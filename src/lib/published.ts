/**
 * Logika dziennika publikacji. Czysta, bez Reacta i bez modelu — żeby dało
 * się ją sprawdzić testem i żeby nikt nie musiał klikać „generuj", żeby
 * dowiedzieć się, co mu poszło.
 *
 * Uczciwość jest tu główną funkcją: przy trzech wpisach nie da się powiedzieć,
 * co działa. Dlatego każda statyka niesie `enough` i nikt nie może jej
 * opisać jako wniosku, dopóki próby nie są wystarczające.
 */
import type { PublishedItem, PublishKind, PublishMetrics } from "../types";
import { hookFingerprint } from "./similarity";

/** Poniżej tylu prób nie ma wniosku, jest tylko ciekawostka. */
export const MIN_SAMPLE = 3;
/** Prog, od którego trzysekundowe przytrzymanie uznajemy za dobre. */
export const HOLD_GOOD_PCT = 60;
/**
 * Ile wyświetleń musi mieć KAŻDY wariant, żeby porównanie A/B było porównaniem.
 * Ta sama zasada co `MIN_SAMPLE`, tylko inna miara próby. Liczy ją trasa
 * `ab-conclusion` i liczy ją UI — przycisk nie może obiecywać rozstrzygnięcia,
 * którego serwer i tak odmówi.
 */
export const MIN_AB_VIEWS = 30;

const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
const KINDS = ["reel", "post", "carousel"] as const;

// ===== UKŁAD KADRU: ZAMKNIĘTY SŁOWNIK =====

/**
 * `format` był wolnym tekstem z domyślnym id rolki („viral_loop_6s"), więc trzy
 * wpisy tego samego układu rozeszły się po trzech jednoelementowych grupach i
 * `kind:format` nigdy nie uzbierał próby. Słownik jest zamknięty: układ kadrowy
 * jest jeden zestaw dla rolki i jeden dla kadru statycznego (post i karuzela
 * grają tymi samymi układami ze studia).
 */
export const REEL_FORMATS = [
  "viral_loop_6s",
  "hook_payoff_5s",
  "three_phases",
  "dynamic_broll_cut",
  "five_beats_20s",
] as const;

/**
 * Układy kadru statycznego ze studia (`FRAME_FORMATS` w `formats.ts`) plus
 * „napis w scenie", który zostaje tylko jako układ z analizy linku.
 */
export const FRAME_FORMATS_IN_LEDGER = ["quote", "protocol", "cost", "collage", "scene"] as const;

/** Tego id nie ma w żadnym słowniku — uczciwe „wiem, że wyszło, nie wiem skąd". */
export const UNKNOWN_FORMAT = "unknown";

/**
 * Nazwy, które już krążą po danych: studia piszą `gridType`, studio rolek pisze
 * swoje id, a prompt serwera zwraca layouts po angielsku.
 */
const FORMAT_ALIASES: Record<string, string> = {
  none_solid: "quote",
  single_quote: "quote",
  cytat: "quote",
  protocol_list: "protocol",
  protokół: "protocol",
  protokol: "protocol",
  cost_vs_reward: "cost",
  koszt: "cost",
  grid_2x2: "collage",
  kolaż: "collage",
  kolaz: "collage",
  studio_wall_3d: "scene",
  napis_w_scenie: "scene",
  loop: "viral_loop_6s",
  loop_6s: "viral_loop_6s",
  payoff: "hook_payoff_5s",
  broll_cut: "dynamic_broll_cut",
  dynamic_broll: "dynamic_broll_cut",
  phases: "three_phases",
  trzy_fazy: "three_phases",
  five_beats: "five_beats_20s",
};

export function formatsForKind(kind: PublishKind): readonly string[] {
  return kind === "reel" ? REEL_FORMATS : FRAME_FORMATS_IN_LEDGER;
}

/** Etykieta po polsku — to UI, nie materiał. */
export const FORMAT_LABELS: Record<string, string> = {
  viral_loop_6s: "Pętla 6 s",
  hook_payoff_5s: "Hook i puenta 5 s",
  three_phases: "Trzy fazy",
  dynamic_broll_cut: "Cięcia na tle",
  five_beats_20s: "Pięć uderzeń 20 s",
  quote: "Cytat",
  protocol: "Protokół",
  cost: "Koszt i utrata",
  collage: "Kolaż",
  scene: "Napis w scenie",
  [UNKNOWN_FORMAT]: "Układ nieprzypisany",
};

