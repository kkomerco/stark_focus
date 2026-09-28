/**
 * Odpowiedzi modelu trafiają prosto w `.map()` i `.join()` po stronie UI,
 * a w projekcie nie ma ErrorBoundary na poziomie danych — dlatego każdy
 * kształt z Gemini przechodzi przez te funkcje, zanim wyjedzie do klienta.
 * Niedozwolona wartość dostaje sensowny fallback zamiast `undefined`.
 */

import { softenForPlatform } from "../platformSafe";

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
 * Odpowiedzi modelu zmiękcza `softenForPlatform` na wyjściu `gemini.server.ts`.
 * Bank treści (fallback w trasie) przechodzi obok tego wyjścia — więc jedynym
 * miejscem, które przechwytuje WSZYSTKIE zdania z banku, jest `sendDegraded`.
 * Schodzimy cały payload i zmiękczamy każdy string tym samym eksportowanym
 * filtrem; nie piszemy drugiej listy słów. Klucze/pole strukturalne są ASCII,
 * a zamienniki nie mają cudzysłowów, więc JSON nie rozjeżdża się.
 */
function softenPayload(value: unknown): unknown {
  if (typeof value === "string") return softenForPlatform(value);
  if (Array.isArray(value)) return value.map(softenPayload);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = softenPayload(val);
    }
    return out;
  }
  return value;
}

/**
 * Uczciwy powód degradacji z błędu Gemini: przeciążenie (503) i limit dzienny
 * (429) to dwie różne diagnozy dla właściciela konta, a „coś nie działa" nie
 * mówi, czy czekać minutę, czy do jutra. `ApiError` z SDK niesie `status`
 * (liczbę), reszta kształtów — tylko `message`, więc czytamy oba.
 */
export function degradedReason(err: unknown): string {
  const status = (err as { status?: unknown } | null)?.status;
  const message = String((err as { message?: unknown } | null)?.message ?? err ?? "");
  const lower = message.toLowerCase();
  if (
    status === 503 ||
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    lower.includes("high demand")
  ) {
    return "Model nie odpowiedział: przeciążenie darmowej warstwy (503). Poniżej treść z banku, nie od modelu.";
  }
  if (
    status === 429 ||
    message.includes("429") ||
    lower.includes("quota") ||
    lower.includes("limit")
  ) {
    return "Model nie odpowiedział: dzienny limit zapytań darmowej warstwy. Poniżej treść z banku, nie od modelu.";
  }
  return "Model nie odpowiedział. Poniżej treść z banku, nie od modelu.";
}

/**
 * Powód degradacji doklejamy jako `notice` tylko do obiektu: payload tablicowy
 * dostałby klucz na pozycji, której UI nie czyta, a `notice` i tak by zniknął.
 * Własny `notice` trasy (np. wyczerpany bank) dostawiamy za powodem — obie
 * informacje są prawdziwe, więc żadnej nie gubimy.
 */
function withDegradedNotice(payload: unknown, reason?: string): unknown {
  if (!reason) return payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const base = payload as Record<string, unknown>;
  const existing = typeof base.notice === "string" ? base.notice.trim() : "";
  return { ...base, notice: existing ? `${reason} ${existing}` : reason };
}

/**
 * Wysłać treść z banku zamiast od modelu i oznaczyć ją dla routera, żeby NIE
 * weszła do cache. Osobne wywołanie `setHeader` łatwo pominąć przy nowym
 * fallbacie — stąd jedna funkcja na oba kroki. Znany powód (`degradedReason`)
 * dokłada do obiektu pole `notice`, które UI pokazuje użytkownikowi.
 */
export function sendDegraded<
  T extends { setHeader(name: string, value: string): unknown; json(payload: unknown): unknown },
>(res: T, payload: unknown, reason?: string): unknown {
  res.setHeader(DEGRADED_HEADER, "1");
  return res.json(softenPayload(withDegradedNotice(payload, reason)));
}

/** Wartość z zamkniętego słownika (temat, typ hooka, format). */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(toText(value)) ? (value as T) : fallback;
}
