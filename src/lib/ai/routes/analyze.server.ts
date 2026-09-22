import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { formatStarkCaption } from "../../caption";
import { isSafeUrl } from "../../safe-url";
import { fetchSafeImage } from "../../fetch-image.server";
import {
  asArray,
  asNumber,
  asString,
  asStringArray,
  oneOf,
  sendDegraded,
} from "../normalize.server";
import { clampCount, clampInt, clampOffset, clampText } from "../../limits";

/**
 * Studio 1:1 robi `setSpec(data.layoutSpec)` a potem `spec.textLayers.map()`.
 * Model, który pominie `textLayers` albo zwróci je jako string, wywraca więc
 * cały widok — kompletne pole dostajemy tutaj, a nie w dwudziestu `?.` w UI.
 */
function normalizeLayoutSpec(spec: unknown, rawMetadata: Record<string, unknown>) {
  const source = (spec ?? {}) as Record<string, unknown>;
  const detectedAudio = asString(rawMetadata.audioTrack);

  const layers = asArray(source.textLayers).map((layer, idx) => {
    const item = (layer ?? {}) as Record<string, unknown>;
    return {
      id: asString(item.id, `t${idx + 1}`),
      text: asString(item.text),
      fontFamily: asString(item.fontFamily, "sans"),
      fontSize: clampInt(item.fontSize, 8, 300, 72),
      fontWeight: asString(item.fontWeight, "bold"),
      fontStyle: asString(item.fontStyle, "normal"),
      casing: asString(item.casing, "preserve"),
      color: asString(item.color, "#FFFFFF"),
      align: oneOf(item.align, ["left", "center", "right"] as const, "left"),
      posY: asNumber(item.posY, 0.46),
      posX: asNumber(item.posX, 0.12),
    };
  });

  return {
    ...source,
    layoutName: asString(source.layoutName, "Analiza AI"),
    slotCount: clampInt(source.slotCount, 0, 12, 1),
    slotLabels: asStringArray(source.slotLabels, 12),
    detectedAudio: detectedAudio || asString(source.detectedAudio, "Czysty dźwięk"),
    textLayers:
      layers.length > 0
        ? layers
        : [
            {
              id: "t1",
              text: asString(rawMetadata.title),
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "bold",
              fontStyle: "normal",
              casing: "preserve",
              color: "#FFFFFF",
              align: "left" as const,
              posY: 0.46,
              posX: 0.12,
            },
          ],
  };
}

export function registerAnalyzeRoutes(app: MiniApp): void {
  app.post("/api/ai/analyze-link", async (req, res) => {
    let cleanUrl = String(req.body?.url || "").trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    if (!isSafeUrl(cleanUrl)) {
      return res.status(400).json({ error: "Nieprawidłowy lub zablokowany URL" });
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
    // `thumbnail_url` z oEmbed to adres kontrolowany przez serwis trzeci —
    // może wskazywać sieć wewnętrzną, więc przechodzi przez fetchSafeImage().
    const image = await fetchSafeImage(rawMetadata.thumbnail);
    if (image) {
      imagePart = {
        inlineData: {
          data: image.buffer.toString("base64"),
          mimeType: image.mimeType,
        },
      };
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
      "detectedAudio": "${rawMetadata.audioTrack || "Ciemny ambient ze skrzypcami"}"
    }
  }`;

    if (!ai) {
      return sendDegraded(res, {
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
            {
              id: "t1",
              text: "Stay ruthless",
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "black",
              fontStyle: "normal",
              casing: "preserve",
              color: "#161920",
              align: "left",
              posY: 0.28,
              posX: 0.16,
            },
            {
              id: "t2",
              text: "with your",
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "black",
              fontStyle: "normal",
              casing: "preserve",
              color: "#161920",
              align: "left",
              posY: 0.36,
              posX: 0.16,
            },
            {
              id: "t3",
              text: "standards.",
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "black",
              fontStyle: "normal",
              casing: "preserve",
              color: "#161920",
              align: "left",
              posY: 0.44,
              posX: 0.16,
            },
            {
              id: "t4",
              text: "Never negotiate",
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "black",
              fontStyle: "normal",
              casing: "preserve",
              color: "#161920",
              align: "left",
              posY: 0.52,
              posX: 0.16,
            },
            {
              id: "t5",
              text: "with your",
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "black",
              fontStyle: "normal",
              casing: "preserve",
              color: "#161920",
              align: "left",
              posY: 0.6,
              posX: 0.16,
            },
            {
              id: "t6",
              text: "weakness.",
              fontFamily: "sans",
              fontSize: 72,
              fontWeight: "black",
              fontStyle: "normal",
              casing: "preserve",
              color: "#161920",
              align: "left",
              posY: 0.68,
              posX: 0.16,
            },
          ],
          caption: formatStarkCaption(
            "Stay ruthless with your standards. Never negotiate with weakness.",
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
      return res.json({
        ...parsed,
        layoutSpec: normalizeLayoutSpec(parsed.layoutSpec, rawMetadata),
      });
    } catch (err: any) {
      console.error("Błąd analizy:", err);
      // `String(err)` do przeglądarki to adresy upstreamu, szczegóły SDK i
      // układ środowiska — zostaje tylko w logu serwera.
      res.status(500).json({ error: "Błąd analizy posta" });
    }
  });
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

    if (!ai) return sendDegraded(res, { analysis: fallbackAnalysis });

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
      return sendDegraded(res, { analysis: fallbackAnalysis });
    } catch {
      return sendDegraded(res, { analysis: fallbackAnalysis });
    }
  });
  app.post("/api/ai/hook-battle", async (req, res) => {
    // `count` steruje pętlą generującą wynik, więc musi być clampnięte.
    const cleanTopic = clampText(req.body?.topic, 200) || "Dyscyplina i bezwzględne standardy";
    const count = clampCount(req.body?.count, 5);
    const currentBatch = clampOffset(req.body?.offset);
    const excludeHooks = (Array.isArray(req.body?.excludeHooks) ? req.body.excludeHooks : [])
      .map((hook: unknown) => asString(hook, ""))
      .filter(Boolean);
    const ai = getGeminiClient();

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
      return sendDegraded(res, {
        battle: generateIntelligentFallbackBattles(cleanTopic, currentBatch),
      });
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

      return sendDegraded(res, {
        battle: generateIntelligentFallbackBattles(cleanTopic, currentBatch),
      });
    } catch (err) {
      console.warn("Hook battle fallback triggered:", err);
      return sendDegraded(res, {
        battle: generateIntelligentFallbackBattles(cleanTopic, currentBatch),
      });
    }
  });
}