/**
 * `oneOf` z `normalize.server.ts` liczy się po odpowiedzi modelu i siedzi w pliku
 * `.server` — dziennik czytają komponenty, więc ten sam słownik sprawdzamy
 * lokalnie, inaczej sprowadzilibyśmy kod serverowy do bundla.
 */
export function normalizeFormat(kind: PublishKind, value: unknown): string {
  const raw = (typeof value === "string" ? value : "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!raw) return UNKNOWN_FORMAT;
  const vocabulary = formatsForKind(kind) as readonly string[];
  const aliased = FORMAT_ALIASES[raw];
  if (aliased && vocabulary.includes(aliased)) return aliased;
  return vocabulary.includes(raw) ? raw : UNKNOWN_FORMAT;
}

export function formatLabel(kind: PublishKind, format: string): string {
  return FORMAT_LABELS[format] ?? format;
}

function asDate(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function asCount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n);
}

function asPct(value: unknown): number | undefined {
  const n = asCount(value);
  return n === undefined ? undefined : Math.min(100, n);
}

function normalizeMetrics(value: unknown): PublishMetrics | undefined {
  const raw = (value ?? {}) as Record<string, unknown>;
  const metrics: PublishMetrics = {
    reach: asCount(raw.reach),
    hold3s: asPct(raw.hold3s),
    watchPct: asPct(raw.watchPct),
    likes: asCount(raw.likes),
    comments: asCount(raw.comments),
    shares: asCount(raw.shares),
    saves: asCount(raw.saves),
  };
  const filled = Object.values(metrics).some((v) => v !== undefined);
  return filled ? metrics : undefined;
}

/**
 * Klucz wpisu: ten sam dzień i ta sama myśl to TA SAMA publikacja.
 * Jedyną ścieżką edycji było „usuń i dodaj ponownie", więc jeden przypadkowy
 * duplikat przekraczał `MIN_SAMPLE` i wchodził do każdego promptu przez
 * `topPublishedHooks()`.
 */
export function publicationKey(item: { postedAt: string; hook: string }): string {
  return `${item.postedAt}|${hookFingerprint(item.hook)}`;
}

/** Blob z localStorage może mieć cokolwiek — stąd normalizacja pola po polu. */
export function normalizePublished(value: unknown): PublishedItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: PublishedItem[] = [];
  for (const entry of value.map(toPublishedItem)) {
    if (!entry) continue;
    // Pilnujemy FAKTU (ten dzień, ta myśl), nie wiersza: `id` tylko nosi wpis w
    // interfejsie, a jego kolizja nie może kasować drugiej publikacji.
    const key = publicationKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(entry);
  }
  return items.sort((a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : 0));
}

function toPublishedItem(entry: unknown, index: number): PublishedItem | null {
  const raw = (entry ?? {}) as Record<string, unknown>;
  const hook = typeof raw.hook === "string" ? raw.hook.trim().slice(0, 300) : "";
  const postedAt = asDate(raw.postedAt);
  if (!hook || !postedAt) return null;
  const kind: PublishKind = (KINDS as readonly string[]).includes(String(raw.kind))
    ? (raw.kind as PublishKind)
    : "reel";
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `pub-${postedAt}-${index}`,
    postedAt,
    platform: (PLATFORMS as readonly string[]).includes(String(raw.platform))
      ? (raw.platform as PublishedItem["platform"])
      : "instagram",
    kind,
    hook,
    format: normalizeFormat(kind, raw.format),
    theme: typeof raw.theme === "string" ? raw.theme.slice(0, 60) : undefined,
    music: typeof raw.music === "string" ? raw.music.slice(0, 80) : undefined,
    sourceId: typeof raw.sourceId === "string" ? raw.sourceId : undefined,
    metrics: normalizeMetrics(raw.metrics),
    loggedAt: typeof raw.loggedAt === "string" ? raw.loggedAt : new Date().toISOString(),
  };
}

/**
 * Wpis wygląda na powtórzenie innego wpisu: exact duplice wycina normalizator,
 * ale ta sama myśl z kadru w innym dniu wciąż jest tą samą treścią w pamięci
 * modeli, a dla właściciela konta — prawdopodobnie tym samym poście.
 */
