/**
 * Odpowiedzi modelu trafiają prosto w `.map()` i `.join()` po stronie UI,
 * a w projekcie nie ma ErrorBoundary na poziomie danych — dlatego każdy
 * kształt z Gemini przechodzi przez te funkcje, zanim wyjedzie do klienta.
 * Niedozwolona wartość dostaje sensowny fallback zamiast `undefined`.
 */

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asString(value: unknown, fallback = ""): string {
  return toText(value) || fallback;
}

/** Tablica niepustych stringów — model często dokłada `null` albo liczby. */
export function asStringArray(value: unknown, max = 20): string[] {
  return asArray(value)
    .map(toText)
    .filter((text) => text.length > 0)
    .slice(0, max);
}

export function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Odpowiedzi z banku treści (nie od modelu) muszą się oznaczyć inaczej niż
 * 200-ka „sukces": router ich NIE cache'uje, bo jeden 429 zapuściłby
 * gotowcami z pliku na cały TTL, a UI pokazywałby „✓ wygenerowano".
 */
export const DEGRADED_HEADER = "x-stark-degraded";

export function markDegraded<T extends { setHeader(name: string, value: string): unknown }>(
  res: T,
): T {
  res.setHeader(DEGRADED_HEADER, "1");
  return res;
}

/**
 * Wysłać treść z banku zamiast od modelu i oznaczyć ją dla routera, żeby NIE
 * weszła do cache. Osobne wywołanie `setHeader` łatwo pominąć przy nowym
 * fallbacie — stąd jedna funkcja na oba kroki.
 */
export function sendDegraded<
  T extends { setHeader(name: string, value: string): unknown; json(payload: unknown): unknown },
>(res: T, payload: unknown): unknown {
  res.setHeader(DEGRADED_HEADER, "1");
  return res.json(payload);
}

/** Wartość z zamkniętego słownika (temat, typ hooka, format). */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(toText(value)) ? (value as T) : fallback;
}
