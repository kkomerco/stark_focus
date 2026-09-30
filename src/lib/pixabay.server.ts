import { asArray, asNumber, asString } from "./ai/normalize.server";
import { LIMITS, clampText } from "./limits";
import type { StockClip } from "../types";

/**
 * Pixabay jako drugi katalog ujęć. Pexels wstrzymał wydawanie kluczy, a sejf
 * nie może zależeć od widzimisię jednego dostawcy — więc dochodzi ten, którego
 * klucz widać od razu po zalogowaniu na stronie dokumentacji.
 *
 * Odpowiedź jest obcym JSON-em i przechodzi przez te same bramki co każda
 * inna: liczby przez `asNumber`, teksty przez `clampText`, a tier wideo
 * wybieramy dopiero po sprawdzeniu, że jest pionowy i mieści się w limicie
 * sejfu — rozmiar widać w odpowiedzi, więc nie musimy go ciągnąć, żeby odmówić.
 */

const API = "https://pixabay.com/api/videos/";

export function pixabayConfigured(): boolean {
  return Boolean(process.env.PIXABAY_API_KEY);
}

interface PixabayTier {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

const TIERS = ["large", "medium", "small", "tiny"] as const;

function asTier(raw: unknown): PixabayTier | null {
  if (!raw || typeof raw !== "object") return null;
  const tier = raw as Record<string, unknown>;
  const url = clampText(tier.url, 400);
  if (!url.startsWith("https://")) return null;
  return {
    url,
    width: asNumber(tier.width, 0),
    height: asNumber(tier.height, 0),
    bytes: asNumber(tier.size, 0),
  };
}

/**
 * Największy pionowy tier, który mieści się w sejfie. `maxBytes = 0` z
 * odpowiedzi nie jest zaproszeniem do pobrania wszystkiego — wtedy tier
 * zostaje, bo rozmiar i tak sprawdzi strumień.
 */
export function pickPixabayTier(
  hit: Record<string, unknown>,
  maxBytes: number,
): PixabayTier | null {
  const videos = (hit.videos ?? {}) as Record<string, unknown>;
  const tiers = TIERS.map((name) => asTier(videos[name])).filter((tier): tier is PixabayTier =>
    Boolean(tier),
  );
  const portrait = tiers.filter((tier) => tier.height > tier.width);
  const fits = (portrait.length > 0 ? portrait : tiers).filter(
    (tier) => maxBytes <= 0 || tier.bytes === 0 || tier.bytes <= maxBytes,
  );
  // TIERS jest od największego, więc pierwszy pasujący to najlepszy pasujący.
  return fits[0] ?? null;
}

export function normalizePixabayClip(
  raw: unknown,
  maxBytes = LIMITS.maxVaultBytes,
): StockClip | null {
  if (!raw || typeof raw !== "object") return null;
  const hit = raw as Record<string, unknown>;
  const id = asString(hit.id);
  const tier = pickPixabayTier(hit, maxBytes);
  if (!id || !tier) return null;

  return {
    // Identyfikator z nazwą katalogu: dwa katalogi mogą mieć ten sam numer,
    // a sejf rozpoznaje po nim, czy plik już leży na dysku.
    id: `pixabay-${id}`,
    previewUrl: clampText(hit.picture_2x, 400),
    fileUrl: tier.url,
    width: tier.width,
    height: tier.height,
    durationSec: asNumber(hit.duration, 0),
    bytes: tier.bytes,
  };
}

/**
 * Wyszukanie ujęć. `safesearch=true` jest tu nie dla grzeczności: materiał
 * ma wejść na konto firmowe, a nagie ciało w tle to dokładnie ten kłopot,
 * którego nie znajdzie później żadna kontrola przed publikacją.
 */
export async function searchPixabayClips(
  query: string,
  count: number,
): Promise<{ clips: StockClip[]; notice: string }> {
  const term = clampText(query, 80);
  if (!pixabayConfigured()) {
    return { clips: [], notice: "Brak klucza PIXABAY_API_KEY w .env — katalog nie odpowiada." };
  }
  if (!term) return { clips: [], notice: "Wpisz frazę po angielsku, np. ‚empty street night'." };

  // Klucz Pixabaya to sam ciąg znaków z pola na górze dokumentacji. Spacja albo
  // `=` w środku znaczy, że do `.env` trafił kawałek przykładowego adresu
  // razem z `key=` — katalog odpowiedziałby 400 bez wyjaśnienia, więc
  // wyjaśniamy tu.
  const key = String(process.env.PIXABAY_API_KEY);
  if (/\s|=/.test(key)) {
    return {
      clips: [],
      notice: `Klucz w .env wygląda na przeklejony razem z resztą zdania (długość ${key.length}, spacja albo '=' w środku) — wklej sam ciąg z pola your API key na górze dokumentacji.`,
    };
  }

  const url = `${API}?${new URLSearchParams({
    key: String(process.env.PIXABAY_API_KEY),
    q: term,
    per_page: String(count),
    // Pion 9:16: wysokość dłuższa niż szerokość, więc minimalne 540x960
    // odcina poziome ujęcia jeszcze po stronie katalogu.
    min_width: "540",
    min_height: "960",
    safesearch: "true",
  })}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    // Pixabay na zły klucz odpowiada 400, nie 401 — sprawdzone na żywo.
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { clips: [], notice: "Katalog odrzucił klucz (400/401/403) — sprawdź go w .env." };
    }
    if (res.status === 429) {
      return { clips: [], notice: "Katalog dał limit (429) — Pixabay liczy 100 żądań na minutę." };
    }
    if (!res.ok) return { clips: [], notice: `Katalog odpowiedział statusem ${res.status}.` };

    const payload = (await res.json()) as Record<string, unknown>;
    const clips = asArray(payload.hits)
      .map((hit) => normalizePixabayClip(hit))
      .filter((clip): clip is StockClip => clip !== null);

    return {
      clips: clips.slice(0, count),
      notice: clips.length ? "" : "Katalog nie ma pionowego ujęcia pod tę frazę.",
    };
  } catch (err) {
    return {
      clips: [],
      notice: `Katalog nie odpowiedział (${err instanceof Error ? err.name : "blad"}).`,
    };
  }
}
