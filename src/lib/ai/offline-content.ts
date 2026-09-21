/**
 * Centralne repozytorium treści offline dla marki @stark_focus.
 *
 * Zapobiega duplikacji hooków, narracji i wariantów A/B w wielu trasach AI
 * (deconstruct, growth, idea-stream, daily-pack). Każda zmiana tonu marki
 * lub banku awaryjnego odbywa się w tym jednym pliku.
 */
import { formatStarkCaption } from "../caption";

export interface StarkVariant {
  id?: string;
  hook: string;
  angle: string;
  phrases: string[];
  theme?: string;
  cta?: string;
  viralityScore?: number;
}

export const DARK_MOTIVATION_CATEGORIES = [
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

export const HOOK_ARCHETYPES = [
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

export const EMOTIONAL_TARGETS = [
  "guilt about wasted potential",
  "anger at own weakness",
  "fear of staying average",
  "pride in silent grind",
  "disgust at mediocrity",
  "awe of discipline",
  "urgency of time running out",
  "relief through acceptance of pain",
] as const;

export const FORMATS = [
  "7-second punch reel",
  "3-phase narrative",
  "4-phrase ladder",
  "single brutal quote",
  "callout carousel hook",
] as const;

export const REEL_THEMES = [
  "obsidian_void",
  "crimson_eclipse",
  "emerald_abyss",
  "carbon_aura",
  "silver_mist",
] as const;

/**
 * Kanoniczny bank hooków offline marki @stark_focus.
 */
export const OFFLINE_HOOK_BANK: readonly string[] = [
  "Your comfort zone is a coffin with Wi-Fi.",
  "They see your silence and call it weakness. Let them.",
  "3 AM is the only honest hour you have left.",
  "5 AM decides who owns the next 20 years.",
  "Comfort is a cage with the door wide open.",
  "Your potential is watching you waste it.",
  "You don't lack time. You lack standards.",
  "Nobody is coming to save you. That is the good news.",
  "The gym is empty at 5 AM. So is the competition.",
  "Every scroll is a vote for the life you hate.",
  "Discipline is choosing what you want most over what you want now.",
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
  "Never announce your moves to spectators.",
  "Starve the distraction. Feed the focus.",
  "Disappear for 6 months in private.",
  "Your feelings are irrelevant to your duty.",
  "Master the art of being alone.",
  "Care nothing about opinions outside your control.",
  "Walk like a king, or walk like you don't care who the king is.",
  "Notice how they treat you when you no longer need them.",
  "The version of you they remember no longer exists.",
  "If you don't build your peace, someone sells you their chaos.",
  "Excuses destroy self-respect.",
  "Commit with total finality.",
  "Silence cannot be misquoted.",
];

/**
 * Szablony wielofazowych narracji Stark używane jako warianty w dekonstrukcji i testach A/B.
 */
export const OFFLINE_STARK_VARIANTS: readonly StarkVariant[] = [
  {
    hook: "Your comfort zone is a coffin with Wi-Fi.",
    angle: "Pattern destruction",
    phrases: [
      "Your comfort zone is a coffin with Wi-Fi.",
      "Every scroll is a nail in your potential.",
      "Close the app. Open your future.",
    ],
    theme: "obsidian_void",
    cta: "Save this if you needed the push.",
    viralityScore: 94,
  },
  {
    hook: "They see your silence and call it weakness.",
    angle: "Silent authority",
    phrases: [
      "They see your silence and call it weakness.",
      "Let them underestimate you.",
      "Your results will be the loudest answer.",
    ],
    theme: "carbon_aura",
    cta: "Follow for silent execution protocols.",
    viralityScore: 92,
  },
  {
    hook: "3 AM is the only honest hour you have left.",
    angle: "Konkret + wykluczenie",
    phrases: [
      "3 AM is the only honest hour you have left.",
      "No noise. No spectators. Just the work.",
      "Most men never meet themselves. You will tonight.",
    ],
    theme: "carbon_aura",
    cta: "Follow for the 3 AM protocol.",
    viralityScore: 93,
  },
  {
    hook: "Comfort is a cage with the door wide open.",
    angle: "Konfrontacja z wymówką",
    phrases: [
      "Comfort is a cage with the door wide open.",
      "You stay because it hurts less than leaving.",
      "Walk out. Now.",
    ],
    theme: "obsidian_void",
    cta: "Save this reminder.",
    viralityScore: 91,
  },
  {
    hook: "Your potential is watching you waste it.",
    angle: "Wyrzut sumienia",
    phrases: [
      "Your potential is watching you waste it.",
      "Every scroll is a vote for the life you hate.",
      "Cast the other vote. Today.",
    ],
    theme: "obsidian_void",
    cta: "Save this reminder.",
    viralityScore: 95,
  },
  {
    hook: "5 AM decides who owns the next 20 years.",
    angle: "Konkret + stawka",
    phrases: [
      "5 AM decides who owns the next 20 years.",
      "The world belongs to those already awake.",
      "Join the ones who don't negotiate.",
    ],
    theme: "carbon_aura",
    cta: "Follow for daily 5 AM calls.",
    viralityScore: 93,
  },
];

function pickN<T>(items: readonly T[], n: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(n, items.length)));
}

