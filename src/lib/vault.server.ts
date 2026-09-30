import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VaultFile } from "../types";

/**
 * Sejf to folder na dysku, poza repozytorium: aplikacja jest lokalna i
 * jednoosobowa, a pliku wideo nie trzymamy w `localStorage` — 5 MB przeglądarki
 * kończyłoby się wycięciem połowy kopii danych przy pierwszym cięższym ujęciu.
 * Serwer oddaje stąd pliki po `/sejf/...`, więc tło rolki działa w podglądzie,
 * w eksporcie klatka-po-klatce i w kolekcji kolażu z tego samego adresu.
 */
export const VAULT_DIR = path.join(process.cwd(), "sejf");
export const VAULT_URL_PREFIX = "/sejf/";

/**
 * Hosty, z których wolno ściągnąć plik do sejfu. Lista jest zamknięta, bo
 * adres ujęcia przychodzi z katalogu zewnętrznego, a nie od użytkownika:
 * każdy inny host to potencjalnie request do sieci wewnętrznej.
 */
export const VAULT_HOSTS = ["videos.pexels.com", "images.pexels.com", "cdn.pixabay.com"];

const EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Rozszerzenie bierziemy z typu odpowiedzi, nigdy z końcówki adresu. */
export function vaultExtension(mimeType: string): string | null {
  return EXTENSIONS[mimeType] ?? null;
}

/**
 * Przedrostek pliku z danego katalogu: `pixabay-1234`, `pexels-9876`. Ten sam
 * numer u dwóch dostawców to dwa różne ujęcia, a po tym przedrostku sejf
 * poznaje, czy plik już leży na dysku.
 */
export function vaultIdPrefix(id: string): string {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
}

/**
 * Nazwa pliku: mały zapis, bez ścieżek i kropek. `..` w nazwie od dostawcy
 * katalogu byłby wyjściem poza sejf, więc zostają znaki, które niczego nie
 * znaczą dla systemu plików.
 */
export function vaultFileName(id: string, title: unknown, mimeType: string): string | null {
  const extension = vaultExtension(mimeType);
  if (!extension) return null;
  const slug = String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const number = vaultIdPrefix(id);
  if (!number) return null;
  return `${number}-${slug || "ujecie"}.${extension}`;
}

/** Zapis do sejfu; null oznacza, że plik nie trafił na dysk i UI musi to powiedzieć. */
export async function saveVaultFile(
  name: string,
  buffer: Buffer,
): Promise<{ filename: string; url: string; bytes: number } | null> {
  try {
    await mkdir(VAULT_DIR, { recursive: true });
    await writeFile(path.join(VAULT_DIR, name), buffer);
    return { filename: name, url: `${VAULT_URL_PREFIX}${name}`, bytes: buffer.byteLength };
  } catch {
    return null;
  }
}

/**
 * Zawartość sejfu liczona z dysku, nie z kopii w przeglądarce — plik jest
 * prawdą, wpis w `localStorage` tylko jego opisem. Bez tego skasowanie stanu
 * w UI zostawiało ujęcia, których aplikacja już nie widziała.
 */
export async function listVaultFiles(limit = 60): Promise<VaultFile[]> {
  let names: string[];
  try {
    names = await readdir(VAULT_DIR);
  } catch {
    return [];
  }

  const files: VaultFile[] = [];
  for (const name of names) {
    if (!/^[a-z0-9._-]+$/i.test(name)) continue;
    if (!vaultExtension(extensionToMime(name))) continue;
    try {
      const info = await stat(path.join(VAULT_DIR, name));
      if (!info.isFile()) continue;
      files.push({ filename: name, url: `${VAULT_URL_PREFIX}${name}`, bytes: info.size });
    } catch {
      // plik właśnie zniknął — nie ma powodu, żeby cała lista padła
    }
  }
  return files.slice(0, limit);
}

function extensionToMime(name: string): string {
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "webm") return "video/webm";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "";
}

/**
 * Czy ujęcie o tym identyfikatorze już leży na dysku. Bez tego kliknięcie
 * „weź" dwa razy ściągało ten sam plik pod drugą nazwą, bo nazwa zależy od
 * frazy, a fraza zmienia się między wyszukiwaniami.
 */
export async function findVaultFileById(id: string): Promise<VaultFile | null> {
  const number = vaultIdPrefix(id);
  if (!number) return null;
  const files = await listVaultFiles(400);
  const matches = files.filter((file) => file.filename.startsWith(`${number}-`));
  return matches.find((file) => extensionToMime(file.filename).startsWith("video/")) ?? null;
}
