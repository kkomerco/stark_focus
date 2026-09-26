import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { VIRAL_REEL_TEMPLATES } from "../../../data/reelTemplates";
import { STARK_CODEX_RULES } from "../../../data/starkCodex";
import { getRandomBackgroundScene } from "../../../data/expandedBackgrounds";
import { hookFingerprint } from "../../similarity";
import { pick, pickForDay, shuffle } from "../../random";
import { clampInt, clampText, clampTextList } from "../../limits";
import {
  HOOK_CRAFT_PROMPT,
  HOOK_IDEAL_WORDS,
  HOOK_MAX_WORDS,
  exemplarBlock,
} from "../../hookCraft";
import { asArray, asString, asStringArray, oneOf, sendDegraded } from "../normalize.server";
import { publishableLine, publishableLines } from "../../prepublish";
import { starkCaption, starkHashtags, starkShortCaption } from "../../caption";

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
 * KONTRAKT PACZKI — jedyne miejsce, gdzie te liczby istnieją. Prompt, klamki i
 * cięcia odpowiedzi czytają stąd, więc nie może się już zdarzyć, że prompt
 * żąda 12 slajdów, trasa ucina do 10, bank ma 5, a studio przyjmuje 16.
 * Karuzela: 12+ slajdów, bo u kont <10k obserwujących właśnie takie wychodzą
 * ponad medianę autora w 23,5% przypadków (Eden, 655 385 karuzeli).
 */
