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
import { clampInt } from "../../limits";

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
    // Model może wymyślić dowolny gridType; tylko znane układy mają renderer.
    gridType: oneOf(
      source.gridType,
      ["none_solid", "single", "split_horizontal", "grid_2x2", "studio_wall_3d"] as const,
      "none_solid",
    ),
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
}
