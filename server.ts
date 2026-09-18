import "dotenv/config";
import express from "express";
import cors from "cors";
import { URL } from "url";
import net from "net";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { handleStarkApi } from "./src/lib/stark-api.server";

const PORT = 3000;

// Lazy initialisation of Google Gemini
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
}

// === CACHE RAM (200 wpisów, TTL 10 min) ===
type CacheEntry = { value: any; expiresAt: number };
const AI_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;

function getFromCache(key: string) {
  const e = AI_CACHE.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) {
    AI_CACHE.delete(key);
    return null;
  }
  // Odświeżenie pozycji w LRU
  AI_CACHE.delete(key);
  AI_CACHE.set(key, e);
  return e.value;
}

function setToCache(key: string, value: any) {
  if (AI_CACHE.size >= CACHE_MAX) {
    const oldest = AI_CACHE.keys().next().value;
    if (oldest) AI_CACHE.delete(oldest);
  }
  AI_CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// === ZABEZPIECZENIE PRZED SSRF ===
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4) return false;
  if (p[0] === 10) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 127 || p[0] === 0) return true;
  if (p[0] === 169 && p[1] === 254) return true;
  return false;
}

export function isSafeUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const h = url.hostname.toLowerCase();
    if (["localhost", "0.0.0.0", "::1", "127.0.0.1", "169.254.169.254"].includes(h)) return false;
    if (net.isIP(h) === 4 && isPrivateIPv4(h)) return false;
    if (
      net.isIP(h) === 6 &&
      (h === "::1" ||
        h === "::" ||
        h.startsWith("fe80:") ||
        h.startsWith("fc") ||
        h.startsWith("fd"))
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

// === VOID MATRIX ===
const VOID_MATRIX = {
  pains: [
    "lenistwo",
    "wymówki",
    "komfort",
    "prokrastynacja",
    "porównywanie się",
    "tania dopamina",
    "brak planu",
    "strach przed oceną",
  ],
  truths: [
    "nikt nie przyjdzie",
    "czas ucieka - klepsydra",
    "jesteś sam",
    "nikt nie patrzy",
    "komfort cię zabija",
    "jutro to kłamstwo",
    "dyscyplina to kara za wczoraj",
  ],
  formats: [
    { id: "4_photos", name: "4 zdjęcia" },
    { id: "black_quote", name: "Cytat na czarnym" },
    { id: "changing_bg", name: "Zmieniające się tło" },
    { id: "carousel_dark", name: "Karuzele 3-7 mroczne" },
  ],
  hooks: [
    "To cię zniszczy",
    "Przestań kłamać",
    "Masz 24h",
    "Nikt ci tego nie powie",
    "Klepsydra nie czeka",
    "SF RULE #",
  ],
  actions: ["wstań", "odtnij ich", "zamknij mordę i rób", "zasada 1%", "protokół 04:30"],
};

async function startServer() {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  // === ENDPOINTY API ===

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. Bezpieczne proxy grafik (omijanie CORS z ochroną przed SSRF)
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl || !isSafeUrl(imageUrl)) {
      return res.status(403).json({ error: "URL zablokowany (SSRF protection)" });
    }

    try {
      const r = await fetch(imageUrl, {
        headers: { "User-Agent": "VisionaryMediaLab/1.0" },
        redirect: "manual",
      });

      if (r.status >= 300 && r.status < 400) {
        return res
          .status(400)
          .json({ error: "Przekierowania URL są zablokowane ze względów bezpieczeństwa" });
      }

      if (!r.ok) return res.status(r.status).json({ error: "Nie udało się pobrać obrazu" });

      const ct = r.headers.get("content-type") || "";
      if (!ct.startsWith("image/"))
        return res.status(400).json({ error: "Zasób nie jest obrazem" });

      res.setHeader("Content-Type", ct);
      res.setHeader("Cache-Control", "public, max-age=86400");

      const buffer = await r.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (e) {
      console.error("Błąd /api/proxy-image:", e);
      return res.status(500).json({ error: "Błąd serwera podczas pobierania obrazu" });
    }
  });

  // 2. Generator idei VOID
  app.post("/api/void/infinite-ideas", (req, res) => {
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

      const hash = `${pain}-${truth}-${format.id}-${hook}`.toLowerCase().replace(/\s+/g, "-");
      if (used.has(hash)) continue;
      used.add(hash);

      ideas.push({
        id: `void-${Date.now()}-${attempts}`,
        title: `${hook}: ${pain} → ${truth}`,
        hook: hook.toUpperCase(),
        format: format.name,
        structure: [pain, truth, action],
        core_message: `${truth}. Rozwiązanie: ${action}. SF Protocol.`,
        pain,
        truth,
        action,
        viral_hooks: [hook, truth.toUpperCase()],
        suggested_format: format.name.includes("Karuzele")
          ? "🖼️ Karuzela 5-slajdowa"
          : "🎬 Rolka 7-Sekundowa",
        bingPrompt: `Minimalist dark void, ${pain}, pure black #000000, SF VOID, 9:16, no text`,
        audience_pain: pain,
        hash,
      });
    }

    const result = {
      ideas,
      seenHashes: Array.from(used),
      message: `Wygenerowano ${ideas.length} unikalnych pomysłów VOID`,
    };
    setToCache(cacheKey, result);
    res.json({ ...result, cached: false });
  });

  // 3. Replikator VOID
  app.post("/api/void/replicate", async (req, res) => {
    const { url } = req.body;
    if (!url || !isSafeUrl(url))
      return res.status(400).json({ error: "Nieprawidłowy lub zablokowany URL" });
    res.json({
      url,
      detected: {
        photos: 4,
        hasQuoteOnBlack: true,
        changingBg: false,
        timing: "0.8s / 1.1s / 0.8s / 2.2s",
      },
      template: {
        type: "VOID_4_PHASE",
        slides: [
          { placeholder: "EMPTY BED" },
          { placeholder: "EMPTY WALLET" },
          { placeholder: "MIRROR" },
          { placeholder: "FUTURE SELF" },
        ],
      },
    });
  });

  // 4. Prawdziwe generowanie AI (Google Gemini z cache)
  app.post("/api/generate", async (req, res) => {
    const { prompt, systemInstruction } = req.body;
    if (!prompt) return res.status(400).json({ error: "Brak wymaganego pola prompt" });

    const cacheKey = `gemini-${JSON.stringify(req.body)}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ text: cached, cached: true });

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: "Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env serwera",
      });
    }

    try {
      const models = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];
      let response: any = null;
      let lastErr: any = null;

      for (const model of models) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model,
              contents: prompt,
              config: systemInstruction ? { systemInstruction } : undefined,
            });
            break;
          } catch (err: any) {
            lastErr = err;
            const msg = String(err?.message || err);
            const isUnavailable =
              msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
            const isRateLimit =
              msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

            if ((isUnavailable || isRateLimit) && attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1200));
              continue;
            }
            break;
          }
        }
        if (response) break;
      }

      if (!response && lastErr) {
        throw lastErr;
      }

      const text = response.text;
      setToCache(cacheKey, text);
      return res.json({ text, cached: false });
    } catch (error: any) {
      console.error("Błąd Gemini API:", error);
      return res.status(500).json({ error: error.message || "Błąd generowania treści przez AI" });
    }
  });

  // 5. Stark Focus AI routes (trend scanning, mentor variants, hook battles, carousel templates)
  app.use(async (req, res, next) => {
    if (req.path.startsWith("/api/ai/") || req.path === "/api/ghostwrite") {
      try {
        const fullUrl = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
        const webReq = new Request(fullUrl, {
          method: req.method,
          headers: req.headers as any,
          body: ["POST", "PUT", "PATCH"].includes(req.method)
            ? JSON.stringify(req.body)
            : undefined,
        });
        const webRes = await handleStarkApi(webReq);
        res.status(webRes.status);
        webRes.headers.forEach((val, key) => res.setHeader(key, val));
        const buf = Buffer.from(await webRes.arrayBuffer());
        return res.send(buf);
      } catch (e: any) {
        console.error("Error handling AI route:", e);
        return res.status(500).json({ error: e.message || "AI route handler error" });
      }
    }
    next();
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 SF VOID / Visionary Media Lab running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
