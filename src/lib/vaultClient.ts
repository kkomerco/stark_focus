import { fetchJson } from "./fetchJson";
import type { StockClip, VaultFile } from "../types";

/**
 * Klient sejfu ujęć. Nie ma tu logiki — jest tylko kształt: trasa normalizuje
 * odpowiedź katalogu, a to, co wraca do UI, przechodzi jeszcze przez tę
 * filtry, bo jedyny ErrorBoundary jest na cały app i jedna niespodzianka
 * w polu to pusty ekran zamiast panelu z tłem.
 */

const text = (value: unknown): string => (typeof value === "string" ? value : "");
const number = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

/** Prefix plików oddawanych przez serwer; musi się zgadzać z `VAULT_URL_PREFIX`. */
const VAULT_PREFIX = "/sejf/";

function asClip(raw: unknown): StockClip | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = text(item.id);
  const fileUrl = text(item.fileUrl);
  // Adresu spoza katalogu nie pokazujemy nawet jako miniaturki.
  if (!id || !fileUrl.startsWith("https://")) return null;
  return {
    id,
    previewUrl: text(item.previewUrl),
    fileUrl,
    width: number(item.width),
    height: number(item.height),
    durationSec: number(item.durationSec),
  };
}

function asFile(raw: unknown): VaultFile | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const url = text(item.url);
  // Plik spoza sejfu nie ma prawa trafić do podglądu jako tło.
  if (!url.startsWith(VAULT_PREFIX)) return null;
  return {
    url,
    filename: text(item.filename) || url.slice(VAULT_PREFIX.length),
    bytes: number(item.bytes),
  };
}

export interface VaultSearch {
  clips: StockClip[];
  configured: boolean;
  notice: string;
}

export interface VaultTake {
  file: VaultFile | null;
  notice: string;
}

export async function searchVaultClips(query: string, count = 8): Promise<VaultSearch> {
  const { data, status } = await fetchJson(
    `/api/ai/vault/search?q=${encodeURIComponent(query.slice(0, 80))}&count=${count}`,
  );
  const clips = Array.isArray(data.clips) ? data.clips.map(asClip).filter(Boolean) : [];
  return {
    clips: clips as StockClip[],
    configured: data.configured === true,
    notice:
      text(data.notice) ||
      (status === 0 ? "Serwer nie odpowiada — sejf potrzebuje uruchomionej aplikacji." : ""),
  };
}

/**
 * Pobranie trwa tyle, ile plik: bez limitu zawieszone połączenie trzymałoby
 * panel w nieskończoność z kręcącym się przyciskiem.
 */
export async function takeVaultClip(clip: StockClip, query: string): Promise<VaultTake> {
  const { data, status } = await fetchJson("/api/ai/vault/take", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: clip.id, url: clip.fileUrl, query }),
    signal: AbortSignal.timeout(90_000),
  });
  const file = asFile(data.file);
  return {
    file,
    notice:
      text(data.notice) ||
      (file ? "" : `Sejf nie oddał pliku (status ${status || "brak połączenia"}).`),
  };
}

export async function readVault(): Promise<{ files: VaultFile[]; configured: boolean }> {
  const { data } = await fetchJson("/api/ai/vault");
  const files = Array.isArray(data.files)
    ? (data.files.map(asFile).filter(Boolean) as VaultFile[])
    : [];
  return { files, configured: data.configured === true };
}

/** Rozmiar w megabajtach z polskim separatorem — to samo, co widzi użytkownik. */
export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB`;
}
