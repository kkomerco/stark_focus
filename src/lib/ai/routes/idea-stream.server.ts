import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { hookFingerprint, maxSimilarity, SIMILARITY } from "../../similarity";
import { pick, pickN } from "../../random";
import { clampCount, clampInt, clampText, LIMITS } from "../../limits";
import { asArray, asString, asStringArray, oneOf } from "../normalize.server";
import { formatStarkCaption, STARK_HASHTAGS } from "../../caption";

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

/** UKŁADY, które potrafi narysować studio — prompt może żądać tylko tych. */
const IDEA_LAYOUTS = [
  "quote",
  "protocol_list",
  "cost_vs_reward",
  "monolith_ledger",
  "studio_wall_3d",
] as const;

/** Offline fallback — rotuje bank po liczbie użytych pomysłów, filtruje excludeHooks. */
function buildOfflineIdeas(count: number, usedCount: number, excludeHooks: string[]) {
  // Klient przesyła ODCISKI hooków (patrz hookFingerprint), więc obie strony
  // muszą porównywać odciski — surowy hook nigdy nie wypadłby równo.
  const excluded = new Set(excludeHooks.map(hookFingerprint));
  // Pełna historia potrafi mieć 500 wpisów; porównywanie tokenami 20 bankowych
  // hooków × 500 to 10 tys. setów na żądanie. Bierzemy najnowsze 150 — dokładne
  // duplikaty i tak wyłapuje `excluded`, okno służy tylko podobieństwom.
  const recentHooks = excludeHooks.slice(-150);
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
    if (excluded.has(hookFingerprint(hook))) continue;
    if (maxSimilarity(hook, recentHooks).score >= SIMILARITY.HARD_BLOCK) continue;
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
      caption: formatStarkCaption(hook, [
        "Stop negotiating with your weakness.",
        `The truth about ${cat.split(" ")[0]} nobody wants to hear.`,
        "Execute in silence. Prove them wrong.",
      ]),
      hashtags: [...STARK_HASHTAGS],
      theme: pick([...THEMES]),
      viralityScore: 90 + Math.floor(Math.random() * 10),
    });
    picked++;
  }
  return ideas;
}

/**
 * Bank offline ma 20 hooków, więc po kilku partiach bez klucza zostaje
 * pustelnia. Wolimy to powiedzieć w odpowiedzi, niż cicho wysłać mniej
 * pomysłów niż o nie proszono — „nieskończona liczba" bez tego jest kłamstwem.
 */
function offlineIdeasResponse(count: number, used: number, exclude: string[]) {
  const ideas = buildOfflineIdeas(count, used, exclude);
  const exhausted = ideas.length < count;
  return {
    generatedAt: new Date().toISOString(),
    source: "offline" as const,
    ideas,
    exhausted,
    notice: exhausted
      ? `Bank treści offline wyczerpany: zostało ${ideas.length} z ${count} pomysłów. Wyczyść historię albo ustaw GEMINI_API_KEY.`
      : undefined,
  };
}

