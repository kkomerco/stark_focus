import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { isSafeUrl } from "../../safe-url";
import { fetchSafeImage } from "../../fetch-image.server";
import { sendDegraded, asArray, asString, asStringArray, oneOf } from "../normalize.server";
import { clampText } from "../../limits";

/**
 * DECONSTRUCT VIRAL — analiza cudzego posta na nasz układ.
 *
 * Podstawą jest OBRAZ, nie adres. Instagram oddaje osobie bez zalogowania
 * samą powłokę JS (sprawdzone: 200, 638 kB, zero `og:image`), więc analiza
 * linku IG nie ma czego opisywać — model wtedy zgadywał z samego URL-a.
 * Stąd: zrzut ekranu jako pierwsze źródło, a gdy nic nie widać, uczciwy
 * zwrot „wklej zrzut" zamiast wymyślonej dekonstrukcji.
 */

/** Data URL od klienta: mierzymy go w znakach base64, nie w bajtach obrazu. */
const MAX_IMAGE_DATA_CHARS = 4_000_000;

const OUR_LAYOUTS = [
  "none_solid",
  "concept_diagram",
  "protocol_list",
  "cost_vs_reward",
  "studio_wall_3d",
  "grid_2x2",
] as const;

const OUR_DIAGRAMS = ["chart", "scales", "path", "split"] as const;

function dataUrlToImage(dataUrl: string): { base64: string; mimeType: string } | null {
  const match = /^data:(image\/(png|jpeg|webp));base64,([\s\S]+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64: match[3] };
}

