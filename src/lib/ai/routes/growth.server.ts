import type { MiniApp, MiniResponse } from "../../mini-express.server";
import {
  GEMINI_MODEL,
  generateJsonWithFallback,
  getGeminiClient,
  callGeminiWithFallback,
} from "../gemini.server";
import { clampInt, clampText, clampTextList } from "../../limits";
import { HOOK_CRAFT_PROMPT, auditHook, auditLine } from "../../hookCraft";
import { hookFingerprint, maxSimilarity, SIMILARITY } from "../../similarity";
import { softenForPlatform } from "../../platformSafe";
import { asArray, asString, asStringArray, oneOf, sendDegraded } from "../normalize.server";
import { isPolishCopy, starkCaption, starkCta, starkHashtags } from "../../caption";
import { MIN_AB_VIEWS } from "../../published";

/**
 * GROWTH ENGINE — eksperymenty A/B i tygodniowy autopilot.
 * 1. /api/ai/ab-variants — 2 warianty TEJ SAMEJ rolki (inny hook / inny motyw)
 * 2. /api/ai/ab-conclusion — zwycięski wzorzec wraca do generatora (pętla uczenia)
 * 3. /api/ai/weekly-autopilot — 7 paczek (po jednej kategorii na dzień z rotacji)
 * 4. /api/ai/reroll-prompt — nowy prompt tła w TYM SAMYM stylu (spójny feed)
 *
 * Materiał po angielsku (warianty, hooki dnia) przechodzi tę samą kontrolę co
 * reszta marki: rzemiosło z `hookCraft`, anty-powtórka z `excludeHooks` i CTA
 * wyłącznie z puli `caption.ts`. Wezwania pisane przez model albo z banku
 * („Follow for the 3 AM protocol.") to dokładnie to, czego marka nie robi.
 *
 * Próg próby A/B (`MIN_AB_VIEWS`) nie siedzi tutaj, tylko w `published.ts` —
 * liczy go i ta trasa, i przycisk w UI, żeby kliknięcie nie obiecywało wniosku,
 * którego serwer i tak odmówi.
 */

/** Miara wiersza jak w `frames.server`: faza roli jest dłuższa niż teza. */
const ROW_MAX_WORDS = 16;

/** Etykiety wariantów — trasa i UI rozpoznają eksperyment wyłącznie po nich. */
const AB_LABELS = ["A", "B"] as const;

