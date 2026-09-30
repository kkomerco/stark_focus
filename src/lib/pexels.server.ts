import { asArray, asNumber, asString } from "./ai/normalize.server";
import { clampText } from "./limits";
import type { StockClip } from "../types";

/**
 * Klient katalogu ujęć. To nie jest trasa AI: nie ma tu promptu ani modelu,
 * więc nie ma też odpowiedzi udającej wygenerowaną. Jest za to odpowiedź
 * zewnętrznego serwisu, więc każdą jej liczbę i tekst normalizujemy tak samo
 * jak z modelu — pole, którego UI nie sprawdzi, jest pustym ekranem na cały
 * app, bo jedyny ErrorBoundary siedzi nad całością.
 */

const API = "https://api.pexels.com/videos/search";

export function pexelsConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

/**
 * Znane jakości od najmocniejszej, która nadal ma sens przy kadrze 1080 px.
 * „uhd" i „4k" są pominięte świadomie: kilkanaście sekund w 4K waży tyle, że
 * sejf rósłby w gigabajty, a kadr i tak jest rysowany na 1080.
 */
const QUALITY_RANK = ["hd", "sd"];

function qualityRank(quality: string): number {
  const index = QUALITY_RANK.indexOf(quality.toLowerCase());
  // Jakość spoza listy nie wygrywa z nieznaną i nie zrzuca wyniku — spada na koniec.
  return index < 0 ? QUALITY_RANK.length : index;
}

export interface StockFile {
  link: string;
  quality: string;
  width: number;
  height: number;
}

/**
 * Pion 9:16 ma wygrywać zawsze, ale bez katalogu pionowych ujęć pod daną frazę
 * zostaje poziom w wysokiej rozdzielczości — inaczej search na „city roof"
 * oddawałby pustkę tam, gdzie jest materiał do obejrzenia.
 */
export function pickStockFile(files: StockFile[]): StockFile | null {
  const usable = files.filter((file) => Boolean(file.link) && file.width > 0 && file.height > 0);
  if (usable.length === 0) return null;
  const portrait = usable.filter((file) => file.height > file.width);
  const pool = portrait.length > 0 ? portrait : usable.filter((file) => file.height >= 720);
  if (pool.length === 0) return null;
  return [...pool].sort(
    (a, b) => qualityRank(a.quality) - qualityRank(b.quality) || b.height - a.height,
  )[0];
}

/** Odpowiedź katalogu na żądanie to obcy JSON — filtrowany, nie rzucany w UI. */
export function normalizeClip(raw: unknown): StockClip | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const files = asArray<Record<string, unknown>>(item.video_files)
    .map((file) => ({
      link: clampText(file?.link, 400),
      quality: asString(file?.quality),
      width: asNumber(file?.width, 0),
      height: asNumber(file?.height, 0),
    }))
    .filter((file) => file.link.startsWith("https://"));

  const chosen = pickStockFile(files);
  const id = asString(item.id);
  if (!chosen || !id) return null;

  return {
    id,
    previewUrl: clampText(item.image, 400),
    fileUrl: chosen.link,
    width: chosen.width,
    height: chosen.height,
    durationSec: asNumber(item.duration, 0),
    // Pexels nie mówi w odpowiedzi, ile waży plik — dowie się dopiero strumień.
    bytes: 0,
  };
}

/**
 * Wyszukanie ujęć. Zwraca listę i powód pustki: „brak klucza", „katalog
 * odrzucił klucz", „limit" i „brak wyników" to cztery różne rzeczy i żadnej
 * z nich właściciel konta nie ma prawa odgadywać z pustej siatki.
 */
export async function searchStockClips(
  query: string,
  count: number,
): Promise<{ clips: StockClip[]; notice: string }> {
  const term = clampText(query, 80);
  if (!pexelsConfigured()) {
    return { clips: [], notice: "Brak klucza PEXELS_API_KEY w .env — katalog nie odpowiada." };
  }
  if (!term) return { clips: [], notice: "Wpisz frazę po angielsku, np. ‚empty street night’." };

  const url = `${API}?${new URLSearchParams({
    query: term,
    per_page: String(count),
    orientation: "portrait",
    locale: "en",
  })}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: String(process.env.PEXELS_API_KEY) },
      signal: AbortSignal.timeout(9000),
    });
    if (res.status === 401 || res.status === 403) {
      return { clips: [], notice: "Katalog odrzucił klucz (401/403) — sprawdź go w .env." };
    }
    if (res.status === 429) {
      return { clips: [], notice: "Katalog dał limit (429) — spróbuj za kilka minut." };
    }
    if (!res.ok) return { clips: [], notice: `Katalog odpowiedział statusem ${res.status}.` };

    const payload = (await res.json()) as Record<string, unknown>;
    const clips = asArray(payload.videos)
      .map(normalizeClip)
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