export function registerDeconstructRoutes(app: MiniApp): void {
  // DECONSTRUCT VIRAL — rozbiera viralowy post na czynniki i generuje warianty @stark_focus
  app.post("/api/ai/deconstruct-viral", async (req, res) => {
    let cleanUrl = String(req.body?.url || "").trim();
    if (cleanUrl && !cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    if (cleanUrl && !isSafeUrl(cleanUrl)) {
      return res.status(400).json({ error: "Nieprawidłowy lub zablokowany URL" });
    }

    const imageDataUrl = clampText(req.body?.imageDataUrl, MAX_IMAGE_DATA_CHARS);
    const clientImage = imageDataUrl ? dataUrlToImage(imageDataUrl) : null;

    const isTikTok = cleanUrl.includes("tiktok.com");
    const isShorts = cleanUrl.includes("youtube.com") || cleanUrl.includes("youtu.be");
    const isInstagram = cleanUrl.includes("instagram.com");
    const platform = isTikTok
      ? "TikTok"
      : isShorts
        ? "YouTube Shorts"
        : isInstagram
          ? "Instagram Reels"
          : "Social Media";

    let metaTitle = "";
    let metaAuthor = "";
    let thumbnail = "";
    let audioTrack = "";
    if (isTikTok) {
      try {
        const oembed = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`,
          { signal: AbortSignal.timeout(4500) },
        );
        if (oembed.ok) {
          const oJson = await oembed.json();
          metaTitle = oJson.title || "";
          metaAuthor = oJson.author_name || "";
          thumbnail = oJson.thumbnail_url || "";
          const soundMatch = oJson.html?.match(/♬\s*([^<"']+)/i);
          if (soundMatch) audioTrack = soundMatch[1].trim();
        }
      } catch (e) {
        console.warn("[Deconstruct oEmbed notice]:", e);
      }
    }

    const ai = getGeminiClient();
    const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);

    // Bez obrazu i bez metadanych nie ma czego analizować. Wcześniejsze
    // zachowanie — model pisał dekonstrukcję z samego adresu — jest gorsze od
    // braku odpowiedzi, bo wygląda jak wynik.
    if (!clientImage && !thumbnail && !metaTitle) {
      return res.json({
        source: "no_input" as const,
        platform,
        message: isInstagram
          ? "Instagram nie pokazuje treści komuś bez zalogowania — wklej zrzut ekranu tego posta, wtedy go rozłożę na układ."
          : "Stąd nie widać treści tego posta. Wklej zrzut ekranu albo link z TikToka/Shortsa.",
        original: { url: cleanUrl, title: "", author: "", audioTrack: "" },
        deconstruction: {
          hookType: "",
          hookText: "",
          structure: [],
          psychologicalTriggers: [],
          whyItWorks: "",
          visualStyle: "",
          audioStrategy: "",
        },
        starkVariants: [],
        blueprints: [],
      });
    }

    if (!ai) {
      return res.json({
        source: "offline",
        platform,
        original: {
          url: cleanUrl,
          title: metaTitle || "Brak metadanych",
          author: metaAuthor || "unknown",
          audioTrack: audioTrack || "unknown",
        },
        deconstruction: {
          hookType: "Direct confrontation",
          hookText: metaTitle.slice(0, 80) || "Viral hook pattern",
          structure: ["Hook", "Contrast", "Punchline"],
          psychologicalTriggers: ["curiosity gap", "social proof"],
          whyItWorks: "Analiza offline — brak klucza API.",
          visualStyle: "Dark aesthetic",
          audioStrategy: audioTrack || "Trending audio",
        },
        starkVariants: [
          {
            id: `variant-${dynamicSeed}-1`,
            hook: "Your comfort zone is a coffin with Wi-Fi.",
            angle: "Pattern destruction",
            phrases: [
              "Your comfort zone is a coffin with Wi-Fi.",
              "Every scroll is a nail in your potential.",
              "Close the app. Open your future.",
            ],
            viralityScore: 94,
          },
          {
            id: `variant-${dynamicSeed}-2`,
            hook: "They see your silence and call it weakness.",
            angle: "Silent authority",
            phrases: [
              "They see your silence and call it weakness.",
              "Let them underestimate you.",
              "Your results will be the loudest answer.",
            ],
            viralityScore: 92,
          },
        ],
      });
    }

    try {
      // Zrzut od klienta wygrywa z miniaturą serwisu: miniaturka IG bywa
      // kadrem z filmu, a nie tym, co człowiek chce odtworzyć.
      let imagePart: any = clientImage
        ? { inlineData: { data: clientImage.base64, mimeType: clientImage.mimeType } }
        : null;
      if (!imagePart) {
        // Adres miniatury pochodzi z odpowiedzi serwisu trzeciego, więc nie
        // jest zaufany — fetchSafeImage() pilnuje SSRF, typu i rozmiaru.
        const image = await fetchSafeImage(thumbnail);
        if (image) {
          imagePart = {
            inlineData: { data: image.buffer.toString("base64"), mimeType: image.mimeType },
          };
        }
      }

      const sawImage = !!imagePart;
      const prompt = `Jesteś ekspertem od dekonstrukcji viralowych treści dla @stark_focus (dark motivation, mroczny minimalizm).
${sawImage ? "Masza ZAŁĄCZONY OBRAZ — to jest ten post. Oceniaj to, co widać, nie to, czego się domyślasz." : `Nie widzę obrazu, tylko metadane: ${platform} | "${metaTitle}" | ${metaAuthor}`}

ZADANIE 1 — DEKONSTRUKCJA (po polsku, dla autora):
hookType, hookText (cytat z oryginału, 1:1), structure, psychologicalTriggers (3), whyItWorks, visualStyle, audioStrategy

ZADANIE 2 — 3 WARIANTY @stark_focus (NOWA treść, TEN SAM wzorzec psychologiczny):
hook (max 10 słów, PO ANGIELSKU), angle, phrases [hook, rozwinięcie, puenta] — wszystko po angielsku, viralityScore 90-99

ZADANIE 3 — 3 RECEPTURY (blueprint): to, co z oryginału da się u nas odtworzyć kadr po kadrze.
Nasz słownik układów: ${OUR_LAYOUTS.join(", ")}.
- "none_solid" — płaski cytat na czerni
- "concept_diagram" — czarny kadr, wiersz u góry i SZKIC LINIĄ pod nim (diagram: ${OUR_DIAGRAMS.join(", ")})
- "protocol_list" — teza + numerowane kroki
- "cost_vs_reward" — pytanie + dwa słupki + puenta
- "studio_wall_3d" — napis w scenie (scena: wall, neon, billboard)
- "grid_2x2" — cztery kadry ze zdaniem na środku

ZASADY RECEPTUR:
- Cały tekst kadru PO ANGIELSKU. "line" to wiersz, który idzie na kadr.
- "needsImage: true" tylko gdy kadr naprawdę wymaga zdjęcia lub ilustracji (wtedy opisz ją w "imagePrompt", po angielsku, w stylistyce marki: obsydian, kość, jeden karmazynowy akcent, bez tekstu w obrazie). Szkic linią i typografia na czerni NIE potrzebują obrazu.
- "why" po polsku: którą cechę oryginału ta receptura przejmuje.
- Nie kopiuj zdania z oryginału. Nowa treść, ten sam mechanizm.

Zwróć WYŁĄCZNIE JSON:
{
  "deconstruction": { "hookType": "", "hookText": "", "structure": [], "psychologicalTriggers": [], "whyItWorks": "", "visualStyle": "", "audioStrategy": "" },
  "starkVariants": [{ "hook": "", "angle": "", "phrases": [], "viralityScore": 92 }],
  "blueprints": [{
    "gridType": "${OUR_LAYOUTS.join("|")}",
    "diagram": "${OUR_DIAGRAMS.join("|")} albo puste",
    "scene": "wall|neon|billboard albo puste",
    "line": "wiersz na kadr (EN)",
    "subline": "dopisek pod szkicem (EN, opcjonalnie)",
    "steps": ["tylko protocol_list: 3 kroki (EN)"],
    "needsImage": false,
    "imagePrompt": "",
    "why": "po polsku, co przenosimy z oryginału"
  }]
}`;

      const contents: any[] = [prompt];
      if (imagePart) contents.push(imagePart);

      const response = await callGeminiWithFallback(ai, {
        contents: contents as never,
        config: { temperature: 0.85 },
      });

      const parsed = safeJsonParse(response.text || "");

      if (parsed?.deconstruction && Array.isArray(parsed?.starkVariants)) {
        return res.json({
          source: "ai",
          platform,
          original: { url: cleanUrl, title: metaTitle, author: metaAuthor, audioTrack },
          deconstruction: {
            hookType: String(parsed.deconstruction.hookType || "Unknown"),
            hookText: String(parsed.deconstruction.hookText || metaTitle || ""),
            structure: Array.isArray(parsed.deconstruction.structure)
              ? parsed.deconstruction.structure.map(String)
              : ["Hook", "Body", "CTA"],
            psychologicalTriggers: Array.isArray(parsed.deconstruction.psychologicalTriggers)
              ? parsed.deconstruction.psychologicalTriggers.map(String)
              : [],
            whyItWorks: String(parsed.deconstruction.whyItWorks || ""),
            visualStyle: String(parsed.deconstruction.visualStyle || ""),
            audioStrategy: String(parsed.deconstruction.audioStrategy || ""),
          },
          starkVariants: parsed.starkVariants.map((v: any, idx: number) => ({
            id: `variant-${dynamicSeed}-${idx + 1}`,
            hook: String(v.hook || "")
              .replace(/["#*]/g, "")
              .trim(),
            angle: String(v.angle || "Stoic pattern"),
            phrases: Array.isArray(v.phrases) ? v.phrases.slice(0, 4) : [v.hook],
            viralityScore: typeof v.viralityScore === "number" ? v.viralityScore : 92,
          })),
          blueprints: asArray(parsed.blueprints)
            .map((item, idx) => {
              const raw = (item ?? {}) as Record<string, unknown>;
              const gridType = oneOf(raw.gridType, OUR_LAYOUTS, "none_solid");
              // Pola dekoracyjne tylko tam, gdzie układ naprawdę je rysuje.
              // Wypełniane zawsze wracały nawet w czystym cytacie, więc
              // „wykres" i „ściana" nie znaczyły nic.
              const diagram =
                gridType === "concept_diagram"
                  ? oneOf(raw.diagram, OUR_DIAGRAMS, "chart")
                  : undefined;
              const scene =
                gridType === "studio_wall_3d"
                  ? oneOf(raw.scene, ["wall", "neon", "billboard"] as const, "wall")
                  : undefined;
              // O tym, czy kadr potrzebuje zdjęcia, decyduje jego układ, a nie
              // widzimisię modelu — inaczej „wymaga obrazu" świeciło na szkicu
              // liniowym, czyli dokładnie tam, gdzie prompt każe go nie chcieć.
              const needsImage = gridType === "grid_2x2" || gridType === "studio_wall_3d";
              return {
                id: `blueprint-${dynamicSeed}-${idx + 1}`,
                gridType,
                diagram,
                scene,
                line: asString(raw.line).slice(0, 160),
                subline: asString(raw.subline).slice(0, 160),
                steps: asStringArray(raw.steps, 4).map((s) => s.slice(0, 90)),
                needsImage,
                imagePrompt: needsImage ? asString(raw.imagePrompt).slice(0, 600) : "",
                why: asString(raw.why).slice(0, 240),
              };
            })
            .filter((b) => b.line.length > 0)
            .slice(0, 3),
        });
      }

      throw new Error("Invalid AI response");
    } catch (err) {
      console.warn("Deconstruct viral error:", err);
      return sendDegraded(res, {
        source: "error",
        platform,
        original: { url: cleanUrl, title: metaTitle, author: metaAuthor, audioTrack },
        deconstruction: {
          hookType: "Error",
          hookText: "Błąd analizy",
          structure: ["Hook"],
          psychologicalTriggers: [],
          whyItWorks: "Błąd generowania AI.",
          visualStyle: "",
          audioStrategy: "",
        },
        starkVariants: [],
        blueprints: [],
      });
    }
  });
}
