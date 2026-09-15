import type { MiniApp } from "../../mini-express.server";
import { GEMINI_LITE_MODEL, GEMINI_MODEL, getGeminiClient, safeJsonParse } from "../gemini.server";
import { formatStarkCaption } from "../../caption";

export function registerReelsRoutes(app: MiniApp): void {
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

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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
}
