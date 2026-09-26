import type { MiniApp, MiniResponse } from "../../mini-express.server";
import { callGeminiWithFallback, getGeminiClient, safeJsonParse } from "../gemini.server";
import {
  asArray,
  asNumber,
  asString,
  asStringArray,
  oneOf,
  sendDegraded,
} from "../normalize.server";
import { clampText, clampTextList } from "../../limits";
import { formatStarkCaption, isPolishCopy, starkCaption, starkHashtags } from "../../caption";
import { HOOK_CRAFT_PROMPT, auditHook, auditLine } from "../../hookCraft";
import { hookFingerprint, maxSimilarity, SIMILARITY } from "../../similarity";
import { softenForPlatform } from "../../platformSafe";

/**
 * RADAR TREŚCI: wątki z niszy, formaty wiralowe, kąty psychologiczne, paradoksy
 * i recykler. Wszystkie pięć silników oddaje UI zdania po angielsku, więc
 * wszystkie przechodzą to samo co reszta marki — rzemiosło z `hookCraft`,
 * anty-powtórka z `excludeHooks` i ogon liczony w `caption.ts`.
 */

/** Tematy dozwolone promptom — ten sam słownik zna studio rolki. */
const THEMES = [
  "obsidian_void",
  "crimson_eclipse",
  "emerald_abyss",
  "carbon_aura",
  "silver_mist",
] as const;

/** Miara wiersza jak w `frames.server`: faza czy krok jest dłuższy niż teza. */
const ROW_MAX_WORDS = 16;

/** Ile linii historii wchodzi w prompt i w pomiar podobieństwa (za znak płaci się). */
const PROMPT_TAIL = 30;
const SIMILAR_TAIL = 60;

const REASON = {
  polish: "polski w materiale",
  published: "powtórka tego, co już poszło w feedzie",
  internal: "powtórka w tej samej odpowiedzi",
} as const;

/**
 * Którą miarę przyłożyć. `hook` to teza (figura retoryczna, 3-12 słów),
 * `line` to wiersz struktury, `plain` to proza i bank treści — limit hooka na
 * akapicie karałby treść, a nie jakość.
 */
type Measure = "hook" | "line" | "plain";

export interface Craft {
  /** Odciski z feedu: dosłowne powtórki. */
  banned: Set<string>;
  /** Ogon historii: mutacje, nie tylko kopie. */
  recent: string[];
  /** Linie przyjęte w tej odpowiedzi — druga karta nie powtórzy pierwszej. */
  accepted: Set<string>;
  /** Powody odmów, żeby `notice` mówił, co naprawdę wypadło. */
  reasons: string[];
}

export function createCraft(exclude: string[]): Craft {
  return {
    banned: new Set(exclude.map(hookFingerprint)),
    recent: exclude.slice(-SIMILAR_TAIL),
    accepted: new Set(),
    reasons: [],
  };
}

/** Karta przyjęta: jej zdania nie mogą wrócić w kolejnej karcie tej samej odpowiedzi. */
function commit(craft: Craft, lines: readonly (string | undefined)[]): void {
  for (const line of lines) {
    if (line) craft.accepted.add(hookFingerprint(line));
  }
}

