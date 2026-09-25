// src/lib/series.ts
// Numeracja edycji — „to jest Body of Work, nie podpis pod zdjęciem".
//
// 57% badanych przychylniej ocenia marki publikujące serie (Sprout Social),
// a mechanika jest darmowa: ten sam układ, ta sama stopka, rosnący numer.
// Edycja liczy się z tego, co naprawdę powstało w aplikacji (zapisane posty
// i to, co wyszło na konto), więc nie da jej się naciągnąć klikaniem.

export const SERIES_NAME = "STARK CODEX";
/** Ile materiałów na rok — plan, nie obietnica. Zmiana tu, nie w dziesięciu plikach. */
export const SERIES_PER_YEAR = 52;

export interface SeriesSource {
  posts?: unknown[];
  published?: unknown[];
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Kolejny numer edycji: zero, jeśli nic jeszcze nie powstało. */
export function nextEdition(source: SeriesSource | null | undefined): number {
  const posts = Array.isArray(source?.posts) ? source.posts.length : 0;
  const published = Array.isArray(source?.published) ? source.published.length : 0;
  return Math.max(posts, published) + 1;
}

/** Stopka kadru: „STARK CODEX 07/52". */
export function seriesLine(edition: number): string {
  return `${SERIES_NAME} ${pad(((edition - 1) % SERIES_PER_YEAR) + 1)}/${SERIES_PER_YEAR}`;
}

/** Wpis do opisu — bez emoji, bo markę broni treść, nie ikonka. */
export function seriesCaption(edition: number): string {
  return `${SERIES_NAME} - edition ${pad(edition)} of ${SERIES_PER_YEAR}`;
}
