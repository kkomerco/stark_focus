
import express from 'express';
import fetch from 'node-fetch';
import { URL } from 'url';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  AI_CACHE.delete(key); AI_CACHE.set(key, e);
  return e.value;
}
function setToCache(key: string, value: any) {
  if (AI_CACHE.size >= CACHE_MAX) {
    const oldest = AI_CACHE.keys().next().value;
    if (oldest) AI_CACHE.delete(oldest);
  }
  AI_CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

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

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// VOID MATRIX
const VOID_MATRIX = {
  pains: ["lenistwo", "wymówki", "komfort", "prokrastynacja", "porównywanie się", "tania dopamina", "brak planu", "strach przed oceną"],
  truths: ["nikt nie przyjdzie", "czas ucieka - klepsydra", "jesteś sam", "nikt nie patrzy", "komfort cię zabija", "jutro to kłamstwo", "dyscyplina to kara za wczoraj"],
  formats: [
    { id: "4_photos", name: "4 zdjęcia" },
    { id: "black_quote", name: "Cytat na czarnym" },
    { id: "changing_bg", name: "Zmieniające się tło" },
    { id: "carousel_dark", name: "Karuzele 3-7 mroczne" },
  ],
  hooks: ["To cię zniszczy", "Przestań kłamać", "Masz 24h", "Nikt ci tego nie powie", "Klepsydra nie czeka", "SF RULE #"],
  actions: ["wstań", "odtnij ich", "zamknij mordę i rób", "zasada 1%", "protokół 04:30"],
};

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

app.post('/api/void/infinite-ideas', (req, res) => {
  const { count = 5, seenHashes = [] } = req.body;
  const cacheKey = `void-ideas-${JSON.stringify(req.body)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const ideas = [];
  const used = new Set(seenHashes);
  let attempts = 0;

  while (ideas.length < count && attempts < count * 10) {
    attempts++;
    const pain = VOID_MATRIX.pains[Math.floor(Math.random() * VOID_MATRIX.pains.length)];
    const truth = VOID_MATRIX.truths[Math.floor(Math.random() * VOID_MATRIX.truths.length)];
    const format = VOID_MATRIX.formats[Math.floor(Math.random() * VOID_MATRIX.formats.length)];
    const hook = VOID_MATRIX.hooks[Math.floor(Math.random() * VOID_MATRIX.hooks.length)];
    const action = VOID_MATRIX.actions[Math.floor(Math.random() * VOID_MATRIX.actions.length)];

    const hash = `${pain}-${truth}-${format.id}-${hook}`.toLowerCase().replace(/\s+/g, '-');
    if (used.has(hash)) continue;
    used.add(hash);

    ideas.push({
      id: `void-${Date.now()}-${attempts}`,
      title: `${hook}: ${pain} → ${truth}`,
      hook: hook.toUpperCase(),
      format: format.name,
      structure: [pain, truth, action],
      core_message: `${truth}. Rozwiązanie: ${action}. SF Protocol.`,
      pain, truth, action,
      viral_hooks: [hook, truth.toUpperCase()],
      suggested_format: format.name.includes('Karuzele') ? '🖼️ Karuzela 5-slajdowa' : '🎬 Rolka 7-Sekundowa',
      bingPrompt: `Minimalist dark void, ${pain}, pure black #000000, SF VOID, 9:16, no text`,
      audience_pain: pain,
      hash,
    });
  }

  const result = { ideas, seenHashes: Array.from(used), message: `Wygenerowano ${ideas.length} unikalnych pomysłów VOID` };
  setToCache(cacheKey, result);
  res.json({ ...result, cached: false });
});

app.post('/api/void/replicate', async (req, res) => {
  const { url } = req.body;
  if (!url || !isSafeUrl(url)) return res.status(400).json({ error: 'Nieprawidłowy URL' });
  res.json({
    url,
    detected: { photos: 4, hasQuoteOnBlack: true, changingBg: false, timing: "0.8s / 1.1s / 0.8s / 2.2s" },
    template: { type: "VOID_4_PHASE", slides: [{ placeholder: "EMPTY BED" }, { placeholder: "EMPTY WALLET" }, { placeholder: "MIRROR" }, { placeholder: "FUTURE SELF" }] }
  });
});

app.post('/api/generate', async (req, res) => {
  const key = JSON.stringify(req.body);
  const cached = getFromCache(key);
  if (cached) return res.json({ ...cached, cached: true });
  const result = { text: 'mock', prompt: req.body.prompt };
  setToCache(key, result);
  res.json({ ...result, cached: false });
});

app.listen(PORT, () => console.log(`SF VOID Server running http://localhost:${PORT} • FIXED __dirname • Cache ${CACHE_MAX}`));
export { isSafeUrl };

