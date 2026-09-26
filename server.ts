import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { handleStarkApi } from "./src/lib/ai/router.server";

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

  // Było tu /api/generate — surowy prompt prosto do modelu, z cache'em w
  // pamięci. Nic z UI go nie wołało, a każdy, kto w sieci lokalnej trafi na
  // ten adres, mógł przepalać dzienny limit klucza własnymi promptami.
  // Treść generuje wyłącznie `router.server.ts`, gdzie każda trasa ma swój
  // clamp, swoją normalizację i swój fallback.

  // Wszystkie trasy AI: montowane z `router.server.ts`, tam każda ma własny
  // moduł w `src/lib/ai/routes/`.
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
