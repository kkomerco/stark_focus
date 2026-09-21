import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { formatStarkCaption } from "../../caption";

export function registerMentorRoutes(app: MiniApp): void {
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
}
