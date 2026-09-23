import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { sendDegraded, asArray, asString, asStringArray } from "../normalize.server";
import { clampInt, clampText } from "../../limits";

/** Tyle slajdów daje bank zapasowy i tyle żąda prompt. */
const MAX_SLIDES = 5;

/** Slajd od modelu może nie mieć `headline` albo podać `highlightWords` jako string. */
function normalizeSlides(slides: unknown, limit: number) {
  return asArray(slides)
    .map((slide, idx) => {
      const item = (slide ?? {}) as Record<string, unknown>;
      const headline = asString(item.headline);
      const bodyText = asString(item.bodyText);
      return {
        slideNumber: clampInt(item.slideNumber, 1, 99, idx + 1),
        headline,
        bodyText,
        highlightWords: asStringArray(
          typeof item.highlightWords === "string"
            ? item.highlightWords.split(",")
            : item.highlightWords,
          6,
        ).join(", "),
      };
    })
    .filter((slide) => slide.headline || slide.bodyText)
    .slice(0, limit);
}

export function registerCarouselRoutes(app: MiniApp): void {
  app.post("/api/ai/generate-carousel-template", async (req, res) => {
    // 3..5: tyle daje bank treści zapasowych i tyle żąda prompt ("dokładnie 4-5").
    // Wcześniejszy sufit 10 sprawia, że prośba o 10 slajdów dostawała 5 —
    // cicho, bez komunikatu o niedoborze.
    const targetCount = clampInt(req.body?.slideCount, 3, MAX_SLIDES, 5);
    const cleanTopic = clampText(req.body?.topic, 200) || "Stoicka Dyscyplina";
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
      return sendDegraded(res, { template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
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
      const slides = normalizeSlides(parsed?.template?.slides, targetCount);
      if (slides.length > 0) {
        return res.json({
          template: {
            name: asString(parsed.template?.name, `STARK // ${cleanTopic.toUpperCase()}`),
            slides,
          },
        });
      }

      return sendDegraded(res, { template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
    } catch (err: any) {
      console.warn(
        "Błąd generowania karuzeli AI, użyto dynamicznego fallbacku:",
        err?.message || err,
      );
      return sendDegraded(res, { template: buildDynamicCarouselFallback(cleanTopic, targetCount) });
    }
  });
}
