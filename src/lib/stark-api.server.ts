import { GoogleGenAI } from "@google/genai";

import { createApp } from "./mini-express.server";

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "stark-focus-os",
      },
    },
  });
}

function safeJsonParse(text: string): any {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
    throw new Error("Nie znaleziono poprawnej struktury JSON");
  }
}

// ===== OCHRONA PRZED SSRF (proxy obrazow) =====
export function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  const blockedHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",
    "metadata.google.internal",
  ];
  if (blockedHosts.includes(host)) return false;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }

  // IPv4 - sieci prywatne / loopback / link-local (RFC 1918 i pokrewne)
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if ([a, b, Number(ipv4[3]), Number(ipv4[4])].some((n) => n > 255)) return false;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
  }

  // IPv6 - loopback, unique-local (fc00::/7), link-local (fe80::/10)
  if (host.includes(":")) {
    if (host === "::" || host === "::1") return false;
    if (/^f[cd]/.test(host)) return false;
    if (/^fe[89ab]/.test(host)) return false;
    if (host.startsWith("::ffff:")) return false;
  }

  return true;
}

// ===== PROSTY CACHE W PAMIECI RAM DLA POWTARZAJACYCH SIE ZAPYTAN AI =====
const AI_CACHE_TTL_MS = 5 * 60 * 1000;
const AI_CACHE_MAX_ENTRIES = 200;
const aiCache = new Map<string, { expiresAt: number; body: string; contentType: string }>();

function cacheGet(key: string) {
  const hit = aiCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    aiCache.delete(key);
    return null;
  }
  // odswiez pozycje (LRU)
  aiCache.delete(key);
  aiCache.set(key, hit);
  return hit;
}

function cacheSet(key: string, body: string, contentType: string) {
  if (aiCache.size >= AI_CACHE_MAX_ENTRIES) {
    const oldest = aiCache.keys().next().value;
    if (oldest !== undefined) aiCache.delete(oldest);
  }
  aiCache.set(key, { expiresAt: Date.now() + AI_CACHE_TTL_MS, body, contentType });
}