export function suspectedDuplicates(items: PublishedItem[]): Map<string, string> {
  const firstSeen = new Map<string, PublishedItem>();
  const flags = new Map<string, string>();
  for (const item of items) {
    const fingerprint = hookFingerprint(item.hook);
    const earlier = firstSeen.get(fingerprint);
    if (earlier) {
      flags.set(
        item.id,
        `Ta sama myśl z kadru jest w dzienniku także pod datą ${earlier.postedAt}. Jeśli to ten sam post, usuń jeden wpis — podwójna próba to podwójny głos w każdym rankingu.`,
      );
      continue;
    }
    firstSeen.set(fingerprint, item);
  }
  return flags;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function publishedHookFingerprints(items: { hook: string }[]): string[] {
  return items.map((item) => hookFingerprint(item.hook));
}

/**
 * Kolejka studia czyta JEDYNĄ rzeczywistość. Post jest „już na koncie", gdy
 * dziennik ma jego identyfikator (`sourceId`) albo myśl z tego kadru — ten sam
 * odcisk, którym normalizator liczy duplikaty.
 *
 * Dawniej patrzyło się na `post.published_date`, który cztery miejsca pisały
 * `null` i nikt nie ustawiał, więc licznik „jeszcze nie poszło" nie schodził
 * nawet po zalogowaniu publikacji.
 */
export function filterUnpublished<T extends { id: string; title?: string }>(
  posts: T[],
  published: PublishedItem[],
): T[] {
  const ids = new Set(
    published
      .map((item) => item.sourceId)
      .filter((id): id is string => typeof id === "string" && !!id),
  );
  const hooks = new Set(publishedHookFingerprints(published));
  return posts.filter(
    (post) => post && !ids.has(post.id) && !hooks.has(hookFingerprint(post.title ?? "")),
  );
}

/**
 * Własne wzorce do wklejenia w prompt. Few-shot na zdaniach, które u nas
 * zadziałały, bije few-shot na cytatach Marka Aureliusza: model nie uczy się
 * wtedy rytmu marki, tylko łaciny i pompy.
 *
 * Bez metryk nie ma wzorca — stąd próg zasięgu. Poniżej niego nie wiemy, czy
 * zdanie było dobre, czy po prostu nikt go nie zobaczył.
 */
export const EXEMPLAR_MIN_REACH = 500;

export function topPublishedHooks(items: PublishedItem[], limit = 6): string[] {
  const scored = items
    .filter((item) => (item.metrics?.reach ?? 0) >= EXEMPLAR_MIN_REACH)
    .map((item) => {
      const reach = item.metrics?.reach ?? 1;
      const sharesPerK = ((item.metrics?.shares ?? 0) / reach) * 1000;
      const savesPerK = ((item.metrics?.saves ?? 0) / reach) * 1000;
      return {
        hook: item.hook,
        score: sharesPerK * 2 + savesPerK + (item.metrics?.hold3s ?? 0) / 10,
      };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of scored) {
    const fp = hookFingerprint(entry.hook);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(entry.hook);
    if (out.length >= limit) break;
  }
  return out;
}

/** Wielkości, którymi porównujemy układy. `enough` liczony jest dla każdej osobno. */
export type ComparedMetric = "reach" | "hold3s" | "watchPct" | "sharesPerK" | "saves";

export interface FormatStat {
  key: string;
  kind: PublishKind;
  format: string;
  /** Wszystkie wpisy w grupie, także te bez ani jednej liczby. */
  count: number;
  /** Wpisy bez żadnych liczb — nie wchodzą do żadnej mediany. */
  unmeasured: number;
  /** Ile wpisów REALNIE ma daną wielkość. Na tym liczy się `enough`. */
  measured: Record<ComparedMetric, number>;
  /** Grupa nadaje się do wniosku, gdy `MIN_SAMPLE` wpisów ma policzone wysyłki. */
  enough: boolean;
  medianReach: number | null;
  medianHold: number | null;
  medianWatch: number | null;
  medianSharesPerK: number | null;
  medianSaves: number | null;
}

function sharesPerK(item: PublishedItem): number | null {
  const reach = item.metrics?.reach;
  const shares = item.metrics?.shares;
  if (!reach || shares === undefined || reach < 100) return null;
  return Math.round((shares / reach) * 1000);
}

const METRIC_SOURCES: Array<{ key: ComparedMetric; of: (item: PublishedItem) => number | null }> = [
  { key: "reach", of: (item) => item.metrics?.reach ?? null },
  { key: "hold3s", of: (item) => item.metrics?.hold3s ?? null },
  { key: "watchPct", of: (item) => item.metrics?.watchPct ?? null },
  { key: "sharesPerK", of: sharesPerK },
  { key: "saves", of: (item) => item.metrics?.saves ?? null },
];

/** Czy dana wielkość tej grupy została zmierzona dość licznym próbkowaniem. */
export function enoughFor(stat: FormatStat, metric: ComparedMetric): boolean {
  return stat.measured[metric] >= MIN_SAMPLE;
}

/** Zbiorcze liczby per format (albo per gatunek kadru) z progiem ZMIERZONYCH prób. */
export function statsByFormat(items: PublishedItem[]): FormatStat[] {
  const groups = new Map<string, PublishedItem[]>();
  for (const item of items) {
    const format = normalizeFormat(item.kind, item.format);
    const key = `${item.kind}:${format}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const ofMetric = (metric: ComparedMetric) =>
        group
          .map((item) => METRIC_SOURCES.find((source) => source.key === metric)?.of(item) ?? null)
          .filter(onlyNumbers);
      const measured = Object.fromEntries(
        METRIC_SOURCES.map(({ key: metric }) => [metric, ofMetric(metric).length]),
      ) as Record<ComparedMetric, number>;
      return {
        key,
        kind: group[0].kind,
        format: key.split(":")[1],
        count: group.length,
        unmeasured: group.filter((item) => item.metrics === undefined).length,
        measured,
        enough: measured.sharesPerK >= MIN_SAMPLE,
        medianReach: median(ofMetric("reach")),
        medianHold: median(ofMetric("hold3s")),
        medianWatch: median(ofMetric("watchPct")),
        medianSharesPerK: median(ofMetric("sharesPerK")),
        medianSaves: median(ofMetric("saves")),
      };
    })
    .sort((a, b) => (b.medianSharesPerK ?? 0) - (a.medianSharesPerK ?? 0));
}

function onlyNumbers(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export interface LedgerVerdict {
  headline: string;
  detail: string;
  /** Czy jest z czego wyciągnąć wniosek, czy tylko zbieramy dane. */
  conclusive: boolean;
}

/**
 * Co dziennik mówi. Nagradzamy wysyłki i przytrzymanie, nie lajki — lajki
 * rosną razem z zasięgiem, więc mówią o algorytmie, nie o treści.
 */
export function ledgerVerdict(items: PublishedItem[]): LedgerVerdict {
  const stats = statsByFormat(items);
  const usable = stats.filter((stat) => stat.enough);
  const measuredShares = stats.reduce((sum, stat) => sum + stat.measured.sharesPerK, 0);
  const unmeasuredEntries = items.filter((item) => item.metrics === undefined).length;

  if (usable.length === 0) {
    return {
      headline: "Za mało danych, żeby cokolwiek rozstrzygnąć",
      detail: items.length
        ? `Wpisów: ${items.length}, z policzonymi wysyłkami: ${measuredShares}. Wniosek o układzie wymaga ${MIN_SAMPLE} ZMIERZONYCH publikacji w tym samym układzie, nie ${MIN_SAMPLE} samych wpisów.${
            unmeasuredEntries ? ` Bez ani jednej liczby: ${unmeasuredEntries}.` : ""
          }`
        : "Dodaj pierwszą publikację z liczbami, a aplikacja zacznie porównywać formaty zamiast strzelać.",
      conclusive: false,
    };
  }

  const top = [...usable].sort((a, b) => (b.medianSharesPerK ?? 0) - (a.medianSharesPerK ?? 0))[0];
  const withHold = usable.filter((stat) => enoughFor(stat, "hold3s"));
  const weak = [...withHold]
    .filter((stat) => (stat.medianHold ?? 100) < HOLD_GOOD_PCT)
    .sort((a, b) => (a.medianHold ?? 0) - (b.medianHold ?? 0))[0];

  const detail = [
    `Mediana z ${top.measured.sharesPerK} publikacji z policzonymi wysyłkami w układzie ${top.key}.`,
    weak
      ? `Najsłabsze przytrzymanie: ${weak.key} — ${weak.medianHold}% po trzech sekundach, czyli pierwsza fraza nie zatrzymuje kciuka.`
      : withHold.length
        ? "Żaden dość licznie zmierzony układ nie spada poniżej progu przytrzymania."
        : `Przytrzymania nie zmierzyliśmy w dość licznym próbkowaniu (min. ${MIN_SAMPLE} wpisów), więc nie orzekamy o progu ${HOLD_GOOD_PCT}%.`,
    unmeasuredEntries
      ? `Wpisów bez ani jednej liczby, pomijanych w każdej medianie: ${unmeasuredEntries}.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline: `Najwięcej wysyłek na tysiąc: ${top.key} (${top.medianSharesPerK ?? 0})`,
    detail,
    conclusive: true,
  };
}
