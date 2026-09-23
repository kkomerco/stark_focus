import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import cors from "cors";
import path from "path";
import { handleStarkApi } from "./src/lib/ai/router.server";
import { createTtlCache } from "./src/lib/cache";
import { clampText } from "./src/lib/limits";
import { getGeminiClient, generateContentWithFallback } from "./src/lib/ai/gemini.server";

const PORT = Number(process.env.PORT) || 3000;

/**
 * Domyślnie tylko localhost. `0.0.0.0` wystawia API bez uwierzytelnienia na
 * całą sieć lokalną — każdy w LAN (i każda strona otwarta w tej przeglądarce,
 * dopóki nie ma allowlisty originów) mógłby przepalać klucz Gemini.
 * Świadomie NIE dodajemy tokenu API dopóki UI nie ma wspólnego wrapperka
 * `fetch`, bo serwer wymagający nagłówka, którego klient nie wysyła, jest
 * gorszy niż oba te stany.
 */
const HOST = process.env.HOST || "127.0.0.1";

/**
 * Serwer z budowy odpala się wyłącznie jawnie (`npm start` → `--prod`).
 * Domyślny jest middleware Vite, bo tak uruchamiasz to lokalnie
 * (`tsx server.ts`, uruchom-final-taskbar.bat) bez żadnych zmiennych env —
 * dawniejszy warunek `NODE_ENV !== "production"` sprawia, że `npm start`
 * odpalał serwer deweloperski albo wywalał się na braku `vite`.
 */
const PRODUCTION = process.argv.includes("--prod");

/**
 * UI działa z tego samego źródła, więc nie potrzebuje CORS w ogóle.
 * Odbijanie `origin: true` z `credentials: true` pozwalało za to każdej
 * odwiedzanej stronie w przeglądarce użytkownika dzwonić na /api/ai/* i
 * przepalać klucz Gemini. Dostępne tylko to, co wpisze ALLOWED_ORIGINS.
 */
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

// === CACHE RAM (200 wpisów, TTL 10 min) ===
const AI_CACHE = createTtlCache<any>({ ttlMs: 10 * 60 * 1000, maxEntries: 200 });

async function startServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "10mb" }));

  // === ENDPOINTY API ===

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. Prawdziwe generowanie AI (Google Gemini z cache)
  app.post("/api/generate", async (req, res) => {
    const prompt = clampText(req.body?.prompt, 6000);
    const systemInstruction = clampText(req.body?.systemInstruction, 2000);
    if (!prompt) return res.status(400).json({ error: "Brak wymaganego pola prompt" });
    if (!getGeminiClient()) {
      return res.status(503).json({ error: "Brak skonfigurowanego klucza GEMINI_API_KEY" });
    }

    // Klucz to skrót klampowanych pól, nie całego body: do cache trafia
    // maksymalnie tyle, ile realnie wpływa na odpowiedź.
    const cacheKey = `gemini-${createHash("sha256")
      .update(`${systemInstruction}\n${prompt}`)
      .digest("hex")}`;
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
      // Szczegóły błędu idą tylko do loga: `error.message` z SDK potrafi
      // zawierać fragmenty zapytania, ścieżki i układ środowiska.
      console.error("Błąd Gemini API:", error);
      return res.status(502).json({ error: "Generowanie AI nie udało się" });
    }
  });

  // 5. Stark Focus AI routes (trend scanning, mentor variants, hook battles, carousel templates)
  app.use(async (req, res, next) => {
    if (req.path.startsWith("/api/ai/") || req.path === "/api/ghostwrite") {
      try {
        const fullUrl = `${req.protocol}://${req.get("host") || "localhost"}${req.originalUrl}`;
        const headers = new Headers(req.headers as any);
        // Body jest ponownie serializowane poniżej — stary content-length
        // przestałby pasować do nowej liczby bajtów.
        headers.delete("content-length");
        const webReq = new Request(fullUrl, {
          method: req.method,
          headers,
          body: ["POST", "PUT", "PATCH"].includes(req.method)
            ? JSON.stringify(req.body ?? {})
            : undefined,
        });
        const webRes = await handleStarkApi(webReq);
        res.status(webRes.status);
        webRes.headers.forEach((val, key) => res.setHeader(key, val));
        const buf = Buffer.from(await webRes.arrayBuffer());
        return res.send(buf);
      } catch (e: any) {
        console.error("Error handling AI route:", e);
        return res.status(500).json({ error: "Obsługa trasy AI nie powiodła się" });
      }
    }
    next();
  });

  // Vite middleware setup
  if (!PRODUCTION) {
    // Leniwy import: statyczne `import from "vite"` trafia do bundla
    // produkcyjnego (esbuild --packages=external) i wywala `npm start`,
    // gdy vite nie jest zainstalowane jako zależność produkcyjna.
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      // Nie zgaduj: zła ścieżka API musi być 404, nie index.html.
      // Inaczej klient JSON.parse() dostaje HTML i błąd jest nieczytelny.
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "Nie znaleziono endpointu" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Błąd z body-parsera (np. uszkodzony JSON) leci domyślnym handlerem
  // Expressa, który zwraca stos wywołań z bezwzględnymi ścieżkami z dysku.
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);

    console.error(`Błąd ${req.method} ${req.path}:`, err?.message || err);
    const badRequest = Number(err?.status) === 400;
    return res.status(badRequest ? 400 : 500).json({
      error: badRequest ? "Nieprawidłowe ciało żądania (oczekiwano JSON)" : "Błąd serwera",
    });
  });

  app.listen(PORT, HOST, () => {
    console.log(`🚀 SF VOID / Visionary Media Lab running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error("Serwer nie wystartował:", e);
  process.exitCode = 1;
});
