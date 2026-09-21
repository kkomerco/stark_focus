/**
 * Ochrona przed SSRF dla proxy obrazów.
 *
 * Implementacja jest izomorficzna (bez `node:net`), więc działa zarówno
 * w backendzie Express, jak i w handlerach opartych o Web Request.
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

  // IPv4 - sieci prywatne / loopback / link-local (RFC 1918 i pokrewne)
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if ([a, b, Number(ipv4[3]), Number(ipv4[4])].some((n) => n > 255)) return false;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a >= 224) return false;
  }

  // IPv6 - loopback, unique-local (fc00::/7), link-local (fe80::/10), IPv4-mapped
  if (host.includes(":")) {
    if (host === "::" || host === "::1") return false;
    if (/^f[cd]/.test(host)) return false;
    if (/^fe[89ab]/.test(host)) return false;
    if (host.startsWith("::ffff:")) return false;
  }

  return true;
}