/** Data publikacji wariantu: albo YYYY-MM-DD, albo pustka — nie „dzisiaj". */
function asDate(value: unknown): string {
  const raw = clampText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

const PROMPT_TAIL = 30;
const SIMILAR_TAIL = 60;

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

const AB_THEMES = ["obsidian_void", "carbon_aura"] as const;

/**
 * Tydzień nie jest siedmioma rolkami. Rolka robi zasięg, karuzela robi zapisy
 * (a zapis najtaniej utrzymuje post w obiegu), a spokojny kadr 1:1 podtrzymuje
 * markę między nimi. Dwie publikacje dziennie „żeby nadrobić spadający zasięg"
 * działają przeciwnie — liczy się stałość, nie wolumen.
 */
const WEEK_FORMATS = ["reel", "carousel", "reel", "post", "reel", "carousel", "reel"] as const;

const FORMAT_LABELS: Record<(typeof WEEK_FORMATS)[number], string> = {
  reel: "Rolka (zasięg)",
  carousel: "Karuzela (zapisy)",
  post: "Kadr 1:1 (marka)",
};

const REASON = {
  polish: "polski w materiale",
  published: "powtórka tego, co już poszło w feedzie",
  internal: "powtórka w tej samej odpowiedzi",
} as const;

/** `hook` = teza, `line` = wiersz struktury, `plain` = bank treści i proza. */
type Measure = "hook" | "line" | "plain";

export interface Craft {
  banned: Set<string>;
  recent: string[];
  accepted: Set<string>;
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

function commit(craft: Craft, lines: readonly (string | undefined)[]): void {
  for (const line of lines) {
    if (line) craft.accepted.add(hookFingerprint(line));
  }
}

function issueLabel(issue: string): string {
  return issue.split(/\s*[("„]/)[0].trim() || issue;
}

function cleanText(value: unknown): string {
  return asString(value).replace(/[*#"]/g, "").replace(/\s+/g, " ").trim();
}

function noteOf(value: unknown, max: number): string {
  return clampText(asString(value), max);
}

function auditMeasure(text: string, measure: Measure) {
  if (measure === "hook") return auditHook(text);
  if (measure === "line") return auditLine(text, ROW_MAX_WORDS);
  return null;
}

function repeatReason(text: string, craft: Craft): string | null {
  // Klient zna treść, którą DOSTAŁ: `sendDegraded` zmiękcza ryzykowne słowa
  // dopiero na wyjściu, więc odcisk surowej linii banku nie zawsze zgadza się
  // z tym, co siedzi w historii. Oba kształty liczy `similarity.ts`.
  const keys = [hookFingerprint(text), hookFingerprint(softenForPlatform(text))];
  if (keys.some((key) => craft.banned.has(key))) return REASON.published;
  if (keys.some((key) => craft.accepted.has(key))) return REASON.internal;
  if (maxSimilarity(text, craft.recent).score >= SIMILARITY.HARD_BLOCK) return REASON.published;
  return null;
}

/**
 * Wyrok na jedno zdanie materiału: pusty napis znaczy „nie wolno pokazać”.
 * Odpada wiersz, nigdy cała odpowiedź.
 */
function craftLine(value: unknown, craft: Craft, measure: Measure): string {
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

function craftLines(value: unknown, craft: Craft, measure: Measure, max = 4): string[] {
  return asStringArray(value, max)
    .map((line) => craftLine(line, craft, measure))
    .filter(Boolean);
}

function tally(reasons: readonly string[]): string[] {
  const counts = new Map<string, number>();
  for (const reason of reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pl"))
    .map(([reason, count]) => `${reason} (${count})`);
}

/** Ten sam kształt odmowy co `notice` w `frames.server` — UI ma pokazać przyczynę. */
function rejectionNotice(craft: Craft, what: string): string {
  const details = tally(craft.reasons);
  if (details.length === 0) return `Brak materiału w ${what} — spróbuj ponownie.`;
  return `W ${what} nie zostało nic do pokazania: ${details.join(", ")}.`;
}

/** Blok wykluczeń — sformułowany dokładnie tak jak w `frames.server`. */
function excludeBlock(exclude: readonly string[]): string {
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

// ============ BANK WARIANTÓW A/B ============

interface BankVariant {
  hook: string;
  angle: string;
  phrases: string[];
}

/**
 * Dwie pary na wypadek, gdy historyjne eksperymenty wykluczyły część banku.
 * Etykiety A/B i motyw idą po pozycji, nie od modelu.
 */
const BANK_VARIANTS: BankVariant[] = [
  {
    hook: "Comfort is a cage with the door wide open.",
    angle: "konfrontacja z wymówką",
    phrases: [
      "Comfort is a cage with the door wide open.",
      "You stay because it hurts less than leaving.",
      "Walk out. Now.",
    ],
  },
  {
    hook: "3 AM is the only honest hour you have left.",
    angle: "konkret + wykluczenie",
    phrases: [
      "3 AM is the only honest hour you have left.",
      "No noise. No spectators. Just the work.",
      "Most men never meet themselves. You will tonight.",
    ],
  },
  {
    hook: "Your potential is watching you waste it.",
    angle: "wyrzut sumienia",
    phrases: [
      "Your potential is watching you waste it.",
      "Every scroll is a vote for the life you hate.",
      "Cast the other vote. Today.",
    ],
  },
  {
    hook: "5 AM decides who owns the next 20 years.",
    angle: "konkret + stawka",
    phrases: [
      "5 AM decides who owns the next 20 years.",
      "The world belongs to those already awake.",
      "Join the ones who do not negotiate.",
    ],
  },
];

/** Wariant z banku: liczymy tylko to, co już nie poszło — resztę robi `normalizeVariant`. */
function bankVariants(craft: Craft) {
  const fresh: RawVariant[] = [];
  for (const variant of BANK_VARIANTS) {
    const hook = craftLine(variant.hook, craft, "plain");
    const phrases = variant.phrases.map((line) => craftLine(line, craft, "plain")).filter(Boolean);
    if (!hook || phrases.length === 0) continue;
    commit(craft, [hook, ...phrases]);
    fresh.push({ hook, angle: variant.angle, phrases });
    if (fresh.length === 2) break;
  }
  return fresh;
}

/**
 * Odpowiedź modelu na pytanie o eksperyment A/B. Zdanie, które nie przechodzi
 * rzemiosła, zabiera tylko swoje ramię — drugie zostaje.
 */
export function craftVariants(raw: unknown, craft: Craft): RawVariant[] {
  const variants: RawVariant[] = [];
  for (const entry of asArray(raw).slice(0, 2)) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const hook = craftLine(item.hook, craft, "hook");
    const phrases = craftLines(item.phrases, craft, "line");
    if (!hook) continue;
    commit(craft, [hook, ...phrases]);
    variants.push({ hook, angle: item.angle, phrases });
  }
  return variants;
}

interface RawVariant {
  hook: string;
  angle?: unknown;
  phrases: string[];
}

/**
 * Kształt wariantu dla UI. `cta` jest TYLKO z puli `STARK_CTAS` (wybiera
 * `starkCta`): model pisał „Follow for the 3 AM protocol.", czyli żebranie o
 * engagement, które `ENGAGEMENT_BAIT` odrzuca w każdym innym zdaniu marki.
 */
function normalizeVariant(
  variant: { hook: string; angle?: unknown; phrases: string[] },
  index: number,
) {
  const source = `${variant.hook} ${variant.phrases.join(" ")}`;
  return {
    // Etykieta PO INDEKSIE, nie od modelu: `ab-conclusion` rozróżnia warianty
    // po "A"/"B", a UI klika po niej inputy — dowolna etykieta z JSON-a
    // collapse'uje oba wiersze eksperymentu.
    label: index === 0 ? "A" : "B",
    hook: variant.hook,
    angle: noteOf(variant.angle, 80),
    phrases: variant.phrases.length > 0 ? variant.phrases : [variant.hook],
    theme: AB_THEMES[index === 0 ? 0 : 1],
    cta: starkCta(source),
    hashtags: starkHashtags(source),
    caption: starkCaption(variant.hook, variant.phrases.slice(1).join(" ")),
  };
}

/** Para z banku, kiedy model nie oddał żadnego ramienia. */
function offlineVariants(res: MiniResponse, craft: Craft, topic: string, historyUsed: number) {
  const variants = bankVariants(craft).map(normalizeVariant);
  const seed = Date.now();
  if (variants.length === 2) {
    return sendDegraded(res, {
      source: "offline" as const,
      topic,
      experimentId: `ab-${seed}`,
      historyUsed,
      variants,
    });
  }
  const notice = rejectionNotice(craft, "wariantach A/B");
  return sendDegraded(res, {
    source: "offline" as const,
    topic,
    experimentId: `ab-${seed}`,
    historyUsed,
    variants: [],
    notice,
    message: notice,
  });
}

// ============ TYDZIEŃ ============

/**
 * Siedem dni z odpowiedzi modelu. Dzień zostaje zawsze — wypada tylko zdanie,
 * które nie przeszło kontroli (autopilot karmi paczkę dnia, a ta i tak pisze
 * materiał od nowa). `null`, gdy model nie trzymał się liczby dni.
 */
export function craftWeek(raw: unknown, craft: Craft) {
  const week = asArray(raw);
  if (week.length !== DAYS.length) return null;

  return week.map((entry, idx) => {
    const day = (entry ?? {}) as Record<string, unknown>;
    const hook = craftLine(day.hookOfDay, craft, "hook");
    const topic = craftLine(day.topic, craft, "plain");
    commit(craft, [hook, topic]);
    const format = WEEK_FORMATS[idx % WEEK_FORMATS.length];
    const category = WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length];
    return {
      day: DAYS[idx],
      dayIndex: idx,
      format,
      formatLabel: FORMAT_LABELS[format],
      category,
      // Kategoria dnia jest gotowcem tylko na wypadek, gdy temat odpadł.
      topic: topic || category,
      hookOfDay: hook,
      plan: noteOf(day.plan, 300),
    };
  });
}

function offlineWeek() {
  return {
    source: "offline" as const,
    generatedAt: new Date().toISOString(),
    week: DAYS.map((day, idx) => ({
      day,
      dayIndex: idx,
      format: WEEK_FORMATS[idx % WEEK_FORMATS.length],
      formatLabel: FORMAT_LABELS[WEEK_FORMATS[idx % WEEK_FORMATS.length]],
      category: WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length],
      topic: `${WEEK_CATEGORIES[idx % WEEK_CATEGORIES.length]} — dark motivation for @stark_focus`,
      hookOfDay: "",
      plan: "",
    })),
  };
}

export function registerGrowthRoutes(app: MiniApp): void {
  // ============ A/B WARIANTY TEJ SAMEJ ROLKI ============
  app.post("/api/ai/ab-variants", async (req, res) => {
    const topic = clampText(req.body?.topic, 200, "dark motivation and brutal discipline");
    const exclude = clampTextList(req.body?.excludeHooks);
    const ai = getGeminiClient();
    const seed = Date.now();

    // Pętla uczenia: historia zakończonych eksperymentów (zwycięskie hooki + lekcje)
    // wtrącana do promptu, żeby AI nie powtarzało przestałych wzorców.
    const safeHistory = asArray(req.body?.history)
      .slice(-8)
      .map((entry) => {
        const item = (entry ?? {}) as Record<string, unknown>;
        return {
          winner: clampText(item.winner, 4, "?"),
          lesson: clampText(item.lesson, 240),
          winningHook: clampText(item.winningHook, 120),
          angle: clampText(item.angle, 80),
        };
      });

    // Zwycięskie hooki z zakończonych eksperymentów to treść, która realnie
    // wyszła na konto — traktujemy je jak historię publikacji: nie wracają ani
    // do promptu, ani do odpowiedzi.
    const banned = [...exclude, ...safeHistory.map((h) => h.winningHook)].filter(Boolean);
    const craft = createCraft(banned);

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
      return offlineVariants(res, craft, topic, safeHistory.length);
    }

    try {
      const prompt = `Jesteś strategiem treści dark motivation dla marki @stark_focus.
Temat: "${topic}".${historyContext}

ZADANIE: Zaprojektuj EKSPERYMENT A/B — DWIE wersje TEJ SAMEJ rolki (ta sama narracja emocjonalna, ale:
- WARIANT A: hook typu "bezpośrednia konfrontacja" (You...), motyw "obsidian_void"
- WARIANT B: hook typu "konkret/liczba/czas" (np. 3AM, 5AM, 99%), motyw "carbon_aura"

Oba warianty: hook max 8 słów po angielsku, phrases [hook, kontrast, puenta], angle po polsku (krótko).
NIE pisz CTA ani hashtagów — ogon bierzemy z puli marki, więc własne wezwanie i tak wyrzucamy.

${HOOK_CRAFT_PROMPT}
${excludeBlock(banned)}
Zwróć WYŁĄCZNIE JSON:
{
  "variants": [
    { "label": "A", "hook": "...", "angle": "...", "phrases": ["...","...","..."], "theme": "obsidian_void" },
    { "label": "B", "hook": "...", "angle": "...", "phrases": ["...","...","..."], "theme": "carbon_aura" }
  ]
}`;

      const parsed = await generateJsonWithFallback<{ variants?: unknown }>({
        contents: prompt,
        temperature: 0.9,
        preferredModel: GEMINI_MODEL,
      });

      const crafted = craftVariants(parsed?.variants, craft);
      // Jedno ramię to nie eksperyment, ale nie skreślamy tego, co model
      // napisał: brakujące ramię dokłada bank, a nie pół pary.
      const pair = [...crafted, ...bankVariants(craft).slice(0, 2 - crafted.length)]
        .slice(0, 2)
        .map(normalizeVariant);

      if (pair.length === 2) {
        return res.json({
          source: "ai" as const,
          topic,
          experimentId: `ab-${seed}`,
          historyUsed: safeHistory.length,
          variants: pair,
          // Ile ramion dołożył bank zamiast modelu — UI nie może kłamać, że
          // cała para przyszła z jednej odpowiedzi.
          bankFilled: 2 - crafted.length,
          trimmedDetails: tally(craft.reasons),
        });
      }
      return offlineVariants(res, craft, topic, safeHistory.length);
    } catch (err) {
      console.warn("ab-variants fallback:", err);
      return offlineVariants(res, craft, topic, safeHistory.length);
    }
  });

  // ============ WNIOSKI Z EKSPERYMENTU (zwycięski wzorzec) ============
  app.post("/api/ai/ab-conclusion", async (req, res) => {
    const experimentId = clampText(req.body?.experimentId, 60);
    const ai = getGeminiClient();

    // Metryki od klienta wchodzą w dzielenie i sortowanie — nieklampowana
    // liczba dałaby NaN albo engagement ujemny.
    const metric = (value: unknown): number => clampInt(value, 0, 1_000_000_000, 0);
    const norm = asArray(req.body?.results)
      .slice(0, 8)
      .map((entry, idx) => {
        const r = (entry ?? {}) as Record<string, unknown>;
        return {
          // Etykieta po pozycji, bo dalsza logika (i UI) rozróżnia warianty
          // wyłącznie po "A" / "B".
          label: oneOf(r.label, AB_LABELS, idx === 0 ? "A" : "B"),
          views: metric(r.views),
          likes: metric(r.likes),
          comments: metric(r.comments),
          shares: metric(r.shares),
          saves: metric(r.saves),
          hook: clampText(r.hook, 160),
          music: clampText(r.music, 80),
          background: clampText(r.background, 80),
          // Data publikacji wariantu od klienta: bez niej wpis z A/B nie ma się
          // z czym zestawić w dzienniku i jest drugą rzeczywistością.
          publishedAt: asDate(r.publishedAt),
        };
      });

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
    const short = norm.filter((r) => r.views < MIN_AB_VIEWS);
    if (short.length > 0) {
      // Brakujące ilości idą w odpowiedzi: UI nie ma z tego robić „wygrał
      // wariant", tylko powiedzieć, ile jeszcze wyświetleń brakuje co do sztuki.
      return res.json({
        source: "offline" as const,
        status: "insufficient_data" as const,
        experimentId,
        winner: null,
        minViews: MIN_AB_VIEWS,
        missing: short.map((r) => ({
          label: r.label,
          views: r.views,
          needs: MIN_AB_VIEWS - r.views,
        })),
        scored,
        lesson: `Bez rozstrzygnięcia: każdy wariant potrzebuje min. ${MIN_AB_VIEWS} wyświetleń, żeby porównanie engagementu cokolwiek udowodniło. ${short
          .map((r) => `Wariant ${r.label}: ${r.views}, brakuje ${MIN_AB_VIEWS - r.views}.`)
          .join(" ")}`,
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
        // Lekcja jest po polsku i nie jest materiałem — nie mierzymy jej
        // rzemiosłem hooka, ale nie przepuścimy też pustki.
        const generated = asString(response.text);
        if (generated.length > 20) lesson = generated;
      } catch {
        /* zostaje lekcja domyślna */
      }
    }

    // `status` i `winner` jadą razem: UI rozgałęzia render po nich, więc nigdy
    // nie złoży odmowy na linijkę „wygrał wariant".
    return res.json({
      source: ai ? ("ai" as const) : ("offline" as const),
      status: "decided" as const,
      experimentId,
      minViews: MIN_AB_VIEWS,
      winner: winner.label,
      scored,
      lesson,
    });
  });

  // ============ TYGODNIOWY AUTOPILOT ============
  app.post("/api/ai/weekly-autopilot", async (req, res) => {
    const exclude = clampTextList(req.body?.excludeHooks);
    const craft = createCraft(exclude);
    const ai = getGeminiClient();

    if (!ai) {
      return sendDegraded(res, offlineWeek());
    }

    try {
      const prompt = `Jesteś strategiem treści dark motivation dla @stark_focus.
Zaplanuj TYDZIEŃ (7 dni) publikacji. Każdy dzień ma przypisaną kategorię i format:

Formaty po kolei: ${WEEK_FORMATS.map((f) => FORMAT_LABELS[f]).join(" · ")}.
JEDNA publikacja dziennie, w formacie przypisanym do dnia. Nie dokładamy drugiej
„żeby nadrobić spadający zasięg" — stałość bije wolumen, a mieszanka formatów
rośnie szybciej niż tydzień samych rolek.
${DAYS.map((d, i) => `- ${d}: ${WEEK_CATEGORIES[i]}`).join("\n")}

${HOOK_CRAFT_PROMPT}
${excludeBlock(exclude)}
Dla każdego dnia zwróć:
- topic: temat dnia po angielsku, pod kategorię
- hookOfDay: główny hook dnia, max 8 słów, po angielsku
- plan: 1 zdanie po polsku — co dokładnie wychodzi tego dnia w przypisanym formacie

Zwróć WYŁĄCZNIE JSON:
{ "week": [ { "day": "MON", "category": "...", "topic": "...", "hookOfDay": "...", "plan": "..." } ] }`;

      const parsed = await generateJsonWithFallback<{ week?: unknown }>({
        contents: prompt,
        temperature: 0.85,
        preferredModel: GEMINI_MODEL,
      });

      const days = craftWeek(parsed?.week, craft);
      if (!days) throw new Error("bad week structure");

      return res.json({
        source: "ai" as const,
        generatedAt: new Date().toISOString(),
        week: days,
        trimmedDetails: tally(craft.reasons),
        notice: days.some((d) => d.hookOfDay)
          ? undefined
          : rejectionNotice(craft, "hookach tygodnia"),
      });
    } catch (err) {
      console.warn("weekly-autopilot fallback:", err);
      return sendDegraded(res, offlineWeek());
    }
  });

  // ============ REROLL PROMPTU W TYM SAMYM STYLU ============
  app.post("/api/ai/reroll-prompt", async (req, res) => {
    // Prompt referencyjny płaci za siebie w każdym wywołaniu — stąd limit.
    const referencePrompt = clampText(req.body?.referencePrompt, 400);
    const format = clampText(req.body?.format, 8, "1:1");
    const ai = getGeminiClient();
    const seed = Date.now();

    const styleCore =
      "dark minimalist composition, matte textures, moody directional lighting, cinematic chiaroscuro, high contrast, clean negative space, strictly no text, no letters, no watermark";

    if (!ai) {
      return sendDegraded(res, {
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

      const generated = clampText(parsed?.prompt, 600);
      if (generated.length > 40) {
        return res.json({ source: "ai" as const, prompt: generated });
      }
      throw new Error("bad prompt");
    } catch (err) {
      console.warn("reroll-prompt fallback:", err);
      return sendDegraded(res, {
        source: "offline" as const,
        prompt: `Abstract minimalist enigmatic void, variation ${seed % 997}, single beam of cold light through atmospheric fog, ${styleCore}, 8k ${format}`,
      });
    }
  });
}
