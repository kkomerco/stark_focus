import { asArray, asNumber, asString } from "./ai/normalize.server";
import { LIMITS, clampText } from "./limits";
import type { StockClip } from "../types";

/**
 * Pixabay jako drugi katalog ujęć. Pexels wstrzymał wydawanie kluczy, a sejf
 * nie może zależeć od widzimisię jednego dostawcy — więc dochodzi ten, którego
 * klucz widać od razu po zalogowaniu na stronie dokumentacji.
 *
 * Kształt odpowiedzi jest sprawdzony na żywo, nie z dokumentacji: tiery
 * (`large`/`medium`/`small`/`tiny`) to warianty bitrate **tego samego kadru**,
 * a nie różne proporcje, miniaturka siedzi w `videos.<tier>.thumbnail` (żadnego
 * `picture_2x` przy wideo nie ma), a katalog sam oznacza klipy generowane przez
 * model (`isAiGenerated`) i oznaczone jako niskiej jakości (`isLowQuality`).
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
  thumbnail: string;
}

const TIERS = ["large", "medium", "small", "tiny"] as const;

function asTier(raw: unknown): PixabayTier | null {
  if (!raw || typeof raw !== "object") return null;
  const tier = raw as Record<string, unknown>;
  const url = clampText(tier.url, 400);
  const width = asNumber(tier.width, 0);
  const height = asNumber(tier.height, 0);
  // Tier bez wymiarów to nie „mniejszy plik", tylko odpowiedź, której nie da
  // się ocenić — odpada, zamiast wejść w kartę z zerami.
  if (!url.startsWith("https://") || width <= 0 || height <= 0) return null;
  return {
    url,
    width,
    height,
    bytes: asNumber(tier.size, 0),
    thumbnail: clampText(tier.thumbnail, 400),
  };
}

function tiersOf(hit: Record<string, unknown>): PixabayTier[] {
  const videos = (hit.videos ?? {}) as Record<string, unknown>;
  return TIERS.map((name) => asTier(videos[name])).filter((tier): tier is PixabayTier =>
    Boolean(tier),
  );
}

/** Kadry, które katalog ma w pionie, są pierwsze — poziome zostają jako rezerwa. */
function isVertical(tier: PixabayTier): boolean {
  return tier.height > tier.width;
}

/**
 * Wybór tieru: pion whole'u klipu, największy mieszczący się w sejfie, ale
 * nie powyżej 2160 px — i tak rysujemy na 1080, a 4K mnoży tylko megabajty.
 * `bytes = 0` z odpowiedzi nie jest zaproszeniem do pobrania wszystkiego:
 * limit i tak sprawdza strumień.
 */
export function pickPixabayTier(
  hit: Record<string, unknown>,
  maxBytes = LIMITS.maxVaultBytes,
): PixabayTier | null {
  const all = tiersOf(hit);
  if (all.length === 0) return null;
  const vertical = all.filter(isVertical);
  const pool = vertical.length > 0 ? vertical : all;
  // Dłuższy bok powyżej 2160 px to 4K: na kadrze 1080 nie widać różnicy,
  // a sejf dostaje plik czterokrotnie większy niż potrzeba.
  const usable = pool.filter((tier) => Math.max(tier.width, tier.height) <= 2160);
  const candidates = usable.length > 0 ? usable : pool;
  const fits = candidates.filter(
    (tier) => maxBytes <= 0 || tier.bytes === 0 || tier.bytes <= maxBytes,
  );
  // TIERS jest od największego, więc pierwszy pasujący to najlepszy pasujący.
  return fits[0] ?? candidates[0] ?? null;
}

/**
 * Hit → karta ujęcia. Filtry są markowe, nie techniczne: klip generowany przez
 * model i oznaczony jako niskiej jakości nie wchodzi do rolki konta, które ma
 * wyglądać na nagrane.
 */
export function normalizePixabayClip(
  raw: unknown,
  maxBytes = LIMITS.maxVaultBytes,
): StockClip | null {
  if (!raw || typeof raw !== "object") return null;
  const hit = raw as Record<string, unknown>;
  if (hit.isAiGenerated === true || hit.isLowQuality === true) return null;

  const id = asString(hit.id);
  const tier = pickPixabayTier(hit, maxBytes);
  if (!id || !tier) return null;

  return {
    // Identyfikator z nazwą katalogu: dwa katalogi mają te same numery, a po
    // przedrostku sejf poznaje, czy plik już leży na dysku.
    id: `pixabay-${id}`,
    previewUrl: tier.thumbnail || tiersOf(hit).find((t) => t.thumbnail)?.thumbnail || "",
    fileUrl: tier.url,
    width: tier.width,
    height: tier.height,
    durationSec: asNumber(hit.duration, 0),
    bytes: tier.bytes,
  };
}

/**
 * Wyszukanie ujęć. `safesearch=true` nie jest dla grzeczności: materiał ma
 * wejść na konto firmowe, a nagi tors w tle to dokładnie ten kłopot, którego
 * nie złapie później żadna kontrola przed publikacją.
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
  // `=` w środku znaczy, że do `.env` trafił kawałek przykładowego adresu razem
  // z `key=` — katalog odpowiedziałby 400 bez wyjaśnienia, więc wyjaśniamy tu.
  const key = String(process.env.PIXABAY_API_KEY);
  if (/\s|=/.test(key)) {
    return {
      clips: [],
      notice: `Klucz w .env wygląda na przeklejony razem z resztą zdania (długość ${key.length}, spacja albo '=' w środku) — wklej sam ciąg z pola your API key na górze dokumentacji.`,
    };
  }

  // Katalog nie ma filtra proporcji dla wideo (`min_height` tnie rozdzielczość,
  // nie orientację), więc pytamy o czterokrotność i filtrujemy u siebie —
  // żądanie kosztuje tyle samo niezależnie od liczby pozycji.
  const url = `${API}?${new URLSearchParams({
    key,
    q: term,
    per_page: String(Math.min(200, count * 4)),
    min_height: "720",
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
      .filter((clip): clip is StockClip => clip !== null)
      .sort((a, b) => Number(b.height > b.width) - Number(a.height > a.width));

    if (clips.length === 0) {
      return { clips: [], notice: "Katalog nie ma pod tę frazę niczego poza klipem generowanym." };
    }
    const vertical = clips.filter((clip) => clip.height > clip.width).length;

    return {
      clips: clips.slice(0, count),
      // Poziomy klip w kadrze 9:16 to mocne przybliżenie środka — nie
      // ukrywamy tego pod listą, która wyglądałaby na pełny wynik.
      notice:
        vertical === 0
          ? "Pod tę frazę katalog ma tylko poziome ujęcia — w pionie będą mocno przycięte."
          : "",
    };
  } catch (err) {
    return {
      clips: [],
      notice: `Katalog nie odpowiedział (${err instanceof Error ? err.name : "blad"}).`,
    };
  }
}
