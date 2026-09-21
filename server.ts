import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { handleStarkApi } from "./src/lib/ai/router.server";
import { isSafeUrl } from "./src/lib/safe-url";

const PORT = 3000;

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
        return res.status(400).json({
          error: "Przekierowania URL są zablokowane ze względów bezpieczeństwa",
        });
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

  // 2. Stark Focus AI routes (trend scanning, mentor variants, generate, hook battles, carousel templates)
  app.use(async (req, res, next) => {
    if (
      req.path.startsWith("/api/ai/") ||
      req.path === "/api/ghostwrite" ||
      req.path === "/api/generate"
    ) {
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
