import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { VIRAL_REEL_TEMPLATES } from "../../../data/reelTemplates";
import { STARK_CODEX_RULES } from "../../../data/starkCodex";
import { getRandomBackgroundScene } from "../../../data/expandedBackgrounds";
import { hookFingerprint } from "../../similarity";
import { pick, pickForDay, shuffle } from "../../random";
import { clampInt, clampText, LIMITS } from "../../limits";
import { HOOK_CRAFT_PROMPT, exemplarBlock } from "../../hookCraft";
import { asArray, asString, asStringArray, oneOf } from "../normalize.server";
import { publishableLine, publishableLines } from "../../prepublish";
import { starkCaption } from "../../caption";
import { STARK_CTA, starkHashtags } from "../../caption";

const REEL_THEMES = [
  "obsidian_void",
  "crimson_eclipse",
  "emerald_abyss",
  "carbon_aura",
  "silver_mist",
] as const;

/** Ile rolek w paczce maksymalnie — każda to osobne, płatne wywołanie modelu. */
const MAX_PACK_REELS = 6;

/**
 * UI robi `reel.phrases.map()` i `reel.hashtags.join()` bez sprawdzania pola,
 * więc kompletne kształty robimy tutaj: jedna rolka bez `phrases` nie może
 * rozbijać całej paczki dnia.
 *
 * Frazy przechodzą przez te same reguły co kontrola przed publikacją — klisza
 * i polszczyzna nie mogą dojść do paczki, a potem do konta.
 */
function normalizeReel(item: unknown) {
  const reel = (item ?? {}) as Record<string, unknown>;
  const phrases = publishableLines(asStringArray(reel.phrases, 5));
  const rawHook = asString(reel.hook);
  const hook = publishableLine(rawHook) ? rawHook : phrases[0] || "";

  return {
    hook,
    phrases: phrases.length > 0 ? phrases : hook ? [hook] : [],
    theme: oneOf(reel.theme, REEL_THEMES, "obsidian_void"),
    duration: clampInt(reel.duration, 5, 15, 8),
    captionShort: starkCaption(hook, asString(reel.captionShort)),
    // Hashtagi liczymy z tego, co jest na kadrze. Model niech ich nie prosi:
    // każdy własny zestaw to inny ogon pod kolejnym postem tego samego konta.
    hashtags: starkHashtags((hook + " " + phrases.join(" ")).trim()),
  };
}

// Nisza dark motivation — auto-rotacja kategorii dla różnorodności treści
const DARK_MOTIVATION_CATEGORIES = [
  "discipline vs motivation",
  "hard work ethos & suffering",
  "monk mode & solitude",
  "mental toughness & pain",
  "silence & strategic power",
  "dopamine detox & focus",
  "iron standards & self-respect",
  "time urgency & memento mori",
] as const;

function pickDailyCategory(): string {
  return pickForDay(DARK_MOTIVATION_CATEGORIES);
}

