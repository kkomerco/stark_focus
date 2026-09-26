/**
 * Jedno miejsce, w którym klient dowiaduje się, że odpowiedź trasy AI nie
 * przyszła od modelu. Serwer oznacza bank treści na dwa sposoby: nagłówkiem
 * `x-stark-degraded: 1` (`sendDegraded()` w `src/lib/ai/normalize.server.ts`,
 * przekazywanym przez proxy w `server.ts`) oraz polami w payloadcie
 * (`source: "offline"`, `bankFilled`). Bez sprawdzenia obu studio wklejało
 * gotowiec z pliku jak wygenerowany.
 */

/** Nagłówek musi się zgadzać z `DEGRADED_HEADER`; nie importujemy z `.server.ts`, bo nie może wejść do bundla przeglądarki. */
const DEGRADED_HEADER = "x-stark-degraded";

export interface JsonReply {
  /** Sparsowany payload; pusty obiekt, gdy serwer oddał nie-JSON albo sieci nie było. */
  data: Record<string, unknown>;
  /** true = treść z banku treści, nie od modelu. */
  degraded: boolean;
  /** Kod HTTP; `0` przy awarii sieci. */
  status: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const isBankPayload = (payload: unknown): boolean => {
  if (!isRecord(payload)) return false;
  if (payload.source === "offline") return true;
  const filled = Number(payload.bankFilled ?? 0);
  return Number.isFinite(filled) && filled > 0;
};

export async function fetchJson(url: string, init?: RequestInit): Promise<JsonReply> {
  let status = 0;
  try {
    const res = await fetch(url, init);
    status = res.status;
    // Czytamy tekst, nie `res.json()`: trasa w błędzie potrafi oddać HTML
    // (Vite, proxy), a `json()` wywaliłaby całą obsługę jednym wyjątkiem.
    const payload: unknown = JSON.parse(await res.text());
    return {
      data: isRecord(payload) ? payload : {},
      degraded: !!res.headers.get(DEGRADED_HEADER) || isBankPayload(payload),
      status,
    };
  } catch {
    return { data: {}, degraded: false, status };
  }
}
