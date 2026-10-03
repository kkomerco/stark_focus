import type { MiniApp } from "../../mini-express.server";
import { GEMINI_MODEL, generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { asString, oneOf } from "../normalize.server";
import { isPolishCopy, repeatsFrame, starkCaption, starkHashtags } from "../../caption";
import {
  auditLine,
  exemplarBlock,
  HOOK_CRAFT_PROMPT,
  HOOK_IDEAL_WORDS,
  HOOK_MAX_WORDS,
} from "../../hookCraft";
import { publishableLine } from "../../prepublish";
import { clampInt, clampText, clampTextList } from "../../limits";
import {
  hookFingerprint,
  maxSimilarity,
  openingSignature,
  repeatedOpenings,
  SIMILARITY,
} from "../../similarity";

const FORMATS = [
  "single_quote",
  "two_phases",
  "three_phases",
  "four_phrases",
  "five_phrases",
] as const;
const THEMES = ["obsidian_void", "crimson_eclipse", "carbon_aura", "silver_mist"] as const;

interface ReelBrief {
  topic: string;
  category: string;
  count: number;
  excludeHooks: string[];
  exemplarHooks: string[];
}

/** Jedna generacja zawiera redakcję; nie dokładamy drugiego płatnego wywołania. */
export function buildGhostwritePrompt(brief: ReelBrief): string {
  const openings = repeatedOpenings(brief.excludeHooks).map(({ opening }) => opening);
  return `Write an original ENGLISH reel for @stark_focus.
TOPIC (may be Polish; it is a brief, not output copy): ${brief.topic}
CATEGORY: ${brief.category}
Exactly ${brief.count} phrases. Aim for ${HOOK_IDEAL_WORDS} words per phrase; never exceed ${HOOK_MAX_WORDS}.
${HOOK_CRAFT_PROMPT}
${exemplarBlock(brief.exemplarHooks)}
ALREADY USED — do not repeat or paraphrase:
${brief.excludeHooks.slice(-60).join("\n")}
AVOID THESE REPEATED OPENINGS: ${openings.join("; ") || "none"}.

NARRATIVE:
- For one phrase: a self-contained observation with a clear consequence.
- For two phrases: one specific behavior, then its direct cost or a concrete correction.
- For three to five phrases: establish one behavior, show its cost, then build to a specific action. Each extra phrase must add information.
- Keep the same situation throughout. Do not combine unrelated slogans, invented statistics, medical diagnoses or promises of guaranteed success.
- An instruction may have two words if it is clear in the sequence; the opening must be a complete hook.

BEFORE RETURNING JSON, ACT AS A STRICT EDITOR:
- Read the phrases in order as one argument. Each must follow from the previous one and advance the same topic.
- Remove contradictions, vague pronouns with no referent, and lines that sound profound but say nothing observable.
- The final phrase must be earned by the setup, not a generic command that could finish any reel.
- If a line fails, rewrite and re-check it in this response. Return only the final version, without your critique.

CAPTIONS:
- captionShort: one or two sentences explaining a consequence or a practical detail absent from the reel.
- captionDeep: a short explanation and concrete actions that fit this particular situation. No obligatory three-step boilerplate.
- Do not repeat any on-screen phrase. Do not add CTA, handles or hashtags; the application supplies these.
- Both captions and title must be English. Do not claim psychological or scientific authority without evidence.

VISUAL NOTES (Polish, for the editor only):
- suggestedTheme: one of ${THEMES.join(", ")}. Black, white and one crimson accent only.
- suggestedBackground: an observable everyday scene suited to the topic; no statues, busts, mascots or ornamental metaphors.
- backgroundRationale: one sentence connecting that scene to the script.

Return JSON only:
{"title":"short title","phrases":[${Array.from({ length: brief.count }, (_, i) => `"phrase ${i + 1}"`).join(",")}],"captionShort":"new context","captionDeep":"new context and actions","suggestedTheme":"obsidian_void","suggestedBackground":"scene","backgroundRationale":"reason","suggestedDuration":${defaultDuration(brief.count)}}`;
}

const defaultDuration = (count: number) => [0, 6, 8, 9, 11, 14][count] ?? 9;

/** Nie skracamy ani nie sklejamy niepoprawnej sekwencji — zmieniłoby to jej sens. */
export function validateReelPhrases(
  value: unknown,
  count: number,
  history: string[],
): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length !== count ||
    value.some((line) => typeof line !== "string")
  )
    return null;
  const phrases = value.map((line: string) =>
    line.replace(/[*#]/g, "").replace(/\s+/g, " ").trim(),
  );
  const seen = new Set<string>();
  const taken = new Set(history.map(hookFingerprint));
  const staleOpenings = new Set(repeatedOpenings(history).map(({ opening }) => opening));
  for (const [index, phrase] of phrases.entries()) {
    const valid =
      index === 0
        ? publishableLine(phrase)
        : !isPolishCopy(phrase) && auditLine(phrase, HOOK_MAX_WORDS).ok;
    const fingerprint = hookFingerprint(phrase);
    if (!valid || seen.has(fingerprint) || taken.has(fingerprint)) return null;
    if (maxSimilarity(phrase, history).score >= SIMILARITY.HARD_BLOCK) return null;
    if (index === 0 && staleOpenings.has(openingSignature(phrase))) return null;
    seen.add(fingerprint);
  }
  return phrases;
}

/** Opis rozwija materiał; powtórka wraca bez body zamiast z bankiem treści. */
export function reelCaptionBody(value: unknown, phrases: string[]): string {
  const text = asString(value);
  return text && !isPolishCopy(text) && !repeatsFrame(text, phrases) ? text : "";
}

export function registerGenerateRoutes(app: MiniApp): void {
  app.post("/api/ghostwrite", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const format = oneOf(clampText(body.format, 24), FORMATS, "four_phrases");
    const count = FORMATS.indexOf(format) + 1;
    const brief: ReelBrief = {
      topic: clampText(body.topic, 300, "stoic discipline and quiet standards"),
      category: clampText(body.category, 40, "all"),
      count,
      excludeHooks: clampTextList(body.excludeHooks),
      exemplarHooks: clampTextList(body.exemplarHooks, 8, 300),
    };

    if (!getGeminiClient()) {
      return res.status(503).json({
        notice:
          "Brak klucza GEMINI_API_KEY w .env. Dodaj klucz, aby wygenerować nową rolkę. Twój materiał pozostaje w studio.",
      });
    }
    try {
      const parsed = await generateJsonWithFallback<Record<string, unknown>>({
        contents: buildGhostwritePrompt(brief),
        preferredModel: GEMINI_MODEL,
        temperature: 1,
        responseMimeType: "application/json",
      });
      const phrases = validateReelPhrases(parsed.phrases, count, brief.excludeHooks);
      if (!phrases) {
        return res.status(422).json({
          notice:
            "Odpowiedź modelu nie przeszła kontroli treści lub powtarza wcześniejszy materiał. Twój materiał pozostaje w studio. Możesz ponowić generację.",
        });
      }
      const hook = phrases[0];
      const result = {
        title: asString(parsed.title).slice(0, 60) || hook.slice(0, 60),
        phrases,
        captionShort: starkCaption(hook, reelCaptionBody(parsed.captionShort, phrases)),
        captionDeep: starkCaption(hook, reelCaptionBody(parsed.captionDeep, phrases)),
        hashtags: starkHashtags(phrases.join(" ")),
        suggestedTheme: oneOf(parsed.suggestedTheme, THEMES, "obsidian_void"),
        suggestedBackground: asString(parsed.suggestedBackground).slice(0, 120),
        backgroundRationale: asString(parsed.backgroundRationale).slice(0, 240),
        suggestedDuration: clampInt(parsed.suggestedDuration, 5, 90, defaultDuration(count)),
      };
      // Pole kompatybilności też zawiera wyłącznie znormalizowany materiał.
      return res.json({ ...result, content: JSON.stringify(result) });
    } catch {
      return res.status(503).json({
        notice:
          "Model nie zwrócił poprawnej odpowiedzi po próbach zapasowych. Twój materiał pozostaje w studio. Sprawdź dostępność i limity w Google AI Studio.",
      });
    }
  });
}
