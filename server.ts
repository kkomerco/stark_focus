import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handleStarkApi } from "./src/lib/ai/router.server";
import { createTtlCache } from "./src/lib/cache";
import { isSafeUrl } from "./src/lib/safe-url";
import { generateContentWithFallback } from "./src/lib/ai/gemini.server";

const PORT = 3000;

// === CACHE RAM (200 wpisów, TTL 10 min) ===
const AI_CACHE = createTtlCache<any>({ ttlMs: 10 * 60 * 1000, maxEntries: 200 });

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
    const cached = AI_CACHE.get(cacheKey);
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
    AI_CACHE.set(cacheKey, result);
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
    const cached = AI_CACHE.get(cacheKey);
    if (cached) return res.json({ text: cached, cached: true });

    try {
      const text = await generateContentWithFallback({
        contents: prompt,
        systemInstruction,
      });
      AI_CACHE.set(cacheKey, text);
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
