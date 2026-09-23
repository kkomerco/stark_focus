import { createHash } from "node:crypto";
import { createApp } from "../mini-express.server";
import { createTtlCache } from "../cache";
import { DEGRADED_HEADER } from "./normalize.server";
import { registerAnalyzeRoutes } from "./routes/analyze.server";
import { registerDeconstructRoutes } from "./routes/deconstruct.server";
import { registerGenerateRoutes } from "./routes/generate.server";
import { registerTrendsRoutes } from "./routes/trends.server";
import { registerStatusRoutes } from "./routes/status.server";
import { registerDailyPackRoutes } from "./routes/daily-pack.server";
import { registerIdeaStreamRoutes } from "./routes/idea-stream.server";
import { registerGrowthRoutes } from "./routes/growth.server";
import { registerBatchRoutes } from "./routes/batch.server";
import { registerBackgroundRoutes } from "./routes/backgrounds.server";

// Cache odpowiedzi AI (identyczne zapytanie = ta sama odpowiedz)
const aiCache = createTtlCache<{ body: string; contentType: string }>({
  ttlMs: 5 * 60 * 1000,
  maxEntries: 200,
});

function cacheGet(key: string) {
  return aiCache.get(key);
}

function cacheSet(key: string, body: string, contentType: string) {
  aiCache.set(key, { body, contentType });
}

const app = createApp();

registerAnalyzeRoutes(app);
registerDeconstructRoutes(app);
registerGenerateRoutes(app);
registerTrendsRoutes(app);
registerStatusRoutes(app);
registerDailyPackRoutes(app);
registerIdeaStreamRoutes(app);
registerGrowthRoutes(app);
registerBatchRoutes(app);
// Świadomie poza CACHEABLE_AI_PATHS: tło ma być za każdym razem inne.
registerBackgroundRoutes(app);

/**
 * Cache zostaje tylko tam, gdzie identyczne zapytanie MA znaczyć identyczną
 * odpowiedź (analiza tego samego linku). Generatory pomysłów są poza listą
 * celowo: dla właściciela powtórka z 5 minut to nie jest „ta sama odpowiedź",
 * tylko zmarnowany klik i mniej treści na feed.
 */
const CACHEABLE_AI_PATHS = new Set(["/api/ai/analyze-link"]);

export async function handleStarkApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cacheable = request.method === "POST" && CACHEABLE_AI_PATHS.has(url.pathname);

  if (!cacheable) return app.handle(request);

  // Klucz to skrót żądania, nie całe body: body potrafi mieć setki kilobajtów
  // (historia hooków, analizowany tekst), a trzymałoby je w pamięci 200 kluczów.
  const rawBody = await request.clone().text();
  const key = createHash("sha256").update(`${url.pathname}\n${rawBody}`).digest("hex");

  const hit = cacheGet(key);
  if (hit) {
    return new Response(hit.body, {
      status: 200,
      headers: { "content-type": hit.contentType, "x-stark-cache": "HIT" },
    });
  }

  const response = await app.handle(request);
  const degraded = response.headers.get(DEGRADED_HEADER);
  if (response.status === 200 && !degraded) {
    const text = await response.clone().text();
    cacheSet(key, text, response.headers.get("content-type") ?? "application/json");
  }
  return response;
}
