/**
 * Logika dziennika publikacji. Czysta, bez Reacta i bez modelu — żeby dało
 * się ją sprawdzić testem i żeby nikt nie musiał klikać „generuj", żeby
 * dowiedzieć się, co już poszło na konto.
 *
 * Dziennik liczy FAKT, nie skuteczność: data, platforma, gatunek, układ i myśl
 * z kadru. Z tego numerujemy edycje (`series.ts`) i tego pilnujemy, żeby ta sama
 * fraza nie wyszła drugi raz (`usedContent.ts`). Wnioski „co działa" wymagałyby
 * kilkudziesięciu prób na układ — przy tej skali byłyby zgadywanką, więc wolimy
 * nie mieć ich wcale niż mieć wymyślone.
 */
import type { PublishedItem, PublishKind, PublishMetrics } from "../types";
import { hookFingerprint } from "./similarity";

/** Poniżej tylu prób nie ma wniosku, jest tylko ciekawostka. */
export const MIN_SAMPLE = 3;
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
 * Klucz wpisu: ten sam dzień i ta sama myśl to TA SAMA publikacja. Jedyną
 * ścieżką edycji było „usuń i dodaj ponownie", więc jeden przypadkowy duplikat
 * liczyłby się jako druga próba — a to on karmi numer edycji i listę wykluczeń
 * anty-powtórki.
 */
export function publicationKey(item: { postedAt: string; hook: string }): string {
  return `${item.postedAt}|${hookFingerprint(item.hook)}`;
}

/**
 * Wpis do dziennika z jednego kliknięcia przy eksporcie — z datą, platformą,
 * gatunkiem, układem i myślą artefaktu, który właśnie wyszedł. Studia (post,
 * rolka) budują go tutaj, a nie u siebie, inaczej każde z nich inaczej
 * rozumiałoby słowo „opublikowane". Zapis przez `normalizePublished`: drugie
 * kliknięcie tego samego kadru tego dnia nie dodaje drugiego wpisu.
 */
export function publishedEntry(input: {
  kind: PublishKind;
  hook: string;
  platform?: string;
  format?: unknown;
  postedAt?: string;
  sourceId?: string;
  music?: string;
}): PublishedItem | null {
  const hook = (input.hook ?? "").trim().slice(0, 300);
  if (!hook) return null;
  const postedAt = asDate(input.postedAt ?? "");
  const kind: PublishKind = (KINDS as readonly string[]).includes(input.kind) ? input.kind : "post";
  return {
    id: `pub-${Date.now()}`,
    postedAt: postedAt || new Date().toISOString().slice(0, 10),
    platform: (PLATFORMS as readonly string[]).includes(String(input.platform))
      ? (input.platform as PublishedItem["platform"])
      : "instagram",
    kind,
    hook,
    format: normalizeFormat(kind, input.format),
    sourceId: input.sourceId,
    music: typeof input.music === "string" ? input.music.slice(0, 80) : undefined,
    loggedAt: new Date().toISOString(),
  };
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
