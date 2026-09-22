import { isSafeUrl } from "./safe-url";
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

/** Zwraca `null` zamiast rzucać — trasy AI mają fallback na brak miniatury. */
export async function fetchSafeImage(rawUrl: unknown): Promise<SafeImage | null> {
  if (typeof rawUrl !== "string" || !isSafeUrl(rawUrl)) return null;

  try {
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "VisionaryMediaLab/1.0" },
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });

    if (res.status >= 300 && res.status < 400) return null;
    if (!res.ok) return null;

    const mimeType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    // SVG odrzucamy: to wykonywalny skrypt osadzony w odpowiedzi.
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) return null;

    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > LIMITS.maxImageBytes) return null;

    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > LIMITS.maxImageBytes) return null;

    return { buffer: Buffer.from(bytes), mimeType };
  } catch {
    return null;
  }
}
