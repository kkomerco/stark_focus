import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { asArray, asString, asStringArray, oneOf, sendDegraded } from "../normalize.server";
import { clampInt, clampText } from "../../limits";

/** Dozwolone wartości — zgodne z unią `VisualTheme` i słownikiem b-roll. */
const REEL_THEMES = [
  "obsidian_void",
  "crimson_eclipse",
  "silver_mist",
  "carbon_aura",
  "emerald_abyss",
] as const;

const REEL_BROLL = [
  "antyczny_marmur_posag",
  "nocna_metropolia_stal",
  "brutalizm_monolit",
  "deszcz_asfalt_430am",
  "ciemna_sala_asceza",
  "mgla_horyzont_pustka",
] as const;

const VARIANT_LETTERS = ["A", "B", "C"] as const;

/**
 * Model potrafi pominąć `phrases` albo podać temat spoza słownika, a UI
 * mapuje te pola bez sprawdzania — więc każdy wariant wychodzi stąd
 * z kompletem pól i wartościami z dozwolonego zbioru.
 */
function normalizeVariant(item: unknown, index: number) {
  const variant = (item ?? {}) as Record<string, unknown>;
  const hook = asString(variant.hook);
  const phrases = asStringArray(variant.phrases, 5);
  const letter = VARIANT_LETTERS[index] ?? String(index + 1);

  return {
    variantLetter: oneOf(variant.variantLetter, VARIANT_LETTERS, letter),
    variantName: asString(variant.variantName, `Wariant ${letter}`),
    hook: hook || phrases[0] || "",
    phrases: phrases.length > 0 ? phrases : hook ? [hook] : [],
    theme: oneOf(variant.theme, REEL_THEMES, "obsidian_void"),
    brollSuggestion: oneOf(variant.brollSuggestion, REEL_BROLL, "deszcz_asfalt_430am"),
    duration: clampInt(variant.duration, 5, 12, 8),
  };
}

export function registerReelsRoutes(app: MiniApp): void {
  app.post("/api/ai/generate-multi-variant-reels", async (req, res) => {
    const topic = clampText(req.body?.topic, 300, "Solitude and relentless standards");
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
      return sendDegraded(res, { variants: fallbackVariants });
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
      const variants = asArray(parsed.variants)
        .map(normalizeVariant)
        .filter((variant) => variant.phrases.length > 0)
        .slice(0, 3);

      if (variants.length === 3) {
        return res.json({ variants });
      }
      return sendDegraded(res, { variants: fallbackVariants });
    } catch (err) {
      console.warn("Błąd multi-variant-reels:", err);
      return sendDegraded(res, { variants: fallbackVariants });
    }
  });
}
