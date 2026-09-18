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

// Helper z odpornością na przeciążenia modeli (503 UNAVAILABLE), limity zapytań (429 RESOURCE_EXHAUSTED)
// oraz wielopoziomowym fallbackiem (gemini-3.1-flash-lite -> gemini-3.8-flash)
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    preferredModel?: string;
  },
): Promise<any> {
  // Próbujemy w pierwszej kolejności lżejszego modelu flash-lite (wyższe limity RPM, mniejsze ryzyko przeciążenia 503)
  const models = options.preferredModel
    ? [options.preferredModel, "gemini-3.1-flash-lite", "gemini-3.8-flash"].filter(
        (v, i, a) => a.indexOf(v) === i,
      )
    : ["gemini-3.1-flash-lite", "gemini-3.8-flash"];

  let lastError: any = null;

  for (const model of models) {
    // 2 próby na dany model z krótkim backoffem w razie 503/429
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isUnavailable =
          msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
        const isRateLimit =
          msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

        // Jeśli to tymczasowy błąd przeciążenia sieci lub limity, odczekajmy chwilę przed ponowieniem
        if ((isUnavailable || isRateLimit) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }

        // Przejdź do kolejnego modelu w liście
        break;
      }
    }
  }

  throw lastError;
}

function safeJsonParse(text: string): any {
  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
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

// ŚCIŚLE STAŁY SCHEMAT OPISÓW DLA MARKI @STARK_FOCUS (100% ENGLISH)
export function formatStarkCaption(
  hook: string,
  principles: [string, string, string],
  directive: string = "Never negotiate with your standards. Execute in silence.",
): string {
  const cleanHook = hook.replace(/["#*]/g, "").trim().toUpperCase();
  return (
    `${cleanHook}\n\n` +
    `1. ${principles[0].trim()}\n` +
    `2. ${principles[1].trim()}\n` +
    `3. ${principles[2].trim()}\n\n` +
    `${directive.trim()}\n\n` +
    `Save this reminder. Execute in silence. Follow @stark_focus.\n\n` +
    `#stoicism #darkdiscipline #discipline #mindset #focus #starkfocus`
  );
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
        Referer: "",
      },
      signal: AbortSignal.timeout(9000),
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
  const platform = isTikTokPhoto
    ? "TikTok Photo"
    : isTikTok
      ? "TikTok"
      : isShorts
        ? "Shorts"
        : isInstagram
          ? "Reels"
          : "Wideo";

  const rawMetadata = {
    title: "",
    description: "",
    uploader: "",
    duration: 7,
    audioTrack: "",
    thumbnail: "",
  };

  if (isTikTok) {
    try {
      const oembed = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`,
        {
          signal: AbortSignal.timeout(4500),
        },
      );
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
        signal: AbortSignal.timeout(5000),
      });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        imagePart = {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0],
          },
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
1. "none_solid" -> JEŚLI to czarne/ciemne tło z minimalistycznym cytatem na czerni (format 9:16).
2. "grid_2x2" -> JEŚLI to siatka 4 zdjęć 2x2 z centralnym napisem na środku (format 9:16).

ZASADY TREŚCI:
- Stwórz 100% autorski tekst dla marki @stark_focus (stoicyzm, dyscyplina, bezwzględne standardy).
- Zakaz kopiowania słów z oryginału.
- Format ZAWSZE 9:16 (1080x1920) pionowy.

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "layoutSpec": {
    "layoutName": "Cytat na Czerni" | "Kolaż 4 Kadrów",
    "gridType": "none_solid" | "grid_2x2",
    "backgroundColor": "#000000",
    "dividerWidth": 0,
    "dividerColor": "#000000",
    "slotCount": 0,
    "slotLabels": [],
    "textEffect": "flat" | "outline",
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
    "detectedAudio": "${rawMetadata.audioTrack || "Ciemny ambient ze skrzypcami"}"
  }
}`;

  if (!ai) {
    return res.json({
      layoutSpec: {
        layoutName: "Cytat na Czerni (9:16)",
        gridType: "none_solid",
        backgroundColor: "#000000",
        dividerWidth: 0,
        dividerColor: "#000000",
        slotCount: 0,
        slotLabels: [],
        textEffect: "flat",
        textLayers: [
          {
            id: "t1",
            text: "Focus on yourself.",
            fontFamily: "sans",
            fontSize: 68,
            fontWeight: "bold",
            fontStyle: "normal",
            casing: "preserve",
            color: "#FFFFFF",
            align: "left",
            posY: 0.42,
            posX: 0.12,
          },
          {
            id: "t2",
            text: "people come & go.",
            fontFamily: "sans",
            fontSize: 42,
            fontWeight: "normal",
            fontStyle: "normal",
            casing: "preserve",
            color: "rgba(255, 255, 255, 0.72)",
            align: "left",
            posY: 0.5,
            posX: 0.12,
          },
        ],
        caption: formatStarkCaption(
          "Focus on yourself. People come and go.",
          [
            "Comfort is a slow poison disguised as safety.",
            "The standards you enforce when alone determine your destiny.",
            "Silence protects your focus while results announce your victory.",
          ],
          "Execute in silence. Never compromise with mediocrity.",
        ),
        detectedAudio: rawMetadata.audioTrack || "Oryginalny dźwięk",
      },
    });
  }

  try {
    const contentsPayload = imagePart ? [imagePart, universalPrompt] : [universalPrompt];
    const response = await callGeminiWithFallback(ai, {
      contents: contentsPayload,
      config: { temperature: 0.85 },
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

// GHOSTWRITER POSTÓW (100% ENGLISH, ŚCIŚLE STAŁY SCHEMAT OPISU)
app.post("/api/ai/generate-post", async (req, res) => {
  const { topic = "", style = "Bezwzględny Stoicyzm", slideCount = 6 } = req.body || {};
  const ai = getGeminiClient();
  const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);

  const prompt = `Jesteś elitarnym autorem tekstów dla marki @stark_focus (nowoczesny brutalny stoicyzm, mroczny minimalizm).
Temat: "${topic}". Styl: "${style}". Liczba slajdów: ${slideCount}. Ziarno: ${dynamicSeed}.

ZASADY:
1. PEŁNA SWOBODA W NOWOCZESNYCH REINTERPRETACJACH: Używaj nowoczesnej psychologii uwagi, eliminacji dopaminowego szumu, samotnej pracy, bezkompromisowej dyscypliny i rygoru 1%.
2. CAŁA TREŚĆ POSTA W 100% PO ANGIELSKU.
3. KRYTYCZNE: Opis ("caption") MUSI mieć ŚCIŚLE STAŁY SCHEMAT:
[HOOK W ALL CAPS]

1. [Pierwsza brutalna zasada stoicka / analiza mechanizmu]
2. [Druga bezwzględna zasada wykonania w ciszy]
3. [Trzecia zasada eliminacji słabości]

[Krótka zasada bez negocjacji]

Save this reminder. Execute in silence. Follow @stark_focus.

#stoicism #darkdiscipline #discipline #mindset #focus #starkfocus

Zwróć poprawny JSON:
{
  "post": {
    "title": "Tytuł po angielsku",
    "hook": "Potężny hook po angielsku",
    "concept": "Mechanizm po angielsku",
    "slides": [{ "slideNumber": 1, "headline": "NAGŁÓWEK PO ANGIELSKU", "bodyText": "Treść po angielsku" }],
    "caption": "Opis w ścisłym schemacie po angielsku",
    "hashtags": ["#stoicism", "#darkdiscipline", "#discipline", "#mindset", "#focus", "#starkfocus"]
  }
}`;

  if (!ai) return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });

  try {
    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.95 },
    });
    res.json(safeJsonParse(response.text || ""));
  } catch (err: any) {
    console.warn("Gemini API generate-post fallback:", err?.message || err);
    const fallbackHook = (topic || "NOBODY CARES ABOUT YOUR EXCUSES.").toUpperCase();
    res.json({
      post: {
        title: topic || "THE SILENT DISCIPLINE",
        hook: fallbackHook,
        concept: "Dark Stoic Protocol",
        slides: [
          {
            slideNumber: 1,
            headline: "RULE 1",
            bodyText: "Execute in silence. Never announce what you are going to do.",
          },
          {
            slideNumber: 2,
            headline: "RULE 2",
            bodyText: "Comfort is a slow poison disguised as safety.",
          },
          {
            slideNumber: 3,
            headline: "RULE 3",
            bodyText: "Suffering with purpose creates unbreakable character.",
          },
          {
            slideNumber: 4,
            headline: "RULE 4",
            bodyText: "Kill the urge to be understood by ordinary minds.",
          },
          {
            slideNumber: 5,
            headline: "RULE 5",
            bodyText: "The standards you enforce when alone define your destiny.",
          },
          {
            slideNumber: 6,
            headline: "VERDICT",
            bodyText: "Never negotiate with your weakness. Stay ruthless.",
          },
        ],
        caption: formatStarkCaption(
          fallbackHook,
          [
            "Comfort is a slow poison that amputates your future sovereignty.",
            "Private victories build permanent foundations; public applause is ephemeral.",
            "When you master your attention in solitude, you become completely untouchable.",
          ],
          "Never negotiate with your weakness. Standards over emotions.",
        ),
        hashtags: [
          "#stoicism",
          "#darkdiscipline",
          "#discipline",
          "#mindset",
          "#focus",
          "#starkfocus",
        ],
      },
    });
  }
});

// STATUS AI
app.get("/api/ai/status", (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  res.json({
    configured: !!key,
    model: "gemini-3.1-flash-lite / gemini-3.8-flash (Auto-Failover)",
  });
});

// SKANER TRENDÓW AI
app.post("/api/ai/scan-trends", async (req, res) => {
  const { niche = "stoicism and dark discipline", platform = "Instagram / TikTok" } =
    req.body || {};
  const ai = getGeminiClient();

  const fallbackTrends = [
    {
      id: "trend-" + Date.now() + "-1",
      title: "The Cost of Comfort",
      suggested_format: "🎬 Rolka 7-Sekundowa (Short Reel)",
      estimated_virality: "97%",
      source_context: "TikTok Viral Sound FYP",
      audience_pain: "Feeling of wasting potential and escaping into mindless scrolling",
      viral_hooks: [
        "Comfort is a cage disguised as peace.",
        "Every minute of comfort costs you 10 hours of future freedom.",
        "You are not tired. You are uninspired and over-stimulated.",
      ],
      core_message:
        "Comfort atrophies your willpower. Genuine peace is forged through voluntary friction, not cheap escape.",
      bingPrompt:
        "Cinematic dark brutalist concrete monolith, mist, moody directional light, 9:16 vertical, ultra sharp 8k",
      copy_draft: {
        hook: "Comfort is a cage disguised as peace.",
        supportingText: "Stop negotiating with your weakness.",
        caption:
          "Comfort is a cage disguised as peace.\n\nEvery time you choose comfort, you trade your future sovereignty for cheap dopamine.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #mindset #focus #starkfocus",
        hashtags: ["#stoicism", "#discipline", "#mindset", "#focus", "#starkfocus"],
      },
    },
    {
      id: "trend-" + Date.now() + "-2",
      title: "Execute In Total Silence",
      suggested_format: "🖤 Cytat na Czerni (9:16 Minimal)",
      estimated_virality: "94%",
      source_context: "IG Reels Dark Aesthetic",
      audience_pain: "Broadcasting moves for cheap validation instead of ruthless execution",
      viral_hooks: [
        "Never announce your moves to spectators.",
        "Silence protects your energy. Results speak louder.",
        "If they know what you are doing, you talk too much.",
      ],
      core_message:
        "Keep your operations completely classified until they become an undeniable reality.",
      bingPrompt:
        "Minimalist pitch-black monolithic room, single razor-thin cold slit of overhead light, matte dark granite floor, atmospheric chiaroscuro, 9:16 vertical, no text, no words",
      copy_draft: {
        hook: "Never announce your moves to spectators.",
        supportingText: "Results are the only language that matters.",
        caption:
          "Never announce your moves to spectators.\n\nPrivate victories build permanent foundations. Public applause is ephemeral.\n\n#stoicism #discipline #darkaesthetic #starkfocus",
        hashtags: ["#stoicism", "#discipline", "#darkaesthetic", "#starkfocus"],
      },
    },
    {
      id: "trend-" + Date.now() + "-3",
      title: "The Solitude Protocol",
      suggested_format: "🎠 Karuzela 5-Slajdowa (IG Slides)",
      estimated_virality: "95%",
      source_context: "Twitter/X Viral Thread & IG Carousel",
      audience_pain: "Fear of solitude and succumbing to continuous digital distraction",
      viral_hooks: [
        "Learn to sit alone in a room without checking your phone.",
        "The strongest weapon in modern world is immunity to distraction.",
        "Solitude is where kings are forged; crowds are where they conform.",
      ],
      core_message:
        "The capacity to endure solitude and concentrated focus is the rarest currency of the 21st century.",
      bingPrompt:
        "Dark aesthetic architectural room, single beam of sunlight, solitary silhouette, 35mm film grain, 9:16",
      copy_draft: {
        hook: "Learn to sit alone in a room without checking your phone.",
        supportingText: "Master solitude before you seek mastery over anything else.",
        caption:
          "Learn to sit alone in a room without checking your phone.\n\nWhen you master your attention, you master your life.\n\n#stoicism #deepwork #solitude #starkfocus",
        hashtags: ["#stoicism", "#deepwork", "#solitude", "#starkfocus"],
      },
    },
  ];

  if (!ai) {
    return res.json({
      trends: fallbackTrends,
      message: "Generated high-leverage algorithmic trends.",
    });
  }

  try {
    const prompt = `You are the viral retention strategist for @stark_focus (brutal stoicism, dark minimalism, relentless discipline).
Niche: "${niche}". Platform: "${platform}".
Identify or synthesize 3 viral trends and storylines with their 0-3s hooks.
CRITICAL: ALL fields (including title, audience_pain, viral_hooks, core_message, copy_draft) MUST BE STRICTLY IN ENGLISH.

Return ONLY valid JSON:
{
  "trends": [
    {
      "id": "trend-1",
      "title": "Trend Title in English",
      "suggested_format": "🎬 Rolka 7-Sekundowa" | "🖤 Cytat na Czerni (9:16)" | "🎠 Karuzela 5-Slajdowa",
      "estimated_virality": "96%",
      "source_context": "TikTok FYP Viral",
      "audience_pain": "Audience psychological frustration in English",
      "viral_hooks": ["Hook 1 (EN)", "Hook 2 (EN)", "Hook 3 (EN)"],
      "core_message": "Core stoic message in English",
      "bingPrompt": "Prompt for image background in English",
      "copy_draft": {
        "hook": "Hook in English",
        "supportingText": "Subtitle in English",
        "caption": "Full caption with hashtags in English",
        "hashtags": ["#stoicism", "#discipline", "#focus"]
      }
    }
  ]
}`;
    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.9 },
    });
    const parsed = safeJsonParse(response.text || "");
    if (parsed?.trends && Array.isArray(parsed.trends)) {
      return res.json({ trends: parsed.trends, message: "✓ Wykryto świeże trendy algorytmiczne." });
    }
    return res.json({
      trends: fallbackTrends,
      message: "Wygenerowano sprofilowane wątki wirusowe.",
    });
  } catch (err: any) {
    console.warn("Skaner trendów - użyto bezpiecznego generatora:", err?.message || err);
    return res.json({
      trends: fallbackTrends,
      message: "Aktywowano zoptymalizowany zestaw trendów wirusowych.",
    });
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
  const triggerWords = [
    "truth",
    "nobody",
    "stop",
    "destroy",
    "discipline",
    "silence",
    "comfort",
    "habits",
    "cost",
    "weakness",
  ];
  const triggerMatches = triggerWords.filter((w) => clean.toLowerCase().includes(w)).length;

  let baseScore =
    80 +
    Math.min(10, words * 1.5) +
    (hasNumbers ? 4 : 0) +
    (hasPunctuation ? 2 : 0) +
    triggerMatches * 3;
  baseScore = Math.min(99, Math.max(75, Math.round(baseScore)));

  const fallbackAnalysis = {
    score: baseScore,
    stopRate: `${baseScore}% Thumb-Stop`,
    verdict: baseScore >= 92 ? "VIRAL RETENTION // WYBITNY" : "SOLIDNY STANDARD STOICKI",
    trigger:
      clean.toLowerCase().includes("why") || clean.toLowerCase().includes("how")
        ? "Ciekawość poznawcza & Enigma"
        : "Negatywny Pattern Interrupt (Uderzenie w dumę)",
    recommendation:
      "Użyj ciemnego bazaltowego tła STARK_FOCUS, kinetic typography i mocnego basu 140BPM w pierwszych 500ms.",
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
    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.7 },
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

// HOOK BATTLE & RETENTION LAB (AI BATTLE - UNLIMITED GENERATION & MODERN REINTERPRETATIONS)
app.post("/api/ai/hook-battle", async (req, res) => {
  const { topic = "Dyscyplina", count = 5, offset = 0, excludeHooks = [] } = req.body || {};
  const ai = getGeminiClient();
  const cleanTopic = String(topic).trim() || "Dyscyplina i bezwzględne standardy";
  const currentBatch = Math.max(0, Number(offset) || 0);

  const generateIntelligentFallbackBattles = (rawTopic: string, batchIdx: number) => {
    const timestamp = Date.now();
    const modernThemes = [
      {
        angle: "Nowoczesny Dopaminowy Detox",
        hook: "Your attention span was engineered to be weak. Retake ownership.",
        estimatedRetention: 98,
        psychologicalTrigger: "Uderzenie w uzależnienie od algorytmów i scrollowania",
        reason: "Natychmiastowe zdemaskowanie cyfrowej manipulacji zatrzymuje kciuk.",
      },
      {
        angle: "Protokół 1%",
        hook: "The top 1% isn't gifted. They just eliminated sympathy for their feelings.",
        estimatedRetention: 96,
        psychologicalTrigger: "Obalenie mitu talentu na rzecz chłodnej kalkulacji",
        reason: "Zmusza widza do natychmiastowej refleksji nad powodem braku wyników.",
      },
      {
        angle: "Negatywny Pattern Interrupt",
        hook: "You want 1% results while making 99% average excuses.",
        estimatedRetention: 97,
        psychologicalTrigger: "Uderzenie w hipokryzję i dysonans poznawczy",
        reason: "Zatrzymuje scroll w pierwszych 500ms poprzez bezpośrednią konfrontację.",
      },
      {
        angle: "Stoicki Paradoks Cyfrowy",
        hook: "Getting 1% better every day is useless if your foundation is rotten.",
        estimatedRetention: 94,
        psychologicalTrigger: "Zburzenie popularnego frazesu z Atomic Habits",
        reason: "Kontrowersyjny atak na powszechny dogmat wywołuje natychmiastowe zaangażowanie.",
      },
      {
        angle: "Prowokacyjny Audyt Poranka",
        hook: "Touching your phone before 7:00 AM guarantees another mediocre day.",
        estimatedRetention: 96,
        psychologicalTrigger: "Bolesna prawda o nawyku 99% ludzi",
        reason: "Uderza w powszechny odruch sięgania po telefon tuż po przebudzeniu.",
      },
      {
        angle: "Cicha Dominacja",
        hook: "Stop announcing what you are going to do. Let the silence do the talking.",
        estimatedRetention: 95,
        psychologicalTrigger: "Dezorientacja pozerów i nobilitacja cichej pracy",
        reason: "Kontrastuje z kulturą ciągłego chwalenia się w social mediach.",
      },
      {
        angle: "Wojna o Suwerenność Umysłu",
        hook: "If you cannot master yourself in silence, the world will master you in public.",
        estimatedRetention: 95,
        psychologicalTrigger: "Autorytet nieprzekraczalnego rygoru",
        reason: "Wymusza respekt i zmusza do wewnętrznej weryfikacji standardów.",
      },
      {
        angle: "Przełamanie Mentalności Ofiary",
        hook: "The day you stop seeking sympathy is the day you become dangerous.",
        estimatedRetention: 97,
        psychologicalTrigger: "Wyzwalacz dumy i siły charakteru",
        reason: "Uderza w najgłębszą potrzebę odzyskania pełnej sprawczości.",
      },
      {
        angle: "Bezlitosne Standardy",
        hook: "Your feelings are suggestions. Your standards are non-negotiable laws.",
        estimatedRetention: 94,
        psychologicalTrigger: "Rozdzielenie emocji od wykonawczego rygoru",
        reason: "Uwalnia od wymówki 'dzisiaj mi się nie chce'.",
      },
      {
        angle: "Koszt Wygody",
        hook: "Comfort is a slow poison disguised as peaceful safety.",
        estimatedRetention: 93,
        psychologicalTrigger: "Odsłonięcie ukrytego kosztu zaniechania",
        reason: "Zmusza do wyboru konstruktywnego cierpienia nad gnuśność.",
      },
      {
        angle: "Enigma Niewidzialnej Pracy",
        hook: "The strongest men in history had one rule they never spoke out loud.",
        estimatedRetention: 92,
        psychologicalTrigger: "Ciekawość tajemnicy i przynależność do elity",
        reason: "Zapewnia retencję powyżej 4 sekund w oczekiwaniu na ujawnienie sekretu.",
      },
      {
        angle: "Prawdziwa Cena Wolności",
        hook: "Total discipline is the only real gateway to absolute personal freedom.",
        estimatedRetention: 95,
        psychologicalTrigger: "Pozorny paradoks stoicki",
        reason: "Mózg musi przetworzyć zderzenie restrykcji z autonomią.",
      },
    ];

    const start = (batchIdx * count) % modernThemes.length;
    const picked = [];
    for (let i = 0; i < count; i++) {
      const item = modernThemes[(start + i) % modernThemes.length];
      picked.push({
        id: `hb-${timestamp}-${batchIdx}-${i + 1}`,
        angle: item.angle,
        hook: item.hook,
        estimatedRetention: item.estimatedRetention - (i % 3),
        psychologicalTrigger: item.psychologicalTrigger,
        reason: item.reason,
      });
    }
    return picked;
  };

  if (!ai) {
    return res.json({ battle: generateIntelligentFallbackBattles(cleanTopic, currentBatch) });
  }

  try {
    const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);
    const prompt = `Jesteś elitarnym dyrektorem kreatywnym i analitykiem wirusowości dla marki @stark_focus (współczesny brutalny stoicyzm, estetyka cichej dominacji, dark discipline).
Użytkownik wpisał temat lub prompt: "${cleanTopic}".
NUMER PARTII (BATCH): ${currentBatch}. ZIARNO: ${dynamicSeed}.

NAJWAŻNIEJSZE DYREKTYWY:
1. PEŁNA SWOBODA W GENEROWANIU WSPÓŁCZESNYCH REINTERPRETACJI:
Nie ograniczaj się do archaicznych gladiatorów czy cytatów z Marka Aureliusza. Łącz stoicki rygor z dzisiejszym światem: cyfrowy dopaminowy szum, smartfony niszczące uwagę, samotna praca w ciszy, algorytmy uzależnień, protokół 1%, kultura przeciętności, bezkompromisowe standardy, suwerenność umysłu.
2. NIEOGRANICZONA ILOŚĆ: Generuj całkowicie unikalne, niepowtarzające się pomysły.
3. JĘZYK: Wszystkie hooki ("hook") MUSZĄ być w 100% PO ANGIELSKU (krótkie, 6-12 słów, ostre jak brzytwa). Polskie mogą być tylko opisy psychologiczne ("angle", "psychologicalTrigger", "reason").
${excludeHooks.length > 0 ? `Unikaj powtarzania tych hooków: ${excludeHooks.slice(-10).join(" | ")}` : ""}

Stwórz DOKŁADNIE ${count} UNIKALNYCH, KONKURENCYJNYCH HOOKÓW (0-3 sekundy) w formacie JSON:
{
  "battle": [
    {
      "id": "hb-${currentBatch}-1",
      "angle": "Nazwa kąta psychologicznego",
      "hook": "Potężny, gramatyczny hook w 100% po angielsku",
      "estimatedRetention": 97,
      "psychologicalTrigger": "Wyzwalacz psychologiczny po polsku",
      "reason": "Dlaczego natychmiast zatrzymuje scroll w 500ms po polsku"
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.95 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (parsed?.battle && Array.isArray(parsed.battle) && parsed.battle.length > 0) {
      const validated = parsed.battle.map((b: any, idx: number) => ({
        id: b.id || `hb-${Date.now()}-${currentBatch}-${idx + 1}`,
        angle: b.angle || "Stoicki Pattern Interrupt",
        hook: String(b.hook || "Silence cannot be misquoted. Execute.")
          .replace(/["#*]/g, "")
          .trim(),
        estimatedRetention:
          typeof b.estimatedRetention === "number" ? b.estimatedRetention : 96 - (idx % 4) * 2,
        psychologicalTrigger:
          b.psychologicalTrigger || b.psychology || "Uderzenie w dumę i dyscyplinę",
        reason: b.reason || b.verdict || "Zatrzymuje scroll w pierwszych 800ms.",
      }));
      return res.json({ battle: validated });
    }

    return res.json({ battle: generateIntelligentFallbackBattles(cleanTopic, currentBatch) });
  } catch (err) {
    console.warn("Hook battle fallback triggered:", err);
    return res.json({ battle: generateIntelligentFallbackBattles(cleanTopic, currentBatch) });
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
    if (
      t.includes("mgła") ||
      t.includes("pustka") ||
      t.includes("cisza") ||
      t.includes("solitude")
    ) {
      return "Minimalist enigmatic horizon veiled in thick cold mist, pitch black negative space, faint distant light gradient, haunting cinematic atmosphere, 35mm film grain, moody shadows, strictly no text, no watermark";
    }
    return `Abstract minimalist enigmatic void inspired by ${theme}, razor-thin sliver of cold diffuse light cutting through pure pitch black darkness, moody deep chiaroscuro, matte obsidian textures, atmospheric volumetric smoke, ultra clean negative space, 8k vertical ${format}, strictly no text, no typography, no letters, no watermark`;
  };

  if (!ai || !clean) {
    return res.json({
      prompt: clean
        ? buildEnigmaticPrompt(clean)
        : "Ultra-minimalist pitch black void, razor-thin sharp ray of cold directional light cutting through dense cinematic fog, dark matte slate textures, haunting atmospheric mood, mysterious solitude, 8k vertical composition, strictly no text, no words, no letters, no watermark",
      mood: "Zagadkowy, minimalistyczny chiaroscuro",
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

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.8 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (parsed?.prompt) {
      return res.json(parsed);
    }
    return res.json({
      prompt: buildEnigmaticPrompt(clean),
      mood: "Mroczny, enigmatyczny minimalizm stoicki",
    });
  } catch {
    return res.json({
      prompt: buildEnigmaticPrompt(clean),
      mood: "Mroczny, enigmatyczny minimalizm stoicki",
    });
  }
});

// GENERATOR WARIANTÓW MENTORA (ANALIZA PROMPTU IN REAL TIME - UNLIMITED & FIXED SCHEMA)
app.post("/api/ai/generate-mentor-variants", async (req, res) => {
  const {
    topic = "Dyscyplina",
    format = "🎬 Rolka 7-Sekundowa (Short Reel)",
    count = 5,
    offset = 0,
    inspirations = [],
    excludeHooks = [],
  } = req.body || {};

  const cleanTopic = String(topic).trim() || "Dyscyplina i bezwzględne standardy";
  const ai = getGeminiClient();
  const currentBatch = Math.max(0, Number(offset) || 0);
  const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000) + currentBatch;

  const inspContext =
    Array.isArray(inspirations) && inspirations.length > 0
      ? `\nKONTEKST INSPIRACJI TWÓRCY:\n${inspirations
          .slice(0, 3)
          .map((i: any) => `- ${i.filename || i.title || ""}: ${i.notes || ""}`)
          .join("\n")}`
      : "";

  const buildSmartFallbackVariants = (rawTopic: string) => {
    const t = rawTopic.toLowerCase();
    const isOnePercent = t.includes("1%") || t.includes("protokół") || t.includes("protokol");
    const isMorning = t.includes("rano") || t.includes("wstaw") || t.includes("morning");

    const pool = [
      {
        hook: isOnePercent
          ? "You want top 1% results with bottom 99% discipline?"
          : isMorning
            ? "Touching your phone before 7:00 AM guarantees another mediocre day."
            : `Comfort in ${cleanTopic} is quietly ruining your potential.`,
        p1: "Every compromise you make in private is an invisible vote for failure.",
        p2: "The 1% never negotiate with their feelings; they execute standard-driven protocols.",
        p3: "When you eliminate the need for external validation, you gain absolute sovereignty.",
        directive: "Never negotiate with weakness. Standards over emotions.",
        notes: `Nowoczesna reinterpretacja dyscypliny dla tematu "${cleanTopic}"`,
      },
      {
        hook: isOnePercent
          ? "The top 1% isn't special. They are just obsessively cold."
          : isMorning
            ? "The snooze button is where weak men bury their self-respect."
            : "The silent price of temporary relief is permanent mediocrity.",
        p1: "Temporary relief is an expensive illusion paid for in future regret.",
        p2: "Suffer with intention in the dark so you never have to beg in the light.",
        p3: "Quiet consistency will outperform noisy bursts of motivation every single time.",
        directive: "Execute in silence. Let your results arrive like thunder.",
        notes: `Uderzenie w hipokryzję i koszt bezczynności dla "${cleanTopic}"`,
      },
      {
        hook: isOnePercent
          ? "Getting 1% better daily is useless if your foundation is rotten."
          : isMorning
            ? "While the world is asleep, silent empires are being built."
            : "If you cannot master yourself in silence, the world will master you in public.",
        p1: "Marcus Aurelius demanded self-rule before ruling an empire.",
        p2: "Your attention is your most precious capital—refuse to let algorithms steal it.",
        p3: "A disciplined mind is an unshakeable citadel against external chaos.",
        directive: "Guard your focus with your life. No compromises.",
        notes: `Autorytet stoicki i suwerenność uwagi dla "${cleanTopic}"`,
      },
      {
        hook: isOnePercent
          ? "Is 1% success worth destroying your entire social life?"
          : isMorning
            ? "Are you genuinely tired, or just addicted to comfortable decay?"
            : "99% of people fail because they demand applause before delivering results.",
        p1: "Applause is a cheap dopamine trap that slows down true momentum.",
        p2: "When you stop announcing your plans, your focus becomes razor sharp.",
        p3: "Real power is built in complete obscurity and verified in private.",
        directive: "Disappear and do the work. The noise can wait.",
        notes: `Przełamanie potrzeby poklasku i pochwała samotnej pracy dla "${cleanTopic}"`,
      },
      {
        hook: isOnePercent
          ? "Most men talk like the 1%, but fold under 1% pain."
          : isMorning
            ? "Nobody respects a man who negotiates with his alarm."
            : "The day you stop seeking sympathy is the day you become dangerous.",
        p1: "Sympathy from others will never pay for your unfulfilled potential.",
        p2: "Eliminate excuses before they have time to form an argument.",
        p3: "The standards you enforce when no one is watching determine your reality.",
        directive: "Lock in. Stay ruthless with your standards.",
        notes: `Brutalny test standardów osobistych dla "${cleanTopic}"`,
      },
    ];

    return pool.map((item, idx) => ({
      format,
      hook: item.hook,
      caption: formatStarkCaption(item.hook, [item.p1, item.p2, item.p3], item.directive),
      notes: item.notes,
    }));
  };

  if (!ai) {
    return res.json({ variants: buildSmartFallbackVariants(cleanTopic).slice(0, count) });
  }

  try {
    const prompt = `Jesteś elitarnym dyrektorem kreatywnym i autorem treści dla marki @stark_focus (współczesny brutalny stoicyzm, estetyka cichej dominacji, dark discipline, rygor 1%).

UŻYTKOWNIK WPISAŁ PROMPT/TEMAT: "${cleanTopic}".
FORMAT POSTA: "${format}".
NUMER PARTII (BATCH): ${currentBatch}. ZIARNO: ${dynamicSeed}.${inspContext}
${excludeHooks.length > 0 ? `Unikaj powtarzania: ${excludeHooks.slice(-8).join(" | ")}` : ""}

KRYTYCZNE ZASADY:
1. PEŁNA SWOBODA W NOWOCZESNYCH REINTERPRETACJACH: Łącz stoicki rygor z dzisiejszymi realiami: wojna o uwagę, algorytmy, dopaminowy szum, samotna praca w ciszy, eliminacja użalania się, standardy 1%.
2. NIEOGRANICZONE WARIANTY: Wygeneruj świeżą, unikalną partię pomysłów.
3. CAŁA TREŚĆ POSTA W 100% PO ANGIELSKU ("hook" oraz "caption"). Polskie mogą być tylko notatki psychologiczne ("notes").
4. ŚCIŚLE STAŁY SCHEMAT OPISU ("caption"):
[HOOK W ALL CAPS]

1. [Pierwsza brutalna zasada stoicka / analiza mechanizmu]
2. [Druga bezwzględna zasada wykonania w ciszy]
3. [Trzecia zasada eliminacji słabości]

[Krótka zasada bez negocjacji]

Save this reminder. Execute in silence. Follow @stark_focus.

#stoicism #darkdiscipline #discipline #mindset #focus #starkfocus

Stwórz ${count} UNIKALNYCH wariantów stoickich.
Zwróć WYŁĄCZNIE poprawny JSON:
{
  "variants": [
    {
      "format": "${format}",
      "hook": "Potężny hook w j. angielskim (maksymalnie 8-12 słów)",
      "caption": "Opis w ŚCIŚLE STAŁYM SCHEMACIE po angielsku z 3 punktami, dyrektywą i hashtagami",
      "notes": "Krótkie wyjaśnienie kąta psychologicznego po polsku"
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.92 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (parsed?.variants && Array.isArray(parsed.variants) && parsed.variants.length > 0) {
      const normalized = parsed.variants.map((v: any, idx: number) => {
        const cleanH = String(v.hook || "Execute in silence.")
          .replace(/["#*]/g, "")
          .trim();
        return {
          format: v.format || format,
          hook: cleanH,
          caption:
            v.caption ||
            formatStarkCaption(
              cleanH,
              [
                "Comfort is a slow poison disguised as peaceful safety.",
                "Private standards dictate public reality; never negotiate with mood.",
                "When you build in absolute silence, results announce your victory.",
              ],
              "Execute in silence. Never compromise with mediocrity.",
            ),
          notes: v.notes || `Analiza psychologiczna wariantu ${idx + 1} dla "${cleanTopic}"`,
        };
      });
      return res.json({ variants: normalized });
    }

    return res.json({ variants: buildSmartFallbackVariants(cleanTopic).slice(0, count) });
  } catch (err: any) {
    console.warn("Błąd generowania wariantów AI:", err?.message || err);
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
        bodyText: `Nobody is coming to save your potential. Every single compromise regarding ${t} is a vote for the person you despise becoming. Raise your minimum standard today.`,
        highlightWords: "compromise, standard, potential",
      },
      {
        headline: "KILL THE NEGOTIATION",
        bodyText:
          "Your brain will offer 10 rational excuses the second friction appears. Real discipline begins when you stop participating in that internal debate.",
        highlightWords: "excuses, discipline, debate",
      },
      {
        headline: "VOLUNTARY FRICTION",
        bodyText:
          "Comfort is slow poison. When you willingly choose the difficult path, external chaos and fatigue lose all leverage over your mind.",
        highlightWords: "friction, leverage, poison",
      },
      {
        headline: "THE SOLITUDE ADVANTAGE",
        bodyText:
          "Weak men broadcast their intentions for cheap applause. Dangerous men work in absolute silence and let undeniable results make the noise.",
        highlightWords: "silence, results, dangerous",
      },
      {
        headline: "THE FINAL TEST",
        bodyText:
          "Save this reminder. Never negotiate with your weakness. The world is full of talkers—be the one who executes in the dark.",
        highlightWords: "reminder, weakness, executes",
      },
    ];

    return {
      name: themeTitle,
      slides: library.slice(0, count).map((s, idx) => ({
        slideNumber: idx + 1,
        headline: s.headline,
        bodyText: s.bodyText,
        highlightWords: s.highlightWords,
      })),
    };
  };

  if (!ai) {
    return res.json({ template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
  }

  try {
    const prompt = `Jesteś elitarnym twórcą viralowych, mrocznych, stoickich karuzeli na Instagram i TikTok dla marki STARK FOCUS (@stark_focus).
Temat karuzeli wpisany przez twórcę: "${cleanTopic}".
Liczba slajdów do wygenerowania: ${targetCount} (dokładnie 4-5 slajdów zgodnie ze standardem platformy).

Stwórz dopracowaną serię slajdów karuzeli w języku angielskim (STRICTLY IN ENGLISH).
Wymogi strukturalne:
1. Slajd 1 (HOOK): Brutalny, przyciągający uwagę magnetyczny nagłówek (Pattern Interrupt) - uderzający w dumę, hipokryzję lub koszt ulegania słabości w kontekście "${cleanTopic}".
2. Slajdy 2 do ${targetCount - 1} (ZASADY): Bezwzględne, konkretne zasady stoickie rozwijające temat. Zwięzłe, uderzające prosto w sedno, łatwe do przyswojenia w 3-4 sekundy.
3. Ostatni slajd (PODSUMOWANIE + CTA): Mocne, jednodaniowe podsumowanie lekcji + bezpośrednie wezwanie do zapisu posta ("Save this reminder...").
4. "headline": 2-4 mocne słowa ALL CAPS (np. "THE SILENT CONTRACT", "KILL THE NEGOTIATION").
5. "bodyText": Zwięzłe, rytmiczne 1-2 zdania po angielsku (maksymalnie 14-24 słowa). Tekst nie może być ścianą tekstu – czytelnik musi go przeczytać w mgnieniu oka na telefonie.
6. "highlightWords": 2-4 najważniejsze słowa kluczowe ze slajdu rozdzielone przecinkiem (będą wyróżnione na ciemny karmazynowy/czerwony akcent marki).

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "template": {
    "name": "Tytuł serii po angielsku",
    "slides": [
      {
        "slideNumber": 1,
        "headline": "THE COLD REALITY",
        "bodyText": "Treść po angielsku...",
        "highlightWords": "cold, reality, standard"
      }
    ]
  }
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.85 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (
      parsed?.template?.slides &&
      Array.isArray(parsed.template.slides) &&
      parsed.template.slides.length > 0
    ) {
      return res.json({ template: parsed.template });
    }

    return res.json({ template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
  } catch (err: any) {
    console.warn(
      "Błąd generowania karuzeli AI, użyto dynamicznego fallbacku:",
      err?.message || err,
    );
    return res.json({ template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
  }
});

// GENERATOR TREŚCI DLA POJEDYNCZEGO SLAJDU KARUZELI
app.post("/api/ai/generate-single-slide", async (req, res) => {
  const {
    topic = "",
    slideIndex = 0,
    totalSlides = 5,
    existingHeadline = "",
    existingBody = "",
    slideType = "principle", // "hook" | "principle" | "cta"
  } = req.body || {};

  const cleanTopic = String(topic).trim() || "Stoic Discipline & Ruthless Focus";
  const ai = getGeminiClient();

  const isHook = slideIndex === 0 || slideType === "hook";
  const isCta = slideIndex === totalSlides - 1 || slideType === "cta";

  const fallbackData = isHook
    ? {
        headline: "THE SILENT CONTRACT",
        bodyText:
          "You don't lack motivation. You lack non-negotiable standards that you honor in silence.",
        highlightWords: "standards, silence, honor",
      }
    : isCta
      ? {
          headline: "THE UNFORGIVING TRUTH",
          bodyText:
            "Save this reminder. Never negotiate with your morning feelings. Execute in the dark.",
          highlightWords: "reminder, feelings, execute",
        }
      : {
          headline: "KILL THE NEGOTIATION",
          bodyText:
            "Every compromise in private whispers to your subconscious that your word is worth nothing.",
          highlightWords: "compromise, subconscious, nothing",
        };

  if (!ai) {
    return res.json({ slide: fallbackData });
  }

  try {
    const rolePrompt = isHook
      ? `Stwórz magnetyczny, brutalny slajd 1 (HOOK / PATTERN INTERRUPT) dla karuzeli na temat: "${cleanTopic}".
Nagłówek (headline) musi mieć 2-4 słowa ALL CAPS uderzające w dumę lub koszt ulegania słabości.
Treść (bodyText) to 1-2 rytmiczne, uderzające zdania po angielsku (maks. 18-24 słowa).`
      : isCta
        ? `Stwórz mocny finałowy slajd (PODSUMOWANIE + CTA) dla karuzeli na temat: "${cleanTopic}".
Nagłówek (headline) ma 2-4 słowa ALL CAPS.
Treść (bodyText) to bezwzględna prawda + wezwanie do zapisu posta ("Save this reminder..."). Maks. 18-24 słowa po angielsku.`
        : `Stwórz konkretną, bezkompromisową zasadę stoicką (slajd #${slideIndex + 1} z ${totalSlides}) dla karuzeli na temat: "${cleanTopic}".
${existingHeadline ? `Dotychczasowy kontekst/nagłówek: "${existingHeadline}".` : ""}
Nagłówek (headline) to 2-4 słowa ALL CAPS.
Treść (bodyText) to 1-2 zwięzłe zdania po angielsku (maks. 16-22 słowa).`;

    const prompt = `Jesteś autorem viralowych, mrocznych stoickich karuzeli dla konta @stark_focus.
${rolePrompt}
Wszystko w 100% po angielsku (STRICTLY ENGLISH).

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "headline": "NAGŁÓWEK 2-4 SŁOWA ALL CAPS",
  "bodyText": "1-2 zwięzłe zdania po angielsku",
  "highlightWords": "2-3 najważniejsze słowa rozdzielone przecinkiem"
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.88 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (parsed?.headline && parsed?.bodyText) {
      return res.json({
        slide: {
          headline: parsed.headline.toUpperCase(),
          bodyText: parsed.bodyText,
          highlightWords: parsed.highlightWords || "",
        },
      });
    }

    return res.json({ slide: fallbackData });
  } catch (err: any) {
    console.warn("Błąd generowania pojedynczego slajdu:", err?.message || err);
    return res.json({ slide: fallbackData });
  }
});

// 1. RADAR TRENDÓW & FORMATÓW WIRALOWYCH (TikTok / Reels Scraper Patterns)
app.post("/api/ai/viral-format-radar", async (req, res) => {
  const { niche = "stoic discipline and ruthless focus" } = req.body || {};
  const ai = getGeminiClient();

  const fallbackFormats = [
    {
      formatKey: "harsh_truth",
      formatName: "The Harsh Truth Formula",
      hook: "The harsh truth about why you're still undisciplined.",
      phrases: [
        "The harsh truth about why you're still undisciplined.",
        "You wait for emotion before you take action.",
        "The stoic executes regardless of mood.",
      ],
      suggestedTheme: "obsidian_void",
      rationale:
        "Wywołuje natychmiastowe zatrzymanie uwagi przez uderzenie w dumę i bezpośrednią konfrontację.",
    },
    {
      formatKey: "why_99_fail",
      formatName: "The 99% Failure Asymmetry",
      hook: "Why 99% fail to maintain monk mode.",
      phrases: [
        "Why 99% fail to maintain monk mode.",
        "They announce their plans before the habit is forged.",
        "Silence is the fuel of genuine transformation.",
      ],
      suggestedTheme: "carbon_aura",
      rationale:
        "Segmentuje widza ponad przeciętną większość i wzbudza potrzebę udowodnienia swojej odporności.",
    },
    {
      formatKey: "delusion_trap",
      formatName: "The Comfortable Delusion",
      hook: "The 4:00 AM delusion that keeps you average.",
      phrases: [
        "The 4:00 AM delusion that keeps you average.",
        "Waking up early is useless if your mind remains distracted.",
        "Focus on depth, not the clock.",
      ],
      suggestedTheme: "silver_mist",
      rationale: "Burzy powszechny mit samorozwojowy i dostarcza głębszego aksjomatu stoickiego.",
    },
    {
      formatKey: "silent_killers",
      formatName: "The Silent Saboteur",
      hook: "3 silent killers of your dopamine baseline.",
      phrases: [
        "3 silent killers of your dopamine baseline.",
        "Morning scrolling. Unearned praise. Constant notifications.",
        "Starve the cheap inputs. Reclaim the citadel.",
      ],
      suggestedTheme: "emerald_abyss",
      rationale:
        "Opiera się o neurobiologię i strach przed cichą utratą kontroli nad własnym potencjałem.",
    },
  ];

  if (!ai) {
    return res.json({ formats: fallbackFormats });
  }

  try {
    const prompt = `Jesteś ekspertem wirusowych struktur psychologicznych krótkich form wideo dla konta @stark_focus.
Wygeneruj 4 potężne, niepowtarzalne formaty wiralowe dopasowane do tematu: "${niche}".
Każdy format musi mieć:
- formatKey: krótki identyfikator
- formatName: nazwa psychologicznego wzorca (np. "The Harsh Truth", "The 99% Failure Paradox", "The Dopamine Saboteur", "The Silent Cost")
- hook: bezwzględny hook 0-3s po angielsku ALL CAPS lub Sentence Case
- phrases: dokładnie 3 fazy [Hook, Bolesny Kontrast, Puenta Climax]
- suggestedTheme: jeden z: "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist"
- rationale: 1 zdanie wyjaśniające psychologię retencji widza

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "formats": [
    {
      "formatKey": "string",
      "formatName": "string",
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "suggestedTheme": "obsidian_void",
      "rationale": "string"
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.85 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (Array.isArray(parsed?.formats) && parsed.formats.length > 0) {
      return res.json({ formats: parsed.formats });
    }
    return res.json({ formats: fallbackFormats });
  } catch (err) {
    console.warn("Błąd viral-format-radar:", err);
    return res.json({ formats: fallbackFormats });
  }
});

// 2. MATRYCA KĄTÓW PSYCHOLOGICZNYCH (Angle Matrix)
app.post("/api/ai/angle-matrix", async (req, res) => {
  const { topic = "Discipline and fighting procrastination" } = req.body || {};
  const ai = getGeminiClient();

  const fallbackAngles = [
    {
      angleId: "controversial",
      angleName: "⚡ Provocation & Controversy",
      hook: "Motivation is an excuse invented by the weak.",
      phrases: [
        "Motivation is an excuse invented by the weak.",
        "Waiting to 'feel ready' is comfortable self-sabotage.",
        "The professional moves before the brain can argue.",
      ],
      caption:
        "Stop waiting for inspiration. It never arrives for spectators. Execute in silence.\n\n#stoicism #discipline #starkfocus",
      rationale: "Breaks the comforting mainstream narrative and immediately polarizes the viewer.",
    },
    {
      angleId: "roman_stoic",
      angleName: "🏛️ Roman Stoicism (Marcus Aurelius)",
      hook: "You have power over your mind, not outside events.",
      phrases: [
        "You have power over your mind, not outside events.",
        "Realize this, and you will find unbreakable strength.",
        "Return to the citadel within.",
      ],
      caption:
        "External chaos only rules you if you grant it permission. Master yourself first.\n\n#stoic #marcusaurelius #innercitadel",
      rationale: "Draws from 2,000 years of imperial stoic sovereignty and emotional fortitude.",
    },
    {
      angleId: "neurobiology",
      angleName: "🧠 Neurobiology & Dopamine Circuitry",
      hook: "Resistance is your anterior mid-cingulate cortex growing.",
      phrases: [
        "Resistance is your anterior mid-cingulate cortex growing.",
        "Every time you force execution, your brain physically changes.",
        "Lean into the friction.",
      ],
      caption:
        "Willpower is not an abstract concept. It is a biological circuit forged by voluntary friction.\n\n#neuroscience #dopamine #deepwork",
      rationale:
        "Grounds the pain of discipline in hard biological science, eliminating intellectual doubt.",
    },
    {
      angleId: "reality_check",
      angleName: "🎯 Zero-Empathy Reality Check",
      hook: "Nobody is coming to save your potential.",
      phrases: [
        "Nobody is coming to save your potential.",
        "The world does not care about your good intentions.",
        "Deliver results or remain forgotten.",
      ],
      caption:
        "Excuses comfort you today and starve you tomorrow. Never negotiate with your standard.\n\n#hardtruth #standards #noexcuses",
      rationale:
        "Relentless confrontation that instantly strips away comforting excuses and self-pity.",
    },
  ];

  if (!ai) {
    return res.json({ angles: fallbackAngles });
  }

  try {
    const prompt = `You are the lead content strategist and cognitive psychologist for @stark_focus.
Deconstruct the topic: "${topic}" into 4 distinct psychological angles:
1. Provocation / Controversy (striking at popular cognitive consensus)
2. Roman Stoicism (asceticism, memento mori, unwavering sovereignty)
3. Neurobiology & Dopamine (the concrete biological anatomy of friction and willpower)
4. Zero-Empathy Reality Check (unforgiving confrontation with reality)

For each angle provide:
- angleId: "controversial" | "roman_stoic" | "neurobiology" | "reality_check"
- angleName: name in English with an icon
- hook: magnetic 0-3s hook in English (Sentence Case or ALL CAPS)
- phrases: exactly 3 phrases in English [Hook, Contrast, Climax]
- caption: 2 sentences of profound stoic caption in English + relevant hashtags
- rationale: 1 sharp sentence in English explaining why this angle captures audience attention

CRITICAL: ALL FIELDS MUST BE GENERATED IN ENGLISH ONLY.

Return ONLY valid JSON:
{
  "angles": [
    {
      "angleId": "string",
      "angleName": "string",
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "caption": "string",
      "rationale": "string"
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.82 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (Array.isArray(parsed?.angles) && parsed.angles.length === 4) {
      return res.json({ angles: parsed.angles });
    }
    return res.json({ angles: fallbackAngles });
  } catch (err) {
    console.warn("Błąd angle-matrix:", err);
    return res.json({ angles: fallbackAngles });
  }
});

// 3. GENERATOR SPRZECZNOŚCI I PARADOKSÓW (Cognitive Friction Generator)
app.post("/api/ai/cognitive-friction", async (req, res) => {
  const { topic = "discipline, success and solitude" } = req.body || {};
  const ai = getGeminiClient();

  const fallbackParadoxes = [
    {
      title: "The Solitude Acceleration",
      hook: "The more people you cut out, the faster your empire grows.",
      explanation:
        "Every loose social obligation drains the cognitive bandwidth required for absolute mastery.",
      phrases: [
        "The more people you cut out,",
        "the faster your empire grows.",
        "Silence is the ultimate compound interest.",
      ],
    },
    {
      title: "The Restlessness of Comfort",
      hook: "Comfort is the quietest form of self-annihilation.",
      explanation:
        "Absence of resistance physically atrophies prefrontal resilience and creates phantom anxiety.",
      phrases: [
        "Comfort is the quietest form of self-annihilation.",
        "The body adapts to ease by creating imaginary anxiety.",
        "Choose hard tension.",
      ],
    },
    {
      title: "The Loudness of Silence",
      hook: "The man who speaks least controls the entire room.",
      explanation: "Unspoken words create information asymmetry and command effortless authority.",
      phrases: [
        "The man who speaks least controls the entire room.",
        "Noise confesses insecurity.",
        "Silence commands respect.",
      ],
    },
    {
      title: "The Laziness of Overwork",
      hook: "Working 16 hours a day is often disguised laziness.",
      explanation:
        "Hectic busyness is the most convenient shelter to dodge the single painful, critical decision.",
      phrases: [
        "Working 16 hours a day is often disguised laziness.",
        "Exhaustion is not accomplishment.",
        "Execute the one thing you are avoiding.",
      ],
    },
  ];

  if (!ai) {
    return res.json({ paradoxes: fallbackParadoxes });
  }

  try {
    const prompt = `You are a master of cognitive friction and psychological paradoxes for @stark_focus.
Generate 4 profound, scroll-stopping cognitive contradictions (Cognitive Friction) on the topic: "${topic}".
The viewer must feel a sudden halt in their scrolling speed and a compelling urge to re-read.
CRITICAL: ALL titles, hooks, phrases, and explanations MUST BE 100% IN ENGLISH.

Return ONLY valid JSON:
{
  "paradoxes": [
    {
      "title": "string in English",
      "hook": "string in English",
      "explanation": "string in English explaining the counter-intuitive truth",
      "phrases": ["string", "string", "string"]
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.9 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (Array.isArray(parsed?.paradoxes) && parsed.paradoxes.length > 0) {
      return res.json({ paradoxes: parsed.paradoxes });
    }
    return res.json({ paradoxes: fallbackParadoxes });
  } catch (err) {
    console.warn("Błąd cognitive-friction:", err);
    return res.json({ paradoxes: fallbackParadoxes });
  }
});

// 4. KLONOWANIE & REMIKSOWANIE NAJLEPSZYCH TREŚCI (Evergreen Recycler - URL & Text)
app.post("/api/ai/evergreen-recycle", async (req, res) => {
  const { sourceText = "" } = req.body || {};
  const cleanInput = String(sourceText).trim() || "Discipline is not motivation, it is identity.";
  const ai = getGeminiClient();

  const isUrl = /^(https?:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/)/i.test(cleanInput);

  const fallbackRecycled = {
    reel: {
      hook: "Your identity is a reflection of what you tolerate.",
      phrases: [
        "Your identity is a reflection of what you tolerate.",
        "Stop waiting for emotional alignment.",
        "Execute without permission.",
      ],
      duration: 8,
      suggestedTheme: "obsidian_void",
    },
    carousel: {
      title: "THE ANATOMY OF STANDARDS",
      slides: [
        {
          headline: "THE SILENT CONTRACT",
          bodyText: "You become what you tolerate in private when nobody is watching.",
          highlightWords: "tolerate, private, watching",
        },
        {
          headline: "MOTIVATION IS CHEAP",
          bodyText: "Amateurs depend on enthusiasm. Professionals obey cold protocol.",
          highlightWords: "enthusiasm, protocol",
        },
        {
          headline: "THE COMPOUND EFFECT",
          bodyText: "One broken promise to yourself destroys subconscious trust for weeks.",
          highlightWords: "promise, subconscious, trust",
        },
        {
          headline: "THE MONK SHIFT",
          bodyText: "Silence your complaints. Let the accumulated volume of work speak.",
          highlightWords: "complaints, accumulated, work",
        },
        {
          headline: "THE UNFORGIVING STANDARD",
          bodyText: "Save this reminder. Never negotiate with your standards.",
          highlightWords: "reminder, negotiate, standards",
        },
      ],
    },
    manifesto: "Never compromise in private if you expect to command respect in public.",
    caption:
      "Stop negotiating with your morning mood. Standards automate what emotion destroys.\n\nSave this reminder. Execute in silence. Follow @stark_focus.\n\n#stoicism #discipline #mindset #starkfocus",
  };

  if (!ai) {
    return res.json(fallbackRecycled);
  }

  try {
    const contextInstruction = isUrl
      ? `The user provided a DIRECT LINK to a social media post, Reel, TikTok, or YouTube Short:
"${cleanInput}"
Analyze this URL, extract the underlying psychological hook, virality mechanism, and core theme from it, and translate that winning premise into the brutal dark stoic identity of @stark_focus.`
      : `Take this raw input or thought from the user:
"${cleanInput}"`;

    const prompt = `You are the elite content editor and strategist for @stark_focus (brutal stoicism, dark minimalism, relentless discipline).
${contextInstruction}

Remix it immediately into 4 ready-to-publish STARK formats:
1. reel: video hook 0-3s, 3 precise phrases in English, suggestedTheme: "obsidian_void"|"carbon_aura"|"crimson_eclipse"
2. carousel: 5-slide carousel in English (headline: 2-4 words ALL CAPS, bodyText: 1-2 concise sentences, highlightWords)
3. manifesto (Stoic Manifesto): 1 uncompromising, razor-sharp stoic sentence summarizing the core truth — MUST BE IN ENGLISH ONLY!
4. caption (Ready Post Caption): complete Instagram caption with strong hooks, brutal wisdom, CTA ("Save this reminder. Follow @stark_focus.") and relevant hashtags — MUST BE IN ENGLISH ONLY!

CRITICAL MANDATE:
Regardless of whether the input was in Polish, English, a URL, or any other format, ALL fields including "manifesto" and "caption" MUST ALWAYS BE GENERATED IN ENGLISH. Do NOT output Polish for manifesto or caption.

Return ONLY valid JSON matching this schema:
{
  "reel": {
    "hook": "string in English",
    "phrases": ["string in English", "string in English", "string in English"],
    "duration": 8,
    "suggestedTheme": "obsidian_void"
  },
  "carousel": {
    "title": "string in English",
    "slides": [
      { "headline": "string in English", "bodyText": "string in English", "highlightWords": "string in English" }
    ]
  },
  "manifesto": "string in English ONLY",
  "caption": "string in English ONLY"
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.8 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (parsed?.reel && parsed?.carousel) {
      return res.json(parsed);
    }
    return res.json(fallbackRecycled);
  } catch (err) {
    console.warn("Błąd evergreen-recycle:", err);
    return res.json(fallbackRecycled);
  }
});

// 5. 1-CLICK MULTI-VARIANT VIDEO GENERATOR (A/B Test Factory)
app.post("/api/ai/generate-multi-variant-reels", async (req, res) => {
  const { topic = "Solitude and relentless standards" } = req.body || {};
  const ai = getGeminiClient();

  const fallbackVariants = [
    {
      variantLetter: "A",
      variantName: "⚡ Wariant A: Bezpośrednia Konfrontacja",
      hook: "You don't lack time. You lack standards.",
      phrases: [
        "You don't lack time. You lack standards.",
        "You give 6 hours to noise, then cry about your fatigue.",
        "Starve the distraction.",
      ],
      theme: "obsidian_void",
      brollSuggestion: "deszcz_asfalt_430am",
      duration: 8,
    },
    {
      variantLetter: "B",
      variantName: "🏛️ Wariant B: Rzymski Aksjomat Stoicki",
      hook: "Marcus Aurelius never asked for motivation.",
      phrases: [
        "Marcus Aurelius never asked for motivation.",
        "He understood that duty does not wait for enthusiasm.",
        "Be the mountain.",
      ],
      theme: "silver_mist",
      brollSuggestion: "antyczny_marmur_posag",
      duration: 9,
    },
    {
      variantLetter: "C",
      variantName: "⚡ Wariant C: Paradoks Cichej Władzy",
      hook: "The dangerous man speaks with results, never promises.",
      phrases: [
        "The dangerous man speaks with results, never promises.",
        "Words borrow credit before the work is done.",
        "Build in total darkness.",
      ],
      theme: "carbon_aura",
      brollSuggestion: "brutalizm_monolit",
      duration: 8,
    },
  ];

  if (!ai) {
    return res.json({ variants: fallbackVariants });
  }

  try {
    const prompt = `Jesteś reżyserem wideo krótkich form dla konta @stark_focus.
Dla tematu: "${topic}" wygeneruj 3 skrajnie różne warianty testowe A/B/C tej samej rolki:
- Wariant A: Bezpośrednia konfrontacja (Direct Confrontation)
- Wariant B: Rzymski aksjomat stoicki (Imperial Stoic)
- Wariant C: Paradoks cichej władzy / tajemnicy (Silent Power Paradox)

Dla każdego wariantu podaj:
- variantLetter: "A" | "B" | "C"
- variantName: nazwa wariantu po polsku
- hook: bezwzględny hook 0-3s po angielsku
- phrases: dokładnie 3 frazy po angielsku [Hook, Kontrast, Climax]
- theme: jeden z: "obsidian_void" | "crimson_eclipse" | "silver_mist" | "carbon_aura" | "emerald_abyss"
- brollSuggestion: jedno z: "antyczny_marmur_posag" | "nocna_metropolia_stal" | "brutalizm_monolit" | "deszcz_asfalt_430am" | "ciemna_sala_asceza" | "mgla_horyzont_pustka"
- duration: liczba sekund (7, 8 lub 9)

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "variants": [
    {
      "variantLetter": "A",
      "variantName": "string",
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "theme": "obsidian_void",
      "brollSuggestion": "deszcz_asfalt_430am",
      "duration": 8
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.85 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (Array.isArray(parsed?.variants) && parsed.variants.length === 3) {
      return res.json({ variants: parsed.variants });
    }
    return res.json({ variants: fallbackVariants });
  } catch (err) {
    console.warn("Błąd multi-variant-reels:", err);
    return res.json({ variants: fallbackVariants });
  }
});

// 6. BATCH GENERATOR (Mass High-Variance Posts Engine - 9:16 Cytat na Czerni)
app.post("/api/ai/batch-generator", async (req, res) => {
  const { topic = "stoic discipline, silence, and standards", count = 10 } = req.body || {};
  const ai = getGeminiClient();

  const PILLARS = [
    {
      id: "silence",
      name: "The Silence Paradox",
      hook: "Never announce your moves to spectators.",
      sub: "let undeniable results speak.",
    },
    {
      id: "voluntary_friction",
      name: "Voluntary Friction",
      hook: "Comfort is slow poison disguised as peace.",
      sub: "seek the hard road daily.",
    },
    {
      id: "dopamine_citadel",
      name: "The Dopamine Citadel",
      hook: "Starve the distraction.",
      sub: "feed the standard.",
    },
    {
      id: "monkish_protocol",
      name: "The Monkish Protocol",
      hook: "Disappear for 6 months in private.",
      sub: "reappear undeniable.",
    },
    {
      id: "unnegotiated_standard",
      name: "The Unnegotiated Standard",
      hook: "Your feelings are irrelevant to your duty.",
      sub: "standards over mood.",
    },
    {
      id: "solitude_sovereignty",
      name: "The Solitude Sovereign",
      hook: "Master the art of being alone.",
      sub: "without feeling empty.",
    },
    {
      id: "volition_boundary",
      name: "The Volition Boundary",
      hook: "Care nothing about opinions outside your control.",
      sub: "guard your perception.",
    },
    {
      id: "sovereign_king",
      name: "Sovereign Mindset",
      hook: "Walk like a king, or walk like you don't care who the king is.",
      sub: "",
    },
    {
      id: "uninspired_truth",
      name: "The Uninspired Reality",
      hook: "You are not tired. You are uninspired.",
      sub: "by a life you didn't choose.",
    },
    {
      id: "need_shift",
      name: "The Power Shift",
      hook: "Notice how they treat you when you no longer need them.",
      sub: "",
    },
    {
      id: "past_version",
      name: "The Dead Past",
      hook: "The version of you they remember no longer exists.",
      sub: "stop apologizing for outgrowing people.",
    },
    {
      id: "chaos_market",
      name: "The Market of Chaos",
      hook: "If you don't build your peace, someone sells you their chaos.",
      sub: "",
    },
    {
      id: "debt_of_compromise",
      name: "The Debt of Compromise",
      hook: "Excuses destroy self-respect.",
      sub: "never negotiate.",
    },
    {
      id: "elimination_half_measures",
      name: "The Elimination of Half-Measures",
      hook: "Commit with total finality.",
      sub: "or do not begin.",
    },
    {
      id: "accumulated_work",
      name: "The Proof of Accumulated Work",
      hook: "Silence cannot be misquoted.",
      sub: "",
    },
  ];

  const fallbackBatch = PILLARS.map((p, idx) => ({
    id: `batch-post-${idx + 1}-${Date.now()}`,
    pillar: p.name,
    pillarId: p.id,
    sayingMain: p.hook,
    sayingSub: p.sub,
    caption: `${p.hook.toUpperCase()}\n\n1. Hold your standards without debate.\n2. Execute especially in private.\n3. Reclaim your sovereignty.\n\nSave this reminder. Follow @stark_focus.\n\n#stoicism #discipline #mindset #focus #starkfocus`,
    template: "none_solid" as const,
    fontColor: "white" as const,
  }));

  if (!ai) {
    return res.json({ posts: fallbackBatch });
  }

  try {
    const prompt = `You are the lead viral copywriter for @stark_focus (dark psychology, realistic discipline, focus, high standards, black background format 9:16).
Topic or niche focus: "${topic}".

Generate EXACTLY ${count} completely UNIQUE, high-variance posts in ENGLISH.

CRITICAL ANTI-AI-SLOP & TONE RULES:
- BAN POMPOUS, ARCHAIC BUZZWORDS: Do NOT use "citadel", "sovereign", "bastion", "monolith", "throne", "decree", "gladiators".
- REALISTIC & LIFE-IMPACTING (Życiowe uderzenie): Ground every line in real psychological observations, modern friction, distractions, self-respect, exhaustion, quiet consistency, and interpersonal boundaries.
- NATURAL SENTENCE CASING ONLY: Capitalize only the first letter. Never use all-caps.
- NO ARTIFICIAL HIGHLIGHTS: No asterisks or special markdown.

CRITICAL FORMAT RULES:
1. Pure brutal minimalism: Quotes must NEVER be long paragraphs or multi-line blocks.
2. Direct, thought-provoking & audience-facing: Address the reader/viewer directly in 2nd person ("you", "your").
   Examples of perfect grounded tone:
   - "Notice how people treat you when you no longer need them."
   - "You are not tired. You are uninspired by a life you didn't choose."
   - "The version of you they remember no longer exists."
   - "If you don't build your peace, someone will sell you their chaos."
   - "Silence cannot be misquoted."
   - "You lose self-respect in small compromises nobody else sees."
3. Format choice per post:
   - OPTION A: Exactly ONE punchy line on the entire screen (strictly 3 to 7 words total). In this case, "sayingSub" MUST be empty string ("").
   - OPTION B: Exactly TWO ultra-short lines (strictly 1 single short line for "sayingMain" of 2-5 words, and strictly 1 single short line for "sayingSub" of 2-5 words, e.g. sayingMain: "Keep quiet.", sayingSub: "until it is done.").
4. Under no circumstances produce multi-sentence or wrapped long text.
5. caption: Complete formatted Instagram caption in English with 3 bullet protocols and hashtags (#stoicism, #discipline, #focus, #starkfocus).
6. NEVER use black font. All posts use pure white font on pitch black background.

Return ONLY valid JSON:
{
  "posts": [
    {
      "pillar": "string",
      "sayingMain": "string (strictly 3-7 words, 1 line)",
      "sayingSub": "string (empty string OR strictly 2-5 words, 1 line)",
      "caption": "string"
    }
  ]
}`;

    const response = await callGeminiWithFallback(ai, {
      contents: prompt,
      config: { temperature: 0.95 },
    });

    const parsed = safeJsonParse(response.text || "");
    if (Array.isArray(parsed?.posts) && parsed.posts.length > 0) {
      const enriched = parsed.posts.map((item: any, idx: number) => ({
        id: `batch-${Date.now()}-${idx + 1}`,
        pillar: item.pillar || `Principle ${idx + 1}`,
        sayingMain:
          item.sayingMain || item.hook || fallbackBatch[idx % fallbackBatch.length].sayingMain,
        sayingSub:
          item.sayingSub || item.sub || fallbackBatch[idx % fallbackBatch.length].sayingSub,
        caption: item.caption || fallbackBatch[idx % fallbackBatch.length].caption,
        template: "none_solid",
        fontColor: "white",
      }));
      return res.json({ posts: enriched });
    }

    return res.json({ posts: fallbackBatch });
  } catch (err) {
    console.warn("Błąd batch-generator:", err);
    return res.json({ posts: fallbackBatch });
  }
});

// GENERATOR GRAFIK SCHEMATU
app.post("/api/ai/generate-scheme-post", async (req, res) => {
  res.json({
    hook: "STAY RUTHLESS WITH YOUR STANDARDS.",
    highlightWords: ["RUTHLESS", "STANDARDS"],
    punchline: "NEVER NEGOTIATE WITH WEAKNESS.",
    caption:
      "Stay ruthless with your standards.\n\nNever negotiate with your weakness.\n\n#stoicism #discipline #starkfocus",
  });
});

// GHOSTWRITE (STUDIO WIDEO - Automontażysta Łamiący Algorytmy & Pętle Retencji)
app.post("/api/ghostwrite", async (req, res) => {
  const {
    topic = "Thought-provoking stoic sovereignty, ruthless discipline, high-agency truth",
    format = "viral_loop_6s",
    category = "all",
    excludeTitles = [],
  } = req.body || {};

  // Import matrycy zapasowej dla 100% gwarancji niepowtarzalności nawet przy offline / limitach quota
  const { getRandomUniqueFormula } = await import("../data/ideaMatrix");

  const isLoop6s = format === "viral_loop_6s" || format === "single_quote";
  const isHookPayoff5s =
    format === "hook_payoff_5s" || format === "two_phases" || format === "dynamic_broll_cut";
  const isThreePhases = format === "three_phases";

  const targetFormat = isLoop6s
    ? "single_quote"
    : isHookPayoff5s
      ? "two_phases"
      : isThreePhases
        ? "three_phases"
        : "four_phrases";

  const count = isLoop6s ? 1 : isHookPayoff5s ? 2 : isThreePhases ? 3 : 4;
  const suggestedDuration = isLoop6s ? 6 : isHookPayoff5s ? 5 : isThreePhases ? 9 : 11;

  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are the lead viral video director for @stark_focus (dark psychology, realistic discipline, stoic focus, high agency, emotional resilience).
Your goal is to CRAFT REALISTIC, LIFE-IMPACTING CONTENT THAT BREAKS THE INSTAGRAM/TIKTOK ALGORITHM (targeting 180%-250% average watch time through hypnotic loops & caption retention).

FORMAT: "${format}" (Requires exactly ${count} phrase(s)).
TOPIC / ANGLE: ${topic}
CATEGORY: ${category}

CRITICAL ANTI-AI-SLOP & TONE RULES:
- BAN POMPOUS, OVERUSED ARCHAIC BUZZWORDS: Do NOT use pretentious or theatrical words like "citadel", "sovereign", "bastion", "monolith", "throne", "decree", "empire", "gladiators".
- REALISTIC & LIFE-IMPACTING (Mocne, życiowe uderzenie): Ground every insight in real psychological friction, daily human struggles, modern distractions, self-respect, exhaustion, quiet consistency, and interpersonal boundaries.
- NATURAL SENTENCE CASING ONLY: Capitalize only the first letter of sentences and proper nouns (e.g. "Notice how people treat you...", NOT "NOTICE HOW PEOPLE TREAT YOU..."). No weird casing tricks.
- NO ARTIFICIAL WORD EMPHASIS: Do NOT highlight words or wrap words in asterisks like *this*. Output clean, pure text.
- STRICTLY 100% IN ENGLISH FOR ALL RETURNED TEXT.

CRITICAL RULES FOR PHRASES:
${
  isLoop6s
    ? `- EXACTLY 1 SINGLE HARD-HITTING, THOUGHT-PROVOKING LINE ON SCREEN (strictly 5 to 11 words).
- Natural sentence casing. Must hit like a wake-up call to anyone scrolling in bed or procrastinating.
- Examples of the exact tone:
  * "Notice how people treat you when you no longer need them."
  * "You are not tired. You are uninspired by a life you didn't choose."
  * "The version of you they remember no longer exists."
  * "If you don't build your own peace, someone will sell you their chaos."
  * "Never let someone comfortable in a cage teach you how to fly."
  * "Silence cannot be misquoted."
  * "You lose self-respect in small compromises nobody else sees."`
    : isHookPayoff5s
      ? `- EXACTLY 2 QUICK BEATS (4-5s total, fast dynamic pacing):
  * Phrase 1 (The Hook/Trap, 0-2s): Raw, relatable observation exposing a harsh truth (3-6 words, e.g. "They think you disappeared.")
  * Phrase 2 (The Payoff, 2-5s): Direct, grounded punchline (3-6 words, e.g. "You just stopped feeding their noise.")`
      : `- Form a tight cohesive narrative of ${count} short phrases (each strictly 3-6 words, grounded and direct).`
}

CRITICAL RULE FOR CAPTION (THIS DRIVES 200%+ WATCH TIME):
The on-screen hook stops the scroll in 1 second. The viewer MUST be compelled to open and read the caption.
While reading the caption for 15-20 seconds, the 6-second video loops 3-4 times in the background, creating a 200%+ watch time metric that explodes into the viral algorithm!
- "captionShort": 1 punchy psychological reframe ending with "Read caption." and "Save this reminder."
- "captionDeep":
  1. Opening relatable, grounded insight (expands on the hook without copying it word-for-word).
  2. "3 non-negotiable rules to live by:" followed by 3 actionable, numbered protocols grounded in real life (work, focus, boundaries).
  3. Urgent CTA: "Save this reel. Drop a ⚔️ if you agree. Follow @stark_focus."
- "subCue": Suggest one retention trigger to show under the video text: "read caption." or "3 rules in caption ⬇️" or "save for later" or "none"

Return strictly valid JSON:
{
  "title": "Short Distinctive Title (2-4 words)",
  "phrases": [${isLoop6s ? '"One powerful thought-provoking hook"' : count === 2 ? '"Beat 1 Hook", "Beat 2 Payoff"' : '"phrase 1", "phrase 2", "phrase 3"'}],
  "subCue": "read caption.",
  "captionShort": "Viral short caption",
  "captionDeep": "Deep caption with 3 protocols that forces the viewer to spend 15s reading",
  "hashtags": ["#stoicism", "#discipline", "#focus", "#mindset", "#starkfocus"],
  "suggestedTheme": "obsidian_void",
  "suggestedBackground": "Descriptive visual scene name in Polish",
  "backgroundRationale": "Reason why this background fits",
  "suggestedDuration": ${suggestedDuration}
}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: prompt,
          config: {
            temperature: 1.0,
            responseMimeType: "application/json",
            abortSignal: AbortSignal.timeout(4500),
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            temperature: 1.0,
            responseMimeType: "application/json",
            abortSignal: AbortSignal.timeout(4500),
          },
        });
      }

      const rawText = response.text || "";
      const parsed = safeJsonParse(rawText);

      if (parsed && Array.isArray(parsed.phrases) && parsed.phrases.length === count) {
        const fallbackThemes = [
          "obsidian_void",
          "silver_mist",
          "crimson_eclipse",
          "emerald_abyss",
          "carbon_aura",
        ];
        const randomTheme = fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
        return res.json({
          title: parsed.title || "Stoic Sovereign Protocol",
          phrases: parsed.phrases,
          subCue: parsed.subCue || "read caption.",
          captionShort: parsed.captionShort || "Execute in total silence. Save this reminder.",
          captionDeep:
            parsed.captionDeep ||
            `Most men lose self-respect in small private compromises.\n\n3 stoic protocols to conquer today:\n1. Move without hesitation.\n2. Do the hardest task first.\n3. Hold your standard in secret.\n\nSave this reel. Follow @stark_focus for daily stoic clarity.`,
          hashtags:
            Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
              ? parsed.hashtags
              : ["#stoicism", "#discipline", "#focus", "#starkfocus"],
          suggestedTheme: parsed.suggestedTheme || randomTheme,
          suggestedBackground: parsed.suggestedBackground || "Marmurowy Posąg Stoika w Cieniu",
          backgroundRationale:
            parsed.backgroundRationale ||
            "Głęboka czerń i chłodny marmur skupiają wzrok widza wyłącznie na surowym tekście dyscypliny.",
          suggestedDuration:
            parsed.suggestedDuration ||
            (isLoop6s ? 6 : isHookPayoff5s ? 5 : isThreePhases ? 9 : 11),
          content: JSON.stringify(parsed),
        });
      }
    } catch (err) {
      console.warn("Gemini ghostwrite error or quota exceeded, using dynamic matrix:", err);
    }
  }

  // Fallback: Niezwykle bogata Matryca Niepowtarzalnych Idei (Zero duplikatów)
  const matrixItem = getRandomUniqueFormula(targetFormat, category, excludeTitles);
  const result = {
    title: matrixItem.title,
    phrases: matrixItem.phrases,
    subCue: "read caption.",
    captionShort: matrixItem.captionShort,
    captionDeep: matrixItem.captionDeep,
    hashtags: matrixItem.hashtags,
    suggestedTheme: matrixItem.suggestedTheme,
    suggestedDuration: matrixItem.suggestedDuration,
    suggestedBackground: matrixItem.suggestedBackground,
    backgroundRationale: matrixItem.backgroundRationale,
    content: JSON.stringify({
      title: matrixItem.title,
      phrases: matrixItem.phrases,
      captionShort: matrixItem.captionShort,
      captionDeep: matrixItem.captionDeep,
      hashtags: matrixItem.hashtags,
      suggestedBackground: matrixItem.suggestedBackground,
      backgroundRationale: matrixItem.backgroundRationale,
    }),
  };

  return res.json(result);
});

// Endpointy AI, ktorych odpowiedzi warto cache'owac (identyczne zapytanie = ta sama odpowiedz)
const CACHEABLE_AI_PATHS = new Set([
  "/api/ai/scan-trends",
  "/api/ai/analyze-hook",
  "/api/ai/generate-background-prompt",
  "/api/ai/generate-carousel-template",
  "/api/ai/analyze-link",
  "/api/ai/viral-format-radar",
  "/api/ai/angle-matrix",
  "/api/ai/cognitive-friction",
  "/api/ai/evergreen-recycle",
  "/api/ai/generate-multi-variant-reels",
  "/api/ai/batch-generator",
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
