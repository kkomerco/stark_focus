/**
 * Granice parametrów liczbowych tras AI.
 *
 * Nieklampowane liczby prosto z `req.body` trafiają wcześniej do pętli
 * (`while (ideas.length < count)`) lub do promptu — dlatego KAŻDA liczba
 * od klienta przechodzi przez `clampInt()`.
 */
export const LIMITS = {
  /** Maksymalnie pomysłów/wariantów w jednym żądaniu. */
  maxCount: 20,
  defaultCount: 5,
  /** Maksymalnie tokenów wykluczonych hooków w `excludeHooks`. */
  maxExcludeHooks: 500,
  /** Rozmiar odpowiedzi proxy obrazu (bajty). */
  maxImageBytes: 8 * 1024 * 1024,
} as const;

/** Bezpieczne Integer z zakresu `[min, max]`; wartość spoza zakresu/NaN wraca do fallbacku. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(Math.floor(n), max));
}

/** Liczba żądanych elementów (pomysły, warianty, slajdy). */
export function clampCount(value: unknown, fallback: number = LIMITS.defaultCount): number {
  return clampInt(value, 1, LIMITS.maxCount, fallback);
}

/** Przesunięcie w banku/stronicowaniu — nigdy ujemne, nigdy ułamkowe. */
export function clampOffset(value: unknown): number {
  return clampInt(value, 0, Number.MAX_SAFE_INTEGER, 0);
}

/**
 * Tekst od klienta wchodzi w skład promptu (i w klucz cache), więc go
 * przycinamy: Express dopusca 10 MB body, a za każdy znak promptu płacimy.
 */
export function clampText(value: unknown, max = 500, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

/**
 * Lista tekstów od klienta (np. wykluczone hooki): każdy przycięty, liczba
 * ograniczona. Bez tego jedno `excludeHooks: ["a".repeat(1e6)]` wchodzi w
 * prompt i płacimy za to przy każdym wywołaniu.
 */
export function clampTextList(
  value: unknown,
  max = LIMITS.maxExcludeHooks,
  itemMax = 80,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clampText(item, itemMax))
    .filter(Boolean)
    .slice(0, max);
}
