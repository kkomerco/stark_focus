import type { MiniApp } from "../../mini-express.server";
import {
  GEMINI_LITE_MODEL,
  GEMINI_MODEL,
  getGeminiClient,
  safeJsonParse,
  callGeminiWithFallback,
} from "../gemini.server";
import { formatStarkCaption, STARK_HASHTAGS } from "../../caption";
import { sendDegraded } from "../normalize.server";

export function registerGenerateRoutes(app: MiniApp): void {
  app.post("/api/ai/generate-post", async (req, res) => {
    const { topic = "", style = "Bezwzględny Stoicyzm", slideCount = 6 } = req.body || {};
    const ai = getGeminiClient();
    const dynamicSeed = Date.now() + Math.floor(Math.random() * 1000000);

    const prompt = `Jesteś elitarnym autorem tekstów dla marki @stark_focus (nowoczesny brutalny stoicyzm, mroczny minimalizm).
  Temat: "${topic}". Styl: "${style}". Liczba slajdów: ${slideCount}. Ziarno: ${dynamicSeed}.

  ZASADY:
  1. PEŁNA SWOBODA W NOWOCZESNYCH REINTERPRETACJACH: Używaj nowoczesnej psychologii uwagi, eliminacji dopaminowego szumu, samotnej pracy, bezkompromisowej dyscypliny i rygoru 1%.
  2. CAŁA TREŚĆ POSTA W 100% PO ANGIELSKU.
  3. KRYTYCZNE: Opis ("caption") MUSI mieć ŚCIŚLE STAŁY SCHEMAT:
  [HOOK W ALL CAPS]

  1. [Pierwsza brutalna zasada stoicka / analiza mechanizmu]
  2. [Druga bezwzględna zasada wykonania w ciszy]
  3. [Trzecia zasada eliminacji słabości]

  [Krótka zasada bez negocjacji]

  Save this reminder. Execute in silence. Follow @stark_focus.

  #stoicism #darkdiscipline #discipline #mindset #focus #starkfocus

  Zwróć poprawny JSON:
  {
    "post": {
      "title": "Tytuł po angielsku",
      "hook": "Potężny hook po angielsku",
      "concept": "Mechanizm po angielsku",
      "slides": [{ "slideNumber": 1, "headline": "NAGŁÓWEK PO ANGIELSKU", "bodyText": "Treść po angielsku" }],
      "caption": "Opis w ścisłym schemacie po angielsku",
      "hashtags": ["#stoicism", "#darkdiscipline", "#discipline", "#mindset", "#focus", "#starkfocus"]
    }
  }`;

    if (!ai) return res.status(503).json({ error: "Brak klucza GEMINI_API_KEY." });

    try {
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.95 },
      });
      res.json(safeJsonParse(response.text || ""));
    } catch (err: any) {
      console.warn("Gemini API generate-post fallback:", err?.message || err);
      const fallbackHook = (topic || "NOBODY CARES ABOUT YOUR EXCUSES.").toUpperCase();
      res.json({
        post: {
          title: topic || "THE SILENT DISCIPLINE",
          hook: fallbackHook,
          concept: "Dark Stoic Protocol",
          slides: [
            {
              slideNumber: 1,
              headline: "RULE 1",
              bodyText: "Execute in silence. Never announce what you are going to do.",
            },
            {
              slideNumber: 2,
              headline: "RULE 2",
              bodyText: "Comfort is a slow poison disguised as safety.",
            },
            {
              slideNumber: 3,
              headline: "RULE 3",
              bodyText: "Suffering with purpose creates unbreakable character.",
            },
            {
              slideNumber: 4,
              headline: "RULE 4",
              bodyText: "Kill the urge to be understood by ordinary minds.",
            },
            {
              slideNumber: 5,
              headline: "RULE 5",
              bodyText: "The standards you enforce when alone define your destiny.",
            },
            {
              slideNumber: 6,
              headline: "VERDICT",
              bodyText: "Never negotiate with your weakness. Stay ruthless.",
            },
          ],
          caption: formatStarkCaption(
            fallbackHook,
            [
              "Comfort is a slow poison that amputates your future sovereignty.",
              "Private victories build permanent foundations; public applause is ephemeral.",
              "When you master your attention in solitude, you become completely untouchable.",
            ],
            "Never negotiate with your weakness. Standards over emotions.",
          ),
          hashtags: [...STARK_HASHTAGS],
        },
      });
    }
  });
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
  app.post("/api/ai/generate-single-slide", async (req, res) => {
    const {
      topic = "",
      slideIndex = 0,
      totalSlides = 5,
      existingHeadline = "",
      existingBody = "",
      slideType = "principle", // "hook" | "principle" | "cta"
    } = req.body || {};

    const cleanTopic = String(topic).trim() || "Stoic Discipline & Ruthless Focus";
    const ai = getGeminiClient();

    const isHook = slideIndex === 0 || slideType === "hook";
    const isCta = slideIndex === totalSlides - 1 || slideType === "cta";

    const fallbackData = isHook
      ? {
          headline: "THE SILENT CONTRACT",
          bodyText:
            "You don't lack motivation. You lack non-negotiable standards that you honor in silence.",
          highlightWords: "standards, silence, honor",
        }
      : isCta
        ? {
            headline: "THE UNFORGIVING TRUTH",
            bodyText:
              "Save this reminder. Never negotiate with your morning feelings. Execute in the dark.",
            highlightWords: "reminder, feelings, execute",
          }
        : {
            headline: "KILL THE NEGOTIATION",
            bodyText:
              "Every compromise in private whispers to your subconscious that your word is worth nothing.",
            highlightWords: "compromise, subconscious, nothing",
          };

    if (!ai) {
      return sendDegraded(res, { slide: fallbackData });
    }

    try {
      const rolePrompt = isHook
        ? `Stwórz magnetyczny, brutalny slajd 1 (HOOK / PATTERN INTERRUPT) dla karuzeli na temat: "${cleanTopic}".
  Nagłówek (headline) musi mieć 2-4 słowa ALL CAPS uderzające w dumę lub koszt ulegania słabości.
  Treść (bodyText) to 1-2 rytmiczne, uderzające zdania po angielsku (maks. 18-24 słowa).`
        : isCta
          ? `Stwórz mocny finałowy slajd (PODSUMOWANIE + CTA) dla karuzeli na temat: "${cleanTopic}".
  Nagłówek (headline) ma 2-4 słowa ALL CAPS.
  Treść (bodyText) to bezwzględna prawda + wezwanie do zapisu posta ("Save this reminder..."). Maks. 18-24 słowa po angielsku.`
          : `Stwórz konkretną, bezkompromisową zasadę stoicką (slajd #${slideIndex + 1} z ${totalSlides}) dla karuzeli na temat: "${cleanTopic}".
  ${existingHeadline ? `Dotychczasowy kontekst/nagłówek: "${existingHeadline}".` : ""}
  Nagłówek (headline) to 2-4 słowa ALL CAPS.
  Treść (bodyText) to 1-2 zwięzłe zdania po angielsku (maks. 16-22 słowa).`;

      const prompt = `Jesteś autorem viralowych, mrocznych stoickich karuzeli dla konta @stark_focus.
  ${rolePrompt}
  Wszystko w 100% po angielsku (STRICTLY ENGLISH).

  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "headline": "NAGŁÓWEK 2-4 SŁOWA ALL CAPS",
    "bodyText": "1-2 zwięzłe zdania po angielsku",
    "highlightWords": "2-3 najważniejsze słowa rozdzielone przecinkiem"
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.88 },
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.headline && parsed?.bodyText) {
        return res.json({
          slide: {
            headline: parsed.headline.toUpperCase(),
            bodyText: parsed.bodyText,
            highlightWords: parsed.highlightWords || "",
          },
        });
      }

      return sendDegraded(res, { slide: fallbackData });
    } catch (err: any) {
      console.warn("Błąd generowania pojedynczego slajdu:", err?.message || err);
      return sendDegraded(res, { slide: fallbackData });
    }
  });
  app.post("/api/ai/generate-scheme-post", async (req, res) => {
    res.json({
      hook: "STAY RUTHLESS WITH YOUR STANDARDS.",
      highlightWords: ["RUTHLESS", "STANDARDS"],
      punchline: "NEVER NEGOTIATE WITH WEAKNESS.",
      caption: formatStarkCaption("Stay ruthless with your standards.", [
        "Never negotiate with your weakness.",
        "Hold the line when it stops being fun.",
        "Silence is the only press release you need.",
      ]),
    });
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
      4. Strong call to action ("Save this protocol for tomorrow morning. Drop a ⚔️ if you commit to this standard. Follow @stark_focus").

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