export function registerIdeaStreamRoutes(app: MiniApp): void {
  app.post("/api/ai/idea-stream", async (req, res) => {
    const safeCount = clampCount(req.body?.count, 5);
    const topic = clampText(req.body?.topic, 300, "dark motivation and brutal discipline");
    const safeExclude: string[] = (
      Array.isArray(req.body?.excludeHooks) ? req.body.excludeHooks : []
    )
      .map((hook: unknown) => asString(hook))
      .filter(Boolean)
      .slice(0, LIMITS.maxExcludeHooks);
    // usedCount indeksuje bank offline: ujemny lub ułamkowy dałby `undefined`,
    // a potem `hook.toLowerCase()` poza try/catchem = 500.
    const safeUsed = clampInt(req.body?.usedCount, 0, 1_000_000, 0);

    if (!getGeminiClient()) {
      return res.json(offlineIdeasResponse(safeCount, safeUsed, safeExclude));
    }

    try {
      const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);
      const chosenCats = pickN([...CATEGORIES], Math.min(safeCount, 6));
      const chosenArchs = pickN([...HOOK_ARCHETYPES], Math.min(safeCount, 8));
      const chosenEmos = pickN([...EMOTIONAL_TARGETS], Math.min(safeCount, 6));
      const chosenFormats = pickN([...FORMATS], Math.min(safeCount, 4));

      const prompt = `Jesteś elitarnym strategiem treści dark motivation dla marki @stark_focus.
Temat nadrzędny: "${topic}".

ZADANIE: Wygeneruj DOKŁADNIE ${safeCount} CAŁKOWICIE UNIKALNYCH pomysłów, z których każdy ma UKŁAD WIZUALNY i GŁĘBIĘ, nie samo hasło.

ZIARNO LOSOWOŚCI: ${dynamicSeed}
LICZBA WCZEŚNIEJSZYCH POMYSŁÓW UŻYTKOWNIKA: ${safeUsed} (nie powtarzaj ich!)

UKŁADY (dobieraj świadomie; w jednej paczce użyj MINIMUM 3 różnych, nigdy nie dawaj wszystkiego jako "quote"):
- "quote" — jedno zdanie, dużo czerni wokół. Tylko na naprawdę mocne zdanie.
- "protocol_list" — teza + 3 numerowane kroki do wykonania dziś. Struktura "zrób to".
- "cost_vs_reward" — pytanie + 3 rzeczy, które kosztują dziś + 3 rzeczy, które to zabiera później + zdanie domykające BEZ odpowiedzi.
- "monolith_ledger" — nagłówek + 3 pozycje rejestru (co policzone, co odnotowane). Chłodna księgowość własnych obietnic.
- "studio_wall_3d" — jedno zdanie jako物理yczny napis na ścianie; musi działać jako obraz.

GŁĘBIA (to warunek jakości, nie opcja):
- Żadnych sloganów motywacyjnych. Zamiast "bądź zdyscyplinowany" — konkretna, niewygodna obserwacja, którą czytelnik musi dokończyć sam.
- Każdy pomysł ma zawierać jeden koszt, jedną liczbę albo jedną sprzeczność. Abstrakcja bez ceny nie zatrzymuje kciuka.
- 100% PO ANGIELSKU (hook, kroki, słupki, caption). Styl: Goggins spotyka Marka Aureliusza.

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
4. Hook max 10 słów.

Zwróć WYŁĄCZNIE JSON:
{
  "ideas": [
    {
      "layout": "quote|protocol_list|cost_vs_reward|monolith_ledger|studio_wall_3d",
      "structure": {
        "eyebrow": "tylko protocol/ledger: krótka etykieta, np. PROTOCOL 04:30",
        "statement": "teza albo pytanie otwierające",
        "steps": ["tylko protocol/ledger: 3 kroki/pozycje"],
        "figure": "tylko protocol: liczba-pieczęć, np. 72h",
        "question": "tylko cost_vs_reward: pytanie",
        "cost": ["3 rzeczy, które kosztują dziś"],
        "forfeit": ["3 rzeczy, które to zabiera później"],
        "closing": "tylko cost_vs_reward: zdanie domykające bez odpowiedzi"
      },
      "hook": "string (max 10 słów; dla układów strukturalnych to statement)",
      "category": "string",
      "archetype": "string",
      "emotionalTarget": "string",
      "format": "string",
      "phrases": ["hook", "kontrast", "puenta"],
      "caption": "opis z CTA i hashtagami",
      "hashtags": ["#stoicism", "..."],
      "theme": "obsidian_void|crimson_eclipse|emerald_abyss|carbon_aura|silver_mist",
      "viralityScore": 90
    }
  ]
}`;

      const parsed = await generateJsonWithFallback<{ ideas?: any[] }>({
        contents: prompt,
        temperature: 0.95,
        preferredModel: GEMINI_MODEL,
      });

      // Model ignoruje zakaz powtórek częściej, niżby chcieć — więc filtrujemy
      // po swojej stronie, a nie tylko prosimy w prompcie.
      const recentHooks = safeExclude.slice(-50);
      const seenInBatch = new Set<string>();
      const ideas = asArray(parsed.ideas)
        .map((item, idx) => {
          const idea = (item ?? {}) as Record<string, unknown>;
          const hook = asString(idea.hook).replace(/["#*]/g, "");
          const phrases = asStringArray(idea.phrases, 4);
          const rawStructure = (idea.structure ?? {}) as Record<string, unknown>;
          const layout = oneOf(idea.layout, IDEA_LAYOUTS, "quote");

          return {
            id: `idea-${Date.now()}-${idx + 1}`,
            layout,
            // Struktura jest nieufna jak każde pole z modelu: kroki tylko
            // stringowe, maks. 4, bez pustaków — render i tak by je pominął,
            // ale UI pokazywałby dziury w kadrze.
            structure: {
              eyebrow: asString(rawStructure.eyebrow).slice(0, 40),
              statement: asString(rawStructure.statement).slice(0, 160),
              steps: asStringArray(rawStructure.steps, 4).map((s) => s.slice(0, 90)),
              figure: asString(rawStructure.figure).slice(0, 12),
              question: asString(rawStructure.question).slice(0, 160),
              cost: asStringArray(rawStructure.cost, 4).map((s) => s.slice(0, 90)),
              forfeit: asStringArray(rawStructure.forfeit, 4).map((s) => s.slice(0, 90)),
              closing: asString(rawStructure.closing).slice(0, 120),
            },
            hook,
            category: asString(idea.category, chosenCats[idx % chosenCats.length]),
            archetype: asString(idea.archetype, chosenArchs[idx % chosenArchs.length]),
            emotionalTarget: asString(idea.emotionalTarget, chosenEmos[idx % chosenEmos.length]),
            format: asString(idea.format, chosenFormats[idx % chosenFormats.length]),
            phrases: phrases.length > 0 ? phrases : [hook],
            caption: asString(idea.caption),
            hashtags: asStringArray(idea.hashtags, 6),
            theme: oneOf(idea.theme, THEMES, "obsidian_void"),
            viralityScore: clampInt(idea.viralityScore, 0, 100, 92),
          };
        })
        .filter((idea) => idea.hook.length > 5)
        .filter((idea) => {
          const fingerprint = hookFingerprint(idea.hook);
          if (seenInBatch.has(fingerprint)) return false;
          if (maxSimilarity(idea.hook, recentHooks).score >= SIMILARITY.HARD_BLOCK) return false;
          seenInBatch.add(fingerprint);
          return true;
        })
        .slice(0, safeCount);

      if (ideas.length === 0) {
        return res.json(offlineIdeasResponse(safeCount, safeUsed, safeExclude));
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai" as const,
        ideas,
        // Model rzadko oddaje dokładnie N po przefiltrowaniu powtórek —
        // bez tego UI pokazuje skróconą partię jak pełną.
        exhausted: ideas.length < safeCount,
        notice:
          ideas.length < safeCount
            ? `Model oddał ${ideas.length} z ${safeCount} pomysłów bez powtórek — spróbuj ponownie albo wyczyść historię.`
            : undefined,
      });
    } catch (err) {
      console.warn("Idea stream error:", err);
      return res.json(offlineIdeasResponse(safeCount, safeUsed, safeExclude));
    }
  });
}
