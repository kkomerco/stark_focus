import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJson, getGeminiClient } from "../gemini.server";
import { VIRAL_REEL_TEMPLATES } from "../../../data/reelTemplates";
import { STARK_CODEX_RULES } from "../../../data/starkCodex";
import { getRandomBackgroundScene } from "../../../data/expandedBackgrounds";

const REEL_THEMES = [
  "obsidian_void",
  "crimson_eclipse",
  "emerald_abyss",
  "carbon_aura",
  "silver_mist",
] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Paczka z lokalnych banków treści — działa w 100% offline (zero klucza API, zero limitów). */
function buildOfflinePack(topic: string, reelsCount: number) {
  const reels = [...VIRAL_REEL_TEMPLATES]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(1, Math.min(reelsCount, 4)))
    .map((template) => ({
      hook: template.phrases[0] || template.title,
      phrases: template.phrases,
      theme: template.suggestedTheme,
      duration: template.suggestedDuration,
      captionShort: template.captionShort,
      hashtags: template.hashtags,
    }));

  const rule = pick(STARK_CODEX_RULES);
  const carousel = {
    title: rule.title,
    slides: rule.carouselSlides.map((slide) => ({
      headline: slide.headline,
      bodyText: slide.bodyText,
    })),
  };

  const post = {
    headline: rule.hook0to3s,
    body: `${rule.corePrinciple}\n\n${rule.actionDirective}\n\nSave this reminder. Execute in silence. Follow @stark_focus.`,
    bingPrompt: getRandomBackgroundScene(pick(REEL_THEMES)).bingPrompt,
  };

  return {
    generatedAt: new Date().toISOString(),
    source: "offline" as const,
    topic,
    reels,
    carousel,
    post,
  };
}

/**
 * ONE-CLICK FACTORY: jeden endpoint, jedna paczka treści na cały dzień publikacji.
 * Rolki + karuzela + post 1:1. Bez klucza API zwraca wariant offline z banków lokalnych.
 */
export function registerDailyPackRoutes(app: MiniApp): void {
  app.post("/api/ai/daily-pack", async (req, res) => {
    const { topic = "stoic discipline, solitude and relentless standards", reelsCount = 2 } =
      req.body || {};

    if (!getGeminiClient()) {
      return res.json(buildOfflinePack(topic, Number(reelsCount) || 2));
    }

    try {
      const prompt = `Jesteś strategiem treści dla marki @stark_focus (brutalny stoicyzm, mroczny minimalizm, treści 100% po angielsku).
Dla tematu: "${topic}" wygeneruj JEDNĄ spójną "paczkę dnia" do publikacji:

1. Rolki 9:16 w liczbie ${Number(reelsCount) || 2} — każda z:
   - hook: bezwzględny hook 0-3s po angielsku (konkret, zero inspiration-talk)
   - phrases: dokładnie 3 frazy po angielsku [hook, kontrast, puenta]
   - theme: jeden z: "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist"
   - duration: liczba sekund 7-10
   - captionShort: krótki opis po angielsku
   - hashtags: 5 hashtagów
2. Karuzela 4:5: title + dokładnie 5 slajdów {headline, bodyText} (każdy slajd po angielsku)
3. Grafika 1:1: {headline, body, bingPrompt} — bingPrompt po angielsku do generatora obrazów (ciemne, minimalistyczne tło, 1:1, bez tekstu)

Zwróć WYŁĄCZNIE poprawny JSON wg schematu:
{
  "reels": [
    {
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "theme": "obsidian_void",
      "duration": 8,
      "captionShort": "string",
      "hashtags": ["#string", "#string", "#string", "#string", "#string"]
    }
  ],
  "carousel": {
    "title": "string",
    "slides": [{ "headline": "string", "bodyText": "string" }]
  },
  "post": {
    "headline": "string",
    "body": "string",
    "bingPrompt": "string"
  }
}`;

      const parsed = await generateJson<any>({
        contents: prompt,
        temperature: 0.9,
        model: GEMINI_MODEL,
      });

      const valid =
        Array.isArray(parsed?.reels) &&
        parsed.reels.length > 0 &&
        Array.isArray(parsed?.carousel?.slides) &&
        parsed.carousel.slides.length > 0 &&
        typeof parsed?.post?.headline === "string";

      if (!valid) return res.json(buildOfflinePack(topic, Number(reelsCount) || 2));

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai",
        topic,
        reels: parsed.reels,
        carousel: parsed.carousel,
        post: parsed.post,
      });
    } catch (err) {
      console.warn("Błąd daily-pack:", err);
      return res.json(buildOfflinePack(topic, Number(reelsCount) || 2));
    }
  });
}