/** Paczka z lokalnych banków treści — działa w 100% offline (zero klucza API, zero limitów). */
function buildOfflinePack(topic: string, reelsCount: number, excludeHooks: string[] = []) {
  const excluded = new Set(excludeHooks.map(hookFingerprint));
  const reels = shuffle(VIRAL_REEL_TEMPLATES)
    .filter((t) => !excluded.has(hookFingerprint(String(t.phrases[0] || t.title))))
    .slice(0, reelsCount)
    .map((template) => ({
      hook: template.phrases[0] || template.title,
      phrases: template.phrases,
      theme: template.suggestedTheme,
      duration: template.suggestedDuration,
      captionShort: template.captionShort,
      hashtags: starkHashtags(template.phrases.join(" ")),
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
    body: `${rule.corePrinciple}\n\n${rule.actionDirective}\n\n${STARK_CTA}\n\n${starkHashtags(rule.corePrinciple).join(" ")}`,
    bingPrompt: getRandomBackgroundScene(pick(REEL_THEMES)).bingPrompt,
  };

  return {
    generatedAt: new Date().toISOString(),
    source: "offline" as const,
    topic,
    category: pickDailyCategory(),
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
    const topic = clampText(
      req.body?.topic,
      300,
      "dark motivation, brutal discipline, hard work and mental toughness",
    );
    const reelsCount = clampInt(req.body?.reelsCount, 1, MAX_PACK_REELS, 3);
    const safeExclude: string[] = (
      Array.isArray(req.body?.excludeHooks) ? req.body.excludeHooks : []
    )
      .map((hook: unknown) => asString(hook))
      .filter(Boolean)
      .slice(0, LIMITS.maxExcludeHooks);
    const exemplars = (Array.isArray(req.body?.exemplars) ? req.body.exemplars : [])
      .map((hook: unknown) => asString(hook))
      .filter(Boolean)
      .slice(0, 8);

    if (!getGeminiClient()) {
      return res.json(buildOfflinePack(topic, reelsCount, safeExclude));
    }

    try {
      const dailyCategory = pickDailyCategory();
      const prompt = `Jesteś strategiem treści dla marki @stark_focus (dark motivation, brutalna dyscyplina, hard work ethos, treści 100% po angielsku).
Dla tematu: "${topic}" i kategorii dnia: "${dailyCategory}" wygeneruj JEDNĄ spójną "paczkę dnia" do publikacji.

WYMAGANIA TREŚCI:
- Ton: bezwzględny, konkretny, zero "inspiration porn"
- Styl: David Goggins meets Marcus Aurelius — surowy, ale filozoficzny
- Każdy hook musi zatrzymać scroll w 0.8s (konkret, liczby, konfrontacja)
- Unikaj ogólników typu "believe in yourself" — zamiast tego "Your comfort zone is a coffin"
- NIE powtarzaj żadnego z tych hooków (ani ich mutacji):
${
  safeExclude
    .slice(-20)
    .map((h) => `  - "${h}"`)
    .join("\n") || "  (brak)"
}

1. Rolki 9:16 w liczbie ${reelsCount} — każda z:
   - hook: bezwzględny hook 0-3s po angielsku (max 8 słów, konkret, zero lania wody)

${HOOK_CRAFT_PROMPT}
${exemplarBlock(exemplars)}
   - phrases: dokładnie 3 frazy po angielsku [hook, bolesny kontrast, puenta/climax]
   - theme: jeden z: "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist"
   - duration: liczba sekund 7-10
   - captionShort: krótki opis po angielsku (max 2 linie, z CTA "Save this")
2. Karuzela 4:5: title + 8 slajdów {headline, bodyText} (sedno w 7-9; karuzele z ośmioma slajdami zbierają kilkakrotnie więcej zapisów niż pięciosekundowe rolki, a zapis jest walutą karuzeli). bodyText to 2-3 zdania po angielsku (25-40 słów): najpierw bolesna obserwacja, potem konkret, na koniec cena za jej brak. Jedno zdanie na slajd nie zatrzymuje czytelnika.
3. Grafika 1:1: {headline, body, bingPrompt} — bingPrompt po angielsku do generatora obrazów (ciemne, brutalistyczne, minimalistyczne tło, 1:1, bez tekstu, moody lighting)

Zwróć WYŁĄCZNIE poprawny JSON wg schematu:
{
  "category": "${dailyCategory}",
  "reels": [
    {
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "theme": "obsidian_void",
      "duration": 8,
      "captionShort": "string",
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

      const parsed = await generateJsonWithFallback<any>({
        contents: prompt,
        temperature: 0.9,
        preferredModel: GEMINI_MODEL,
      });

      const reels = asArray(parsed.reels)
        .map(normalizeReel)
        .filter((reel) => reel.phrases.length > 0 && reel.hook)
        .slice(0, MAX_PACK_REELS);

      const slides = asArray(parsed.carousel?.slides)
        .map((slide: unknown) => ({
          headline: asString((slide as Record<string, unknown>)?.headline),
          bodyText: asString((slide as Record<string, unknown>)?.bodyText),
        }))
        .filter((slide) => slide.headline || slide.bodyText)
        .slice(0, 10);

      const postHeadline = asString(parsed.post?.headline);

      if (reels.length === 0 || slides.length === 0 || !postHeadline) {
        return res.json(buildOfflinePack(topic, reelsCount, safeExclude));
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai",
        topic,
        category: asString(parsed.category, dailyCategory),
        reels,
        carousel: { title: asString(parsed.carousel?.title, "Stark Focus Codex"), slides },
        post: {
          headline: postHeadline,
          body: asString(parsed.post?.body),
          bingPrompt: asString(parsed.post?.bingPrompt),
        },
      });
    } catch (err) {
      console.warn("Błąd daily-pack:", err);
      return res.json(buildOfflinePack(topic, reelsCount, safeExclude));
    }
  });
}
