import type { MiniApp, MiniResponse } from "../../mini-express.server";
import type { IdeaItem } from "../../../types";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { SIMILARITY, hookFingerprint, maxSimilarity, repeatedOpenings } from "../../similarity";
import { pickN } from "../../random";
import { clampCount, clampInt, clampText, clampTextList } from "../../limits";
import {
  HOOK_ARCHETYPES,
  HOOK_CRAFT_PROMPT,
  HOOK_IDEAL_WORDS,
  auditHook,
  auditLine,
  exemplarBlock,
} from "../../hookCraft";
import { FRAME_FORMATS, FrameFormat, formatFieldSpec } from "../../formats";
import { formatStarkCaption, isPolishCopy, starkCaption, starkHashtags } from "../../caption";
import {
  asArray,
  asString,
  asStringArray,
  degradedReason,
  oneOf,
  sendDegraded,
} from "../normalize.server";

/**
 * IDEA STREAM — generator pomysłów z anty-powtórką.
 * Klient przesyła ODCISKI tego, co już ma (posty + dziennik); serwer każe tego
 * unikać, a odpowiedź modelu filtruje tą samą miarą rzemiosła co reszta tras.
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

/** Metadane pomysłu do macierzy promptu — to nie układ kadru, więc nie z `formats.ts`. */
const MATERIAL_SHAPES = [
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

/**
 * UKŁADY to dokładnie te, które studio rysuje, wzięte z `FRAME_FORMATS`.
 * Własna lista w tej trasie wskrzeszała „Napis w scenie" — format skasowany,
 * którego nie ma czym narysować.
 */
type IdeaLayout = NonNullable<IdeaItem["layout"]>;

const LAYOUTS: readonly { value: IdeaLayout; format: FrameFormat }[] = FRAME_FORMATS.map(
  (format) => ({
    value: (format.id === "quote" ? "quote" : format.gridType) as IdeaLayout,
    format,
  }),
);

const LAYOUT_VALUES = LAYOUTS.map((layout) => layout.value);

/** Kształt i pola układu prosto z tabeli formatów: prompt nie ma własnych limitów. */
const LAYOUT_PROMPT = LAYOUTS.map(
  ({ value, format }) =>
    `- "${value}" (${format.label}) — ${format.shape}\n` +
    formatFieldSpec(format)
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n"),
).join("\n");

/** Liczby wierszy pochodzą z tabeli formatów, nie z literałów w trasie. */
function listSize(format: FrameFormat, key: string): number {
  return format.fields.find((field) => field.key === key)?.list ?? 0;
}

const clean = (value: unknown): string =>
  asString(value).replace(/[*#"]/g, "").replace(/\s+/g, " ").trim();

/** Teza kadru: miara hooka, taka jak w pozostałych trasach. */
function thesis(value: unknown): string {
  const text = clean(value);
  return text && !isPolishCopy(text) && auditHook(text).ok ? text : "";
}

/** Wiersz struktury (krok, cena, utrata, puenta): `auditLine`, nie miara hooka. */
function line(value: unknown): string {
  const text = clean(value);
  return text && !isPolishCopy(text) && auditLine(text).ok ? text : "";
}

function lineList(value: unknown, max: number): string[] {
  if (max <= 0) return [];
  return asStringArray(value, max + 2)
    .map(line)
    .filter(Boolean)
    .slice(0, max);
}

/**
 * KOSZT PISZE SIĘ PARAMI. Model oddaje wiersz „cena -> utrata", a stąd dwie
 * równe listy, które `structuredSpec` rysuje jeden słupek przy drugim. Para
 * spada w całości: utrata bez własnej ceny to inny rząd, nie rząd krótszy.
 */
function pairRows(value: unknown, max: number): { cost: string[]; forfeit: string[] } {
  const cost: string[] = [];
  const forfeit: string[] = [];
  if (max <= 0) return { cost, forfeit };
  for (const row of asStringArray(value, max + 2)) {
    const halves = row.split(/\s*(?:->|→|—)\s*/);
    if (halves.length !== 2) continue;
    const price = line(halves[0]);
    const loss = line(halves[1]);
    if (!price || !loss) continue;
    cost.push(price);
    forfeit.push(loss);
    if (cost.length >= max) break;
  }
  return { cost, forfeit };
}

/** Metadane z macierzy — własne wartości modelu są krótkie i bez polszczyzny. */
function note(value: unknown, fallback: string, max = 60): string {
  const text = clean(value).slice(0, max);
  return text && !isPolishCopy(text) ? text : fallback;
}

/**
 * Bank offline przechodzi TĘ SAMĄ kontrolę co odpowiedź modelu. Klisza w pliku
 * („comfort zone", abstrakt w roli podmiotu, rym) jest tak samo niepublikowalna
 * jak klisza od modelu, a dotąd szła do UI bez filtra.
 */
const OFFLINE_HOOKS = [
  "They see your silence and call it weakness. Let them.",
  "You don't lack time. You lack the courage to say no.",
  "The gym is empty at 5 AM. So is the competition.",
  "Every scroll is a vote for the life you hate.",
  "Your potential is watching you waste it.",
  "Nobody is coming to save you. That is the good news.",
  "The pain of regret weighs more than the pain of discipline.",
  "You are not tired. You are bored and over-stimulated.",
  "Hard work beats talent when talent is scrolling.",
  "Your excuses are the only thing you produce consistently.",
  "The mirror doesn't lie. Your standards do.",
  "You broke promises to everyone. Stop breaking them to yourself.",
  "Your phone died. Your dreams didn't. Act like it.",
  "If it was easy, the reward would be worthless.",
  "Comfort is the enemy wearing a friendly face.",
  "The 1% are not lucky. They are just willing to be bored longer.",
  "Silence is the loudest answer to doubt.",
  "Discipline is choosing what you want most over what you want now.",
  "Your comfort zone is a coffin with Wi-Fi.",
  "Kings build in silence. Clowns announce their plans.",
].filter((hook) => !isPolishCopy(hook) && auditHook(hook).ok);

interface BatchSeed {
  cats: string[];
  figures: string[];
  emos: string[];
  shapes: string[];
}

/** Eksportowane dla testu taniego promptu — reszta aplikacji nie ma tu czego szukać. */
export function batchSeed(count: number): BatchSeed {
  return {
    cats: pickN([...CATEGORIES], Math.min(count, CATEGORIES.length)),
    figures: pickN(
      HOOK_ARCHETYPES.map((archetype) => archetype.id),
      Math.min(count, HOOK_ARCHETYPES.length),
    ),
    emos: pickN([...EMOTIONAL_TARGETS], Math.min(count, EMOTIONAL_TARGETS.length)),
    shapes: pickN([...MATERIAL_SHAPES], Math.min(count, MATERIAL_SHAPES.length)),
  };
}

/**
 * Pomysł z banku: rotacja po liczbie już wysłanych, więc bez klucza API
 * kolejne partie nie są tą samą piątką zdań. Zero zdanych fraz — bank ma
 * tylko tezy, żadnych „faz" ani ogonów pisanych w trasie.
 */
function buildOfflineIdeas(count: number, usedCount: number, excludeHooks: string[]) {
  // Klient przesyła ODCISKI hooków (patrz hookFingerprint), więc obie strony
  // muszą porównywać odciski — surowy hook nigdy nie wypadłby równo.
  const excluded = new Set(excludeHooks.map(hookFingerprint));
  // Pełna historia potrafi mieć 300 wpisów; porównywanie tokenami kilku bankowych
  // hooków × 300 to tysiące setów na żądanie. Bierzemy najnowsze 150 — dokładne
  // duplikaty i tak wyłapuje `excluded`, okno służy tylko podobieństwom.
  const recentHooks = excludeHooks.slice(-150);
  const timestamp = Date.now();
  const seed = batchSeed(count);
  const ideas: Record<string, unknown>[] = [];

  let cursor = usedCount % OFFLINE_HOOKS.length;
  let scanned = 0;
  while (ideas.length < count && scanned < OFFLINE_HOOKS.length) {
    const hook = OFFLINE_HOOKS[cursor % OFFLINE_HOOKS.length];
    cursor++;
    scanned++;
    if (excluded.has(hookFingerprint(hook))) continue;
    if (maxSimilarity(hook, recentHooks).score >= SIMILARITY.HARD_BLOCK) continue;
    const index = ideas.length;
    ideas.push({
      id: `idea-${timestamp}-${index + 1}`,
      layout: "quote" as const,
      hook,
      // Ogon jest wyłącznie z puli `caption.ts` — w trasie nie ma własnego
      // wezwania ani hashtagów, bo każdy taki dopis rozjezdza estetyke feedu.
      phrases: [hook],
      caption: formatStarkCaption(hook),
      hashtags: starkHashtags(hook),
      theme: THEMES[index % THEMES.length],
      category: seed.cats[index % seed.cats.length],
      archetype: seed.figures[index % seed.figures.length],
      emotionalTarget: seed.emos[index % seed.emos.length],
      format: seed.shapes[index % seed.shapes.length],
    });
  }
  return ideas;
}

/**
 * Bank ma z góry znana liczbe zdac, więc po kilku partiach bez klucza zostaje
 * pustelnia. Wolimy to powiedzieć w odpowiedzi, niż cicho wysłać mniej
 * pomysłów niż o nie proszono.
 */
function sendOfflineIdeas(
  res: MiniResponse,
  count: number,
  used: number,
  exclude: string[],
  reason?: string,
) {
  const ideas = buildOfflineIdeas(count, used, exclude);
  const exhausted = ideas.length < count;
  return sendDegraded(
    res,
    {
      generatedAt: new Date().toISOString(),
      source: "offline" as const,
      ideas,
      exhausted,
      notice: exhausted
        ? `Bank treści offline ma ${OFFLINE_HOOKS.length} zdań po kontroli rzemiosła — zostało ${ideas.length} z ${count}. Ustaw GEMINI_API_KEY albo zmniejsz liczbę.`
        : undefined,
    },
    reason,
  );
}

/** Pojedynczy pomysł od modelu -> kształt, którego studio użyje bez sprawdzania. */
/** Eksportowane dla testów: tu zapada wyrok, czy kadr jest pełny, czy tylko tezą. */
export function normalizeModelIdea(
  raw: unknown,
  index: number,
  seed: BatchSeed,
  /** Wezwania już użyte w tej partii — opis każdego pomysłu ma być inny. */
  usedCtas?: Set<string>,
) {
  const item = (raw ?? {}) as Record<string, unknown>;
  const structure = (item.structure ?? {}) as Record<string, unknown>;
  const layout = oneOf(item.layout, LAYOUT_VALUES, "quote" as IdeaLayout);
  const format = LAYOUTS.find((option) => option.value === layout)?.format ?? FRAME_FORMATS[0];

  // Teza kadru jest jedynym źródłem hooka: model nie pisze osobno „hook" i
  // osobno „statement", bo te dwa pola zawsze się rozjeżdżały. Tani prompt
  // strumienia daje ją wprost w polu „primary"; „structure.primary" zostaje
  // jako ścieżka dla odpowiedzi pełnego kadru.
  const statement = thesis(item.primary ?? structure.primary);
  if (!statement) return null;

  const steps = lineList(structure.steps, listSize(format, "steps"));
  const { cost, forfeit } = pairRows(structure.rows, listSize(format, "rows"));
  const closing = steps.length || cost.length ? line(structure.closing) : "";
  // Cyfra jest dekoracją kadru, ale wchodzi na render — polski dopisek odpada.
  const rawFigure = clean(structure.figure).slice(0, 12);
  const figure = rawFigure && !isPolishCopy(rawFigure) ? rawFigure : "";

  // Brak wierszy przy układzie, który ich żąda, to NIE pusta lista — to kadr
  // jeszcze niewypełniony. Dawniej taka karta zwijała się do cytatu i znikała
  // z niej informacja, że pomysł był protokołem; teraz niesie flagę, na której
  // studio dopytuje jeden pełny kadr.
  const wantsRows = listSize(format, "steps") > 0 || listSize(format, "rows") > 0;
  const needsFill = wantsRows && steps.length === 0 && cost.length === 0;

  return {
    id: `idea-${Date.now()}-${index + 1}`,
    layout: layout as IdeaLayout,
    needsFill,
    // Puste listy nie wchodzą do struktury — `structuredSpec` dokłada warstwę
    // tylko za każdą niepustą listę, a kadr z dziurą nie ma czym wypełnić.
    structure: {
      statement,
      ...(steps.length ? { steps } : {}),
      ...(cost.length ? { cost, forfeit } : {}),
      ...(closing ? { closing } : {}),
      ...(figure ? { figure } : {}),
    },
    hook: statement,
    category: note(item.category, seed.cats[index % seed.cats.length]),
    archetype: note(item.archetype, seed.figures[index % seed.figures.length], 40),
    emotionalTarget: note(item.emotionalTarget, seed.emos[index % seed.emos.length]),
    format: note(item.format, seed.shapes[index % seed.shapes.length]),
    phrases: [statement, ...lineList(item.phrases, 3).filter((text) => text !== statement)],
    // Sol to kolejność w partii: cała paczka ma ten sam kształt treści, więc
    // bez niego każdy pomysł w strumieniu dostawał to samo wezwanie.
    caption: starkCaption(statement, clean(item.caption), index, usedCtas),
    hashtags: starkHashtags(statement),
    theme: oneOf(item.theme, THEMES, "obsidian_void"),
  };
}

export function registerIdeaStreamRoutes(app: MiniApp): void {
  app.post("/api/ai/idea-stream", async (req, res) => {
    const safeCount = clampCount(req.body?.count, 5);
    const topic = clampText(req.body?.topic, 300, "dark motivation and brutal discipline");
    const safeExclude = clampTextList(req.body?.excludeHooks);
    const exemplars = clampTextList(req.body?.exemplars).slice(0, 8);
    // usedCount indeksuje bank offline: ujemny lub ułamkowy dałby `undefined`,
    // a potem `hook.toLowerCase()` poza try/catchem = 500.
    const safeUsed = clampInt(req.body?.usedCount, 0, 1_000_000, 0);

    if (!getGeminiClient()) {
      return sendOfflineIdeas(res, safeCount, safeUsed, safeExclude);
    }

    try {
      const usedCtas = new Set<string>();
      const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);
      const seed = batchSeed(safeCount);

      const prompt = `Jesteś autorem treści marki @stark_focus (brutalny stoicyzm, dyscyplina, wysokie standardy).
Temat nadrzędny: "${topic}".

ZADANIE: napisz DOKŁADNIE ${safeCount} pomysłów na materiał. Każdy pomysł to TEZA kadru plus wybrany dla niej układ — i nic więcej. Wierszy, par, opisu ani pytania NIE pisz: dopisuje je osobne zapytanie w momencie, gdy człowiek otwiera pomysł w studiu. Dzięki temu jedna partia jest tania, a pełny kadr płaci się tylko za to, co naprawdę poszło do edytora.

${HOOK_CRAFT_PROMPT}
${exemplarBlock(exemplars)}

UKŁADY (pole "layout"; w jednej paczce użyj MINIMUM 3 różnych, nigdy wszystkiego jako "quote"). Z całej listy pól interesuje nas wyłącznie "primary" — to jest teza, którą masz napisać:
${LAYOUT_PROMPT}

Teza ma być napisana tak, by wybrany układ miał co rozwinąć: protokół pod zdanie z sekwencją działań, koszt pod pytanie o cenę, kolaż pod dwa słowa, które trzymają cztery kadry. Cyfry nie dokleaj — "figure" też jest polem pełnego kadru.

JAKOŚĆ (to warunek, nie opcja):
- Żadnych sloganów motywacyjnych. Zamiast "bądź zdyscyplinowany" — konkretna, niewygodna obserwacja, którą czytelnik musi dokończyć sam.
- Każdy pomysł ma jeden koszt, jedną liczbę albo jedną sprzeczność. Abstrakcja bez ceny nie zatrzymuje kciuka.
- Teza kadru: ${HOOK_IDEAL_WORDS} słów.
- 100% PO ANGIELSKU (teza i wszystkie krótkie pola). Polski w dowolnym polu = pomysł odrzucony w kodzie.

MACIERZ (używaj różnych kombinacji; "archetype" to id figury z listy powyżej):
- Kategorie: ${seed.cats.join(" | ")}
- Figury hooków: ${seed.figures.join(" | ")}
- Cele emocjonalne: ${seed.emos.join(" | ")}
- Kształty materiału: ${seed.shapes.join(" | ")}

ZIARNO LOSOWOŚCI: ${dynamicSeed}
LICZBA WCZEŚNIEJSZYCH POMYSŁÓW UŻYTKOWNIKA: ${safeUsed}

ZAKAZY:
1. NIE używaj żadnego z tych zdań ani ich mutacji:
${
  safeExclude
    .slice(-30)
    .map((hook) => `   - "${hook}"`)
    .join("\n") || "   (brak historii)"
}
2. NIE powtarzaj struktury zdania w tej samej paczce.
3. NIE zaczynaj żadnego pomysłu od tych samych trzech pierwszych słów: ${
        repeatedOpenings(safeExclude, 2, 40)
          .map((entry) => `„${entry.opening}…" (${entry.count}x)`)
          .join(", ") || "(brak powtarzalnych otwarć)"
      }.

Zwróć WYŁĄCZNIE JSON:
{
  "ideas": [
    {
      "layout": ${LAYOUT_VALUES.map((value) => `"${value}"`).join(" | ")},
      "primary": "teza kadru po angielsku — jedyne zdanie, które piszesz",
      "category": "string",
      "archetype": "id figury, której użyłeś",
      "emotionalTarget": "string",
      "format": "string",
      "theme": "${THEMES.join(" | ")}"
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
        // Jedna partia = jeden zestaw użytych wezwań: bez niego osiem
        // pomysłów o tym samym kształcie kończyło się tym samym podpisem.
        .map((item, index) => normalizeModelIdea(item, index, seed, usedCtas))
        .filter((idea): idea is NonNullable<typeof idea> => idea !== null)
        .filter((idea) => {
          const fingerprint = hookFingerprint(idea.hook);
          if (seenInBatch.has(fingerprint)) return false;
          if (maxSimilarity(idea.hook, recentHooks).score >= SIMILARITY.HARD_BLOCK) return false;
          seenInBatch.add(fingerprint);
          return true;
        })
        .slice(0, safeCount);

      if (ideas.length === 0) {
        return sendOfflineIdeas(res, safeCount, safeUsed, safeExclude);
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai" as const,
        ideas,
        // Model rzadko oddaje dokładnie N po przefiltrowaniu — bez tego UI
        // pokazywałby skróconą partię jak pełną.
        exhausted: ideas.length < safeCount,
        notice:
          ideas.length < safeCount
            ? `Model oddał ${ideas.length} z ${safeCount} pomysłów, resztę wywaliła kontrola rzemiosła lub powtórka — spróbuj ponownie.`
            : undefined,
      });
    } catch (err) {
      console.warn("Idea stream error:", err);
      // UI pokazuje `notice` — bank bez powodu udawałby wolny wybór, nie awarię.
      return sendOfflineIdeas(res, safeCount, safeUsed, safeExclude, degradedReason(err));
    }
  });
}