/** Etykieta powodu bez cytowanego fragmentu — inaczej licznik nie ma czego zliczyć. */
function issueLabel(issue: string): string {
  return issue.split(/\s*[("„]/)[0].trim() || issue;
}

/** Markdown z modelu nie wchodzi na kadr. */
function cleanText(value: unknown): string {
  return asString(value).replace(/[*#"]/g, "").replace(/\s+/g, " ").trim();
}

function auditMeasure(text: string, measure: Measure) {
  if (measure === "hook") return auditHook(text);
  if (measure === "line") return auditLine(text, ROW_MAX_WORDS);
  return null;
}

function repeatReason(text: string, craft: Craft): string | null {
  // Klient zna treść, którą DOSTAŁ: `sendDegraded` zmiękcza risky słowa dopiero
  // na wyjściu, więc odcisk surowej linii banku nie zawsze zgadza się z tym, co
  // siedzi w historii. Porównujemy oba kształty, jedną funkcją z `similarity.ts`.
  const keys = [hookFingerprint(text), hookFingerprint(softenForPlatform(text))];
  if (keys.some((key) => craft.banned.has(key))) return REASON.published;
  if (keys.some((key) => craft.accepted.has(key))) return REASON.internal;
  if (maxSimilarity(text, craft.recent).score >= SIMILARITY.HARD_BLOCK) return REASON.published;
  return null;
}

/**
 * Wyrok na jedno zdanie materiału: pusty napis znaczy „nie wolno pokazać”.
 * Odpada wiersz, nigdy cała karta — karta znika dopiero wtedy, gdy nie ma na
 * niej już czego przeczytać.
 */
export function craftLine(value: unknown, craft: Craft, measure: Measure): string {
  const text = cleanText(value);
  if (!text) return "";
  if (isPolishCopy(text)) {
    craft.reasons.push(REASON.polish);
    return "";
  }
  const repeat = repeatReason(text, craft);
  if (repeat) {
    craft.reasons.push(repeat);
    return "";
  }
  const audit = auditMeasure(text, measure);
  if (audit && !audit.ok) {
    craft.reasons.push(...audit.issues.map(issueLabel));
    return "";
  }
  return text;
}

function craftLines(value: unknown, craft: Craft, measure: Measure, max = 8): string[] {
  return asStringArray(value, max)
    .map((line) => craftLine(line, craft, measure))
    .filter(Boolean);
}

/** Bank treści przechodzi tylko anty-powtórka i polszczyznę — nie własną miarę. */
function freshLines(lines: readonly string[], craft: Craft): string[] {
  return lines.map((line) => craftLine(line, craft, "plain")).filter(Boolean);
}

/**
 * Opis pod kartą to proza, więc bez miary wiersza — ale zdanie, które już
 * poszło w feedzie (albo powtarza tezę tej karty), nie ma prawa wrócić w
 * środku opisu.
 */
function captionBody(value: unknown, craft: Craft): string {
  return asString(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => craftLine(sentence, craft, "plain"))
    .filter(Boolean)
    .join(" ");
}

/** Notatka dla autora (po polsku albo po angielsku): przycinamy, nie kasujemy. */
function noteOf(value: unknown, max: number): string {
  return clampText(asString(value), max);
}

/** Licznik w raportach: „rym (3), powtórka tego, co już poszło w feedzie (1)”. */
function tally(reasons: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pl"))
    .map(([reason, count]) => `${reason} (${count})`);
}

/**
 * Pusta sekcja radaru bez przyczyny wygląda jak kaprys modelu, więc ją
 * nazywamy — ten sam kształt odpowiedzi co `notice` w `frames.server` i
 * `idea-stream.server`.
 */
function rejectionNotice(craft: Craft, what: string): string {
  const details = tally(craft.reasons);
  if (details.length === 0) return `Brak materiału w ${what} — spróbuj ponownie.`;
  return `W ${what} nie zostało nic do pokazania: ${details.join(", ")}.`;
}

/**
 * Bank w miejsce wyniku modelu musi powiedzieć, że to bank. Bez tego jeden
 * przekręcony rym wyglądałby jak „model nie miał zdania”.
 */
function bankMessage(craft: Craft, fallback: string): string {
  const details = tally(craft.reasons);
  if (details.length === 0) return fallback;
  return `${fallback} Zdania od modelu odpadły w kontroli: ${details.join(", ")}.`;
}

/** Blok wykluczeń — sformułowany dokładnie tak jak w `frames.server`. */
export function excludeBlock(exclude: readonly string[]): string {
  if (exclude.length === 0) return "";
  return (
    `JUŻ OPUBLIKOWANE — nie powtarzaj tych linii ani ich mutacji:\n` +
    exclude
      .slice(-PROMPT_TAIL)
      .map((line) => `- ${line}`)
      .join("\n") +
    "\n"
  );
}

/** Sekundy rolki: model potrafi oddać `null`, tekst albo godzinę w sekundach. */
function clampDuration(value: unknown): number {
  return Math.min(60, Math.max(4, Math.round(asNumber(value, 8))));
}

// ============ BANKI TREŚCI (odpowiedź zapasowa, nie wynik modelu) ============

interface BankTrend {
  title: string;
  suggested_format: string;
  estimated_virality: string;
  source_context: string;
  audience_pain: string;
  viral_hooks: string[];
  core_message: string;
  bingPrompt: string;
  draft: { hook: string; supportingText: string; lines: string[] };
}

/**
 * `trend.id` jest kluczem Reacta, więc numery idą per żądanie — stały zestaw
 * identyfikatorów z evaluate'u modułu sprawiał, że druga partia nie odświeżała
 * niczego w „dodane do planera”.
 */
const BANK_TRENDS: BankTrend[] = [
  {
    title: "The Cost of Comfort",
    suggested_format: "Rolka 7-Sekundowa (Short Reel)",
    estimated_virality: "97%",
    source_context: "TikTok Viral Sound FYP",
    audience_pain: "Poczucie marnowania potencjału i ucieczka w scrollowanie",
    viral_hooks: [
      "Comfort is a cage disguised as peace.",
      "Every minute of comfort costs you 10 hours of future freedom.",
      "You are not tired. You are uninspired and over-stimulated.",
    ],
    core_message:
      "Wygoda osłabia wolę walki. Prawdziwy spokój rodzi się z rygoru, a nie z ucieczki.",
    bingPrompt:
      "Cinematic dark brutalist concrete monolith, mist, moody directional light, 9:16 vertical, ultra sharp 8k",
    draft: {
      hook: "Comfort is a cage disguised as peace.",
      supportingText: "Stop negotiating with your weakness.",
      lines: [
        "Every time you choose comfort, you trade your future for cheap dopamine.",
        "Peace is earned in private, not purchased in public.",
        "Hold the standard when nobody is watching.",
      ],
    },
  },
  {
    title: "Execute In Total Silence",
    suggested_format: "3D Wall Letters / Brutalist Quote",
    estimated_virality: "94%",
    source_context: "IG Reels Dark Aesthetic",
    audience_pain: "Mówienie o swoich planach zamiast ich bezwzględnej realizacji",
    viral_hooks: [
      "Never announce your moves to spectators.",
      "Silence protects your energy. Results speak louder.",
      "If they know what you are doing, you talk too much.",
    ],
    core_message: "Zachowaj plany w tajemnicy dopóki nie staną się rzeczywistością.",
    bingPrompt:
      "Minimalist studio wall with physical black matte 3d lettering, warm overhead lamp spotlight, grey concrete, 9:16",
    draft: {
      hook: "Never announce your moves to spectators.",
      supportingText: "Results are the only language that matters.",
      lines: [
        "Private victories build permanent foundations.",
        "Public applause is ephemeral.",
        "Let the results do the talking.",
      ],
    },
  },
  {
    title: "The Solitude Protocol",
    suggested_format: "Karuzela 5-Slajdowa (IG Slides)",
    estimated_virality: "95%",
    source_context: "Twitter/X Viral Thread & IG Carousel",
    audience_pain: "Lęk przed samotnością i uleganie presji otoczenia",
    viral_hooks: [
      "Learn to sit alone in a room without checking your phone.",
      "The strongest weapon in modern world is immunity to distraction.",
      "Solitude is where kings are forged; crowds are where they conform.",
    ],
    core_message:
      "Zdolność do przebywania w samotności i skupienia to najrzadsza waluta XXI wieku.",
    bingPrompt:
      "Dark aesthetic architectural room, single beam of sunlight, solitary silhouette, 35mm film grain, 9:16",
    draft: {
      hook: "Learn to sit alone in a room without checking your phone.",
      supportingText: "Master solitude before you seek mastery over anything else.",
      lines: [
        "When you master your attention, you master your life.",
        "Solitude is where standards are tested.",
        "Noise is the anesthetic you keep reaching for.",
      ],
    },
  },
];

/** Karty banku: hook + trzy fazy + notatka psychologiczna po polsku. */
interface BankCard {
  name: string;
  hook: string;
  phrases: string[];
  rationale: string;
  theme?: string;
  captionLine?: string;
  cardId?: string;
}

const BANK_FORMATS: BankCard[] = [
  {
    name: "The Harsh Truth Formula",
    hook: "The harsh truth about why you're still undisciplined.",
    phrases: [
      "The harsh truth about why you're still undisciplined.",
      "You wait for emotion before you take action.",
      "The stoic executes regardless of mood.",
    ],
    theme: "obsidian_void",
    rationale:
      "Wywołuje natychmiastowe zatrzymanie uwagi przez uderzenie w dumę i bezpośrednią konfrontację.",
  },
  {
    name: "The 99% Failure Asymmetry",
    hook: "Why 99% fail to maintain monk mode.",
    phrases: [
      "Why 99% fail to maintain monk mode.",
      "They announce their plans before the habit is forged.",
      "Silence is the fuel of genuine transformation.",
    ],
    theme: "carbon_aura",
    rationale:
      "Segmentuje widza ponad przeciętną większość i wzbudza potrzebę udowodnienia swojej odporności.",
  },
  {
    name: "The Comfortable Delusion",
    hook: "The 4:00 AM delusion that keeps you average.",
    phrases: [
      "The 4:00 AM delusion that keeps you average.",
      "Waking up early is useless if your mind remains distracted.",
      "Focus on depth, not the clock.",
    ],
    theme: "silver_mist",
    rationale: "Burzy powszechny mit samorozwojowy i dostarcza głębszego aksjomatu stoickiego.",
  },
  {
    name: "The Silent Saboteur",
    hook: "3 silent killers of your dopamine baseline.",
    phrases: [
      "3 silent killers of your dopamine baseline.",
      "Morning scrolling. Unearned praise. Constant notifications.",
      "Starve the cheap inputs. Reclaim the citadel.",
    ],
    theme: "emerald_abyss",
    rationale:
      "Opiera się o neurobiologię i strach przed cichą utratą kontroli nad własnym potencjałem.",
  },
];

const BANK_ANGLES: BankCard[] = [
  {
    name: "Prowokacja & Kontrowersja",
    cardId: "controversial",
    hook: "Motivation is an excuse invented by the weak.",
    phrases: [
      "Motivation is an excuse invented by the weak.",
      "Waiting to feel ready is comfortable self-sabotage.",
      "The professional moves before the brain can argue.",
    ],
    captionLine: "Stop waiting for inspiration. It never arrives for spectators.",
    rationale: "Przełamuje powszechne przekonanie i natychmiast polaryzuje odbiorcę.",
  },
  {
    name: "Rzymski Stoicyzm (Marcus Aurelius)",
    cardId: "roman_stoic",
    hook: "You have power over your mind, not outside events.",
    phrases: [
      "You have power over your mind, not outside events.",
      "Realize this, and you will find unbreakable strength.",
      "Return to the citadel within.",
    ],
    captionLine: "External chaos only rules you if you grant it permission. Master yourself first.",
    rationale:
      "Odwołuje się do 2000 lat imperialnej mądrości i głębokiej suwerenności emocjonalnej.",
  },
  {
    name: "Neurobiologia & Układ Dopaminy",
    cardId: "neurobiology",
    hook: "Resistance is your anterior mid-cingulate cortex growing.",
    phrases: [
      "Resistance is your anterior mid-cingulate cortex growing.",
      "Every time you force execution, your brain physically changes.",
      "Lean into the friction.",
    ],
    captionLine:
      "Willpower is not an abstract concept. It is a biological circuit forged by voluntary friction.",
    rationale: "Uzasadnia ból dyscypliny twardą nauką, eliminując wątpliwości intelektualne.",
  },
  {
    name: "Zero-Empathy Reality Check",
    cardId: "reality_check",
    hook: "Nobody is coming to save your potential.",
    phrases: [
      "Nobody is coming to save your potential.",
      "The world does not care about your good intentions.",
      "Deliver results or remain forgotten.",
    ],
    captionLine:
      "Excuses comfort you today and starve you tomorrow. Never negotiate with your standard.",
    rationale:
      "Bezwzględne uderzenie w strefę komfortu, natychmiast usuwające użalanie się nad sobą.",
  },
];

const BANK_PARADOXES: BankCard[] = [
  {
    name: "The Solitude Acceleration",
    hook: "The more people you cut out, the faster your empire grows.",
    rationale: "Każda luźna relacja kradnie energię poznawczą wymaganą do mistrzostwa.",
    phrases: [
      "The more people you cut out,",
      "the faster your empire grows.",
      "Silence is the ultimate compound interest.",
    ],
  },
  {
    name: "The Restlessness of Comfort",
    hook: "Comfort is the quietest form of self-annihilation.",
    rationale: "Brak oporu fizjologicznie osłabia gęstość kory przedczołowej.",
    phrases: [
      "Comfort is the quietest form of self-annihilation.",
      "The body adapts to ease by creating imaginary anxiety.",
      "Choose hard tension.",
    ],
  },
  {
    name: "The Loudness of Silence",
    hook: "The man who speaks least controls the entire room.",
    rationale: "Niewypowiedziane słowa budują asymetrię informacji i aurę nieprzewidywalności.",
    phrases: [
      "The man who speaks least controls the entire room.",
      "Noise confesses insecurity.",
      "Silence commands respect.",
    ],
  },
  {
    name: "The Laziness of Overwork",
    hook: "Working 16 hours a day is often disguised laziness.",
    rationale: "Zajętość to najwygodniejsza ucieczka przed 1 bolesną, kluczową decyzją.",
    phrases: [
      "Working 16 hours a day is often disguised laziness.",
      "Exhaustion is not accomplishment.",
      "Execute the one thing you are avoiding.",
    ],
  },
];

const BANK_RECYCLED = {
  reel: {
    hook: "Your identity is a reflection of what you tolerate.",
    phrases: [
      "Your identity is a reflection of what you tolerate.",
      "Stop waiting for emotional alignment.",
      "Execute without permission.",
    ],
    duration: 8,
    suggestedTheme: "obsidian_void",
  },
  title: "THE ANATOMY OF STANDARDS",
  slides: [
    {
      headline: "THE SILENT CONTRACT",
      bodyText:
        "You become what you tolerate in private when nobody is watching. Every standard you waive quietly rewrites the terms of the agreement you hold with yourself.",
      highlightWords: "tolerate, private, watching",
    },
    {
      headline: "MOTIVATION IS CHEAP",
      bodyText:
        "Amateurs depend on enthusiasm and wait to feel ready. Professionals obey cold protocol, because enthusiasm has already left the room twice this week.",
      highlightWords: "enthusiasm, protocol, ready",
    },
    {
      headline: "THE COMPOUND EFFECT",
      bodyText:
        "One broken promise to yourself destroys subconscious trust for weeks. You stop believing your own word, and the plans you make after that arrive without weight behind them.",
      highlightWords: "promise, subconscious, trust",
    },
    {
      headline: "THE MONK SHIFT",
      bodyText:
        "Silence your complaints and let the accumulated volume of work speak instead. Nobody who is busy building has the time to explain why it is hard.",
      highlightWords: "complaints, accumulated, work",
    },
    {
      headline: "THE UNFORGIVING STANDARD",
      bodyText:
        "Never negotiate with your standards in the moment you are tired; that is the only moment the negotiation costs anything. Save this reminder for the next one.",
      highlightWords: "negotiate, standards, tired",
    },
  ],
  manifesto: "Never compromise in private if you expect to command respect in public.",
  captionLines: [
    "Stop negotiating with your morning mood.",
    "Standards automate what emotion destroys.",
  ],
};

// ============ KARTY ============

interface RadarCard {
  hook: string;
  phrases: string[];
  caption: string;
  hashtags: string[];
  formatKey: string;
  formatName: string;
  angleId: string;
  angleName: string;
  title: string;
  explanation: string;
  rationale: string;
  suggestedTheme: string;
}

/**
 * UI woła `fmt.phrases.map()` i `ang.phrases.join()` bez sprawdzania pola, więc
 * każda karta odchodzi stąd z tablicą fraz i hashtagami, nawet gdy model jej
 * nie zwrócił. Rzemiosło i anty-powtórka są tu, nie w komponencie: klisza nie
 * ma prawa dojść do ekranu.
 */
export function normalizeCard(card: unknown, craft: Craft): RadarCard {
  const item = (card ?? {}) as Record<string, unknown>;
  const phrases = craftLines(item.phrases, craft, "line");
  const hook = craftLine(item.hook, craft, "hook") || phrases[0] || "";
  commit(craft, [hook, ...phrases]);

  return {
    hook,
    phrases: phrases.length > 0 ? phrases : hook ? [hook] : [],
    caption: starkCaption(hook, captionBody(item.caption, craft)),
    // Hashtagi liczymy z treści: własny ogon modelu rozbija spójność feedu.
    hashtags: starkHashtags(`${hook} ${phrases.join(" ")}`),
    formatKey: noteOf(item.formatKey, 60),
    formatName: noteOf(item.formatName, 120),
    angleId: noteOf(item.angleId, 60),
    angleName: noteOf(item.angleName, 120),
    title: noteOf(item.title, 120),
    explanation: noteOf(item.explanation, 400),
    rationale: noteOf(item.rationale, 400),
    suggestedTheme: oneOf(item.suggestedTheme, THEMES, "obsidian_void"),
  };
}

/** Karta z banku: te same pola, ale bez miary hooka — bank jest kuratorowany. */
function normalizeBankCard(card: BankCard, craft: Craft): RadarCard {
  const phrases = freshLines(card.phrases, craft);
  const hook = craftLine(card.hook, craft, "plain");
  const usable = hook || phrases[0] || "";
  commit(craft, [usable, ...phrases]);

  return {
    hook: usable,
    phrases: phrases.length > 0 ? phrases : usable ? [usable] : [],
    caption: starkCaption(usable, captionBody(card.captionLine, craft)),
    hashtags: starkHashtags(`${usable} ${phrases.join(" ")}`),
    formatKey: card.cardId ?? slug(usable),
    formatName: noteOf(card.name, 120),
    angleId: card.cardId ?? "",
    angleName: noteOf(card.name, 120),
    title: noteOf(card.name, 120),
    explanation: noteOf(card.rationale, 400),
    rationale: noteOf(card.rationale, 400),
    suggestedTheme: oneOf(card.theme, THEMES, "obsidian_void"),
  };
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Wątki z banku: cała karta znika dopiero wtedy, gdy nie ma w niej hooka. */
function bankTrends(craft: Craft): Record<string, unknown>[] {
  const stamp = Date.now();
  const trends: Record<string, unknown>[] = [];

  BANK_TRENDS.forEach((trend, idx) => {
    const hooks = freshLines(trend.viral_hooks, craft);
    const draftHook = craftLine(trend.draft.hook, craft, "plain");
    const supporting = craftLine(trend.draft.supportingText, craft, "plain");
    const lines = freshLines(trend.draft.lines, craft);
    const usable = hooks[0] || draftHook || "";
    if (!usable) return;
    commit(craft, [usable, supporting, ...hooks, ...lines]);

    trends.push({
      id: `trend-${stamp}-${idx + 1}`,
      title: noteOf(trend.title, 120),
      suggested_format: noteOf(trend.suggested_format, 80),
      estimated_virality: noteOf(trend.estimated_virality, 12),
      source_context: noteOf(trend.source_context, 200),
      audience_pain: noteOf(trend.audience_pain, 200),
      core_message: noteOf(trend.core_message, 400),
      bingPrompt: noteOf(trend.bingPrompt, 400),
      // UI bierze `viral_hooks[0] || title` — karta z materiałem nie może
      // zostać z pustą listą, bo `title` jest notatką, nie tekstem na kadr.
      viral_hooks: hooks.length > 0 ? hooks : [usable],
      copy_draft: {
        hook: usable,
        supportingText: supporting,
        caption: formatStarkCaption(usable, lines.length > 0 ? lines : [supporting]),
        hashtags: starkHashtags(`${usable} ${lines.join(" ")}`),
      },
    });
  });

  return trends;
}

// ============ ODPOWIEDZI Z BANKU ============

/** Bank zamiast wyniku modelu — zawsze przez `sendDegraded`, żeby nie wszedł do cache. */
function degradedList(
  res: MiniResponse,
  key: string,
  items: unknown[],
  craft: Craft,
  what: string,
): unknown {
  if (items.length > 0) {
    return sendDegraded(res, {
      [key]: items,
      message: bankMessage(craft, "Model nie odpowiedział — pokazujemy zestaw z banku treści."),
      notice: bankMessage(craft, "Pokazujemy zestaw z banku treści, nie wynik modelu."),
    });
  }
  const notice = rejectionNotice(craft, what);
  return sendDegraded(res, { [key]: [], message: notice, notice });
}

// ============ TRASY ============

export function registerTrendsRoutes(app: MiniApp): void {
  // ============ 1. WĄTKI POWTARZAJĄCE SIĘ W NISZY ============
  app.post("/api/ai/scan-trends", async (req, res) => {
    const niche = clampText(req.body?.niche, 200, "stoicism and dark discipline");
    const platform = clampText(req.body?.platform, 100, "Instagram / TikTok");
    const exclude = clampTextList(req.body?.excludeHooks);
    const craft = createCraft(exclude);
    const ai = getGeminiClient();

    if (!ai) {
      return degradedList(res, "trends", bankTrends(craft), craft, "wątkach z niszy");
    }

    try {
      const prompt = `Jesteś analitykiem wirusowości dla konta @stark_focus (brutalny stoicyzm, mroczny minimalizm).
  Nisza: "${niche}". Platforma: "${platform}".
  Z własnej pamięci o tej niszy podaj 3 wątki, które NAJCZĘŚCIEJ powtarzają się u dużych
  nadawców, wraz z hookami 0-3s. Nie wymyślaj, że coś sprawdziłeś w sieci — "source_context"
  ma mówić, u kogo i w jakiej formie ten wątek chodzi (np. "powtarza się u kont 100k+ w
  formatie mówiącej głowy"). "estimated_virality" to uczciwy zgadywany przedział, nie pomiar.

  ${HOOK_CRAFT_PROMPT}
  ${excludeBlock(exclude)}
  Zwróć poprawny JSON:
  {
    "trends": [
      {
        "id": "trend-1",
        "title": "Tytuł trendu po angielsku",
        "suggested_format": "Rolka 7-Sekundowa" | "3D Wall Letters" | "Karuzela 5-Slajdowa",
        "estimated_virality": "96%",
        "source_context": "U kogo i w jakiej formie ten wątek się powtarza",
        "audience_pain": "Dokładna frustracja widza po polsku",
        "viral_hooks": ["Hook 1 (EN)", "Hook 2 (EN)", "Hook 3 (EN)"],
        "core_message": "Główne przesłanie po polsku",
        "bingPrompt": "Prompt pod Bing Image Creator 9:16 po angielsku",
        "copy_draft": {
          "hook": "Hook (EN)",
          "supportingText": "Podtytuł (EN)",
          "caption": "2-3 zdania po angielsku rozwijające wątek, bez hashtagów i bez CTA — ogon doklejamy u siebie"
        }
      }
    ]
  }`;
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.9 },
      });
      const parsed = safeJsonParse(response.text || "");
      const trends = asArray(parsed.trends)
        .map((trend, idx) => {
          const card = (trend ?? {}) as Record<string, unknown>;
          const draft = (card.copy_draft ?? {}) as Record<string, unknown>;
          const hooks = craftLines(card.viral_hooks, craft, "hook", 6);
          const supporting = craftLine(draft.supportingText, craft, "line");
          const hook = craftLine(draft.hook, craft, "hook") || hooks[0] || supporting;
          const usable = hook || "";
          commit(craft, [usable, supporting, ...hooks]);

          return {
            // `trend.id` jest kluczem Reacta — bez niego lista ma duplikaty kluczy.
            id: noteOf(card.id, 60) || `trend-${Date.now()}-${idx}`,
            title: noteOf(card.title, 120),
            suggested_format: noteOf(card.suggested_format, 80),
            estimated_virality: noteOf(card.estimated_virality, 12),
            source_context: noteOf(card.source_context, 200),
            audience_pain: noteOf(card.audience_pain, 200),
            core_message: noteOf(card.core_message, 400),
            bingPrompt: noteOf(card.bingPrompt, 400),
            // UI bierze `viral_hooks[0] || title`, więc karta z materiałem nigdy
            // nie może zejść do pustej listy — `title` jest notatką, nie tekstem.
            viral_hooks: hooks.length > 0 ? hooks : usable ? [usable] : [],
            copy_draft: {
              hook: usable,
              supportingText: supporting,
              caption: starkCaption(usable, captionBody(draft.caption, craft)),
              hashtags: starkHashtags(`${usable} ${supporting}`),
            },
          };
        })
        // Karta bez ani jednego nadającego się zdania to szum, nie wynik skanu.
        .filter((card) => card.viral_hooks.length > 0);

      if (trends.length > 0) {
        return res.json({
          trends,
          message: "Wątki z pamięci modelu — wzorce, które powtarzają się w tej niszy.",
          trimmedDetails: tally(craft.reasons),
        });
      }
      return degradedList(res, "trends", bankTrends(craft), craft, "wątkach z niszy");
    } catch (err: any) {
      console.warn("Skaner trendów - użyto bezpiecznego generatora:", err?.message || err);
      return degradedList(res, "trends", bankTrends(craft), craft, "wątkach z niszy");
    }
  });

  // ============ 2. FORMATY WIRALOWE ============
  app.post("/api/ai/viral-format-radar", async (req, res) => {
    const niche = clampText(req.body?.niche, 200, "stoic discipline and ruthless focus");
    const exclude = clampTextList(req.body?.excludeHooks);
    const craft = createCraft(exclude);
    const ai = getGeminiClient();

    const bank = () =>
      BANK_FORMATS.map((card) => normalizeBankCard(card, craft)).filter(
        (card) => card.phrases.length > 0,
      );

    if (!ai) {
      return degradedList(res, "formats", bank(), craft, "formatach wiralowych");
    }

    try {
      const prompt = `Jesteś ekspertem wirusowych struktur psychologicznych krótkich form wideo dla konta @stark_focus.
  Wygeneruj 4 potężne, niepowtarzalne formaty wiralowe dopasowane do tematu: "${niche}".
  Każdy format musi mieć:
  - formatKey: krótki identyfikator
  - formatName: nazwa psychologicznego wzorca (np. "The Harsh Truth", "The 99% Failure Paradox", "The Dopamine Saboteur", "The Silent Cost")
  - hook: bezwzględny hook 0-3s po angielsku ALL CAPS lub Sentence Case
  - phrases: dokładnie 3 fazy [Hook, Bolesny Kontrast, Puenta Climax]
  - suggestedTheme: jeden z: "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist"
  - rationale: 1 zdanie wyjaśniające psychologię retencji widza

  ${HOOK_CRAFT_PROMPT}
  ${excludeBlock(exclude)}
  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "formats": [
      {
        "formatKey": "string",
        "formatName": "string",
        "hook": "string",
        "phrases": ["string", "string", "string"],
        "suggestedTheme": "obsidian_void",
        "rationale": "string"
      }
    ]
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.85 },
      });

      const parsed = safeJsonParse(response.text || "");
      const formats = asArray(parsed.formats)
        .map((card) => normalizeCard(card, craft))
        .filter((format) => format.phrases.length > 0);
      if (formats.length > 0) {
        return res.json({ formats, trimmedDetails: tally(craft.reasons) });
      }
      return degradedList(res, "formats", bank(), craft, "formatach wiralowych");
    } catch (err) {
      console.warn("Błąd viral-format-radar:", err);
      return degradedList(res, "formats", bank(), craft, "formatach wiralowych");
    }
  });

  // ============ 3. MATRYCA KĄTÓW PSYCHOLOGICZNYCH ============
  app.post("/api/ai/angle-matrix", async (req, res) => {
    const topic = clampText(req.body?.topic, 200, "Dyscyplina i walka z prokrastynacją");
    const exclude = clampTextList(req.body?.excludeHooks);
    const craft = createCraft(exclude);
    const ai = getGeminiClient();

    const bank = () =>
      BANK_ANGLES.map((card) => normalizeBankCard(card, craft)).filter((card) => card.hook);

    if (!ai) {
      return degradedList(res, "angles", bank(), craft, "kątach psychologicznych");
    }

    try {
      const prompt = `Jesteś strategiem treści i psychologiem uwagi dla marki @stark_focus.
  Rozbij temat: "${topic}" na 4 skrajnie odmienne kąty psychologiczne:
  1. Prowokacja / Kontrowersja (uderzenie w schemat myślowy)
  2. Rzymski Stoicyzm (asceza, ciężar nieodwracalnych decyzji, niewzruszoność — po angielsku, bez słów o śmierci)
  3. Neurobiologia & Układ Dopaminy (konkretna anatomia woli i oporu)
  4. Zero-Empathy Reality Check (twarda konfrontacja bez owijania w bawełnę)

  Dla każdego kąta przygotuj:
  - angleId: "controversial" | "roman_stoic" | "neurobiology" | "reality_check"
  - angleName: nazwa po polsku
  - hook: magnetyczny hook 0-3s po angielsku (Sentence Case lub ALL CAPS)
  - phrases: dokładnie 3 frazy po angielsku [Hook, Kontrast, Climax]
  - caption: 2-3 zdania głębokiego opisu stoickiego PO ANGIELSKU, bez hashtagów i bez CTA (ogon doklejamy u siebie)
  - rationale: dlaczego ten kąt działa psychologicznie (po polsku)

  ${HOOK_CRAFT_PROMPT}
  ${excludeBlock(exclude)}
  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "angles": [
      {
        "angleId": "string",
        "angleName": "string",
        "hook": "string",
        "phrases": ["string", "string", "string"],
        "caption": "string",
        "rationale": "string"
      }
    ]
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.82 },
      });

      const parsed = safeJsonParse(response.text || "");
      // Dawniej brakowało jednego kąta i cała matryca lądowała w banku.
      // Odpada kąt, nie odpowiedź.
      const angles = asArray(parsed.angles)
        .map((card) => normalizeCard(card, craft))
        .filter((angle) => angle.hook);
      if (angles.length > 0) {
        return res.json({ angles, trimmedDetails: tally(craft.reasons) });
      }
      return degradedList(res, "angles", bank(), craft, "kątach psychologicznych");
    } catch (err) {
      console.warn("Błąd angle-matrix:", err);
      return degradedList(res, "angles", bank(), craft, "kątach psychologicznych");
    }
  });

  // ============ 4. PARADOKSY POZNAWCZE ============
  app.post("/api/ai/cognitive-friction", async (req, res) => {
    const topic = clampText(req.body?.topic, 200, "dyscyplina, sukces i samotność");
    const exclude = clampTextList(req.body?.excludeHooks);
    const craft = createCraft(exclude);
    const ai = getGeminiClient();

    const bank = () =>
      BANK_PARADOXES.map((card) => normalizeBankCard(card, craft)).filter(
        (card) => card.hook || card.phrases.length > 0,
      );

    if (!ai) {
      return degradedList(res, "paradoxes", bank(), craft, "paradoksach poznawczych");
    }

    try {
      const prompt = `Jesteś mistrzem paradoksów poznawczych dla profilu @stark_focus.
  Wygeneruj 4 głębokie, hipnotyzujące sprzeczności i paradoksy (Cognitive Friction) na temat: "${topic}".
  Odbiorca musi poczuć nagłe zwolnienie przewijania i potrzebę ponownego przeczytania.
  Wszystkie hooki i frazy po angielsku. Wyjaśnienie po polsku.

  ${HOOK_CRAFT_PROMPT}
  ${excludeBlock(exclude)}
  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "paradoxes": [
      {
        "title": "string",
        "hook": "string",
        "explanation": "string",
        "phrases": ["string", "string", "string"]
      }
    ]
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.9 },
      });

      const parsed = safeJsonParse(response.text || "");
      const paradoxes = asArray(parsed.paradoxes)
        .map((card) => normalizeCard(card, craft))
        .filter((card) => card.hook || card.phrases.length > 0);
      if (paradoxes.length > 0) {
        return res.json({ paradoxes, trimmedDetails: tally(craft.reasons) });
      }
      return degradedList(res, "paradoxes", bank(), craft, "paradoksach poznawczych");
    } catch (err) {
      console.warn("Błąd cognitive-friction:", err);
      return degradedList(res, "paradoxes", bank(), craft, "paradoksach poznawczych");
    }
  });

  // ============ 5. RECYKLER TREŚCI ============
  app.post("/api/ai/evergreen-recycle", async (req, res) => {
    const cleanInput = clampText(req.body?.sourceText, 1000) || "Dyscyplina to nie motywacja.";
    const exclude = clampTextList(req.body?.excludeHooks);
    const craft = createCraft(exclude);
    const ai = getGeminiClient();

    if (!ai) {
      return degradedRecycled(res, bankRecycled(craft), craft);
    }

    try {
      const prompt = `Jesteś elitarnym redaktorem treści i strategiem @stark_focus.
  Weź poniższą surową myśl lub post użytkownika:
  "${cleanInput}"

  I natychmiast zremiksuj ją na 4 gotowe formaty STARK:
  1. reel: rolka wideo [hook 0-3s, 3 precyzyjne fazy po angielsku, suggestedTheme: "obsidian_void"|"carbon_aura"|"crimson_eclipse"]
  2. carousel: karuzela 12 slajdów (headline: 2-4 słowa ALL CAPS, bodyText: 2-3 zdania (25-40 słów), highlightWords). Slajd 1 to teza, slajdy 2-10 po jednej myśli każdy, slajd 11 cena za brak zmiany, slajd 12 zdanie do zapisania. Krótkie karuzele (2-4 slajdy) wychodzą ponad medianę autora rzadziej niż długie: 18,0% vs 23,5% na kontach poniżej 10k (Eden, 655 385 karuzeli).
  3. manifesto: 1 bezkompromisowe zdanie podsumowujące sedno
  4. caption: 2-3 zdania po angielsku rozwijające myśl, bez hashtagów i bez CTA — ogon doklejamy u siebie

  ${HOOK_CRAFT_PROMPT}
  ${excludeBlock(exclude)}
  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "reel": {
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "duration": 8,
      "suggestedTheme": "obsidian_void"
    },
    "carousel": {
      "title": "string",
      "slides": [
        { "headline": "string", "bodyText": "string", "highlightWords": "string" }
      ]
    },
    "manifesto": "string",
    "caption": "string"
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.8 },
      });

      const parsed = safeJsonParse(response.text || "");
      const reel = (parsed?.reel ?? {}) as Record<string, unknown>;
      const carousel = (parsed?.carousel ?? {}) as Record<string, unknown>;
      const reelHook = craftLine(reel.hook, craft, "hook");
      const reelPhrases = craftLines(reel.phrases, craft, "line");
      const manifesto = craftLine(parsed?.manifesto, craft, "hook");
      const slides = asArray(carousel.slides)
        .map((slide) => {
          const item = (slide ?? {}) as Record<string, unknown>;
          // `headline` to 2-4 słowa: miara wiersza, bo hook żąda trzech słów i
          // wypaczałby każdy prowadzący slajd.
          const headline = craftLine(item.headline, craft, "line");
          // `bodyText` to 2-3 zdania prozy: miara wiersza wypaczyłaby każdy
          // slajd, więc tu liczy się tylko polszczyzna i powtórka.
          const bodyText = craftLine(item.bodyText, craft, "plain").slice(0, 600);
          return headline || bodyText
            ? { headline, bodyText, highlightWords: noteOf(item.highlightWords, 80) }
            : null;
        })
        .filter((slide): slide is { headline: string; bodyText: string; highlightWords: string } =>
          Boolean(slide),
        );

      const thesis = manifesto || reelHook || slides[0]?.headline || "";
      commit(craft, [reelHook, manifesto, thesis, ...reelPhrases]);

      // Recykler bez ani jednego zdania z materiału nie ma co pokazać.
      if (!thesis && slides.length === 0) {
        return degradedRecycled(res, bankRecycled(craft), craft);
      }

      return res.json({
        reel: {
          hook: reelHook || thesis,
          phrases: reelPhrases.length > 0 ? reelPhrases : [reelHook || thesis],
          duration: clampDuration(reel.duration),
          suggestedTheme: oneOf(reel.suggestedTheme, THEMES, "obsidian_void"),
        },
        carousel: { title: noteOf(carousel.title, 120), slides },
        manifesto,
        // Opis pod remiksem rozwija myśl i ma nasz ogon — nigdy hashtagów modelu.
        caption: starkCaption(thesis, captionBody(parsed?.caption, craft)),
        hashtags: starkHashtags(`${thesis} ${reelPhrases.join(" ")}`),
        trimmedDetails: tally(craft.reasons),
      });
    } catch (err) {
      console.warn("Błąd evergreen-recycle:", err);
      return degradedRecycled(res, bankRecycled(craft), craft);
    }
  });
}

