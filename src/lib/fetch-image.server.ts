import { promises as dns } from "node:dns";
import { isIpAddress, isPrivateAddress, isSafeUrl } from "./safe-url";
import { LIMITS } from "./limits";

/**
 * Pobieranie obrazów wskazywanych przez zewnętrzne serwisy (oEmbed, TikTok,
 * Instagram). Adres NIE jest zaufany nawet gdy sam wygląda na CDN: odpowiedź
 * trzeciej strony może wskazywać `http://169.254.169.254/`, a `fetch()`
 * domyślnie podąża za przekierowaniami. Stąd `redirect: "manual"` —
 * przekierowanie odrzucamy zamiast za nim podążać.
 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];

export interface SafeImage {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Druga brama, tam gdzie realnie wychodzimy do sieci: `isSafeUrl()` widzi
 * tylko kształt adresu, a nazwa może się nazywać `127.0.0.1.nip.io` albo mieć
 * własny rekord A na loopbacku. Rozwiązuje więc nazwę i odrzuca odpowiedź, w
 * której KTÓRYKOLWIEK adres jest prywatny.
 *
 * Nie zatrzymuje to ataku DNS-rebinding (serwer może odpowiedzieć inaczej przy
 * drugim rozwiązywaniu, tuż przed połączeniem) — zatrzymuje natomiast każdą
 * domenę, która po prostu wskazuje na sieć wewnętrzną. Przy aplikacji
 * jednoosobowej bez kont to wystarczy; przy publicznym wdrożeniu trzeba by
 * podłączyć własny `lookup` do agenta undici i łączyć po sprawdzonej odpowiedzi.
 */
async function resolvesPublicly(rawUrl: string): Promise<boolean> {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (!host) return false;
  // Adres liczbowy ocenił już `isSafeUrl()` tą samą miarą — nie ma co pytać DNS.
  if (isIpAddress(host)) return true;

  try {
    const answers = await dns.lookup(host, { all: true, verbatim: true });
    if (answers.length === 0) return false;
    return !answers.some((answer) => isPrivateAddress(answer.address));
  } catch {
    // nierozwiązywalna nazwa to brak powodu, żeby cokolwiek pobierać
    return false;
  }
}

/** Czytamy ciało odpowiedzi kawałkami: limit rozmiaru obowiązuje w trakcie, nie po. */
async function readCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

/** Zwraca `null` zamiast rzucać — trasy AI mają fallback na brak miniatury. */
export async function fetchSafeImage(rawUrl: unknown): Promise<SafeImage | null> {
  if (typeof rawUrl !== "string" || !isSafeUrl(rawUrl)) return null;
  if (!(await resolvesPublicly(rawUrl))) return null;

  try {
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "VisionaryMediaLab/1.0" },
      redirect: "manual",
      // Sygnał obejmuje też czytanie ciała: bez tego serwer oddający wolny
      // strumień trzymałby trasę AI otwartą bez ograniczenia.
      signal: AbortSignal.timeout(8000),
    });

    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;

    const mimeType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    // SVG odrzucamy: to wykonywalny skrypt osadzony w odpowiedzi.
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;

    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > LIMITS.maxImageBytes) return null;

    const bytes = res.body ? await readCapped(res.body, LIMITS.maxImageBytes) : null;
    if (!bytes || bytes.byteLength === 0) return null;

    return { buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), mimeType };
  } catch {
    return null;
  }
}

/**
 * Pliki do sejfu (ujęcia wideo, miniatury) wolno ściągać wyłącznie z hostów
 * podanych przez wołającego. Obraz z oEmbed jest jeden i jego adres ocenia
 * `isSafeUrl()`; adresy z katalogu stockowego przychodzą strumieniem, a każdy
 * z nich mógłby wskazywać na sieć wewnętrzną — biała lista hostów jest tu
 * twardsza niż ocena kształtu adresu i nie da się jej obejść przekierowaniem,
 * bo przekierowań nie obsługujemy w ogóle.
 */
export interface SafeFileRequest {
  maxBytes: number;
  hosts: readonly string[];
  /** Pobieranie 40 MB przez wolne łącze nie mieści się w ośmiu sekundach. */
  timeoutMs?: number;
}

const ALLOWED_FILE_TYPES = ["video/mp4", "video/webm", "image/jpeg", "image/png"];

/**
 * Adres pliku do sejfu musi być https i trafić w listę hostów podaną przez
 * wołającego. Oddzielone od pobierania, bo to jedyna bramka, którą da się
 * zbadać bez wychodzenia do sieci.
 */
export function isAllowedFileUrl(rawUrl: unknown, hosts: readonly string[]): boolean {
  if (typeof rawUrl !== "string" || !isSafeUrl(rawUrl)) return false;
  try {
    return hosts.includes(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Typ i deklarowany rozmiar decydują, zanim przeczytamy pierwszy bajt ciała.
 * Zwraca znormalizowany MIME albo null — „plik odrzucony".
 */
export function allowedFileType(
  contentType: string | null,
  contentLength: string | null,
  maxBytes: number,
): string | null {
  const mimeType = (contentType || "").split(";")[0].trim().toLowerCase();
  // SVG i HTML odrzucamy: to wykonywalny skrypt udający zasób.
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) return null;
  const declared = Number(contentLength);
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  return mimeType;
}

export async function fetchSafeFile(
  rawUrl: unknown,
  options: SafeFileRequest,
): Promise<SafeImage | null> {
  if (typeof rawUrl !== "string" || !isAllowedFileUrl(rawUrl, options.hosts)) return null;
  if (!(await resolvesPublicly(rawUrl))) return null;

  try {
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "VisionaryMediaLab/1.0" },
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
    });

    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;

    const mimeType = allowedFileType(
      res.headers.get("content-type"),
      res.headers.get("content-length"),
      options.maxBytes,
    );
    if (!mimeType) return null;

    const bytes = res.body ? await readCapped(res.body, options.maxBytes) : null;
    if (!bytes || bytes.byteLength === 0) return null;

    return { buffer: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength), mimeType };
  } catch {
    return null;
  }
}
