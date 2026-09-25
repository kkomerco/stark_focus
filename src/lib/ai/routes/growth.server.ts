import type { MiniApp } from "../../mini-express.server";
import {
  GEMINI_MODEL,
  generateJsonWithFallback,
  getGeminiClient,
  callGeminiWithFallback,
} from "../gemini.server";
import { clampText } from "../../limits";
import { HOOK_CRAFT_PROMPT } from "../../hookCraft";
import { asStringArray } from "../normalize.server";

/**
 * GROWTH ENGINE — eksperymenty A/B i tygodniowy autopilot.
 * 1. /api/ai/ab-variants — 2 warianty TEJ SAMEJ rolki (inny hook / inny motyw)
 * 2. /api/ai/ab-conclusion — zwycięski wzorzec wraca do generatora (pętla uczenia)
 * 3. /api/ai/weekly-autopilot — 7 paczek (po jednej kategorii na dzień z rotacji)
 * 4. /api/ai/reroll-prompt — nowy prompt tła w TYM SAMYM stylu (spójny feed)
 */

/** Minimalna liczba wyświetleń na wariant, żeby w ogóle porównywać engagement. */
const MIN_AB_VIEWS = 30;

// Rotacja kategorii — spójna z idea-stream.server.ts
const WEEK_CATEGORIES = [
  "monk mode & solitude",
  "iron standards & self-respect",
  "discipline vs motivation",
  "dopamine detox & focus",
  "mental toughness & pain",
  "silence & strategic power",
  "time urgency & memento mori",
] as const;

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

