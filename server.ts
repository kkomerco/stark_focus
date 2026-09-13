import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';
import net from 'net';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// === CACHE RAM 200 wpisów, TTL 10min ===
type CacheEntry = { value: any; expiresAt: number };
const AI_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

function getFromCache(key: string) {
  const e = AI_CACHE.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { AI_CACHE.delete(key); return null; }
  AI_CACHE.delete(key); AI_CACHE.set(key, e); // LRU
  return e.value;
}
function setToCache(key: string, value: any) {
  if (AI_CACHE.size >= CACHE_MAX) {
    const oldest = AI_CACHE.keys().next().value;
    if (oldest) AI_CACHE.delete(oldest);
  }
  AI_CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// === SSRF PROTECTION ===
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4) return false;
  if (p[0] === 10) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 127 || p[0] === 0) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  return false;
}
function isSafeUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const h = url.hostname.toLowerCase();
    if (['localhost', '0.0.0.0', '::1', '127.0.0.1', '169.254.169.254'].includes(h)) return false;
    if (net.isIP(h) === 4 && isPrivateIPv4(h)) return false;
    if (net.isIP(h) === 6 && (h === '::1' || h === '::' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd'))) return false;
    return true;
  } catch { return false; }
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Proxy obrazów - zabezpieczony
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl || !isSafeUrl(imageUrl)) return res.status(403).json({ error: 'URL zablokowany (SSRF protection)' });
  try {
    const r = await fetch(imageUrl, { headers: { 'User-Agent': 'VisionaryMediaLab/1.0' } } as any);
    if (!r.ok) return res.status(r.status).json({ error: 'Nie udało się pobrać' });
    const ct = r.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return res.status(400).json({ error: 'To nie jest obraz' });
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // @ts-ignore
    r.body.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Błąd proxy' });
  }
});

// AI generate z cache
app.post('/api/generate', async (req, res) => {
  const key = JSON.stringify(req.body);
  const cached = getFromCache(key);
  if (cached) return res.json({ ...cached, cached: true });
  // TU podmień na prawdziwe wywołanie Gemini
  const result = { text: 'mock', prompt: req.body.prompt };
  setToCache(key, result);
  res.json({ ...result, cached: false });
});

app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));
export { isSafeUrl };
