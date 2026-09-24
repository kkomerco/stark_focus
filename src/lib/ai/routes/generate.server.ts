import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { formatStarkCaption, STARK_HASHTAGS } from "../../caption";

export function registerGenerateRoutes(app: MiniApp): void {
  app.post("/api/ai/generate-background-prompt", async (req, res) => {
    const { topic = "", format = "9:16" } = req.body || {};
    const ai = getGeminiClient();
    const clean = String(topic).trim();

    const buildEnigmaticPrompt = (theme: string) => {
      const t = theme.toLowerCase();
      if (t.includes("ruthless") || t.includes("bezwzględ") || t.includes("siła")) {
        return "Ultra-minimalist dark composition, a solitary shadowy figure standing motionless at the edge of an abyss, cold sharp directional rim lighting, deep charcoal void, eerie silent atmosphere, mysterious cinematic chiaroscuro, 8k vertical composition, strictly no text, no words, no letters, no watermark";
      }
      if (t.includes("1%") || t.includes("elita") || t.includes("szczyt")) {
        return "Abstract minimalist dark architecture, a singular razor-thin beam of pure cold light cutting through total blackness, matte carbon textures, stark geometry, haunting atmospheric fog, mysterious liminal perspective, 8k vertical, strictly no text, no watermark";
      }
      if (
        t.includes("mgła") ||
        t.includes("pustka") ||
        t.includes("cisza") ||
        t.includes("solitude")
      ) {
        return "Minimalist enigmatic horizon veiled in thick cold mist, pitch black negative space, faint distant light gradient, haunting cinematic atmosphere, 35mm film grain, moody shadows, strictly no text, no watermark";
      }
      return `Abstract minimalist enigmatic void inspired by ${theme}, razor-thin sliver of cold diffuse light cutting through pure pitch black darkness, moody deep chiaroscuro, matte obsidian textures, atmospheric volumetric smoke, ultra clean negative space, 8k vertical ${format}, strictly no text, no typography, no letters, no watermark`;
    };

    if (!ai || !clean) {
      return res.json({
        prompt: clean
          ? buildEnigmaticPrompt(clean)
          : "Ultra-minimalist pitch black void, razor-thin sharp ray of cold directional light cutting through dense cinematic fog, dark matte slate textures, haunting atmospheric mood, mysterious solitude, 8k vertical composition, strictly no text, no words, no letters, no watermark",
        mood: "Zagadkowy, minimalistyczny chiaroscuro",
      });
    }

    try {
      const prompt = `Jesteś elitarnym dyrektorem artystycznym dla marki @stark_focus (mroczny, surowy stoicyzm, brutalistyczny minimalizm, tajemnica, chiaroscuro).
  Użytkownik wpisał hasło/slogan/koncept: "${clean}".

  TWOJE ZADANIE:
  Przekształć to hasło w ZAGADKOWE, MINIMALISTYCZNE, MROCZNE tło fotograficzne lub architektoniczne pod generator obrazów AI (Bing Image Creator / DALL-E 3).

  KRYTYCZNE ZASADY:
  1. Absolutnie ŻADNYCH napisów, liter, typografii, słów, cytatów ani znaków wodnych na grafice (STRICTLY NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO WATERMARKS).
  2. Tło ma być ZAGADKOWE i MINIMALISTYCZNE: np. pusta mroczna przestrzeń, pojedyncza smuga chłodnego światła w otchłani, abstrakcyjna geometria cienia, brutalistyczna szczelina światła, samotna niewyraźna sylwetka tonąca w gęstej mgle, chłodny grafit, matowy obsydian, surowy węgiel.
  3. Unikaj powtarzalnych banałów typu 'bazaltowy monolit' - skup się na zagadkowym nastroju, przestrzeni negatywnej pod napisy i kinowym świetle.
  4. Kompozycja: pionowa ${format}.

  Zwróć poprawny JSON:
  {
    "prompt": "Pełny angielski prompt gotowy do wklejenia w Bing Image Creator...",
    "mood": "Krótkie określenie nastroju po polsku (np. 'Zagadkowa szczelina światła w próżni')"
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.8 },
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.prompt) {
        return res.json(parsed);
      }
      return res.json({
        prompt: buildEnigmaticPrompt(clean),
        mood: "Mroczny, enigmatyczny minimalizm stoicki",
      });
    } catch {
      return res.json({
        prompt: buildEnigmaticPrompt(clean),
        mood: "Mroczny, enigmatyczny minimalizm stoicki",
      });
    }
  });
  // GHOSTWRITE (STUDIO WIDEO - Powiązane logicznie narracje stoickie z zerową powtarzalnością)
  app.post("/api/ghostwrite", async (req, res) => {
    const {
      topic = "Ruthless stoic discipline, solitude, high-leverage focus, modern dark philosophy",
      format = "four_phrases",
      category = "all",
      excludeTitles = [],
    } = req.body || {};

    // Import matrycy zapasowej dla 100% gwarancji niepowtarzalności nawet przy offline / limitach quota
    const { getRandomUniqueFormula } = await import("../../../data/ideaMatrix");

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

  FORMAT REQUIREMENT: Exactly ${count} phrase(s) for format "${targetFormat}".
  TOPIC / ANGLE: ${topic}
  CATEGORY: ${category}

  CRITICAL RULES FOR PHRASE LENGTH & READABILITY:
  - Every phrase MUST be ULTRA-SHORT: strictly 3 to 7 words maximum per phrase!
  - Never generate long or compound sentences. A viewer only has 2-3 seconds to read each slide.
  - Avoid all filler words. Each phrase must hit like a cold chisel: concise, sharp, high-contrast stoic axioms.
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
    "hashtags": ["#stoicism", "#discipline", "#focus", "#mindset", "#starkfocus"],
    "suggestedTheme": "obsidian_void",
    "suggestedBackground": "Descriptive visual scene name",
    "backgroundRationale": "Reason why this background fits the reel",
    "suggestedDuration": ${count === 4 ? 11 : count === 3 ? 9 : count === 2 ? 8 : 7}
  }`;

        let response;
        try {
          response = await callGeminiWithFallback(ai, {
            contents: prompt,
            config: {
              temperature: 1.0,
              responseMimeType: "application/json",
              abortSignal: AbortSignal.timeout(4500),
            },
          });
        } catch {
          response = await callGeminiWithFallback(ai, {
            contents: prompt,
            config: {
              temperature: 1.0,
              responseMimeType: "application/json",
              abortSignal: AbortSignal.timeout(4500),
            },
          });
        }

        const rawText = response.text || "";
        const parsed = safeJsonParse(rawText);

        if (parsed && Array.isArray(parsed.phrases) && parsed.phrases.length === count) {
          const fallbackThemes = [
            "obsidian_void",
            "silver_mist",
            "crimson_eclipse",
            "emerald_abyss",
            "carbon_aura",
          ];
          const randomTheme = fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
          return res.json({
            title: parsed.title || "Stoic Sovereign Protocol",
            phrases: parsed.phrases,
            captionShort: parsed.captionShort || "Execute in total silence. Save this reminder.",
            captionDeep:
              parsed.captionDeep ||
              formatStarkCaption("Most men lose self-respect in small private compromises.", [
                "Move without hesitation.",
                "Do the hardest task first.",
                "Hold your standard in secret.",
              ]),
            hashtags:
              Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
                ? parsed.hashtags
                : [...STARK_HASHTAGS],
            suggestedTheme: parsed.suggestedTheme || randomTheme,
            suggestedBackground: parsed.suggestedBackground || "Marmurowy Posąg Stoika w Cieniu",
            backgroundRationale:
              parsed.backgroundRationale ||
              "Głęboka czerń i chłodny marmur skupiają wzrok widza wyłącznie na surowym tekście dyscypliny.",
            suggestedDuration:
              parsed.suggestedDuration ||
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
      hashtags: matrixItem.hashtags,
      suggestedTheme: matrixItem.suggestedTheme,
      suggestedDuration: matrixItem.suggestedDuration,
      suggestedBackground: matrixItem.suggestedBackground,
      backgroundRationale: matrixItem.backgroundRationale,
      content: JSON.stringify({
        title: matrixItem.title,
        phrases: matrixItem.phrases,
        captionShort: matrixItem.captionShort,
        captionDeep: matrixItem.captionDeep,
        hashtags: matrixItem.hashtags,
        suggestedBackground: matrixItem.suggestedBackground,
        backgroundRationale: matrixItem.backgroundRationale,
      }),
    };

    return res.json(result);
  });
}
