import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJson, getGeminiClient } from "../gemini.server";

/**
 * IDEA STREAM — nieskończony generator pomysłów z silną anty-powtórką.
 * Klient przesyła excludeHooks (historię z localStorage); serwer każe AI ich unikać.
 */

const CATEGORIES = [
  "discipline vs motivation",
  "hard work ethos & suffering",
  "monk mode & solitude",
  "mental toughness & pain",
  "silence & strategic power",
  "dopamine detox & focus",
  "iron standards & self-respect",
  "time urgency & memento mori",
  "comfort zone destruction",
  "enemies & haters as fuel",
] as const;

const HOOK_ARCHETYPES = [
  "direct confrontation (You...)",
  "uncomfortable truth statement",
  "paradox / counterintuitive claim",
  "numbers & specificity (3AM, 99%, 1 hour)",
  "enemy reveal (They want you...)",
  "future regret projection",
  "silent authority (Kings never...)",
  "challenge / dare",
  "myth destruction (Motivation is a lie)",
  "before/after identity shift",
] as const;

const EMOTIONAL_TARGETS = [
  "guilt about wasted potential",
  "anger at own weakness",
  "fear of staying average",
  "pride in silent grind",
  "disgust at mediocrity",
  "awe of discipline",
  "urgency of time running out",
  "relief through acceptance of pain",
] as const;

const FORMATS = [
  "7-second punch reel",
  "3-phase narrative",
  "4-phrase ladder",
  "single brutal quote",
  "callout carousel hook",
] as const;

const THEMES = [
  "obsidian_void",
  "crimson_eclipse",
  "emerald_abyss",
  "carbon_aura",
  "silver_mist",
] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickN<T>(items: readonly T[], n: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(n, items.length)));
}

/** Offline fallback — rotuje bank po liczbie użytych pomysłów, filtruje excludeHooks. */
function buildOfflineIdeas(count: number, usedCount: number, excludeHooks: string[]) {
  const excluded = new Set(excludeHooks.map((h) => h.toLowerCase().trim()));
  const ideas = [];
  const timestamp = Date.now();
  const cats = pickN([...CATEGORIES], Math.min(count, CATEGORIES.length));
  const archs = pickN([...HOOK_ARCHETYPES], Math.min(count, HOOK_ARCHETYPES.length));
  const emos = pickN([...EMOTIONAL_TARGETS], Math.min(count, EMOTIONAL_TARGETS.length));

  const offlineHookBank = [
    "Your comfort zone is a coffin with Wi-Fi.",
    "They see your silence and call it weakness. Let them.",
    "You don't lack time. You lack the courage to say no.",
    "The gym is empty at 5 AM. So is the competition.",
    "Every scroll is a vote for the life you hate.",
    "Discipline is choosing what you want most over what you want now.",
    "Your potential is watching you waste it.",
    "Nobody is coming to save you. That is the good news.",
    "The pain of regret weighs more than the pain of discipline.",
    "You are not tired. You are bored and over-stimulated.",
    "Hard work beats talent when talent is scrolling.",
    "Silence is the loudest answer to doubt.",
    "Your excuses are the only thing you produce consistently.",
    "The mirror doesn't lie. Your standards do.",
    "Kings build in silence. Clowns announce their plans.",
    "You broke promises to everyone. Stop breaking them to yourself.",
    "Comfort is the enemy wearing a friendly face.",
    "The 1% are not lucky. They are just willing to be bored longer.",
    "Your phone died. Your dreams didn't. Act like it.",
    "If it was easy, the reward would be worthless.",
  ];

  let picked = 0;
  let bankIdx = (usedCount * 3) % offlineHookBank.length;
  const maxScan = offlineHookBank.length * 3;
  let scanned = 0;
  while (picked < count && scanned < maxScan) {
    const hook = offlineHookBank[bankIdx % offlineHookBank.length];
    scanned++;
    bankIdx++;
    if (excluded.has(hook.toLowerCase().trim())) continue;
    const cat = cats[picked % cats.length];
    ideas.push({
      id: `idea-${timestamp}-${picked + 1}`,
      hook,
      category: cat,
      archetype: archs[picked % archs.length],
      emotionalTarget: emos[picked % emos.length],
      format: pick([...FORMATS]),
      phrases: [
        hook,
        `The truth about ${cat.split(" ")[0]} nobody wants to hear.`,
        "Execute in silence. Prove them wrong.",
      ],
      caption: `${hook}\n\nStop negotiating with your weakness.\n\nSave this. Follow @stark_focus.\n\n#darkmotivation #discipline #hardwork #mindset #starkfocus`,
      hashtags: ["#darkmotivation", "#discipline", "#hardwork", "#mindset", "#starkfocus"],
      theme: pick([...THEMES]),
      viralityScore: 90 + Math.floor(Math.random() * 10),
    });
    picked++;
  }
  return ideas;
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
        ideas: buildOfflineIdeas(safeCount, safeUsed, safeExclude),
      });
    }

    try {
      const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);
      const chosenCats = pickN([...CATEGORIES], Math.min(safeCount, 6));
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

      const parsed = await generateJson<{ ideas?: any[] }>({
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
          ideas: buildOfflineIdeas(safeCount, safeUsed, safeExclude),
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
        ideas: buildOfflineIdeas(safeCount, safeUsed, safeExclude),
      });
    }
  });
}
