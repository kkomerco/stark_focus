import { createApp } from "../mini-express.server";
import { createTtlCache } from "../cache";
import { registerAnalyzeRoutes } from "./routes/analyze.server";
import { registerDeconstructRoutes } from "./routes/deconstruct.server";
import { registerGenerateRoutes } from "./routes/generate.server";
import { registerTrendsRoutes } from "./routes/trends.server";
import { registerCarouselRoutes } from "./routes/carousel.server";
import { registerMentorRoutes } from "./routes/mentor.server";
import { registerReelsRoutes } from "./routes/reels.server";
import { registerStatusRoutes } from "./routes/status.server";
import { registerDailyPackRoutes } from "./routes/daily-pack.server";
import { registerIdeaStreamRoutes } from "./routes/idea-stream.server";
import { registerGrowthRoutes } from "./routes/growth.server";

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
registerCarouselRoutes(app);
registerMentorRoutes(app);
registerReelsRoutes(app);
registerStatusRoutes(app);
registerDailyPackRoutes(app);
registerIdeaStreamRoutes(app);
registerGrowthRoutes(app);

// Endpointy AI, ktorych odpowiedzi warto cache'owac (identyczne zapytanie = ta sama odpowiedz)
const CACHEABLE_AI_PATHS = new Set([
  "/api/ai/scan-trends",
  "/api/ai/analyze-hook",
  "/api/ai/generate-background-prompt",
  "/api/ai/generate-carousel-template",
  "/api/ai/analyze-link",
  "/api/ai/viral-format-radar",
  "/api/ai/angle-matrix",
  "/api/ai/cognitive-friction",
  "/api/ai/evergreen-recycle",
  "/api/ai/generate-multi-variant-reels",
]);

export async function handleStarkApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cacheable = request.method === "POST" && CACHEABLE_AI_PATHS.has(url.pathname);

  if (!cacheable) return app.handle(request);

  const rawBody = await request.clone().text();
  const key = `${url.pathname}:${rawBody}`;
  const hit = cacheGet(key);
  if (hit) {
    return new Response(hit.body, {
      status: 200,
      headers: { "content-type": hit.contentType, "x-stark-cache": "HIT" },
    });
  }

  const response = await app.handle(request);
  if (response.status === 200) {
    const text = await response.clone().text();
    cacheSet(key, text, response.headers.get("content-type") ?? "application/json");
  }
  return response;
}