/** Remiks z banku: wiersz po wierszu odrzucamy tylko to, co już poszło w feedzie. */
function bankRecycled(craft: Craft): Record<string, unknown> | null {
  const phrases = freshLines(BANK_RECYCLED.reel.phrases, craft);
  const hook = craftLine(BANK_RECYCLED.reel.hook, craft, "plain");
  const manifesto = craftLine(BANK_RECYCLED.manifesto, craft, "plain");
  const title = craftLine(BANK_RECYCLED.title, craft, "plain");
  const slides = BANK_RECYCLED.slides
    .map((slide) => {
      const headline = craftLine(slide.headline, craft, "plain");
      const bodyText = craftLine(slide.bodyText, craft, "plain");
      return headline || bodyText
        ? { headline, bodyText, highlightWords: noteOf(slide.highlightWords, 80) }
        : null;
    })
    .filter((slide): slide is { headline: string; bodyText: string; highlightWords: string } =>
      Boolean(slide),
    );
  const captionLines = freshLines(BANK_RECYCLED.captionLines, craft);
  const usable = hook || manifesto || slides[0]?.headline || "";
  commit(craft, [hook, manifesto, title, usable, ...phrases]);
  if (!usable && slides.length === 0) return null;

  return {
    reel: {
      hook: hook || usable,
      phrases: phrases.length > 0 ? phrases : [usable],
      duration: BANK_RECYCLED.reel.duration,
      suggestedTheme: oneOf(BANK_RECYCLED.reel.suggestedTheme, THEMES, "obsidian_void"),
    },
    carousel: { title, slides },
    manifesto,
    caption: formatStarkCaption(usable, captionLines),
    hashtags: starkHashtags(`${usable} ${captionLines.join(" ")}`),
  };
}

function degradedRecycled(
  res: MiniResponse,
  recycled: Record<string, unknown> | null,
  craft: Craft,
): unknown {
  if (recycled) {
    return sendDegraded(res, {
      ...recycled,
      message: bankMessage(craft, "Pokazujemy remiks z banku treści, nie wynik modelu."),
    });
  }
  const notice = rejectionNotice(craft, "remiksie treści");
  return sendDegraded(res, {
    reel: null,
    carousel: null,
    manifesto: "",
    caption: "",
    message: notice,
    notice,
  });
}
