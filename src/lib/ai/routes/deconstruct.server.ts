import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { isSafeUrl } from "../../safe-url";
import { fetchSafeImage } from "../../fetch-image.server";

/**
 * DECONSTRUCT VIRAL — analiza rynku z linków.
 * Rozbiera viralowy post na czynniki (hook, struktura, wyzwalacze) i generuje
 * własne warianty @stark_focus wykorzystujące ten sam wzorzec psychologiczny.
 */
export function registerDeconstructRoutes(app: MiniApp): void {
  // DECONSTRUCT VIRAL — rozbiera viralowy post na czynniki i generuje warianty @stark_focus
  app.post("/api/ai/deconstruct-viral", async (req, res) => {
    let cleanUrl = String(req.body?.url || "").trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "https://" + cleanUrl;
    }
    if (!isSafeUrl(cleanUrl)) {
      return res.status(400).json({ error: "Nieprawidłowy lub zablokowany URL" });
    }

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
      let imagePart: any = null;
      // Adres miniatury pochodzi z odpowiedzi serwisu trzeciego, więc nie
      // jest zaufany — fetchSafeImage() pilnuje SSRF, typu i rozmiaru.
      const image = await fetchSafeImage(thumbnail);
      if (image) {
        imagePart = {
          inlineData: {
            data: image.buffer.toString("base64"),
            mimeType: image.mimeType,
          },
        };
      }

      const prompt = `Jesteś ekspertem od dekonstrukcji viralowych treści dla @stark_focus (dark motivation).

ANALIZUJESY: ${platform} | "${metaTitle}" | ${metaAuthor} | audio: ${audioTrack}

ZADANIE 1 — DEKONSTRUKCJA:
- hookType, hookText, structure, psychologicalTriggers (3), whyItWorks (PL), visualStyle, audioStrategy

ZADANIE 2 — 3 WARIANTY @stark_focus (NOWA treść, TEN SAM wzorzec):
- hook (max 10 słów, EN), angle, phrases [hook, rozwinięcie, puenta], viralityScore 90-99

Zwróć WYŁĄCZNIE JSON: { "deconstruction": {...}, "starkVariants": [...] }`;

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
        });
      }

      throw new Error("Invalid AI response");
    } catch (err) {
      console.warn("Deconstruct viral error:", err);
      return res.json({
        source: "offline",
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
      });
    }
  });
}