export function registerGrowthRoutes(app: MiniApp): void {
  // ============ A/B WARIANTY TEJ SAMEJ ROLKI ============
  app.post("/api/ai/ab-variants", async (req, res) => {
    const { history = [] } = req.body || {};
    const topic = clampText(req.body?.topic, 200, "dark motivation and brutal discipline");
    const ai = getGeminiClient();
    const seed = Date.now();

    // Pętla uczenia: historia zakończonych eksperymentów (zwycięskie hooki + lekcje)
    // wtrącana do promptu, żeby AI nie powtarzało przestałych wzorców.
    const safeHistory: Array<{
      winner: string;
      lesson: string;
      winningHook: string;
      angle: string;
    }> = Array.isArray(history)
      ? history.slice(-8).map((h: any) => ({
          winner: String(h?.winner || "?"),
          lesson: String(h?.lesson || ""),
          winningHook: String(h?.winningHook || ""),
          angle: String(h?.angle || ""),
        }))
      : [];

    const historyContext =
      safeHistory.length > 0
        ? `

WCZEŚNIEJ ZAKOŃCZONE EKSPERYMENTY A/B (ucz się z nich — nie powtarzaj przestałych):
${safeHistory
  .map(
    (h) =>
      `- Wariant ${h.winner} wygrał hookiem: "${h.winningHook}" (kąt: ${h.angle}). Lekcja: ${h.lesson}`,
  )
  .join("\n")}
`
        : "";

    if (!ai) {
      return res.json({
        source: "offline" as const,
        topic,
        experimentId: `ab-${seed}`,
        historyUsed: safeHistory.length,
        variants: [
          {
            label: "A",
            hook: "Comfort is a cage with the door wide open.",
            angle: "konfrontacja z wymówką",
            phrases: [
              "Comfort is a cage with the door wide open.",
              "You stay because it hurts less than leaving.",
              "Walk out. Now.",
            ],
            theme: "obsidian_void",
            cta: "Save this if you needed the push.",
          },
          {
            label: "B",
            hook: "3 AM is the only honest hour you have left.",
            angle: "konkret + wykluczenie",
            phrases: [
              "3 AM is the only honest hour you have left.",
              "No noise. No spectators. Just the work.",
              "Most men never meet themselves. You will tonight.",
            ],
            theme: "carbon_aura",
            cta: "Follow for the 3 AM protocol.",
          },
        ],
      });
    }

    try {
      const prompt = `Jesteś strategiem treści dark motivation dla marki @stark_focus.
Temat: "${topic}".${historyContext}

ZADANIE: Zaprojektuj EKSPERYMENT A/B — DWIE wersje TEJ SAMEJ rolki (ta sama narracja emocjonalna, ale:
- WARIANT A: hook typu "bezpośrednia konfrontacja" (You...), motyw "obsidian_void"
- WARIANT B: hook typu "konkret/liczba/czas" (np. 3AM, 5AM, 99%), motyw "carbon_aura"

Oba warianty: hook max 8 słów po angielsku, phrases [hook, kontrast, puenta], CTA po angielsku, angle po polsku (krótko).

${HOOK_CRAFT_PROMPT}

Zwróć WYŁĄCZNIE JSON:
{
  "variants": [
    { "label": "A", "hook": "...", "angle": "...", "phrases": ["...","...","..."], "theme": "obsidian_void", "cta": "..." },
    { "label": "B", "hook": "...", "angle": "...", "phrases": ["...","...","..."], "theme": "carbon_aura", "cta": "..." }
  ]
}`;

      const parsed = await generateJsonWithFallback<{ variants?: any[] }>({
        contents: prompt,
        temperature: 0.9,
        preferredModel: GEMINI_MODEL,
      });

      const variants = Array.isArray(parsed?.variants)
        ? parsed.variants.slice(0, 2).map((v: any, idx: number) => {
            const hook = String(v.hook || "")
              .replace(/["#*]/g, "")
              .trim();
            const phrases = asStringArray(v.phrases, 4);

            return {
              // Etykieta PO INDEKSIE, nie od modelu: `ab-conclusion` rozróżnia
              // warianty po "A"/"B", a UI klika po niej inputy — dowolna
              // etykieta z JSON-a collapse'uje oba wiersze eksperymentu.
              label: idx === 0 ? "A" : "B",
              hook,
              angle: String(v.angle || ""),
              phrases: phrases.length > 0 ? phrases : hook ? [hook] : [],
              theme: ["obsidian_void", "carbon_aura"].includes(v.theme)
                ? v.theme
                : idx === 0
                  ? "obsidian_void"
                  : "carbon_aura",
              cta: String(v.cta || ""),
            };
          })
        : [];

      if (variants.length === 2 && variants.every((v) => v.hook.length > 5)) {
        return res.json({
          source: "ai" as const,
          topic,
          experimentId: `ab-${seed}`,
          historyUsed: safeHistory.length,
          variants,
        });
      }
      throw new Error("bad structure");
    } catch (err) {
      console.warn("ab-variants fallback:", err);
      return res.json({
        source: "offline" as const,
        topic,
        experimentId: `ab-${seed}`,
        variants: [
          {
            label: "A",
            hook: "Your potential is watching you waste it.",
            angle: "wyrzut sumienia",
            phrases: [
              "Your potential is watching you waste it.",
              "Every scroll is a vote for the life you hate.",
              "Cast the other vote. Today.",
            ],
            theme: "obsidian_void",
            cta: "Save this reminder.",
          },
          {
            label: "B",
            hook: "5 AM decides who owns the next 20 years.",
            angle: "konkret + stawka",
            phrases: [
              "5 AM decides who owns the next 20 years.",
              "The world belongs to those already awake.",
              "Join the ones who don't negotiate.",
            ],
            theme: "carbon_aura",
            cta: "Follow for daily 5 AM calls.",
          },
        ],
      });
    }
  });

  // ============ WNIOSKI Z EKSPERYMENTU (zwycięski wzorzec) ============
  app.post("/api/ai/ab-conclusion", async (req, res) => {
    const { experimentId = "", results = [] } = req.body || {};
    const ai = getGeminiClient();

    const norm = (Array.isArray(results) ? results : []).map((r: any, idx: number) => ({
      // Jak wyżej: etykieta po pozycji, bo dalsza logika (i UI) rozróżnia
      // warianty wyłącznie po "A" / "B".
      label: r.label === "A" || r.label === "B" ? String(r.label) : idx === 0 ? "A" : "B",
      views: Number(r.views) || 0,
      likes: Number(r.likes) || 0,
      comments: Number(r.comments) || 0,
      shares: Number(r.shares) || 0,
      saves: Number(r.saves) || 0,
      hook: clampText(r.hook, 160),
      music: clampText(r.music, 80),
      background: clampText(r.background, 80),
    }));

    if (norm.length < 2) {
      return res.status(400).json({ error: "Potrzeba wyników dla obu wariantów (A i B)." });
    }

    const scored = norm.map((r) => ({
      ...r,
      engagement: r.views > 0 ? (r.likes + r.comments + r.shares + r.saves) / r.views : 0,
    }));

    // Lekcja wyciągnięta z 5 wyświetleń to zgadywanka, która wraca potem do
    // promptu generatora jako "udowodniony" wzorzec — poniżej progu nie ma
    // zwycięzcy i mówimy o tym wprost zamiast typować.
    if (norm.some((r) => r.views < MIN_AB_VIEWS)) {
      return res.json({
        source: "offline" as const,
        status: "insufficient_data" as const,
        experimentId,
        winner: null,
        scored,
        lesson: `Za mało danych: każdy wariant potrzebuje min. ${MIN_AB_VIEWS} wyświetleń, żeby porównanie engagementu cokolwiek udowodniło.`,
      });
    }

    const winner = [...scored].sort((a, b) => b.engagement - a.engagement)[0];
    const loser = scored.find((r) => r.label !== winner.label) ?? scored[0];
    const gap =
      loser.engagement > 0
        ? `${(((winner.engagement - loser.engagement) / loser.engagement) * 100).toFixed(0)}%`
        : "brak bazy do porównania";

    // Wniosek nie może udowodnić więcej, niż zmierzono. Jeśli warianty różniły
    // się też muzyką albo tłem, różnica wyniku nie jest zasługą hooka.
    const otherChanges = [
      winner.music && loser.music && winner.music !== loser.music ? "muzyka" : "",
      winner.background && loser.background && winner.background !== loser.background ? "tło" : "",
    ].filter(Boolean);

    let lesson =
      otherChanges.length > 0
        ? `Wariant ${winner.label} miał engagement o ${gap} wyższy od ${loser.label}. Nie da się tego przypisać samemu hookowi — różniły się także: ${otherChanges.join(", ")}. Powtórz eksperyment z jednym zmienionym elementem, jeśli chcesz znać cenę hooka.`
        : `Wariant ${winner.label} miał engagement o ${gap} wyższy od ${loser.label} przy tym samym tle i muzyce, więc różnicę robi hook: "${winner.hook}".`;

    if (ai) {
      try {
        const prompt = `Eksperyment A/B hooków dla marki @stark_focus (dark motivation).
Wyniki (hook, muzyka i tło każdego wariantu): ${JSON.stringify(scored)}.
Zwycięzca: wariant ${winner.label} (engagement ${(winner.engagement * 100).toFixed(1)}%).
${otherChanges.length > 0 ? `UWAGA: warianty różniły się także (${otherChanges.join(", ")}), więc NIE przypisuj wyniku samemu hookowi — nazwij, czego eksperyment nie rozstrzyga.` : "Hook był jedyną różnicą, więc możesz wskazać go jako przyczynę."}
W 2-3 zdaniach po polsku wyciągnij LEKCJĘ: co faktycznie zmierzono i jak to stosować w kolejnych generacjach. Bez lania wody i bez wniosków, których te dane nie niosą.`;
        const response = await callGeminiWithFallback(ai, {
          contents: prompt,
          config: { temperature: 0.7 },
        });
        if (response.text && response.text.trim().length > 20) lesson = response.text.trim();
      } catch {
        /* zostaje lekcja domyślna */
      }
    }

    return res.json({
      source: ai ? "ai" : "offline",
      experimentId,
      winner: winner.label,
      scored,
      lesson,
    });
  });

  // ============ TYGODNIOWY AUTOPILOT ============
  app.post("/api/ai/weekly-autopilot", async (req, res) => {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        source: "offline" as const,
        generatedAt: new Date().toISOString(),
        week: DAYS.map((day, idx) => ({
          day,
          dayIndex: idx,
          category: WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length],
          topic: `${WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length]} — dark motivation for @stark_focus`,
        })),
      });
    }

    try {
      const prompt = `Jesteś strategiem treści dark motivation dla @stark_focus.
Zaplanuj TYDZIEŃ (7 dni) publikacji. Każdy dzień ma przypisaną kategorię:
${DAYS.map((d, i) => `- ${d}: ${WEEK_CATEGORIES[i]}`).join("\n")}

Dla każdego dnia zwróć:
- topic: temat dnia po angielsku, pod kategorię
- hookOfDay: główny hook dnia, max 8 słów, po angielsku
- plan: 1 zdanie po polsku — jaka rolka rano, jaka wieczorem

Zwróć WYŁĄCZNIE JSON:
{ "week": [ { "day": "MON", "category": "...", "topic": "...", "hookOfDay": "...", "plan": "..." } ] }`;

      const parsed = await generateJsonWithFallback<{ week?: any[] }>({
        contents: prompt,
        temperature: 0.85,
        preferredModel: GEMINI_MODEL,
      });

      const week = Array.isArray(parsed?.week) && parsed.week.length === 7 ? parsed.week : null;
      if (!week) throw new Error("bad week structure");

      return res.json({
        source: "ai" as const,
        generatedAt: new Date().toISOString(),
        week: week.map((d: any, idx: number) => ({
          day: DAYS[idx],
          dayIndex: idx,
          category: WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length],
          topic: String(d.topic || WEEK_CATEGORIES[idx]),
          hookOfDay: String(d.hookOfDay || "")
            .replace(/["#*]/g, "")
            .trim(),
          plan: String(d.plan || ""),
        })),
      });
    } catch (err) {
      console.warn("weekly-autopilot fallback:", err);
      return res.json({
        source: "offline" as const,
        generatedAt: new Date().toISOString(),
        week: DAYS.map((day, idx) => ({
          day,
          dayIndex: idx,
          category: WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length],
          topic: WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length],
        })),
      });
    }
  });

  // ============ REROLL PROMPTU W TYM SAMYM STYLU ============
  app.post("/api/ai/reroll-prompt", async (req, res) => {
    const { referencePrompt = "", format = "1:1" } = req.body || {};
    const ai = getGeminiClient();
    const seed = Date.now();

    const styleCore =
      "dark minimalist composition, matte textures, moody directional lighting, cinematic chiaroscuro, high contrast, clean negative space, strictly no text, no letters, no watermark";

    if (!ai) {
      return res.json({
        source: "offline" as const,
        prompt: `Abstract minimalist enigmatic void, variant ${seed % 1000}, razor-thin sliver of cold diffuse light cutting through pure pitch black darkness, ${styleCore}, 8k ${format}`,
      });
    }

    try {
      const prompt = `Oto referencyjny prompt tła użyty wcześniej w marce @stark_focus:
"${referencePrompt}"

ZADANIE: Wygeneruj NOWY prompt tła w DOKŁADNIE TYM SAMYM stylu wizualnym (spójny feed!), ale z innym ujęciem/kompozycją (np. inne źródło światła, inna tekstura, inna perspektywa).
Zasady: po angielsku, jeden akapit, 8k ${format}, bez tekstu na obrazie, bez znaku wodnego, mroczny minimalizm.

Zwróć WYŁĄCZNIE JSON: { "prompt": "..." }`;

      const parsed = await generateJsonWithFallback<{ prompt?: string }>({
        contents: prompt,
        temperature: 0.9,
        preferredModel: GEMINI_MODEL,
      });

      if (parsed?.prompt && parsed.prompt.length > 40) {
        return res.json({ source: "ai" as const, prompt: parsed.prompt.trim() });
      }
      throw new Error("bad prompt");
    } catch (err) {
      console.warn("reroll-prompt fallback:", err);
      return res.json({
        source: "offline" as const,
        prompt: `Abstract minimalist enigmatic void, variation ${seed % 997}, single beam of cold light through atmospheric fog, ${styleCore}, 8k ${format}`,
      });
    }
  });
}
