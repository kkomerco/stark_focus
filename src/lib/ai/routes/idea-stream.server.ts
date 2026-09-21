import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import {
  DARK_MOTIVATION_CATEGORIES,
  HOOK_ARCHETYPES,
  EMOTIONAL_TARGETS,
  FORMATS,
  buildOfflineIdeaStream,
} from "../offline-content";

/**
 * IDEA STREAM — nieskończony generator pomysłów z silną anty-powtórką.
 * Klient przesyła excludeHooks (historię z localStorage); serwer każe AI ich unikać.
 */

function pickN<T>(items: readonly T[], n: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(n, items.length)));
}

export function registerIdeaStreamRoutes(app: MiniApp): void {
  app.post("/api/ai/idea-stream", async (req, res) => {
    const {
      count = 5,
      excludeHooks = [],
      usedCount = 0,
      topic = "dark motivation and brutal discipline",
    } = req.body || {};

    const safeCount = Math.max(1, Math.min(Number(count) || 5, 20));
    const safeExclude = Array.isArray(excludeHooks) ? excludeHooks.map(String) : [];
    const safeUsed = Number(usedCount) || 0;

    if (!getGeminiClient()) {
      return res.json({
        generatedAt: new Date().toISOString(),
        source: "offline" as const,
        ideas: buildOfflineIdeaStream(safeCount, safeUsed, safeExclude),
      });
    }

    try {
      const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);
      const chosenCats = pickN([...DARK_MOTIVATION_CATEGORIES], Math.min(safeCount, 6));
      const chosenArchs = pickN([...HOOK_ARCHETYPES], Math.min(safeCount, 8));
      const chosenEmos = pickN([...EMOTIONAL_TARGETS], Math.min(safeCount, 6));
      const chosenFormats = pickN([...FORMATS], Math.min(safeCount, 4));

      const prompt = `Jesteś elitarnym strategiem treści dark motivation dla marki @stark_focus.
Temat nadrzędny: "${topic}".

ZADANIE: Wygeneruj DOKŁADNIE ${safeCount} CAŁKOWICIE UNIKALNYCH pomysłów na treści.

ZIARNO LOSOWOŚCI: ${dynamicSeed}
LICZBA WCZEŚNIEJSZYCH POMYSŁÓW UŻYTKOWNIKA: ${safeUsed} (nie powtarzaj ich!)

MATRYCA (używaj różnych kombinacji):
- Kategorie: ${chosenCats.join(" | ")}
- Archetypy hooków: ${chosenArchs.join(" | ")}
- Cele emocjonalne: ${chosenEmos.join(" | ")}
- Formaty: ${chosenFormats.join(" | ")}

ZAKAZY:
1. NIE używaj żadnego z tych hooków (ani mutacji):
${
  safeExclude
    .slice(-30)
    .map((h) => `   - "${h}"`)
    .join("\n") || "   (brak historii)"
}
2. NIE używaj: "believe in yourself", "never give up", "stay motivated".
3. NIE powtarzaj struktury zdania w tej samej paczce.
4. Hook max 10 słów, 100% po angielsku. Styl: Goggins meets Aurelius.

Zwróć WYŁĄCZNIE JSON:
{
  "ideas": [
    {
      "hook": "string",
      "category": "string",
      "archetype": "string",
      "emotionalTarget": "string",
      "format": "string",
      "phrases": ["hook", "kontrast", "puenta"],
      "caption": "opis z CTA i hashtagami",
      "hashtags": ["#darkmotivation", "..."],
      "theme": "obsidian_void|crimson_eclipse|emerald_abyss|carbon_aura|silver_mist",
      "viralityScore": 90
    }
  ]
}`;

      const parsed = await generateJsonWithFallback<{ ideas?: any[] }>({
        contents: prompt,
        temperature: 0.95,
        model: GEMINI_MODEL,
      });

      const ideas = Array.isArray(parsed?.ideas) ? parsed.ideas : [];
      const validIdeas = ideas
        .filter((i) => typeof i?.hook === "string" && i.hook.trim().length > 5)
        .map((i, idx) => ({
          id: `idea-${Date.now()}-${idx + 1}`,
          hook: String(i.hook).replace(/["#*]/g, "").trim(),
          category: String(i.category || chosenCats[idx % chosenCats.length]),
          archetype: String(i.archetype || chosenArchs[idx % chosenArchs.length]),
          emotionalTarget: String(i.emotionalTarget || chosenEmos[idx % chosenEmos.length]),
          format: String(i.format || chosenFormats[idx % chosenFormats.length]),
          phrases: Array.isArray(i.phrases) ? i.phrases.slice(0, 4) : [i.hook],
          caption: String(i.caption || ""),
          hashtags: Array.isArray(i.hashtags) ? i.hashtags.slice(0, 6) : ["#darkmotivation"],
          theme: String(i.theme || "obsidian_void"),
          viralityScore: typeof i.viralityScore === "number" ? i.viralityScore : 92,
        }));

      if (validIdeas.length === 0) {
        return res.json({
          generatedAt: new Date().toISOString(),
          source: "offline" as const,
          ideas: buildOfflineIdeaStream(safeCount, safeUsed, safeExclude),
        });
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai" as const,
        ideas: validIdeas,
      });
    } catch (err) {
      console.warn("Idea stream error:", err);
      return res.json({
        generatedAt: new Date().toISOString(),
        source: "offline" as const,
        ideas: buildOfflineIdeaStream(safeCount, safeUsed, safeExclude),
      });
    }
  });
}
