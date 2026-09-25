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
export const WATCH_GOOD_PCT = 50;
/** Wysyłki na tysiąc odbiorców: 10 to zdrowo, powyżej 30 to wyjątek. */
export const SHARES_GOOD_PER_K = 10;

const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
const KINDS = ["reel", "post", "carousel"] as const;

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
    follows: asCount(raw.follows),
  };
  const filled = Object.values(metrics).some((v) => v !== undefined);
  return filled ? metrics : undefined;
}

/** Blob z localStorage może mieć cokolwiek — stąd normalizacja pola po polu. */
export function normalizePublished(value: unknown): PublishedItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index): PublishedItem | null => {
      const raw = (entry ?? {}) as Record<string, unknown>;
      const hook = typeof raw.hook === "string" ? raw.hook.trim().slice(0, 300) : "";
      const postedAt = asDate(raw.postedAt);
      if (!hook || !postedAt) return null;
      return {
        id: typeof raw.id === "string" && raw.id ? raw.id : `pub-${postedAt}-${index}`,
        postedAt,
        platform: (PLATFORMS as readonly string[]).includes(String(raw.platform))
          ? (raw.platform as PublishedItem["platform"])
          : "instagram",
        kind: (KINDS as readonly string[]).includes(String(raw.kind))
          ? (raw.kind as PublishKind)
          : "reel",
        hook,
        format: typeof raw.format === "string" ? raw.format.trim().slice(0, 60) : "unknown",
        theme: typeof raw.theme === "string" ? raw.theme.slice(0, 60) : undefined,
        music: typeof raw.music === "string" ? raw.music.slice(0, 80) : undefined,
        sourceId: typeof raw.sourceId === "string" ? raw.sourceId : undefined,
        metrics: normalizeMetrics(raw.metrics),
        loggedAt: typeof raw.loggedAt === "string" ? raw.loggedAt : new Date().toISOString(),
      };
    })
    .filter((entry): entry is PublishedItem => entry !== null)
    .sort((a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : 0));
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

export interface FormatStat {
  key: string;
  kind: PublishKind;
  count: number;
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

/** Zbiorcze liczby per format (albo per gatunek kadru) z progiem próby. */
export function statsByFormat(items: PublishedItem[]): FormatStat[] {
  const groups = new Map<string, PublishedItem[]>();
  for (const item of items) {
    const key = `${item.kind}:${item.format}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      kind: group[0].kind,
      count: group.length,
      enough: group.length >= MIN_SAMPLE,
      medianReach: median(group.map((g) => g.metrics?.reach).filter(onlyNumbers)),
      medianHold: median(group.map((g) => g.metrics?.hold3s).filter(onlyNumbers)),
      medianWatch: median(group.map((g) => g.metrics?.watchPct).filter(onlyNumbers)),
      medianSharesPerK: median(group.map(sharesPerK).filter(onlyNumbers)),
      medianSaves: median(group.map((g) => g.metrics?.saves).filter(onlyNumbers)),
    }))
    .sort((a, b) => (b.medianReach ?? 0) - (a.medianReach ?? 0));
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
  const usable = statsByFormat(items).filter((stat) => stat.enough);

  if (usable.length === 0) {
    const withMetrics = items.filter((item) => item.metrics?.reach !== undefined).length;
    return {
      headline: "Za mało danych, żeby cokolwiek rozstrzygnąć",
      detail: items.length
        ? `Masz ${items.length} publikacj${items.length === 1 ? "ę" : i(items.length)}, z czego ${withMetrics} z liczbami. Potrzeba co najmniej ${MIN_SAMPLE} w jednym formacie.`
        : "Dodaj pierwszą publikację z liczbami, a aplikacja zacznie porównywać formaty zamiast strzelać.",
      conclusive: false,
    };
  }

  const byShare = [...usable].sort((a, b) => (b.medianSharesPerK ?? 0) - (a.medianSharesPerK ?? 0));
  const top = byShare[0];
  const weak = [...usable]
    .filter((stat) => stat.medianHold !== null && stat.medianHold < HOLD_GOOD_PCT)
    .sort((a, b) => (a.medianHold ?? 0) - (b.medianHold ?? 0))[0];

  return {
    headline: `Najwięcej wysyłek na tysiąc: ${top.key} (${top.medianSharesPerK ?? 0})`,
    detail: [
      `Mediana z ${top.count} publikacji w tym formacie.`,
      weak
        ? `Najsłabsze przytrzymanie: ${weak.key} — ${weak.medianHold}% po trzech sekundach, czyli pierwsza fraza nie zatrzymuje kciuka.`
        : "Żaden format nie spada poniżej progu przytrzymania.",
    ].join(" "),
    conclusive: true,
  };
}

/** Polska odmiana liczebnika — bez tego tekst w UI wygląda na maszynowy. */
function i(count: number): string {
  return count >= 5 ? "i" : "e";
}