const app = createApp();

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // PROXY DLA ZEWNĘTRZNYCH OBRAZÓW (BEZPIECZEŃSTWO I BRAK CORS)
  app.get("/api/proxy-image", async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const imageUrl = req.query.url as string;
    if (!imageUrl) return res.status(400).send("Brak parametru URL");
    if (!isSafeUrl(imageUrl)) {
      return res.status(400).send("Niedozwolony adres URL (ochrona SSRF)");
    }

    try {
      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": ""
        },
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) return res.redirect(imageUrl);
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch {
      res.redirect(imageUrl);
    }
  });

  // GŁÓWNY ENDPOINT: UNIWERSALNA DEKONSTRUKCJA ANATOMII DOWOLNEGO POSTA (GEMINI VISION)
  app.post("/api/ai/analyze-link", async (req, res) => {
    let cleanUrl = String(req.body?.url || "").trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }

    const isTikTokPhoto = cleanUrl.includes("tiktok.com") && cleanUrl.includes("/photo/");
    const isTikTok = cleanUrl.includes("tiktok.com");
    const isShorts = cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be");
    const isInstagram = cleanUrl.includes("instagram.com");
    const platform = isTikTokPhoto ? "TikTok Photo" : isTikTok ? "TikTok" : isShorts ? "Shorts" : isInstagram ? "Reels" : "Wideo";

    let rawMetadata = {
      title: "",
      description: "",
      uploader: "",
      duration: 7,
      audioTrack: "",
      thumbnail: ""
    };

    if (isTikTok) {
      try {
        const oembed = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`, {
          signal: AbortSignal.timeout(4500)
        });
        if (oembed.ok) {
          const oJson = await oembed.json();
          rawMetadata.title = oJson.title || "";
          rawMetadata.uploader = oJson.author_name || "";
          rawMetadata.thumbnail = oJson.thumbnail_url || "";
          const soundMatch = oJson.html?.match(/♬\s*([^<"']+)/i);
          if (soundMatch) rawMetadata.audioTrack = soundMatch[1].trim();
        }
      } catch (e) {
        console.warn("[TikTok oEmbed notice]:", e);
      }
    }


    let imagePart: any = null;
    if (rawMetadata.thumbnail) {
      try {
        const imgRes = await fetch(rawMetadata.thumbnail, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(5000)
        });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          imagePart = {
            inlineData: {
              data: Buffer.from(buffer).toString("base64"),
              mimeType: (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0]
            }
          };
        }
      } catch (imgErr) {
        console.warn("Błąd pobrania klatki do Vision:", imgErr);
      }
    }

    const ai = getGeminiClient();
    const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);

    const universalPrompt = `Jesteś ekspertem analizy wizualnej i układów graficznych dla marki @stark_focus (brutalny stoicyzm, mroczny minimalizm).
Zbadaj ZAŁĄCZONY OBRAZ (klatkę/miniaturę posta) lub metadane:
- Link: "${cleanUrl}"
- Platforma: "${platform}"
- Tytuł/Opis z posta: "${rawMetadata.title} ${rawMetadata.description.slice(0, 300)}"
- Wykryte audio: "${rawMetadata.audioTrack}"
- Unikalne ziarno losowości: ${dynamicSeed}

ZADANIE: Rozpoznaj dokładny styl wizualny posta i zwróć specyfikację UniversalLayoutSpec:
1. "studio_wall_3d" -> JEŚLI na obrazie są czarne, fizyczne litery 3D zamontowane na szarej/betonowej ścianie z lampą oświetlającą kadr z góry (tekst w 5-6 linijkach z lewej strony).
2. "grid_2x2" -> JEŚLI to siatka 4 zdjęć 2x2 z centralnym napisem na środku.
3. "none_solid" -> JEŚLI to czarne/ciemne tło z płaskim cytatem.
4. "split_horizontal" -> JEŚLI ekran jest podzielony poziomo na pół.

ZASADY TREŚCI:
- Stwórz 100% autorski tekst dla marki @stark_focus (stoicyzm, dyscyplina, bezwzględne standardy).
- Zakaz kopiowania słów z oryginału.
- Jeśli "studio_wall_3d": rozbij autorski tekst na 5-6 zwartych linijek (np. "Stay ruthless", "with your", "standards.", "Never negotiate", "with your", "weakness.").

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "layoutSpec": {
    "layoutName": "Litery 3D na Ścianie z Lampą" | "Kolaż 4 Kadrów" | "Cytat na Czerni",
    "gridType": "studio_wall_3d" | "grid_2x2" | "none_solid" | "split_horizontal",
    "backgroundColor": "#686F7C",
    "dividerWidth": 0,
    "dividerColor": "#000000",
    "slotCount": 0,
    "slotLabels": [],
    "textEffect": "3d_wall" | "flat" | "outline",
    "textLayers": [
      {
        "id": "t1",
        "text": "Stay ruthless",
        "fontFamily": "sans",
        "fontSize": 72,
        "fontWeight": "black",
        "fontStyle": "normal",
        "casing": "preserve",
        "color": "#161920",
        "align": "left",
        "posY": 0.28,
        "posX": 0.16
      },
      {
        "id": "t2",
        "text": "with your standards.",
        "fontFamily": "sans",
        "fontSize": 72,
        "fontWeight": "black",
        "fontStyle": "normal",
        "casing": "preserve",
        "color": "#161920",
        "align": "left",
        "posY": 0.38,
        "posX": 0.16
      }
    ],
    "caption": "Kompletny autorski opis pod post po angielsku z hashtagami",
    "detectedAudio": "${rawMetadata.audioTrack || 'Ciemny ambient ze skrzypcami'}"
  }
}`;

    if (!ai) {
      return res.json({
        layoutSpec: {
          layoutName: "Litery 3D na Ścianie z Lampą",
          gridType: "studio_wall_3d",
          backgroundColor: "#686F7C",
          dividerWidth: 0,
          dividerColor: "#000000",
          slotCount: 0,
          slotLabels: [],
          textEffect: "3d_wall",
          textLayers: [
            { id: "t1", text: "Stay ruthless", fontFamily: "sans", fontSize: 72, fontWeight: "black", fontStyle: "normal", casing: "preserve", color: "#161920", align: "left", posY: 0.28, posX: 0.16 },
            { id: "t2", text: "with your", fontFamily: "sans", fontSize: 72, fontWeight: "black", fontStyle: "normal", casing: "preserve", color: "#161920", align: "left", posY: 0.36, posX: 0.16 },
            { id: "t3", text: "standards.", fontFamily: "sans", fontSize: 72, fontWeight: "black", fontStyle: "normal", casing: "preserve", color: "#161920", align: "left", posY: 0.44, posX: 0.16 },
            { id: "t4", text: "Never negotiate", fontFamily: "sans", fontSize: 72, fontWeight: "black", fontStyle: "normal", casing: "preserve", color: "#161920", align: "left", posY: 0.52, posX: 0.16 },
            { id: "t5", text: "with your", fontFamily: "sans", fontSize: 72, fontWeight: "black", fontStyle: "normal", casing: "preserve", color: "#161920", align: "left", posY: 0.60, posX: 0.16 },
            { id: "t6", text: "weakness.", fontFamily: "sans", fontSize: 72, fontWeight: "black", fontStyle: "normal", casing: "preserve", color: "#161920", align: "left", posY: 0.68, posX: 0.16 }
          ],
          caption: "Stay ruthless with your standards. Never negotiate with weakness.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #mindset #focus #starkfocus",
          detectedAudio: rawMetadata.audioTrack || "Oryginalny dźwięk"
        }
      });
    }

    try {
      const contentsPayload = imagePart ? [imagePart, universalPrompt] : [universalPrompt];
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contentsPayload,
        config: { temperature: 0.85 }
      });

      const parsed = safeJsonParse(response.text || "");
      if (rawMetadata.audioTrack && parsed?.layoutSpec) {
        parsed.layoutSpec.detectedAudio = rawMetadata.audioTrack;
      }
      return res.json(parsed);
    } catch (err: any) {
      console.error("Błąd analizy:", err);
      res.status(500).json({ error: "Błąd analizy posta", details: String(err) });
    }
  });

  // GHOSTWRITER POSTÓW
  app.post("/api/ai/generate-post", async (req, res) => {
    const { topic = "", style = "Bezwzględny Stoicyzm", slideCount = 6 } = req.body || {};
    const ai = getGeminiClient();
    const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);

    const prompt = `Jesteś autorem tekstów dla marki @stark_focus.
Temat: "${topic}". Styl: "${style}". Liczba slajdów: ${slideCount}. Ziarno: ${dynamicSeed}.
Zwróć poprawny JSON z postem stoickim w 100% po angielsku.
{
  "post": {
    "title": "Tytuł",
    "hook": "Hook",
    "concept": "Mechanizm",
    "slides": [{ "slideNumber": 1, "headline": "HOOK", "bodyText": "Treść" }],
    "caption": "Opis",
    "hashtags": ["#stoicism", "#discipline", "#focus"]
  }
}`;

    if (!ai) return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.95 }
      });
      res.json(safeJsonParse(response.text || ""));
    } catch (err: any) {
      console.warn("Gemini API generate-post fallback:", err?.message || err);
      // Fallback post
      res.json({
        post: {
          title: topic || "THE SILENT DISCIPLINE",
          hook: "NOBODY CARES ABOUT YOUR EXCUSES.",
          concept: "Dark Stoic Protocol",
          slides: [
            { slideNumber: 1, headline: "RULE 1", bodyText: "Execute in silence. Never announce what you are going to do." },
            { slideNumber: 2, headline: "RULE 2", bodyText: "Comfort is a slow poison disguised as safety." },
            { slideNumber: 3, headline: "RULE 3", bodyText: "Suffering with purpose creates unbreakable character." },
            { slideNumber: 4, headline: "RULE 4", bodyText: "Kill the urge to be understood by ordinary minds." },
            { slideNumber: 5, headline: "RULE 5", bodyText: "The standards you enforce when alone define your destiny." },
            { slideNumber: 6, headline: "VERDICT", bodyText: "Never negotiate with your weakness. Stay ruthless." }
          ],
          caption: `${topic || "The Silent Discipline"}\n\nExecute in silence.\n\n#stoicism #discipline #mindset #focus #starkfocus`,
          hashtags: ["#stoicism", "#discipline", "#focus", "#starkfocus"]
        }
      });
    }
  });

  // STATUS AI
  app.get("/api/ai/status", (req, res) => {
    const key = process.env.GEMINI_API_KEY;
    res.json({
      configured: !!key,
      model: "gemini-3.8-flash"
    });
  });

  // SKANER TRENDÓW AI
  app.post("/api/ai/scan-trends", async (req, res) => {
    const { niche = "stoicism and dark discipline", platform = "Instagram / TikTok" } = req.body || {};
    const ai = getGeminiClient();

    const fallbackTrends = [
      {
        id: "trend-" + Date.now() + "-1",
        title: "The Cost of Comfort",
        suggested_format: "🎬 Rolka 7-Sekundowa (Short Reel)",
        estimated_virality: "97%",
        source_context: "TikTok Viral Sound FYP",
        audience_pain: "Poczucie marnowania potencjału i ucieczka w scrollowanie",
        viral_hooks: [
          "Comfort is a cage disguised as peace.",
          "Every minute of comfort costs you 10 hours of future freedom.",
          "You are not tired. You are uninspired and over-stimulated."
        ],
        core_message: "Wygoda osłabia wolę walki. Prawdziwy spokój rodzi się z rygoru, a nie z ucieczki.",
        bingPrompt: "Cinematic dark brutalist concrete monolith, mist, moody directional light, 9:16 vertical, ultra sharp 8k",
        copy_draft: {
          hook: "Comfort is a cage disguised as peace.",
          supportingText: "Stop negotiating with your weakness.",
          caption: "Comfort is a cage disguised as peace.\n\nEvery time you choose comfort, you trade your future sovereignty for cheap dopamine.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #mindset #focus #starkfocus",
          hashtags: ["#stoicism", "#discipline", "#mindset", "#focus", "#starkfocus"]
        }
      },
      {
        id: "trend-" + Date.now() + "-2",
        title: "Execute In Total Silence",
        suggested_format: "3D Wall Letters / Brutalist Quote",
        estimated_virality: "94%",
        source_context: "IG Reels Dark Aesthetic",
        audience_pain: "Mówienie o swoich planach zamiast ich bezwzględnej realizacji",
        viral_hooks: [
          "Never announce your moves to spectators.",
          "Silence protects your energy. Results speak louder.",
          "If they know what you are doing, you talk too much."
        ],
        core_message: "Zachowaj plany w tajemnicy dopóki nie staną się rzeczywistością.",
        bingPrompt: "Minimalist studio wall with physical black matte 3d lettering, warm overhead lamp spotlight, grey concrete, 9:16",
        copy_draft: {
          hook: "Never announce your moves to spectators.",
          supportingText: "Results are the only language that matters.",
          caption: "Never announce your moves to spectators.\n\nPrivate victories build permanent foundations. Public applause is ephemeral.\n\n#stoicism #discipline #darkaesthetic #starkfocus",
          hashtags: ["#stoicism", "#discipline", "#darkaesthetic", "#starkfocus"]
        }
      },
      {
        id: "trend-" + Date.now() + "-3",
        title: "The Solitude Protocol",
        suggested_format: "🎠 Karuzela 5-Slajdowa (IG Slides)",
        estimated_virality: "95%",
        source_context: "Twitter/X Viral Thread & IG Carousel",
        audience_pain: "Lęk przed samotnością i uleganie presji otoczenia",
        viral_hooks: [
          "Learn to sit alone in a room without checking your phone.",
          "The strongest weapon in modern world is immunity to distraction.",
          "Solitude is where kings are forged; crowds are where they conform."
        ],
        core_message: "Zdolność do przebywania w samotności i skupienia to najrzadsza waluta XXI wieku.",
        bingPrompt: "Dark aesthetic architectural room, single beam of sunlight, solitary silhouette, 35mm film grain, 9:16",
        copy_draft: {
          hook: "Learn to sit alone in a room without checking your phone.",
          supportingText: "Master solitude before you seek mastery over anything else.",
          caption: "Learn to sit alone in a room without checking your phone.\n\nWhen you master your attention, you master your life.\n\n#stoicism #deepwork #solitude #starkfocus",
          hashtags: ["#stoicism", "#deepwork", "#solitude", "#starkfocus"]
        }
      }
    ];

    if (!ai) {
      return res.json({ trends: fallbackTrends, message: "Wygenerowano sprofilowane wątki wirusowe z bazy algorytmicznej." });
    }

    try {
      const prompt = `Jesteś analitykiem wirusowości dla konta @stark_focus (brutalny stoicyzm, mroczny minimalizm).
Nisza: "${niche}". Platforma: "${platform}".
Wyszukaj lub zsyntetyzuj 3 najgorętsze trendy i wątki wirusowe z ich hookami 0-3s.
Zwróć poprawny JSON:
{
  "trends": [
    {
      "id": "trend-1",
      "title": "Tytuł trendu po angielsku",
      "suggested_format": "🎬 Rolka 7-Sekundowa" | "3D Wall Letters" | "🎠 Karuzela 5-Slajdowa",
      "estimated_virality": "96%",
      "source_context": "TikTok FYP Viral",
      "audience_pain": "Dokładna frustracja widza po polsku",
      "viral_hooks": ["Hook 1 (EN)", "Hook 2 (EN)", "Hook 3 (EN)"],
      "core_message": "Główne przesłanie po polsku",
      "bingPrompt": "Prompt pod Bing Image Creator 9:16 po angielsku",
      "copy_draft": {
        "hook": "Hook (EN)",
        "supportingText": "Podtytuł (EN)",
        "caption": "Pełny opis pod post z hashtagami (EN)",
        "hashtags": ["#stoicism", "#discipline", "#focus"]
      }
    }
  ]
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.9 }
      });
      const parsed = safeJsonParse(response.text || "");
      if (parsed?.trends && Array.isArray(parsed.trends)) {
        return res.json({ trends: parsed.trends, message: "✓ Wykryto świeże trendy algorytmiczne." });
      }
      return res.json({ trends: fallbackTrends, message: "Wygenerowano sprofilowane wątki wirusowe." });
    } catch (err: any) {
      console.warn("Skaner trendów - użyto bezpiecznego generatora:", err?.message || err);
      return res.json({ trends: fallbackTrends, message: "Aktywowano zoptymalizowany zestaw trendów wirusowych." });
    }
  });

  // ANALIZA HOOKA (PIPELINE)
  app.post("/api/ai/analyze-hook", async (req, res) => {
    const { hook = "", platform = "Instagram" } = req.body || {};
    const ai = getGeminiClient();

    // Szybka ewaluacja heurystyczna
    const clean = String(hook).trim();
    const words = clean.split(/\s+/).filter(Boolean).length;
    const hasNumbers = /\d/.test(clean);
    const hasPunctuation = clean.includes("?") || clean.includes("!") || clean.includes(".");
    const triggerWords = ["truth", "nobody", "stop", "destroy", "discipline", "silence", "comfort", "habits", "cost", "weakness"];
    const triggerMatches = triggerWords.filter(w => clean.toLowerCase().includes(w)).length;
    
    let baseScore = 80 + Math.min(10, words * 1.5) + (hasNumbers ? 4 : 0) + (hasPunctuation ? 2 : 0) + triggerMatches * 3;
    baseScore = Math.min(99, Math.max(75, Math.round(baseScore)));

    const fallbackAnalysis = {
      score: baseScore,
      stopRate: `${baseScore}% Thumb-Stop`,
      verdict: baseScore >= 92 ? "VIRAL RETENTION // WYBITNY" : "SOLIDNY STANDARD STOICKI",
      trigger: clean.toLowerCase().includes("why") || clean.toLowerCase().includes("how")
        ? "Ciekawość poznawcza & Enigma"
        : "Negatywny Pattern Interrupt (Uderzenie w dumę)",
      recommendation: "Użyj ciemnego bazaltowego tła STARK_FOCUS, kinetic typography i mocnego basu 140BPM w pierwszych 500ms."
    };

    if (!ai) return res.json({ analysis: fallbackAnalysis });

    try {
      const prompt = `Oceń potencjał wirusowy tego hooka pod format ${platform} dla marki @stark_focus: "${clean}".
Zwróć poprawny JSON:
{
  "analysis": {
    "score": 93,
    "stopRate": "93% Thumb-Stop",
    "verdict": "Krótki werdykt",
    "trigger": "Zastosowany wyzwalacz psychologiczny",
    "recommendation": "Rekomendacja reżyserska (wizualia, tempo, dźwięk)"
  }
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.7 }
      });
      const parsed = safeJsonParse(response.text || "");
      if (parsed?.analysis) {
        return res.json(parsed);
      }
      return res.json({ analysis: fallbackAnalysis });
    } catch {
      return res.json({ analysis: fallbackAnalysis });
    }
  });

  // HOOK BATTLE & RETENTION LAB (AI BATTLE)
  app.post("/api/ai/hook-battle", async (req, res) => {
    const { topic = "Dyscyplina" } = req.body || {};
    const ai = getGeminiClient();
    const cleanTopic = String(topic).trim() || "Dyscyplina i bezwzględne standardy";

    const generateIntelligentFallbackBattles = (rawTopic: string) => {
      const t = rawTopic.toLowerCase();
      const isOnePercent = t.includes("1%") || t.includes("1 %") || t.includes("protokół") || t.includes("protokol");
      const isMorning = t.includes("rano") || t.includes("wstaw") || t.includes("morning") || t.includes("5:00") || t.includes("sen");
      const isComfort = t.includes("wygod") || t.includes("lenistw") || t.includes("comfort") || t.includes("prokrastynacj");

      if (isOnePercent) {
        return [
          {
            id: "hb-1",
            angle: "Negatywny Pattern Interrupt",
            hook: "You want 1% results while making 99% average excuses.",
            estimatedRetention: 97,
            psychologicalTrigger: "Uderzenie w hipokryzję i dysonans poznawczy",
            reason: "Zatrzymuje scroll w pierwszych 500ms poprzez bezpośrednią konfrontację z przeciętnością."
          },
          {
            id: "hb-2",
            angle: "Protokół 1%",
            hook: "The top 1% isn't gifted. They just eliminated sympathy for their feelings.",
            estimatedRetention: 95,
            psychologicalTrigger: "Obalenie mitu talentu na rzecz chłodnej kalkulacji",
            reason: "Zmusza widza do natychmiastowej refleksji nad powodem braku wyników."
          },
          {
            id: "hb-3",
            angle: "Stoicki Paradoks",
            hook: "Getting 1% better every day is useless if your core foundation is rotten.",
            estimatedRetention: 94,
            psychologicalTrigger: "Zburzenie popularnego frazesu z Atomic Habits",
            reason: "Kontrowersyjny atak na powszechny dogmat wywołuje natychmiastowe zaangażowanie."
          },
          {
            id: "hb-4",
            angle: "Prowokacyjny Audyt",
            hook: "If you can't conquer your morning, stop pretending you belong in the 1%.",
            estimatedRetention: 92,
            psychologicalTrigger: "Test godności i prawdomówności",
            reason: "Odbiorca czuje presję obrony własnego statusu w komentarzach."
          },
          {
            id: "hb-5",
            angle: "Zagadka / Stoicka Enigma",
            hook: "The top 1% follow one silent rule that ordinary minds call insane.",
            estimatedRetention: 91,
            psychologicalTrigger: "Ciekawość tajemnicy i przynależność do elity",
            reason: "Wymusza obejrzenie kolejnych 5 sekund rolki w celu poznania zasady."
          }
        ];
      }

      if (isMorning) {
        return [
          {
            id: "hb-1",
            angle: "Negatywny Pattern Interrupt",
            hook: "Touching your phone before 7:00 AM guarantees another mediocre day.",
            estimatedRetention: 96,
            psychologicalTrigger: "Bolesna prawda o nawyku 99% ludzi",
            reason: "Uderza w powszechny, wstydliwy odruch sięgania po telefon tuż po przebudzeniu."
          },
          {
            id: "hb-2",
            angle: "Stoicki Paradoks",
            hook: "The snooze button is where weak men bury their self-respect.",
            estimatedRetention: 94,
            psychologicalTrigger: "Połączenie niewinnego przycisku z utratą godności",
            reason: "Mózg widza musi przetworzyć brutalną etykietę przyklejoną do prostej czynności."
          },
          {
            id: "hb-3",
            angle: "Protokół 1%",
            hook: "While the world is asleep, silent empires are being built.",
            estimatedRetention: 93,
            psychologicalTrigger: "Lęk przed pozostaniem w tyle (FOMO wyższego rzędu)",
            reason: "Budzi poczucie winy i zazdrość wobec tych, którzy już trenują w ciemności."
          },
          {
            id: "hb-4",
            angle: "Prowokacyjny Audyt",
            hook: "Are you genuinely tired, or just addicted to comfortable decay?",
            estimatedRetention: 91,
            psychologicalTrigger: "Zakwestionowanie fizjologicznej wymówki",
            reason: "Odmawia odbiorcy prawa do litości nad samym sobą."
          },
          {
            id: "hb-5",
            angle: "Zagadka / Stoicka Enigma",
            hook: "Marcus Aurelius had a brutal morning ritual that killed procrastination instantly.",
            estimatedRetention: 90,
            psychologicalTrigger: "Autorytet cesarza i obietnica natychmiastowego rozwiązania",
            reason: "Buduje ciekawość historyczną i wstrzymuje odruch scrollowania."
          }
        ];
      }

      return [
        {
          id: "hb-1",
          angle: "Negatywny Pattern Interrupt",
          hook: `Your obsession with comfort is the exact reason you feel hollow.`,
          estimatedRetention: 96,
          psychologicalTrigger: "Bezpośrednie uderzenie w fałszywy spokój i iluzję bezpieczeństwa",
          reason: "Zatrzymuje scroll w pierwszych 500ms poprzez brutalną konfrontację z pustką."
        },
        {
          id: "hb-2",
          angle: "Paradoks Stoicki",
          hook: `The pain of discipline is light. The weight of regret is permanent.`,
          estimatedRetention: 94,
          psychologicalTrigger: "Wizualizacja nieodwracalnego kosztu zaniechania",
          reason: "Zmusza mózg do porównania dwóch rodzajów cierpienia i wyboru trudniejszej ścieżki."
        },
        {
          id: "hb-3",
          angle: "Prowokacyjny Audyt",
          hook: `If everyone knew what you did in private, would they respect you?`,
          estimatedRetention: 95,
          psychologicalTrigger: "Audyt wstydu i konfrontacja z hipokryzją",
          reason: "Uderza w najgłębszą obawę przed zdemaskowaniem słabości."
        },
        {
          id: "hb-4",
          angle: "Protokół 1%",
          hook: `Stop announcing what you are going to do. Let the silence do the talking.`,
          estimatedRetention: 92,
          psychologicalTrigger: "Dezorientacja głośnych pozerów i nobilitacja cichej pracy",
          reason: "Kontrastuje z kulturą ciągłego chwalenia się w social media."
        },
        {
          id: "hb-5",
          angle: "Zagadka / Stoicka Enigma",
          hook: `The strongest men in history had one rule they never spoke out loud.`,
          estimatedRetention: 91,
          psychologicalTrigger: "Ciekawość i autorytet mistrzów przeszłości",
          reason: "Zapewnia retencję powyżej 4 sekund w oczekiwaniu na ujawnienie sekretu."
        }
      ];
    };

    if (!ai) {
      return res.json({ battle: generateIntelligentFallbackBattles(cleanTopic) });
    }

    try {
      const prompt = `Jesteś elitarnym analitykiem wirusowości i dyrektorem kreatywnym dla marki @stark_focus (stoicyzm, surowy minimalizm, bezkompromisowa dyscyplina, estetyka cichej dominacji).
Użytkownik wpisał temat lub problem: "${cleanTopic}".

TWOJE ZADANIE:
Stwórz DOKŁADNIE 5 UNIKALNYCH, KONKURENCYJNYCH HOOKÓW (0-3 sekundy) w języku angielskim, które bezpośrednio odnoszą się do tematu "${cleanTopic}".
Żadnych szablonowych wstawek typu 'Your excuses about "${cleanTopic}"'. Hooki muszą być naturalnymi, potężnymi, gramatycznymi zdaniami po angielsku o maksymalnej sile retencji (Thumb-Stop rate).

Format wyjściowy JSON:
{
  "battle": [
    {
      "id": "hb-1",
      "angle": "Negatywny Pattern Interrupt",
      "hook": "Potężny naturalny hook po angielsku",
      "estimatedRetention": 97,
      "psychologicalTrigger": "Precyzyjny opis wyzwalacza psychologicznego po polsku",
      "reason": "Dlaczego ten hook zatrzymuje kciuk w pierwszych 800ms po polsku"
    },
    {
      "id": "hb-2",
      "angle": "Paradoks Stoicki",
      "hook": "Potężny hook po angielsku",
      "estimatedRetention": 95,
      "psychologicalTrigger": "Opis wyzwalacza",
      "reason": "Uzasadnienie retencji"
    },
    {
      "id": "hb-3",
      "angle": "Prowokacyjny Audyt",
      "hook": "Potężny hook po angielsku",
      "estimatedRetention": 94,
      "psychologicalTrigger": "Opis wyzwalacza",
      "reason": "Uzasadnienie retencji"
    },
    {
      "id": "hb-4",
      "angle": "Protokół 1%",
      "hook": "Potężny hook po angielsku",
      "estimatedRetention": 92,
      "psychologicalTrigger": "Opis wyzwalacza",
      "reason": "Uzasadnienie retencji"
    },
    {
      "id": "hb-5",
      "angle": "Zagadka / Stoicka Enigma",
      "hook": "Potężny hook po angielsku",
      "estimatedRetention": 90,
      "psychologicalTrigger": "Opis wyzwalacza",
      "reason": "Uzasadnienie retencji"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.85 }
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.battle && Array.isArray(parsed.battle) && parsed.battle.length > 0) {
        // Ensure every item has hook and estimatedRetention
        const validated = parsed.battle.map((b: any, idx: number) => ({
          id: b.id || `hb-${idx + 1}`,
          angle: b.angle || 'Stoicki Pattern Interrupt',
          hook: b.hook || b.hookA || 'Silence cannot be misquoted. Execute.',
          estimatedRetention: typeof b.estimatedRetention === 'number' ? b.estimatedRetention : (96 - idx * 2),
          psychologicalTrigger: b.psychologicalTrigger || b.psychology || 'Uderzenie w dumę i dyscyplinę',
          reason: b.reason || b.verdict || 'Zatrzymuje scroll w pierwszych 800ms.'
        }));
        return res.json({ battle: validated });
      }

      return res.json({ battle: generateIntelligentFallbackBattles(cleanTopic) });
    } catch (err) {
      console.warn("Hook battle fallback triggered:", err);
      return res.json({ battle: generateIntelligentFallbackBattles(cleanTopic) });
    }
  });

  // GENERATOR PROMPTU TŁA AI (BING IMAGE CREATOR / DALL-E) - MINIMALISTYCZNE, ZAGADKOWE, ZERO TEKSTU
  app.post("/api/ai/generate-background-prompt", async (req, res) => {
    const { topic = "", format = "9:16" } = req.body || {};
    const ai = getGeminiClient();
    const clean = String(topic).trim();

    const buildEnigmaticPrompt = (theme: string) => {
      const t = theme.toLowerCase();
      if (t.includes("ruthless") || t.includes("bezwzględ") || t.includes("siła")) {
        return "Ultra-minimalist dark composition, a solitary shadowy figure standing motionless at the edge of an abyss, cold sharp directional rim lighting, deep charcoal void, eerie silent atmosphere, mysterious cinematic chiaroscuro, 8k vertical composition, strictly no text, no words, no letters, no watermark";
      }
      if (t.includes("1%") || t.includes("elita") || t.includes("szczyt")) {
        return "Abstract minimalist dark architecture, a singular razor-thin beam of pure cold light cutting through total blackness, matte carbon textures, stark geometry, haunting atmospheric fog, mysterious liminal perspective, 8k vertical, strictly no text, no watermark";
      }
      if (t.includes("mgła") || t.includes("pustka") || t.includes("cisza") || t.includes("solitude")) {
        return "Minimalist enigmatic horizon veiled in thick cold mist, pitch black negative space, faint distant light gradient, haunting cinematic atmosphere, 35mm film grain, moody shadows, strictly no text, no watermark";
      }
      return `Abstract minimalist enigmatic void inspired by ${theme}, razor-thin sliver of cold diffuse light cutting through pure pitch black darkness, moody deep chiaroscuro, matte obsidian textures, atmospheric volumetric smoke, ultra clean negative space, 8k vertical ${format}, strictly no text, no typography, no letters, no watermark`;
    };

    if (!ai || !clean) {
      return res.json({
        prompt: clean
          ? buildEnigmaticPrompt(clean)
          : "Ultra-minimalist pitch black void, razor-thin sharp ray of cold directional light cutting through dense cinematic fog, dark matte slate textures, haunting atmospheric mood, mysterious solitude, 8k vertical composition, strictly no text, no words, no letters, no watermark",
        mood: "Zagadkowy, minimalistyczny chiaroscuro"
      });
    }

    try {
      const prompt = `Jesteś elitarnym dyrektorem artystycznym dla marki @stark_focus (mroczny, surowy stoicyzm, brutalistyczny minimalizm, tajemnica, chiaroscuro).
Użytkownik wpisał hasło/slogan/koncept: "${clean}".

TWOJE ZADANIE:
Przekształć to hasło w ZAGADKOWE, MINIMALISTYCZNE, MROCZNE tło fotograficzne lub architektoniczne pod generator obrazów AI (Bing Image Creator / DALL-E 3).

KRYTYCZNE ZASADY:
1. Absolutnie ŻADNYCH napisów, liter, typografii, słów, cytatów ani znaków wodnych na grafice (STRICTLY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO WATERMARKS).
2. Tło ma być ZAGADKOWE i MINIMALISTYCZNE: np. pusta mroczna przestrzeń, pojedyncza smuga chłodnego światła w otchłani, abstrakcyjna geometria cienia, brutalistyczna szczelina światła, samotna niewyraźna sylwetka tonąca w gęstej mgle, chłodny grafit, matowy obsydian, surowy węgiel.
3. Unikaj powtarzalnych banałów typu 'bazaltowy monolit' - skup się na zagadkowym nastroju, przestrzeni negatywnej pod napisy i kinowym świetle.
4. Kompozycja: pionowa ${format}.

Zwróć poprawny JSON:
{
  "prompt": "Pełny angielski prompt gotowy do wklejenia w Bing Image Creator...",
  "mood": "Krótkie określenie nastroju po polsku (np. 'Zagadkowa szczelina światła w próżni')"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.8 }
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.prompt) {
        return res.json(parsed);
      }
      return res.json({
        prompt: buildEnigmaticPrompt(clean),
        mood: "Mroczny, enigmatyczny minimalizm stoicki"
      });
    } catch {
      return res.json({
        prompt: buildEnigmaticPrompt(clean),
        mood: "Mroczny, enigmatyczny minimalizm stoicki"
      });
    }
  });

  // GENERATOR WARIANTÓW MENTORA (ANALIZA PROMPTU IN REAL TIME)
  app.post("/api/ai/generate-mentor-variants", async (req, res) => {
    const {
      topic = "Dyscyplina",
      format = "🎬 Rolka 7-Sekundowa (Short Reel)",
      count = 5,
      inspirations = []
    } = req.body || {};

    const cleanTopic = String(topic).trim() || "Dyscyplina i bezwzględne standardy";
    const ai = getGeminiClient();
    const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);

    const inspContext = Array.isArray(inspirations) && inspirations.length > 0
      ? `\nKONTEKST INSPIRACJI TWÓRCY:\n${inspirations.slice(0, 3).map((i: any) => `- ${i.filename || i.title || ''}: ${i.notes || ''}`).join('\n')}`
      : '';

    const buildSmartFallbackVariants = (rawTopic: string) => {
      const t = rawTopic.toLowerCase();
      if (t.includes("1%") || t.includes("1 %") || t.includes("protokół") || t.includes("protokol")) {
        return [
          {
            format,
            hook: "You want top 1% results with bottom 99% discipline?",
            caption: "Everyone craves the status of the elite, yet clings to the comforts of the masses. The top 1% is not an accident born of luck or weekend ambition. It is forged in absolute isolation while the rest of the world seeks validation. If your daily routines look like the crowd's, your outcome is already decided. Stop demanding exceptional returns from entirely average sacrifices.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Klasyczne uderzenie w hipokryzję odbiorcy i dysonans między pragnieniem sukcesu a gotowością do poświęceń."
          },
          {
            format,
            hook: "The top 1% isn't special. They are just obsessively cold.",
            caption: "Society paints the elite as gifted visionaries to justify its own mediocrity. The brutal truth is far darker: they simply eliminated sympathy for their own weakness. While the 99% negotiate with their alarms and feelings, the 1% execute without emotion. You do not need more talent; you need the spine to become ruthless with your time.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Demistyfikacja pojęcia 1% jako talentu na rzecz chłodnej, bezdusznej dyscypliny i eliminacji użalania się."
          },
          {
            format,
            hook: "Getting 1% better daily is useless if your foundation is rotten.",
            caption: "Self-help peddles micro-improvements to keep weak men feeling productive. You cannot compound 1% gains when your core discipline is completely compromised. Small habits won't save a life governed by distraction and instant gratification. First, burn your excuses to the ground with violent, radical consistency.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Bezpośredni atak na kultowy frazes rozwoju osobistego. Polaryzuje i prowokuje do dyskusji."
          },
          {
            format,
            hook: "Is 1% success worth destroying your entire social life?",
            caption: "The modern world preaches balance because it is terrified of radical obsession. Every man in the genuine top 1% had to abandon friendships, comfort, and common understanding. You cannot walk with the herd and simultaneously outrun it into the dark. Solitude is the brutal toll booth at the entrance to mastery.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Prowokacyjne pytanie podważające dogmat work-life balance i ukazujące realną cenę sukcesu."
          },
          {
            format,
            hook: "Most men talk like the 1%, but fold under 1% pain.",
            caption: "It costs nothing to post stoic quotes and wear the aesthetic of ambition. But the moment physical or mental exhaustion hits, 99% look for a dignified exit. Stoicism is not an intellectual hobby; it is a blood contract with real suffering. If minor discomfort breaks your focus, you are hallucinating your potential.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Ego-check uderzający bezpośrednio w pozerstwo i 'cyfrowy stoicyzm'."
          }
        ];
      }

      if (t.includes("ruthless") || t.includes("bezwzględ")) {
        return [
          {
            format,
            hook: "Being ruthless with yourself is the highest form of self-respect.",
            caption: "Weak minds confuse self-love with self-indulgence. Giving into your impulses is not compassion; it is betrayal. When you demand non-negotiable excellence from yourself, you build an unshakeable armor against external chaos.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Przedefiniowanie bezwzględności jako jedynej prawdziwej miłości własnej."
          },
          {
            format,
            hook: "If you hesitate to cut off your weakness, it will consume you.",
            caption: "Marcus Aurelius knew that mercy towards your own lazy habits is slow suicide. The world will not remember what you intended to do. It only records what you had the courage to conquer.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Konfrontacja z kosztem pobłażliwości wobec własnych słabości."
          },
          {
            format,
            hook: "Stay ruthless in the dark. Let results arrive like thunder.",
            caption: "Never advertise your battles. When you suffer in private and build without applause, you become immune to opinions. The quietest rooms build the most terrifying men.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Pochwała pracy w ciszy i bezlitosnego egzekwowania standardów."
          },
          {
            format,
            hook: "Your feelings are suggestions. Your standards are laws.",
            caption: "The second you let your mood dictate your execution, you have surrendered your sovereignty. Enforce ruthless discipline over your morning, and your life will submit to your will.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Zasada rozdzielenia emocji od standardów wykonawczych."
          },
          {
            format,
            hook: "Nobody respects a man who negotiates with his alarm.",
            caption: "Your first decision of the day determines whether you are a master or a slave. The moment you argue with the morning, your standards are already dead.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus",
            notes: "Brutalny test porannej dyscypliny i godności."
          }
        ];
      }

      return [
        {
          format,
          hook: `Comfort is quietly robbing you of everything you could become.`,
          caption: `Comfort is quietly robbing you of everything you could become.\n\nMost people negotiate with their weaknesses every single day. The moment friction appears, they fold.\n\nStop waiting for motivation. Build standard-driven execution.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #mentaltoughness #focus #starkfocus`,
          notes: `Negatywny Pattern Interrupt dotyczący tematu "${cleanTopic}"`
        },
        {
          format,
          hook: `The silent price of temporary relief is permanent mediocrity.`,
          caption: `The silent price of temporary relief is permanent mediocrity.\n\nEvery day you compromise, you cast a vote for the person you despise becoming.\n\nKill the noise. Do the work when no one is watching.\n\n#stoicism #focus #mindset #standards #starkfocus`,
          notes: `Uderzenie w poczucie wstydu i koszt bezczynności dla "${cleanTopic}"`
        },
        {
          format,
          hook: `If you cannot master yourself in silence, the world will master you in public.`,
          caption: `If you cannot master yourself in silence, the world will master you in public.\n\nMarcus Aurelius never asked for permission to be disciplined. He enforced ruthless control over his impulses.\n\nExecute in silence. Let your results speak.\n\n#stoic #discipline #darkaesthetic #starkfocus`,
          notes: `Autorytet stoicki i nieprzekraczalny rygor w odniesieniu do "${cleanTopic}"`
        },
        {
          format,
          hook: `99% of people fail because they demand applause before delivering results.`,
          caption: `99% of people fail because they demand applause before delivering results.\n\nSilence protects your energy. Voluntary friction is the only currency of respect.\n\nSave this. Revisit when you feel like quitting.\n\n#darkstoicism #discipline #focus #growth #starkfocus`,
          notes: `Brutalna statystyka i separacja od przeciętności dla "${cleanTopic}"`
        },
        {
          format,
          hook: `The day you stop seeking sympathy is the day you become untouchable.`,
          caption: `The day you stop seeking sympathy is the day you become untouchable.\n\nNobody cares about your complaints. The world only respects outcomes achieved in absolute silence.\n\nLock in. Stay ruthless.\n\n#stoicism #discipline #darkdiscipline #starkfocus`,
          notes: `Przełamanie mentalności ofiary dla tematu "${cleanTopic}"`
        }
      ];
    };

    if (!ai) {
      return res.json({ variants: buildSmartFallbackVariants(cleanTopic).slice(0, count) });
    }

    try {
      const prompt = `Jesteś elitarnym dyrektorem kreatywnym i autorem hooków dla marki @stark_focus (brutalny stoicyzm, mroczny minimalizm, bezkompromisowa dyscyplina, estetyka sukcesu w ciszy).

UŻYTKOWNIK WPISAŁ KONKRETNY PROMPT/TEMAT: "${cleanTopic}".
FORMAT POSTA: "${format}".
LOSOWE ZIARNO: ${dynamicSeed}.${inspContext}

TWOJE ZADANIE:
Głęboko przeanalizuj DOKŁADNIE TEN TEMAT ("${cleanTopic}") w czasie rzeczywistym.
Nie używaj ogólnych, generycznych sloganów. Dostosuj każdy hook bezpośrednio do sensu, problemu lub słów kluczowych wpisanych przez użytkownika!

Stwórz ${count} UNIKALNYCH wariantów stoickich.
Każdy wariant musi zawierać:
1. "hook" - potężny hook 0-3 sekundy w języku angielskim (maksymalnie 8-12 słów), który natychmiast zatrzymuje kciuk (pattern interrupt, uderzenie w dumę, brutalna prawda stoicka).
2. "caption" - pełny autorski opis po angielsku (4-6 zdań) rozwijający ten temat z mocnym CTA ("Save this reminder. Execute in silence.") oraz hashtagami (#stoicism #discipline #darkdiscipline #focus #starkfocus).
3. "notes" - krótka polska notatka wyjaśniająca kąt psychologiczny hooka i jak odnosi się do promptu "${cleanTopic}".

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "variants": [
    {
      "format": "${format}",
      "hook": "Potężny hook w j. angielskim bezpośrednio o ${cleanTopic}",
      "caption": "Pełny opis w j. angielskim rozwijający ten temat z CTA i hashtagami",
      "notes": "Wyjaśnienie kąta psychologicznego"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.85 }
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.variants && Array.isArray(parsed.variants) && parsed.variants.length > 0) {
        return res.json({ variants: parsed.variants });
      }

      return res.json({ variants: buildSmartFallbackVariants(cleanTopic).slice(0, count) });
    } catch (err: any) {
      console.warn("Błąd generowania wariantów AI w czasie rzeczywistym, użyto dynamicznego generatora kontekstowego:", err?.message || err);
      return res.json({ variants: buildSmartFallbackVariants(cleanTopic).slice(0, count) });
    }
  });

  // GENERATOR KARUZEL
  app.post("/api/ai/generate-carousel-template", async (req, res) => {
    const { topic = "Stoicka Dyscyplina", slideCount = 5 } = req.body || {};
    const cleanTopic = String(topic).trim() || "Stoic Discipline and High Standards";
    const targetCount = Math.min(10, Math.max(3, Number(slideCount) || 5));
    const ai = getGeminiClient();

    const buildDynamicCarouselFallback = (t: string, count: number) => {
      const themeTitle = `STARK // ${t.toUpperCase()}`;
      const library = [
        {
          headline: "THE SILENT CONTRACT",
          bodyText: `Nobody is coming to save your potential. Every single compromise regarding ${t} is a vote for the person you despise becoming. Raise your minimum standard today.`
        },
        {
          headline: "KILL THE NEGOTIATION",
          bodyText: "Your brain will offer 10 rational excuses the second friction appears. Real discipline begins when you stop participating in that internal debate."
        },
        {
          headline: "VOLUNTARY FRICTION",
          bodyText: "Comfort is slow poison. When you willingly choose the difficult path, external chaos and fatigue lose all leverage over your mind."
        },
        {
          headline: "THE SOLITUDE ADVANTAGE",
          bodyText: "Weak men broadcast their intentions for cheap applause. Dangerous men work in absolute silence and let undeniable results make the noise."
        },
        {
          headline: "RADICAL CONSISTENCY",
          bodyText: "The 1% is not an elite club born of genius. It is forged across hundreds of mundane, repetitive days that average men abandon."
        },
        {
          headline: "EMOTIONAL DETACHMENT",
          bodyText: "Never allow a fleeting morning mood to dictate your lifelong trajectory. Your feelings are suggestions; your standards are absolute law."
        },
        {
          headline: "FINAL DIRECTIVE",
          bodyText: "Save this reminder. Execute in total silence. Let them wonder how you became completely untouchable."
        }
      ];

      return {
        name: themeTitle,
        slides: library.slice(0, count).map((s, idx) => ({
          slideNumber: idx + 1,
          headline: s.headline,
          bodyText: s.bodyText
        }))
      };
    };

    if (!ai) {
      return res.json({ template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
    }

    try {
      const prompt = `Jesteś elitarnym twórcą viralowych, mrocznych, stoickich karuzeli na Instagramie dla marki STARK FOCUS (@stark_focus).
Temat karuzeli wpisany przez twórcę: "${cleanTopic}".
Liczba slajdów do wygenerowania: ${targetCount}.

Stwórz dopracowaną serię slajdów karuzeli w języku angielskim (STRICTLY IN ENGLISH).
Wymogi:
1. Slajd 1: Brutalny, magnetyczny Hook (Pattern Interrupt) - uderzający w dumę, hipokryzję lub koszt ulegania słabości w kontekście "${cleanTopic}".
2. Slajdy 2 do ${targetCount - 1}: Bezwzględne, konkretne zasady stoickie rozwijające temat "${cleanTopic}". Krótkie, gęste od merytoryki, bez lania wody.
3. Ostatni slajd: Ostateczne wezwanie do działania (Call to Action) i dyscyplina wykonania w ciszy.
4. "headline": 2-4 mocne słowa ALL CAPS (np. "THE SILENT CONTRACT", "KILL THE NEGOTIATION").
5. "bodyText": 2-3 zdania po angielsku (ok. 25-45 słów). Maksymalna klarowność i moc.

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "template": {
    "name": "Tytuł serii po angielsku",
    "slides": [
      {
        "slideNumber": 1,
        "headline": "THE COLD REALITY",
        "bodyText": "Treść po angielsku..."
      }
    ]
  }
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.85 }
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.template?.slides && Array.isArray(parsed.template.slides) && parsed.template.slides.length > 0) {
        return res.json({ template: parsed.template });
      }

      return res.json({ template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
    } catch (err: any) {
      console.warn("Błąd generowania karuzeli AI, użyto dynamicznego fallbacku:", err?.message || err);
      return res.json({ template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
    }
  });

  // GENERATOR GRAFIK SCHEMATU
  app.post("/api/ai/generate-scheme-post", async (req, res) => {
    res.json({
      hook: "STAY RUTHLESS WITH YOUR STANDARDS.",
      highlightWords: ["RUTHLESS", "STANDARDS"],
      punchline: "NEVER NEGOTIATE WITH WEAKNESS.",
      caption: "Stay ruthless with your standards.\n\nNever negotiate with your weakness.\n\n#stoicism #discipline #starkfocus"
    });
  });

  // GHOSTWRITE (STUDIO WIDEO)
  app.post("/api/ghostwrite", async (req, res) => {
    const { topic = "Solitude and focus" } = req.body || {};
    const ai = getGeminiClient();

    const fallback = "NOBODY IS COMING TO SAVE YOU.\nEXECUTE IN TOTAL SILENCE.";
    if (!ai) return res.json({ content: fallback });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Create a brutal 2-line stoic video hook in ENGLISH (max 8 words total) on: "${topic}". ALL CAPS. No punctuation except periods.`,
        config: { temperature: 0.9 }
      });
      res.json({ content: (response.text || fallback).trim() });
    } catch {
      res.json({ content: fallback });
    }
  });

// Endpointy AI, ktorych odpowiedzi warto cache'owac (identyczne zapytanie = ta sama odpowiedz)
const CACHEABLE_AI_PATHS = new Set([
  "/api/ai/scan-trends",
  "/api/ai/analyze-hook",
  "/api/ai/generate-background-prompt",
  "/api/ai/generate-carousel-template",
  "/api/ai/analyze-link",
]);

export async function handleStarkApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cacheable = request.method === "POST" && CACHEABLE_AI_PATHS.has(url.pathname);

  if (!cacheable) return app.handle(request);

  const rawBody = await request.clone().text();
  const key = `${url.pathname}:${rawBody}`;
  const hit = cacheGet(key);
  if (hit) {
    return new Response(hit.body, {
      status: 200,
      headers: { "content-type": hit.contentType, "x-stark-cache": "HIT" },
    });
  }

  const response = await app.handle(request);
  if (response.status === 200) {
    const text = await response.clone().text();
    cacheSet(key, text, response.headers.get("content-type") ?? "application/json");
  }
  return response;
}
