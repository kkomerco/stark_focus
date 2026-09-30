// src/lib/similarity.ts
// Detektor podobieństwa hooków — chroni przed monotonią, nie tylko identycznymi powtórkami.

/** Normalizacja hooka: lowercase, bez interpunkcji, pojedyncze spacje. */
export function normalizeHook(hook: string): string {
  return hook
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Krótki, kanoniczny kształt hooka do porównywania "czy już to mieliśmy".
 * Historia między klientem a serwerem przenosi WYŁĄCZNIE odciski, więc obie
 * strony muszą liczyć je tą samą funkcją — porównanie odcisku z surowym
 * zdaniem nie wypadłoby równe nigdy.
 */
export function hookFingerprint(hook: string): string {
  return normalizeHook(hook).slice(0, 60);
}

/** Zestaw tokenów (słowa >= 2 znaki, bez stop-wordów generycznych). */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "you",
  "your",
  "to",
  "of",
  "in",
  "it",
  "that",
  "and",
  "for",
  "on",
  "with",
  "they",
  "them",
  "be",
]);

export function hookTokens(hook: string): Set<string> {
  const words = normalizeHook(hook)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Podobieństwo strukturalno-leksykalne 0..1.
 * Jaccard na tokenach + bonus za zgodność długości (bucket słów)
 * i za zaczynanie od tego samego słowa (typowy "ten sam wzorzec zdania").
 */
export function hookSimilarity(a: string, b: string): number {
  const ta = hookTokens(a);
  const tb = hookTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const jaccard = shared / (ta.size + tb.size - shared);

  const wordsA = normalizeHook(a).split(" ").length;
  const wordsB = normalizeHook(b).split(" ").length;
  const sameBucket = Math.abs(wordsA - wordsB) <= 1 ? 0.08 : 0;

  const firstA = normalizeHook(a).split(" ")[0] || "";
  const firstB = normalizeHook(b).split(" ")[0] || "";
  const sameStart = firstA.length > 2 && firstA === firstB ? 0.07 : 0;

  return Math.min(1, jaccard + sameBucket + sameStart);
}

/** Maksymalne podobieństwo hooka względem historii. Zwraca też "najbliższego kuzyna". */
export function maxSimilarity(
  hook: string,
  history: string[],
): { score: number; similarTo: string | null } {
  let best = 0;
  let bestHook: string | null = null;
  for (const h of history) {
    const s = hookSimilarity(hook, h);
    if (s > best) {
      best = s;
      bestHook = h;
    }
  }
  return { score: best, similarTo: bestHook };
}

/**
 * Początek zdania, nie całe zdanie: trzy pierwsze słowa. Feed czyta się od
 * lewej, więc „You are not tired…" i „You are not lazy…" to dla czytelnika ten
 * sam autor mówiący to samo — nawet gdy reszta jest inna i żaden odcisk całego
 * zdania na to nie wpadnie.
 */
export function openingSignature(hook: string, words = 3): string {
  return normalizeHook(hook).split(" ").slice(0, words).join(" ");
}

/**
 * Ile razy każdy początek powtarza się w ostatnich zdaniach. Zwraca tylko
 * te powtórzone co najmniej `min` razy, posortowane od najgorszego — że pięć
 * postów z rzędu startuje od „You are not" to widać dopiero po zliczeniu, a nie
 * po porównaniu dwóch sąsiadów.
 */
export function repeatedOpenings(
  hooks: readonly string[],
  min = 2,
  limit = 60,
): Array<{ opening: string; count: number }> {
  const counts = new Map<string, number>();
  for (const hook of hooks.slice(-limit)) {
    const opening = openingSignature(hook);
    if (!opening) continue;
    counts.set(opening, (counts.get(opening) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= min)
    .map(([opening, count]) => ({ opening, count }))
    .sort((a, b) => b.count - a.count);
}

/** Progi podobieństwa. */
export const SIMILARITY = {
  /** Powyżej tej wartości pomysł jest odrzucany. */
  HARD_BLOCK: 0.72,
  /** Powyżej tej wartości pomysł dostaje ostrzeżenie "podobny". */
  WARN: 0.45,
} as const;
