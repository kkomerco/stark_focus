import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';
import net from 'net';

const app = express();
const PORT = process.env.PORT || 3001;

// --- (3) Prosty cache w pamięci RAM dla zapytań AI ---
// Map z TTL i limitem 200 wpisów
type CacheEntry = { value: any; expiresAt: number };
const AI_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 10; // 10 minut
const CACHE_MAX_SIZE = 200;

function getFromCache(key: string): any | null {
  const entry = AI_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    AI_CACHE.delete(key);
    return null;
  }
  // odśwież kolejność LRU: usuń i dodaj na koniec
  AI_CACHE.delete(key);
  AI_CACHE.set(key, entry);
  return entry.value;
}

function setToCache(key: string, value: any, ttl = CACHE_TTL_MS) {
  if (AI_CACHE.size >= CACHE_MAX_SIZE) {
    // usuń najstarszy wpis (pierwszy w Map)
    const oldestKey = AI_CACHE.keys().next().value;
    if (oldestKey) AI_CACHE.delete(oldestKey);
  }
  AI_CACHE.set(key, { value, expiresAt: Date.now() + ttl });
}

// --- (2) Zabezpieczenie SSRF dla /api/proxy-image ---
function isIPv4Private(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return false;
  // 127.0.0.0/8 loopback
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;
  // 169.254.0.0/16 link-local (w tym 169.254.169.254 - AWS metadata)
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

function isSafeUrl(input: string): boolean {
  try {
    const url = new URL(input);
    // tylko http/https
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const hostname = url.hostname.toLowerCase();

    // blokuj nazwy
    const blockedHostnames = ['localhost', '0.0.0.0', '::1'];
    if (blockedHostnames.includes(hostname)) return false;

    // blokuj konkretne IP z zadania
    const blockedIps = ['127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
    if (blockedIps.includes(hostname)) return false;

    // jeśli hostname to IP, sprawdź czy prywatny
    const ipVersion = net.isIP(hostname);
    if (ipVersion === 4) {
      if (isIPv4Private(hostname)) return false;
    }
    if (ipVersion === 6) {
      // blokuj IPv6 loopback, link-local, unique local
      if (hostname === '::1' || hostname === '::' || hostname.startsWith('fe80:') || hostname.startsWith('fc') || hostname.startsWith('fd')) {
        return false;
      }
    }

    // dodatkowo blokuj jeśli hostname zawiera metadata service
    if (hostname === '169.254.169.254') return false;

    // blokuj próby obejścia przez 0x, dziesiętne itp. - net.isIP już je wyłapie, ale dorzućmy heurystykę
    if (/^0x[0-9a-f]+$/i.test(hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

// Przykład użycia w endpointach AI z cache
app.use(express.json({ limit: '1mb' }));

app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Brak parametru url' });
  }

  if (!isSafeUrl(imageUrl)) {
    return res.status(403).json({ error: 'URL zablokowany ze względów bezpieczeństwa (SSRF protection)' });
  }

  try {
    const response = await fetch(imageUrl, {
      // timeout 10s
      // @ts-ignore - node-fetch v2 ma timeout
      timeout: 10000,
      headers: { 'User-Agent': 'VisionaryMediaLab/1.0' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Nie udało się pobrać obrazu' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL nie wskazuje na obraz' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // @ts-ignore
    response.body.pipe(res);
  } catch (err) {
    console.error('proxy-image error', err);
    res.status(500).json({ error: 'Błąd proxy' });
  }
});

// Przykład endpointu AI z cache
app.post('/api/generate', async (req, res) => {
  const cacheKey = JSON.stringify({ body: req.body, url: req.path });
  const cached = getFromCache(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  // TODO: tutaj Twoje wywołanie do Gemini / innego LLM
  // const result = await callGemini(req.body);
  const result = { text: 'mock AI result', prompt: req.body };

  setToCache(cacheKey, result);
  res.json({ ...result, cached: false });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { isSafeUrl, getFromCache, setToCache, AI_CACHE };
