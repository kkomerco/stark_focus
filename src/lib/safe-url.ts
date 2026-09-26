/**
 * Ochrona przed SSRF dla proxy obrazów.
 *
 * `isSafeUrl()` jest izomorficzne (bez `node:dns`), więc działa zarówno w
 * backendzie Express, jak i w handlerach opartych o Web Request. To tylko
 * pierwsza brama: sprawdza kształt adresu, bo `new URL()` normalizuje formy
 * liczbowe (`2130706433`, `0x7f.1`, `127.1` → `127.0.0.1`), więc host nie
 * udaje publicznego, będąc loopbackiem. Czego nie zobaczy: domeny, która
 * RESOLWUJE się na adres prywatny (`127.0.0.1.nip.io`, sslip.io, własny A
 * record). Tę łapie `resolvesPublicly()` w `fetch-image.server.ts`, tam gdzie
 * naprawdę wychodzimy do sieci.
 *
 * Blokuje loopback, sieci prywatne (RFC 1918), link-local, CGNAT,
 * zakresy multicast/rezerwowane oraz wewnętrzne domeny Google Cloud.
 */
export function isSafeUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  const blockedHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "169.254.169.254",
    "metadata.google.internal",
  ];
  if (blockedHosts.includes(host)) return false;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }

  // Host będący dosłownie adresem IP oceniamy tą samą miarą, którą oceniamy
  // odpowiedź DNS — jeden słownik zakresów, dwa miejsca użycia.
  if (isIpAddress(host)) return !isPrivateAddress(host);

  return true;
}

/** Wygląda na adres IPv4 albo IPv6 (po normalizacji `new URL()`)? */
export function isIpAddress(host: string): boolean {
  if (!host) return false;
  if (host.includes(":")) return true;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * Czy adres należy do zakresu, do którego aplikacja nie ma prawa wychodzić:
 * loopback, RFC 1918, link-local, CGNAT, multicast, IPv4-unspecified, a także
 * formy IPv6: mapped, unique-local, link-local i zakresy rezerwowane.
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (!ip) return true;

  // IPv6-mapped-IPv4 (::ffff:127.0.0.1) i 6to4 zagnieżdżające adres v4.
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(ip)) return true;

  if (ip.includes(":")) {
    if (ip === "::" || ip === "::1") return true;
    if (/^f[cd]/.test(ip)) return true; // unique-local fc00::/7
    if (/^fe[89ab]/.test(ip)) return true; // link-local fe80::/10
    if (/^2001:db8/.test(ip)) return true; // dokumentacyjna
    if (/^[23][0-9a-f]{2}:/.test(ip)) return true; // multicast / rezerwa
    return false;
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return true; // nie do rozpoznania -> nie wychodzimy
  }
  const [a, b] = parts;
  if (a === 0) return true; // "this" host
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast i rezerwa
  return false;
}