const CAROUSEL_SLIDES = 12;
const REEL_DURATION_MIN = 5;
const REEL_DURATION_MAX = 15;

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
    duration: clampInt(reel.duration, REEL_DURATION_MIN, REEL_DURATION_MAX, 8),
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
    .map((template) => {
      const hook = template.phrases[0] || template.title;
      return {
        hook,
        phrases: template.phrases,
        theme: template.suggestedTheme,
        duration: clampInt(template.suggestedDuration, REEL_DURATION_MIN, REEL_DURATION_MAX, 8),
        // Bank ma własne ogony („Save this reminder and execute in silence") —
        // bez puli z `caption.ts` na koncie ląduje pięć różnych stopek pisanych
        // przez pięć osób. `starkCaption` bierze ze zdania banku treść, a CTA
        // i hashtagy dokłada zawsze markowe.
        captionShort: starkCaption(hook, template.captionShort),
        hashtags: starkHashtags(template.phrases.join(" ")),
      };
    });

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
    body: starkShortCaption(rule.hook0to3s, rule.corePrinciple),
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
    // Lista od klienta wchodzi w prompt, więc każdy wiersz jest przycinany
    // osobno: bez tego jedno `excludeHooks: ["a".repeat(1e6)]` płaci za siebie
    // przy każdym wywołaniu w łańcuchu fallbacku modeli.
    const safeExclude = clampTextList(req.body?.excludeHooks);
    const exemplars = clampTextList(req.body?.exemplars).slice(0, 8);

    if (!getGeminiClient()) {
      return sendDegraded(res, buildOfflinePack(topic, reelsCount, safeExclude));
    }

    try {
      const dailyCategory = pickDailyCategory();
      const prompt = `Jesteś strategiem treści dla marki @stark_focus (dark motivation, brutalna dyscyplina, hard work ethos, treści 100% po angielsku).
Dla tematu: "${topic}" i kategorii dnia: "${dailyCategory}" wygeneruj JEDNĄ spójną "paczkę dnia" do publikacji.

WYMAGANIA TREŚCI:
- Ton: bezwzględny, konkretny, zero "inspiration porn"
- Styl: David Goggins meets Marcus Aurelius — surowy, ale filozoficzny
- Każdy hook musi zatrzymać scroll w 0.8s (konkret, liczby, konfrontacja)
- Zero ogólników: zamiast hasła ma być jedna z figur z katalogu poniżej, na geście, który czytelnik naprawdę robi
- NIE powtarzaj żadnego z tych hooków (ani ich mutacji):
${
  safeExclude
    .slice(-20)
    .map((h) => `  - "${h}"`)
    .join("\n") || "  (brak)"
}

1. Rolki 9:16 w liczbie ${reelsCount} — każda z:
   - hook: bezwzględny hook 0-3s po angielsku (${HOOK_IDEAL_WORDS} słów, sufit ${HOOK_MAX_WORDS}, konkret, zero lania wody)

${HOOK_CRAFT_PROMPT}
${exemplarBlock(exemplars)}
   - phrases: dokładnie 3 frazy po angielsku [hook, bolesny kontrast, puenta/climax]
   - theme: jeden z: "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist"
   - duration: liczba sekund ${REEL_DURATION_MIN}-${REEL_DURATION_MAX}
   - captionShort: jedno-dwa zdania po angielsku rozwijające hook. BEZ wezwania do działania i BEZ hashtagów — ogon z puli marki dokłada \`caption.ts\`, a dwa ogony pod jednym postem wyglądają jak dwóch autorów.
2. Karuzela 4:5: title + ${CAROUSEL_SLIDES} slajdów {headline, bodyText}. Długość nie jest kaprysem: u kont poniżej 10k obserwujących karuzele 11-20 slajdów wychodzą ponad medianę autora w 23,5% przypadków, te 2-4 slajdy w 18,0% (Eden, 655 385 karuzeli). Rozkład: slajd 1 to teza, nie tytuł; slajdy 2-${CAROUSEL_SLIDES - 2} po jednej myśli każdy, z niedomkniętym zdaniem na końcu (to ono każe swipnąć); slajd ${CAROUSEL_SLIDES - 1} konkretna cena za brak zmiany; slajd ${CAROUSEL_SLIDES} jedno zdanie do zapisania. bodyText to 2-3 zdania po angielsku (25-40 słów): najpierw bolesna obserwacja, potem konkret, na koniec cena za jej brak. Jedno zdanie na slajd nie zatrzymuje czytelnika.
3. Grafika 1:1: {headline, body, bingPrompt} — bingPrompt po angielsku do generatora obrazów (ciemne, brutalistyczne, minimalistyczne tło, 1:1, bez tekstu, moody lighting). \`headline\` to jedno zdanie na czarnym kadrze (4-10 słów, PO ANGIELSKU), a \`body\` to JEDNO zdanie po angielsku (max 22 słowa), które dopowiada to, czego nie widać na kadrze. Pod cytatem na czerni nie ma wykładu na pięć linijek — nikt go nie czyta, a kadr zostaje tym samym zdaniem.

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
        .slice(0, CAROUSEL_SLIDES);

      const postHeadline = asString(parsed.post?.headline);

      // Zapytanie już zostało zapłacone, więc jedno puste pole nie może kasować
      // całej paczki: oddajemy to, co przyszło dobre, a brak nazywa UI (pola
      // wracają puste). Bank wchodzi do gry dopiero, gdy nie ma niczyjego zdania.
      const hasReels = reels.length > 0;
      const hasCarousel = slides.length > 0;
      if (!hasReels && !hasCarousel && !postHeadline) {
        return sendDegraded(res, buildOfflinePack(topic, reelsCount, safeExclude));
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai",
        topic,
        category: asString(parsed.category, dailyCategory),
        reels,
        carousel: { title: hasCarousel ? asString(parsed.carousel?.title) : "", slides },
        post: postHeadline
          ? {
              headline: postHeadline,
              body: starkShortCaption(postHeadline, asString(parsed.post?.body)),
              bingPrompt: asString(parsed.post?.bingPrompt),
            }
          : { headline: "", body: "", bingPrompt: "" },
      });
    } catch (err) {
      console.warn("Błąd daily-pack:", err);
      return sendDegraded(res, buildOfflinePack(topic, reelsCount, safeExclude));
    }
  });
}
