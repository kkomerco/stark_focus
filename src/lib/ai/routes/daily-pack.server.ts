import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { hookFingerprint } from "../../similarity";
import { pickForDay } from "../../random";
import { clampInt, clampText, clampTextList } from "../../limits";
import { CAROUSEL_MAX_SLIDES, CAROUSEL_TARGET_SLIDES } from "../../carousel";
import {
  HOOK_CRAFT_PROMPT,
  HOOK_IDEAL_WORDS,
  HOOK_MAX_WORDS,
  exemplarBlock,
  auditLine,
} from "../../hookCraft";
import {
  asArray,
  asString,
  asStringArray,
  degradedReason,
  oneOf,
  sendDegraded,
} from "../normalize.server";
import { publishableLine } from "../../prepublish";
import { isPolishCopy, starkCaption, starkHashtags, starkShortCaption } from "../../caption";
import { reelCaptionBody, validateReelPhrases } from "./generate.server";

const REEL_THEMES = ["obsidian_void", "crimson_eclipse", "carbon_aura", "silver_mist"] as const;

/** Sufit dla starszych klientów API; studio prosi o jedną rolkę w jednym wywołaniu. */
const MAX_PACK_REELS = 6;

/**
 * KONTRAKT PACZKI — liczba slajdów NIE mieszka tu: czytamy ją z
 * `src/lib/carousel.ts`, żeby paczka dnia, recykler i studio nie miały trzech
 * różnych odpowiedzi na to samo pytanie. Zostają własne miary paczki: czas
 * rolki, którego studio i tak przyciąga do swoich kroków.
 */
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
/** `index` wchodzi z `map()` jako sol wezwania — patrz `starkCta`. */
export function normalizePackReel(
  item: unknown,
  index = 0,
  usedCtas?: Set<string>,
  history: string[] = [],
) {
  const reel = (item ?? {}) as Record<string, unknown>;
  const rawPhrases = asStringArray(reel.phrases, 5);
  const phrases = validateReelPhrases(rawPhrases, rawPhrases.length, history);
  if (!phrases?.length) return null;
  const rawHook = asString(reel.hook);
  // Pierwsza fraza jest tezą rolki. Oddzielne pole nie może zmienić jej w studiu.
  const hook = phrases[0];
  if (rawHook && hookFingerprint(rawHook) !== hookFingerprint(hook)) return null;

  return {
    hook,
    phrases,
    theme: oneOf(reel.theme, REEL_THEMES, "obsidian_void"),
    duration: clampInt(reel.duration, REEL_DURATION_MIN, REEL_DURATION_MAX, 8),
    captionShort: starkCaption(hook, reelCaptionBody(reel.captionShort, phrases), index, usedCtas),
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

/** Nie podstawiamy materiału z banku pod temat właściciela konta. */
function unavailablePack(topic: string) {
  return {
    generatedAt: new Date().toISOString(),
    source: "offline",
    topic,
    reels: [],
    carousel: { title: "", slides: [] },
    post: { headline: "", body: "", bingPrompt: "" },
  };
}

/** Cały wywód przechodzi kontrolę: usunięcie środkowego slajdu zmieniłoby argument. */
export function normalizePackCarousel(value: unknown, history: string[] = []) {
  const source = (value ?? {}) as Record<string, unknown>;
  const slides = asArray(source.slides)
    .slice(0, CAROUSEL_MAX_SLIDES)
    .map((item) => {
      const slide = (item ?? {}) as Record<string, unknown>;
      return { headline: asString(slide.headline), bodyText: asString(slide.bodyText) };
    });
  if (
    !slides.length ||
    !publishableLine(slides[0].headline) ||
    history.some((line) => hookFingerprint(line) === hookFingerprint(slides[0].headline))
  )
    return { title: "", slides: [] };
  const seen = new Set<string>();
  for (const slide of slides) {
    const id = hookFingerprint(slide.headline);
    if (
      isPolishCopy(slide.headline) ||
      !auditLine(slide.headline).ok ||
      seen.has(id) ||
      (slide.bodyText && (isPolishCopy(slide.bodyText) || !auditLine(slide.bodyText, 32).ok))
    )
      return { title: "", slides: [] };
    seen.add(id);
  }
  return { title: asString(source.title), slides };
}

export function registerDailyPackRoutes(app: MiniApp): void {
  app.post("/api/ai/daily-pack", async (req, res) => {
    const topic = clampText(
      req.body?.topic,
      300,
      "dark motivation, brutal discipline, hard work and mental toughness",
    );
    const reelsCount = clampInt(req.body?.reelsCount, 1, MAX_PACK_REELS, 1);
    // Lista od klienta wchodzi w prompt, więc każdy wiersz jest przycinany
    // osobno: bez tego jedno `excludeHooks: ["a".repeat(1e6)]` płaci za siebie
    // przy każdym wywołaniu w łańcuchu fallbacku modeli.
    const safeExclude = clampTextList(req.body?.excludeHooks);
    const exemplars = clampTextList(req.body?.exemplars).slice(0, 8);

    if (!getGeminiClient()) {
      return sendDegraded(
        res.status(503),
        unavailablePack(topic),
        "Brak GEMINI_API_KEY. Dodaj klucz darmowej warstwy lub pracuj ręcznie w studiu.",
      );
    }

    try {
      const dailyCategory = clampText(req.body?.topic, 300) || pickDailyCategory();
      const prompt = `Jesteś strategiem treści dla marki @stark_focus (dark motivation, brutalna dyscyplina, hard work ethos, treści 100% po angielsku).
Dla tematu: "${topic}" i kategorii dnia: "${dailyCategory}" wygeneruj JEDNĄ spójną "paczkę dnia" do publikacji.

WYMAGANIA TREŚCI:
- Ton: bezwzględny, konkretny, zero "inspiration porn"
- Oryginalny głos marki: bez podszywania się pod cudzy styl; jedna obserwowalna sytuacja i jej konsekwencje
- Każdy hook nazywa zachowanie lub koszt. Nie obiecuj zasięgu ani retencji.
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
   - theme: jeden z: "obsidian_void" | "crimson_eclipse" | "carbon_aura" | "silver_mist"
   - duration: liczba sekund ${REEL_DURATION_MIN}-${REEL_DURATION_MAX}
   - captionShort: jedno-dwa zdania po angielsku rozwijające hook. BEZ wezwania do działania i BEZ hashtagów — ogon z puli marki dokłada \`caption.ts\`, a dwa ogony pod jednym postem wyglądają jak dwóch autorów.
2. Karuzela 4:5: title + ${CAROUSEL_TARGET_SLIDES} slajdów {headline, bodyText}.
   ROZKŁAD: slajd 1 to teza, nie tytuł; slajdy 2-${CAROUSEL_TARGET_SLIDES - 2} ROZWIJAJĄ TĘ SAMĄ tezę o jeden krok każdy — to jest jeden wywód, nie zbiór aforyzmów; slajd ${CAROUSEL_TARGET_SLIDES - 1} konkretna cena za brak zmiany; slajd ${CAROUSEL_TARGET_SLIDES} jedno zdanie do zapisania.
   UNIKAJ TEGO BŁĘDU: każdy slajd o nowym przedmiocie. „Zmywasz blat dwa razy", „krzesło stoi pięćdziesiąt centymetrów od kaloryfera", „siedem nieprzeczytanych maili" — to jest lista rekwizytów, nie argument. Konkret z „ZASADY RZEMIOSLA" ma SŁUŻYĆ tezie, a nie ją zastępować; jeśli slajd da się przenieść do karuzeli o innym temacie i nic się nie zmienia, slajd jest zły — przepisz go tak, żeby bez tematu z slajdu 1 nie dało się go zrozumieć.
   bodyText: 1-2 zdania po angielsku (18-30 słów). Trzecie zdanie na slajdzie to już nie swipe, tylko ściana tekstu.
3. Grafika 1:1: {headline, body}. \`headline\` to jedno zdanie na czarnym kadrze (4-10 słów, PO ANGIELSKU), a \`body\` to JEDNO zdanie po angielsku (max 22 słowa), które dopowiada to, czego nie widać na kadrze. Pod cytatem na czerni nie ma wykładu na pięć linijek — nikt go nie czyta, a kadr zostaje tym samym zdaniem.

Zwróć WYŁĄCZNIE poprawny JSON wg schematu:
{
  "category": "${dailyCategory}",
  "reels": [
    {
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "theme": "obsidian_void",
      "duration": 8,
      "captionShort": "string"
    }
  ],
  "carousel": {
    "title": "string",
    "slides": [{ "headline": "string", "bodyText": "string" }]
  },
  "post": {
    "headline": "string",
    "body": "string"
  }
}`;

      const parsed = await generateJsonWithFallback<any>({
        contents: prompt,
        temperature: 0.9,
        preferredModel: GEMINI_MODEL,
      });

      // Jedna paczka dnia = jeden zestaw użytych wezwań, więc deklaracja
      // wyprzedza pierwsze zdanie, które może je zabrać.
      const usedCtas = new Set<string>();
      const history = [...safeExclude];
      const reels = asArray(parsed.reels)
        .slice(0, reelsCount)
        .flatMap((item, index) => {
          const reel = normalizePackReel(item, index, usedCtas, history);
          if (!reel) return [];
          history.push(...reel.phrases);
          return [reel];
        });
      const carousel = normalizePackCarousel(parsed.carousel, safeExclude);
      const slides = carousel.slides;
      const rawPostHeadline = asString(parsed.post?.headline);
      const postHeadline =
        publishableLine(rawPostHeadline) &&
        !safeExclude.some((line) => hookFingerprint(line) === hookFingerprint(rawPostHeadline))
          ? rawPostHeadline
          : "";

      // Zapytanie już zostało zapłacone, więc jedno puste pole nie może kasować
      // całej paczki: oddajemy to, co przyszło dobre, a brak nazywa UI (pola
      // wracają puste). Jeśli nie ma dobrego materiału, zwracamy komunikat bez banku treści.
      const hasReels = reels.length > 0;
      const hasCarousel = slides.length > 0;
      if (!hasReels && !hasCarousel && !postHeadline) {
        return sendDegraded(
          res.status(422),
          unavailablePack(topic),
          "Materiał nie przeszedł kontroli jakości. Nie wstawiamy zastępczej paczki z banku.",
        );
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        source: "ai",
        topic,
        category: asString(parsed.category, dailyCategory),
        reels,
        carousel,
        notice:
          !hasReels || !hasCarousel || !postHeadline
            ? "Nie wszystkie części przeszły kontrolę jakości. Zachowano poprawny materiał; brakujące formaty przygotuj w studiu."
            : "",
        post: postHeadline
          ? {
              headline: postHeadline,
              body: starkShortCaption(
                postHeadline,
                reelCaptionBody(parsed.post?.body, [postHeadline]),
                0,
                usedCtas,
              ),
              bingPrompt: "",
            }
          : { headline: "", body: "", bingPrompt: "" },
      });
    } catch (err) {
      console.warn("Błąd daily-pack:", err);
      // Powód awarii w `notice`; klient zachowuje poprzednią paczkę.
      return sendDegraded(res.status(503), unavailablePack(topic), degradedReason(err));
    }
  });
}
