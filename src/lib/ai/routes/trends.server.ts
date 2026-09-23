import type { MiniApp } from "../../mini-express.server";
import { getGeminiClient, safeJsonParse, callGeminiWithFallback } from "../gemini.server";
import { asArray, asString, asStringArray, sendDegraded } from "../normalize.server";
import { clampText } from "../../limits";
import { formatStarkCaption, STARK_CTA, STARK_HASHTAGS } from "../../caption";

/**
 * UI woła `fmt.phrases.map()` i `ang.phrases.join()` bez sprawdzania pola, a
 * w aplikacji nie ma granicy błędu na dane — więc każda karta odchodzi stąd
 * z tablicą frazami i hashtagami, nawet gdy model jej nie zwrócił.
 */
function normalizeCard(card: unknown) {
  const item = (card ?? {}) as Record<string, unknown>;
  const phrases = asStringArray(item.phrases, 8);
  const hook = asString(item.hook);

  return {
    ...item,
    phrases: phrases.length > 0 ? phrases : hook ? [hook] : [],
    hashtags: asStringArray(item.hashtags, 12),
  };
}

export function registerTrendsRoutes(app: MiniApp): void {
  app.post("/api/ai/scan-trends", async (req, res) => {
    const niche = clampText(req.body?.niche, 200, "stoicism and dark discipline");
    const platform = clampText(req.body?.platform, 100, "Instagram / TikTok");
    const ai = getGeminiClient();

    const fallbackTrends = [
      {
        id: "trend-" + Date.now() + "-1",
        title: "The Cost of Comfort",
        suggested_format: "🎬 Rolka 7-Sekundowa (Short Reel)",
        estimated_virality: "97%",
        source_context: "TikTok Viral Sound FYP",
        audience_pain: "Poczucie marnowania potencjału i ucieczka w scrollowanie",
        viral_hooks: [
          "Comfort is a cage disguised as peace.",
          "Every minute of comfort costs you 10 hours of future freedom.",
          "You are not tired. You are uninspired and over-stimulated.",
        ],
        core_message:
          "Wygoda osłabia wolę walki. Prawdziwy spokój rodzi się z rygoru, a nie z ucieczki.",
        bingPrompt:
          "Cinematic dark brutalist concrete monolith, mist, moody directional light, 9:16 vertical, ultra sharp 8k",
        copy_draft: {
          hook: "Comfort is a cage disguised as peace.",
          supportingText: "Stop negotiating with your weakness.",
          caption: formatStarkCaption("Comfort is a cage disguised as peace.", [
            "Every time you choose comfort, you trade your future for cheap dopamine.",
            "Peace is earned in private, not purchased in public.",
            "Hold the standard when nobody is watching.",
          ]),
          hashtags: [...STARK_HASHTAGS],
        },
      },
      {
        id: "trend-" + Date.now() + "-2",
        title: "Execute In Total Silence",
        suggested_format: "3D Wall Letters / Brutalist Quote",
        estimated_virality: "94%",
        source_context: "IG Reels Dark Aesthetic",
        audience_pain: "Mówienie o swoich planach zamiast ich bezwzględnej realizacji",
        viral_hooks: [
          "Never announce your moves to spectators.",
          "Silence protects your energy. Results speak louder.",
          "If they know what you are doing, you talk too much.",
        ],
        core_message: "Zachowaj plany w tajemnicy dopóki nie staną się rzeczywistością.",
        bingPrompt:
          "Minimalist studio wall with physical black matte 3d lettering, warm overhead lamp spotlight, grey concrete, 9:16",
        copy_draft: {
          hook: "Never announce your moves to spectators.",
          supportingText: "Results are the only language that matters.",
          caption: formatStarkCaption("Never announce your moves to spectators.", [
            "Private victories build permanent foundations.",
            "Public applause is ephemeral.",
            "Let the results do the talking.",
          ]),
          hashtags: [...STARK_HASHTAGS],
        },
      },
      {
        id: "trend-" + Date.now() + "-3",
        title: "The Solitude Protocol",
        suggested_format: "🎠 Karuzela 5-Slajdowa (IG Slides)",
        estimated_virality: "95%",
        source_context: "Twitter/X Viral Thread & IG Carousel",
        audience_pain: "Lęk przed samotnością i uleganie presji otoczenia",
        viral_hooks: [
          "Learn to sit alone in a room without checking your phone.",
          "The strongest weapon in modern world is immunity to distraction.",
          "Solitude is where kings are forged; crowds are where they conform.",
        ],
        core_message:
          "Zdolność do przebywania w samotności i skupienia to najrzadsza waluta XXI wieku.",
        bingPrompt:
          "Dark aesthetic architectural room, single beam of sunlight, solitary silhouette, 35mm film grain, 9:16",
        copy_draft: {
          hook: "Learn to sit alone in a room without checking your phone.",
          supportingText: "Master solitude before you seek mastery over anything else.",
          caption: formatStarkCaption("Learn to sit alone in a room without checking your phone.", [
            "When you master your attention, you master your life.",
            "Solitude is where standards are tested.",
            "Noise is the anesthetic you keep reaching for.",
          ]),
          hashtags: [...STARK_HASHTAGS],
        },
      },
    ];

    if (!ai) {
      return sendDegraded(res, {
        trends: fallbackTrends,
        message: "Wygenerowano sprofilowane wątki wirusowe z bazy algorytmicznej.",
      });
    }

    try {
      const prompt = `Jesteś analitykiem wirusowości dla konta @stark_focus (brutalny stoicyzm, mroczny minimalizm).
  Nisza: "${niche}". Platforma: "${platform}".
  Wyszukaj lub zsyntetyzuj 3 najgorętsze trendy i wątki wirusowe z ich hookami 0-3s.
  Zwróć poprawny JSON:
  {
    "trends": [
      {
        "id": "trend-1",
        "title": "Tytuł trendu po angielsku",
        "suggested_format": "🎬 Rolka 7-Sekundowa" | "3D Wall Letters" | "🎠 Karuzela 5-Slajdowa",
        "estimated_virality": "96%",
        "source_context": "TikTok FYP Viral",
        "audience_pain": "Dokładna frustracja widza po polsku",
        "viral_hooks": ["Hook 1 (EN)", "Hook 2 (EN)", "Hook 3 (EN)"],
        "core_message": "Główne przesłanie po polsku",
        "bingPrompt": "Prompt pod Bing Image Creator 9:16 po angielsku",
        "copy_draft": {
          "hook": "Hook (EN)",
          "supportingText": "Podtytuł (EN)",
          "caption": "Pełny opis pod post z hashtagami (EN)",
          "hashtags": ["#stoicism", "#discipline", "#focus"]
        }
      }
    ]
  }`;
      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.9 },
      });
      const parsed = safeJsonParse(response.text || "");
      const trends = asArray(parsed.trends).map((trend, idx) => ({
        ...normalizeCard(trend),
        // `trend.id` jest kluczem Reacta — bez niego lista dostaje duplikaty kluczy.
        id: asString((trend as Record<string, unknown>).id, `trend-${Date.now()}-${idx}`),
        viral_hooks: asStringArray((trend as Record<string, unknown>).viral_hooks, 6),
      }));
      if (trends.length > 0) {
        return res.json({
          trends,
          message: "✓ Wykryto świeże trendy algorytmiczne.",
        });
      }
      return sendDegraded(res, {
        trends: fallbackTrends,
        message: "Wygenerowano sprofilowane wątki wirusowe.",
      });
    } catch (err: any) {
      console.warn("Skaner trendów - użyto bezpiecznego generatora:", err?.message || err);
      return sendDegraded(res, {
        trends: fallbackTrends,
        message: "Aktywowano zoptymalizowany zestaw trendów wirusowych.",
      });
    }
  });
  app.post("/api/ai/viral-format-radar", async (req, res) => {
    const { niche = "stoic discipline and ruthless focus" } = req.body || {};
    const ai = getGeminiClient();

    const fallbackFormats = [
      {
        formatKey: "harsh_truth",
        formatName: "The Harsh Truth Formula",
        hook: "The harsh truth about why you're still undisciplined.",
        phrases: [
          "The harsh truth about why you're still undisciplined.",
          "You wait for emotion before you take action.",
          "The stoic executes regardless of mood.",
        ],
        suggestedTheme: "obsidian_void",
        rationale:
          "Wywołuje natychmiastowe zatrzymanie uwagi przez uderzenie w dumę i bezpośrednią konfrontację.",
      },
      {
        formatKey: "why_99_fail",
        formatName: "The 99% Failure Asymmetry",
        hook: "Why 99% fail to maintain monk mode.",
        phrases: [
          "Why 99% fail to maintain monk mode.",
          "They announce their plans before the habit is forged.",
          "Silence is the fuel of genuine transformation.",
        ],
        suggestedTheme: "carbon_aura",
        rationale:
          "Segmentuje widza ponad przeciętną większość i wzbudza potrzebę udowodnienia swojej odporności.",
      },
      {
        formatKey: "delusion_trap",
        formatName: "The Comfortable Delusion",
        hook: "The 4:00 AM delusion that keeps you average.",
        phrases: [
          "The 4:00 AM delusion that keeps you average.",
          "Waking up early is useless if your mind remains distracted.",
          "Focus on depth, not the clock.",
        ],
        suggestedTheme: "silver_mist",
        rationale: "Burzy powszechny mit samorozwojowy i dostarcza głębszego aksjomatu stoickiego.",
      },
      {
        formatKey: "silent_killers",
        formatName: "The Silent Saboteur",
        hook: "3 silent killers of your dopamine baseline.",
        phrases: [
          "3 silent killers of your dopamine baseline.",
          "Morning scrolling. Unearned praise. Constant notifications.",
          "Starve the cheap inputs. Reclaim the citadel.",
        ],
        suggestedTheme: "emerald_abyss",
        rationale:
          "Opiera się o neurobiologię i strach przed cichą utratą kontroli nad własnym potencjałem.",
      },
    ];

    if (!ai) {
      return sendDegraded(res, { formats: fallbackFormats });
    }

    try {
      const prompt = `Jesteś ekspertem wirusowych struktur psychologicznych krótkich form wideo dla konta @stark_focus.
  Wygeneruj 4 potężne, niepowtarzalne formaty wiralowe dopasowane do tematu: "${niche}".
  Każdy format musi mieć:
  - formatKey: krótki identyfikator
  - formatName: nazwa psychologicznego wzorca (np. "The Harsh Truth", "The 99% Failure Paradox", "The Dopamine Saboteur", "The Silent Cost")
  - hook: bezwzględny hook 0-3s po angielsku ALL CAPS lub Sentence Case
  - phrases: dokładnie 3 fazy [Hook, Bolesny Kontrast, Puenta Climax]
  - suggestedTheme: jeden z: "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist"
  - rationale: 1 zdanie wyjaśniające psychologię retencji widza

  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "formats": [
      {
        "formatKey": "string",
        "formatName": "string",
        "hook": "string",
        "phrases": ["string", "string", "string"],
        "suggestedTheme": "obsidian_void",
        "rationale": "string"
      }
    ]
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.85 },
      });

      const parsed = safeJsonParse(response.text || "");
      const formats = asArray(parsed.formats)
        .map(normalizeCard)
        .filter((format) => format.phrases.length > 0);
      if (formats.length > 0) {
        return res.json({ formats });
      }
      return sendDegraded(res, { formats: fallbackFormats });
    } catch (err) {
      console.warn("Błąd viral-format-radar:", err);
      return sendDegraded(res, { formats: fallbackFormats });
    }
  });
  app.post("/api/ai/angle-matrix", async (req, res) => {
    const { topic = "Dyscyplina i walka z prokrastynacją" } = req.body || {};
    const ai = getGeminiClient();

    const fallbackAngles = [
      {
        angleId: "controversial",
        angleName: "⚡ Prowokacja & Kontrowersja",
        hook: "Motivation is an excuse invented by the weak.",
        phrases: [
          "Motivation is an excuse invented by the weak.",
          "Waiting to 'feel ready' is comfortable self-sabotage.",
          "The professional moves before the brain can argue.",
        ],
        caption: `Stop waiting for inspiration. It never arrives for spectators.\n\n${STARK_CTA}\n\n${STARK_HASHTAGS.join(" ")}`,
        rationale: "Przełamuje powszechne przekonanie i natychmiast polaryzuje odbiorcę.",
      },
      {
        angleId: "roman_stoic",
        angleName: "🏛️ Rzymski Stoicyzm (Marcus Aurelius)",
        hook: "You have power over your mind, not outside events.",
        phrases: [
          "You have power over your mind, not outside events.",
          "Realize this, and you will find unbreakable strength.",
          "Return to the citadel within.",
        ],
        caption: `External chaos only rules you if you grant it permission. Master yourself first.\n\n${STARK_CTA}\n\n${STARK_HASHTAGS.join(" ")}`,
        rationale:
          "Odwołuje się do 2000 lat imperialnej mądrości i głębokiej suwerenności emocjonalnej.",
      },
      {
        angleId: "neurobiology",
        angleName: "🧠 Neurobiologia & Układ Dopaminy",
        hook: "Resistance is your anterior mid-cingulate cortex growing.",
        phrases: [
          "Resistance is your anterior mid-cingulate cortex growing.",
          "Every time you force execution, your brain physically changes.",
          "Lean into the friction.",
        ],
        caption: `Willpower is not an abstract concept. It is a biological circuit forged by voluntary friction.\n\n${STARK_CTA}\n\n${STARK_HASHTAGS.join(" ")}`,
        rationale: "Uzasadnia ból dyscypliny twardą nauką, eliminując wątpliwości intelektualne.",
      },
      {
        angleId: "reality_check",
        angleName: "🎯 Zero-Empathy Reality Check",
        hook: "Nobody is coming to save your potential.",
        phrases: [
          "Nobody is coming to save your potential.",
          "The world does not care about your good intentions.",
          "Deliver results or remain forgotten.",
        ],
        caption: `Excuses comfort you today and starve you tomorrow. Never negotiate with your standard.\n\n${STARK_CTA}\n\n${STARK_HASHTAGS.join(" ")}`,
        rationale:
          "Bezwzględne uderzenie w strefę komfortu, natychmiast usuwające użalanie się nad sobą.",
      },
    ];

    if (!ai) {
      return sendDegraded(res, { angles: fallbackAngles });
    }

    try {
      const prompt = `Jesteś strategiem treści i psychologiem uwagi dla marki @stark_focus.
  Rozbij temat: "${topic}" na 4 skrajnie odmienne kąty psychologiczne:
  1. Prowokacja / Kontrowersja (uderzenie w schemat myślowy)
  2. Rzymski Stoicyzm (asceza, memento mori, niewzruszoność)
  3. Neurobiologia & Układ Dopaminy (konkretna anatomia woli i oporu)
  4. Zero-Empathy Reality Check (twarda konfrontacja bez owijania w bawełnę)

  Dla każdego kąta przygotuj:
  - angleId: "controversial" | "roman_stoic" | "neurobiology" | "reality_check"
  - angleName: nazwa po polsku z ikoną
  - hook: magnetyczny hook 0-3s po angielsku (Sentence Case lub ALL CAPS)
  - phrases: dokładnie 3 frazy po angielsku [Hook, Kontrast, Climax]
  - caption: 2 zdania głębokiego opisu stoickiego po angielsku + hashtagi
  - rationale: dlaczego ten kąt działa psychologicznie (po polsku)

  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "angles": [
      {
        "angleId": "string",
        "angleName": "string",
        "hook": "string",
        "phrases": ["string", "string", "string"],
        "caption": "string",
        "rationale": "string"
      }
    ]
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.82 },
      });

      const parsed = safeJsonParse(response.text || "");
      const angles = asArray(parsed.angles).map(normalizeCard);
      if (angles.length === 4) {
        return res.json({ angles });
      }
      return sendDegraded(res, { angles: fallbackAngles });
    } catch (err) {
      console.warn("Błąd angle-matrix:", err);
      return sendDegraded(res, { angles: fallbackAngles });
    }
  });
  app.post("/api/ai/cognitive-friction", async (req, res) => {
    const { topic = "dyscyplina, sukces i samotność" } = req.body || {};
    const ai = getGeminiClient();

    const fallbackParadoxes = [
      {
        title: "The Solitude Acceleration",
        hook: "The more people you cut out, the faster your empire grows.",
        explanation: "Każda luźna relacja kradnie energię poznawczą wymaganą do mistrzostwa.",
        phrases: [
          "The more people you cut out,",
          "the faster your empire grows.",
          "Silence is the ultimate compound interest.",
        ],
      },
      {
        title: "The Restlessness of Comfort",
        hook: "Comfort is the quietest form of self-annihilation.",
        explanation: "Brak oporu fizjologicznie osłabia gęstość kory przedczołowej.",
        phrases: [
          "Comfort is the quietest form of self-annihilation.",
          "The body adapts to ease by creating imaginary anxiety.",
          "Choose hard tension.",
        ],
      },
      {
        title: "The Loudness of Silence",
        hook: "The man who speaks least controls the entire room.",
        explanation:
          "Niewypowiedziane słowa budują asymetrię informacji i aurę nieprzewidywalności.",
        phrases: [
          "The man who speaks least controls the entire room.",
          "Noise confesses insecurity.",
          "Silence commands respect.",
        ],
      },
      {
        title: "The Laziness of Overwork",
        hook: "Working 16 hours a day is often disguised laziness.",
        explanation: "Zajętość to najwygodniejsza ucieczka przed 1 bolesną, kluczową decyzją.",
        phrases: [
          "Working 16 hours a day is often disguised laziness.",
          "Exhaustion is not accomplishment.",
          "Execute the one thing you are avoiding.",
        ],
      },
    ];

    if (!ai) {
      return sendDegraded(res, { paradoxes: fallbackParadoxes });
    }

    try {
      const prompt = `Jesteś mistrzem paradoksów poznawczych dla profilu @stark_focus.
  Wygeneruj 4 głębokie, hipnotyzujące sprzeczności i paradoksy (Cognitive Friction) na temat: "${topic}".
  Odbiorca musi poczuć nagłe zwolnienie przewijania i potrzebę ponownego przeczytania.
  Wszystkie hooki i frazy po angielsku. Wyjaśnienie po polsku.

  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "paradoxes": [
      {
        "title": "string",
        "hook": "string",
        "explanation": "string",
        "phrases": ["string", "string", "string"]
      }
    ]
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.9 },
      });

      const parsed = safeJsonParse(response.text || "");
      const paradoxes = asArray(parsed.paradoxes).map(normalizeCard);
      if (paradoxes.length > 0) {
        return res.json({ paradoxes });
      }
      return sendDegraded(res, { paradoxes: fallbackParadoxes });
    } catch (err) {
      console.warn("Błąd cognitive-friction:", err);
      return sendDegraded(res, { paradoxes: fallbackParadoxes });
    }
  });
  app.post("/api/ai/evergreen-recycle", async (req, res) => {
    const { sourceText = "" } = req.body || {};
    const cleanInput = String(sourceText).trim() || "Dyscyplina to nie motywacja, to tożsamość.";
    const ai = getGeminiClient();

    const fallbackRecycled = {
      reel: {
        hook: "Your identity is a reflection of what you tolerate.",
        phrases: [
          "Your identity is a reflection of what you tolerate.",
          "Stop waiting for emotional alignment.",
          "Execute without permission.",
        ],
        duration: 8,
        suggestedTheme: "obsidian_void",
      },
      carousel: {
        title: "THE ANATOMY OF STANDARDS",
        slides: [
          {
            headline: "THE SILENT CONTRACT",
            bodyText: "You become what you tolerate in private when nobody is watching.",
            highlightWords: "tolerate, private, watching",
          },
          {
            headline: "MOTIVATION IS CHEAP",
            bodyText: "Amateurs depend on enthusiasm. Professionals obey cold protocol.",
            highlightWords: "enthusiasm, protocol",
          },
          {
            headline: "THE COMPOUND EFFECT",
            bodyText: "One broken promise to yourself destroys subconscious trust for weeks.",
            highlightWords: "promise, subconscious, trust",
          },
          {
            headline: "THE MONK SHIFT",
            bodyText: "Silence your complaints. Let the accumulated volume of work speak.",
            highlightWords: "complaints, accumulated, work",
          },
          {
            headline: "THE UNFORGIVING STANDARD",
            bodyText: "Save this reminder. Never negotiate with your standards.",
            highlightWords: "reminder, negotiate, standards",
          },
        ],
      },
      manifesto: "Never compromise in private if you expect to command respect in public.",
      caption: `Stop negotiating with your morning mood. Standards automate what emotion destroys.\n\n${STARK_CTA}\n\n${STARK_HASHTAGS.join(" ")}`,
    };

    if (!ai) {
      return sendDegraded(res, fallbackRecycled);
    }

    try {
      const prompt = `Jesteś elitarnym redaktorem treści i strategiem @stark_focus.
  Weź poniższą surową myśl lub post użytkownika:
  "${cleanInput}"

  I natychmiast zremiksuj ją na 4 gotowe formaty STARK:
  1. reel: rolka wideo [hook 0-3s, 3 precyzyjne fazy po angielsku, suggestedTheme: "obsidian_void"|"carbon_aura"|"crimson_eclipse"]
  2. carousel: 5-slajdowa karuzela (headline: 2-4 słowa ALL CAPS, bodyText: 1-2 zwięzłe zdania, highlightWords)
  3. manifesto: 1 bezkompromisowe zdanie podsumowujące sedno
  4. caption: gotowy opis posta z mocnym CTA i hashtagami

  Zwróć WYŁĄCZNIE poprawny JSON:
  {
    "reel": {
      "hook": "string",
      "phrases": ["string", "string", "string"],
      "duration": 8,
      "suggestedTheme": "obsidian_void"
    },
    "carousel": {
      "title": "string",
      "slides": [
        { "headline": "string", "bodyText": "string", "highlightWords": "string" }
      ]
    },
    "manifesto": "string",
    "caption": "string"
  }`;

      const response = await callGeminiWithFallback(ai, {
        contents: prompt,
        config: { temperature: 0.8 },
      });

      const parsed = safeJsonParse(response.text || "");
      if (parsed?.reel && parsed?.carousel) {
        return res.json(parsed);
      }
      return sendDegraded(res, fallbackRecycled);
    } catch (err) {
      console.warn("Błąd evergreen-recycle:", err);
      return sendDegraded(res, fallbackRecycled);
    }
  });
}