/**
 * Zwraca warianty Stark z unikalnymi identyfikatorami dla danego ziarna (seed).
 */
export function getOfflineStarkVariants(
  seed: number = Date.now(),
  count: number = 2,
): StarkVariant[] {
  const offset = Math.abs(seed) % OFFLINE_STARK_VARIANTS.length;
  const result: StarkVariant[] = [];
  for (let i = 0; i < count; i++) {
    const item = OFFLINE_STARK_VARIANTS[(offset + i) % OFFLINE_STARK_VARIANTS.length];
    result.push({
      ...item,
      id: `variant-${seed}-${i + 1}`,
    });
  }
  return result;
}

/**
 * Zwraca 2 warianty A/B dla eksperymentów growth.
 */
export function getOfflineAbVariants(seed: number = Date.now()): Array<{
  label: string;
  hook: string;
  angle: string;
  phrases: string[];
  theme: string;
  cta: string;
}> {
  const variants = getOfflineStarkVariants(seed, 2);
  return [
    {
      label: "A",
      hook: variants[0].hook,
      angle: variants[0].angle,
      phrases: variants[0].phrases,
      theme: variants[0].theme || "obsidian_void",
      cta: variants[0].cta || "Save this if you needed the push.",
    },
    {
      label: "B",
      hook: variants[1].hook,
      angle: variants[1].angle,
      phrases: variants[1].phrases,
      theme: variants[1].theme || "carbon_aura",
      cta: variants[1].cta || "Follow for protocols.",
    },
  ];
}

/**
 * Generator pomysłów offline dla Idea Stream z filtracją wykluczeń i rotacją.
 */
export function buildOfflineIdeaStream(
  count: number,
  usedCount: number,
  excludeHooks: string[] = [],
) {
  const excluded = new Set(excludeHooks.map((h) => h.toLowerCase().trim()));
  const ideas = [];
  const timestamp = Date.now();
  const cats = pickN(
    [...DARK_MOTIVATION_CATEGORIES],
    Math.min(count, DARK_MOTIVATION_CATEGORIES.length),
  );
  const archs = pickN([...HOOK_ARCHETYPES], Math.min(count, HOOK_ARCHETYPES.length));
  const emos = pickN([...EMOTIONAL_TARGETS], Math.min(count, EMOTIONAL_TARGETS.length));

  let picked = 0;
  let bankIdx = (usedCount * 3) % OFFLINE_HOOK_BANK.length;
  const maxScan = OFFLINE_HOOK_BANK.length * 3;
  let scanned = 0;

  while (picked < count && scanned < maxScan) {
    const hook = OFFLINE_HOOK_BANK[bankIdx % OFFLINE_HOOK_BANK.length];
    scanned++;
    bankIdx++;
    if (!excluded.has(hook.toLowerCase().trim())) {
      ideas.push({
        id: `offline-idea-${timestamp}-${picked + 1}`,
        hook,
        category: cats[picked % cats.length],
        archetype: archs[picked % archs.length],
        emotionalTarget: emos[picked % emos.length],
        format: FORMATS[picked % FORMATS.length],
        phrases: [
          hook,
          "They think you gave up. Let them think that.",
          "Show up every day until the numbers can't be ignored.",
        ],
        caption: formatStarkCaption(
          hook,
          [
            "Do not explain your standards to anyone.",
            "Never negotiate with your internal weakness.",
            "Show up until your execution cannot be denied.",
          ],
          "Execute in total silence.",
        ),
        hashtags: ["#darkmotivation", "#discipline", "#monkmode", "#hardwork", "#starkfocus"],
        theme: REEL_THEMES[picked % REEL_THEMES.length],
        viralityScore: 90 + ((picked * 3) % 9),
      });
      picked++;
    }
  }

  // Fallback awaryjny gdyby wykluczenia odrzuciły wszystkie hooki
  if (ideas.length === 0) {
    const fallbackHook = OFFLINE_HOOK_BANK[bankIdx % OFFLINE_HOOK_BANK.length];
    ideas.push({
      id: `offline-idea-${timestamp}-1`,
      hook: fallbackHook,
      category: cats[0] || "discipline vs motivation",
      archetype: archs[0] || "direct confrontation",
      emotionalTarget: emos[0] || "urgency of time running out",
      format: FORMATS[0],
      phrases: [fallbackHook, "Nobody is coming.", "Execute."],
      caption: formatStarkCaption(
        fallbackHook,
        [
          "Nobody is coming to save you.",
          "Time is silently running down.",
          "Your work in private defines you.",
        ],
        "Save this reminder. Execute.",
      ),
      hashtags: ["#darkmotivation", "#discipline"],
      theme: REEL_THEMES[0],
      viralityScore: 92,
    });
  }

  return ideas;
}
