import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { asString, asStringArray, sendDegraded } from "../normalize.server";
import { isPolishCopy, starkCaption, starkHashtags } from "../../caption";
import { HOOK_CRAFT_PROMPT, auditHook } from "../../hookCraft";
import { clampText, clampTextList } from "../../limits";
import { hookFingerprint } from "../../similarity";

export function registerGenerateRoutes(app: MiniApp): void {
  // GHOSTWRITE (STUDIO WIDEO - Powiązane logicznie narracje stoickie z zerową powtarzalnością)
  app.post("/api/ghostwrite", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    // Każdy parametr z klienta idzie przez clamp: za każdy znak w prompcie
    // płaci się z dziennej kasetki darmowego tieru.
    const topic = clampText(body.topic, 300, "stoic discipline and quiet standards");
    const category = clampText(body.category, 40, "all");
    const excludeTitles = clampTextList(body.excludeTitles);
    // Klient wysyła odciski, nie zdania — to ta sama miara po obu stronach.
    const excludeHooks = clampTextList(body.excludeHooks);
    // Odcisk to znormalizowany tekst, więc policzenie go drugi raz nic nie
    // zmienia — można zestawiać wprost z tym, co zwróci model.
    const taken = new Set(excludeHooks);

    // Import matrycy zapasowej dla 100% gwarancji niepowtarzalności nawet przy offline / limitach quota
    const { getRandomUniqueFormula } = await import("../../../data/ideaMatrix");

    const format = clampText(body.format, 24, "four_phrases");
    const targetFormat =
      format === "single_quote" ||
      format === "two_phases" ||
      format === "three_phases" ||
      format === "four_phrases"
        ? format
        : "four_phrases";

    const count =
      targetFormat === "single_quote"
        ? 1
        : targetFormat === "two_phases"
          ? 2
          : targetFormat === "three_phases"
            ? 3
            : 4;

    const ai = getGeminiClient();

    if (ai) {
      try {
        const prompt = `You are the lead viral stoic copywriter for the elite brand @stark_focus (dark stoicism, high agency, ruthless execution, zero excuses).
  Create a brand new, highly original, non-repetitive script in ENGLISH for a vertical video reel.
  TOPIC może być opisany po polsku — to tylko temat. CAŁY wynik (phrases, captionShort, captionDeep) musi być po angielsku.

  FORMAT REQUIREMENT: Exactly ${count} phrase(s) for format "${targetFormat}".
  TOPIC / ANGLE: ${topic}
  CATEGORY: ${category}
  ${
    excludeHooks.length
      ? `JUŻ OPUBLIKOWANE — nie powtarzaj tych linii ani ich mutacji:\n${excludeHooks
          .slice(0, 30)
          .map((line) => `- ${line}`)
          .join("\n")}\n`
      : ""
  }

  CRITICAL RULES FOR PHRASE LENGTH & READABILITY:
  - Every phrase MUST be ULTRA-SHORT: strictly 3 to 7 words maximum per phrase!
  - Never generate long or compound sentences. A viewer only has 2-3 seconds to read each slide.
  - Avoid all filler words. Each phrase must hit like a cold chisel: concise, sharp, high-contrast stoic axioms.

${HOOK_CRAFT_PROMPT}
  - Example good: "You bargain with your alarm." (5 words)
  - Example good: "Discipline ignores your feelings." (4 words)
  - Example good: "Rise now or stay mediocre." (5 words)
  - Example REJECTED (too long): "You constantly allow external distractions to sabotage the promises you made in private." (13 words - REJECTED).

  CRITICAL RULE FOR NARRATIVE COHERENCE:
  The ${count} phrases MUST NOT be random disconnected slogans. They MUST form one continuous, deeply linked narrative progression:
  ${
    targetFormat === "four_phrases"
      ? `- Phrase 1 (The Trap/Hook): Provocative observation exposing a weakness (3-6 words).
  - Phrase 2 (The Bitter Reality): Brutal diagnosis shattering the excuse (3-6 words).
  - Phrase 3 (The Stoic Law): Timeless principle of sovereignty and action (3-6 words).
  - Phrase 4 (The Climax Punchline): Memorable closing directive (3-6 words).`
      : targetFormat === "three_phases"
        ? `- Phrase 1 (The Hook): Jarring observation exposing weakness (3-6 words).
  - Phrase 2 (The Stoic Law): Timeless principle of action (3-6 words).
  - Phrase 3 (The Directive): Uncompromising closing command (3-6 words).`
        : targetFormat === "two_phases"
          ? `- Phrase 1 (The Illusion): The mistake 99% of people make (3-6 words).
  - Phrase 2 (The Sovereign Standard): What the disciplined 1% execute (3-6 words).`
          : `- Phrase 1: A profound, unforgettable stoic aphorism (3-6 words).`
  }

  CRITICAL RULES FOR CAPTIONS:
  - DO NOT copy or repeat the reel phrases in the captions!
  - The reel on-screen text is only the scroll-stopping hook. The caption must provide NEW, expanding context and high-value takeaways:
    - "captionShort": 1-2 sentence compelling insight explaining WHY this happens and giving an urgent directive to save and follow @stark_focus.
    - "captionDeep": A complete, viral-ready Instagram caption:
      1. Provocative opening hook question or psychological reality (do NOT repeat the video phrases).
      2. A 2-sentence psychological diagnosis of the mental trap.
      3. "3 non-negotiable protocols to apply today:" followed by 3 numbered action steps.
      4. Strong call to action ("Save this protocol for tomorrow morning. Comment if you commit to this standard. Follow @stark_focus").

  CRITICAL RULES FOR BACKGROUND & THEME RECOMMENDATION:
  - "suggestedTheme": Choose one of: "obsidian_void" (black void, discipline), "crimson_eclipse" (crimson fire/eclipse, memento mori/urgency), "emerald_abyss" (dark jade mist, monk mode/solitude), "carbon_aura" (charcoal steel, iron standards), "silver_mist" (silver night ocean, emotional sovereignty).
  - "suggestedBackground": Descriptive name of the ideal visual scene in Polish (e.g. "Posąg Marka Aureliusza w cieniu", "Mglisty las sosnowy o zmierzchu", "Obsydianowy monolit w popiele", "Zaćmienie z krwistym żarem").
  - "backgroundRationale": 1 clear sentence in Polish explaining WHY this visual background elevates this specific topic.

  Return strictly valid JSON with this exact schema:
  {
    "title": "Short Distinctive Title (2-4 words)",
    "phrases": ["phrase 1"${count > 1 ? ', "phrase 2"' : ""}${count > 2 ? ', "phrase 3"' : ""}${count > 3 ? ', "phrase 4"' : ""}],
    "captionShort": "Viral short Instagram/TikTok caption (independent insight, 1-2 sentences)",
    "captionDeep": "Deep Instagram caption with independent opening hook, 3 actionable protocols, and CTA",
    "suggestedTheme": "obsidian_void",
    "suggestedBackground": "Descriptive visual scene name",
    "backgroundRationale": "Reason why this background fits the reel",
    "suggestedDuration": ${count === 4 ? 11 : count === 3 ? 9 : count === 2 ? 8 : 7}
  }`;

        // Jedno wywołanie na kliknięcie. Wcześniejszy `catch` powtarzał ten sam
        // prompt, więc normalna, dłuższa odpowiedź była przerywana po 4,5 s i
        // płatna drugi raz — a `gemini.server.ts` ma własny budżet i backoff.
        const response = await callGeminiWithFallback(ai, {
          contents: prompt,
          config: {
            temperature: 1.0,
            responseMimeType: "application/json",
            abortSignal: AbortSignal.timeout(20000),
          },
        });

        const rawText = response.text || "";
        const parsed = safeJsonParse(rawText);
        const phrases = asStringArray(parsed?.phrases, count + 2).map((phrase) => phrase.trim());
        // Instrukcja jest po polsku, więc model potrafi odpowiedzieć po
        // polsku — a to idzie prosto na kadr. Taki wynik jest błędem, nie
        // wariantem: spadam na bank treści, który jest po angielsku.
        if (isPolishCopy(rawText)) {
          console.warn("Ghostwriter oddał materiał po polsku — używam banku treści.");
        } else if (
          phrases.length === count &&
          phrases.every((phrase) => auditHook(phrase).ok) &&
          // Anty-powtórka jest jedna: to, co już wyszło na konto, nie wraca
          // tylko dlatego, że model akurat na to trafił.
          phrases.every((phrase) => !taken.has(hookFingerprint(phrase)))
        ) {
          const fallbackThemes = [
            "obsidian_void",
            "silver_mist",
            "crimson_eclipse",
            "emerald_abyss",
            "carbon_aura",
          ];
          const randomTheme = fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
          const hook = phrases[0];
          // Bez zdania od modelu nie dokładamy mu z głowy ani tytułu, ani
          // opisu: stałe „Execute in total silence…" i „Marmurowy Posąg"
          // wracają pod każdą rolką, czyli tym, czego marka ma pełne konto.
          return res.json({
            title: asString(parsed?.title).slice(0, 60) || hook.slice(0, 60),
            phrases,
            captionShort: starkCaption(hook, asString(parsed?.captionShort)),
            captionDeep: starkCaption(hook, asString(parsed?.captionDeep)),
            // Hashtagi liczymy z fraz rolki — nigdy od modelu.
            hashtags: starkHashtags(phrases.join(" ")),
            suggestedTheme: asString(parsed?.suggestedTheme) || randomTheme,
            suggestedBackground: asString(parsed?.suggestedBackground),
            backgroundRationale:
              asString(parsed?.backgroundRationale) ||
              "Głęboka czerń i chłodny marmur skupiają wzrok widza wyłącznie na surowym tekście dyscypliny.",
            suggestedDuration:
              parsed?.suggestedDuration ||
              (count === 4 ? 11 : count === 3 ? 9 : count === 2 ? 8 : 7),
            content: JSON.stringify(parsed),
          });
        }
      } catch (err) {
        console.warn("Gemini ghostwrite error or quota exceeded, using dynamic matrix:", err);
      }
    }

    // Fallback: Niezwykle bogata Matryca Niepowtarzalnych Idei (Zero duplikatów)
    const matrixItem = getRandomUniqueFormula(targetFormat, category, excludeTitles);
    const result = {
      title: matrixItem.title,
      phrases: matrixItem.phrases,
      captionShort: matrixItem.captionShort,
      captionDeep: matrixItem.captionDeep,
      hashtags: starkHashtags(matrixItem.phrases.join(" ")),
      suggestedTheme: matrixItem.suggestedTheme,
      suggestedDuration: matrixItem.suggestedDuration,
      suggestedBackground: matrixItem.suggestedBackground,
      backgroundRationale: matrixItem.backgroundRationale,
      content: JSON.stringify({
        title: matrixItem.title,
        phrases: matrixItem.phrases,
        captionShort: matrixItem.captionShort,
        captionDeep: matrixItem.captionDeep,
        hashtags: starkHashtags(matrixItem.phrases.join(" ")),
        suggestedBackground: matrixItem.suggestedBackground,
        backgroundRationale: matrixItem.backgroundRationale,
      }),
    };

    // Bank treści musi być oznaczony: bez tego rolka z matrycy udawałaby
    // odpowiedź modelu i wchodziła do historii jako wygenerowana.
    return sendDegraded(res, result);
  });
}
