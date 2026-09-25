import type { MiniApp } from "../../mini-express.server";
import { generateContentWithFallback, getGeminiClient, safeJsonParse } from "../gemini.server";
import { clampCount, clampText, clampTextList } from "../../limits";
import { HOOK_CRAFT_PROMPT, auditHook } from "../../hookCraft";
import { asArray, asString, sendDegraded } from "../normalize.server";
import { formatStarkCaption, starkCaption } from "../../caption";
import { hookFingerprint } from "../../similarity";

const PILLARS = [
  {
    id: "silence",
    name: "The Silence Paradox",
    hook: "Never announce your moves to spectators.",
    sub: "let undeniable results speak.",
  },
  {
    id: "voluntary_friction",
    name: "Voluntary Friction",
    hook: "Comfort is slow poison disguised as peace.",
    sub: "seek the hard road daily.",
  },
  {
    id: "dopamine_citadel",
    name: "The Dopamine Citadel",
    hook: "Starve the distraction.",
    sub: "feed the standard.",
  },
  {
    id: "monkish_protocol",
    name: "The Monkish Protocol",
    hook: "Disappear for 6 months in private.",
    sub: "reappear undeniable.",
  },
  {
    id: "unnegotiated_standard",
    name: "The Unnegotiated Standard",
    hook: "Your feelings are irrelevant to your duty.",
    sub: "standards over mood.",
  },
  {
    id: "solitude_sovereignty",
    name: "The Solitude Sovereign",
    hook: "Master the art of being alone.",
    sub: "without feeling empty.",
  },
  {
    id: "volition_boundary",
    name: "The Volition Boundary",
    hook: "Care nothing about opinions outside your control.",
    sub: "guard your perception.",
  },
  {
    id: "sovereign_king",
    name: "Sovereign Mindset",
    hook: "Walk like a king, or walk like you don't care who the king is.",
    sub: "",
  },
  {
    id: "uninspired_truth",
    name: "The Uninspired Reality",
    hook: "You are not tired. You are uninspired.",
    sub: "by a life you didn't choose.",
  },
  {
    id: "need_shift",
    name: "The Power Shift",
    hook: "Notice how they treat you when you no longer need them.",
    sub: "",
  },
  {
    id: "past_version",
    name: "The Dead Past",
    hook: "The version of you they remember no longer exists.",
    sub: "stop apologizing for outgrowing people.",
  },
  {
    id: "chaos_market",
    name: "The Market of Chaos",
    hook: "If you don't build your peace, someone sells you their chaos.",
    sub: "",
  },
  {
    id: "debt_of_compromise",
    name: "The Debt of Compromise",
    hook: "Excuses destroy self-respect.",
    sub: "never negotiate.",
  },
  {
    id: "elimination_half_measures",
    name: "The Elimination of Half-Measures",
    hook: "Commit with total finality.",
    sub: "or do not begin.",
  },
  {
    id: "accumulated_work",
    name: "The Proof of Accumulated Work",
    hook: "Silence cannot be misquoted.",
    sub: "",
  },
];

/**
 * Ids MUSZĄ być liczone per żądanie: `AiRadarTab` pilnuje "dodane do planera"
 * po zbiorze identyfikatorów, więc stały zestaw id z evaluate'u modułu sprawiał,
 * że druga i każda następna partia "dodaj wszystko" nie robiły nic.
 */
export function buildBatchFallback() {
  const stamp = Date.now();
  return PILLARS.map((p, idx) => ({
    id: `batch-post-${idx + 1}-${stamp}`,
    pillar: p.name,
    pillarId: p.id,
    sayingMain: p.hook,
    sayingSub: p.sub,
    caption: formatStarkCaption(p.hook, [
      "Hold your standards without debate.",
      "Execute especially in private.",
      "Reclaim your sovereignty.",
    ]),
    template: "none_solid" as const,
    fontColor: "white" as const,
  }));
}

// 6. BATCH GENERATOR (Mass High-Variance Posts Engine - 9:16 Cytat na Czerni)
export function registerBatchRoutes(app: MiniApp): void {
  app.post("/api/ai/batch-generator", async (req, res) => {
    // Klient wysyła `niche`, trasa czytała `topic` — nisza była wyrzucana,
    // a cache oddawał ten sam zestaw postów dla każdej niszy.
    const topic =
      clampText(req.body?.niche, 200) ||
      clampText(req.body?.topic, 200) ||
      "stoic discipline, silence, and standards";
    const count = clampCount(req.body?.count, 10);
    const exclude = clampTextList(req.body?.excludeHooks);
    const excluded = new Set(exclude.map(hookFingerprint));
    const ai = getGeminiClient();
    const allPillars = buildBatchFallback();
    // Bank filarów też podlega anty-powtórce: bez tego ta sama dziesiątka
    // hooków wracała przy każdym kliknięciu, dopóki model milczał.
    const freshPillars = allPillars.filter(
      (post) => !excluded.has(hookFingerprint(post.sayingMain)),
    );
    // Wolimy oddać mniej pozycji niż dołożyć powtórkę — dlatego brakujące
    // mówimy wprost, zamiast cicho uzupełniać bankiem, który już był.
    const fallbackPosts =
      freshPillars.length >= count ? freshPillars.slice(0, count) : freshPillars;
    const notice =
      freshPillars.length < count
        ? `Bank treści wyczerpany: nowe jest ${freshPillars.length} z ${count} pozycji — reszta już gdzieś poszła.`
        : undefined;

    if (!ai) {
      return sendDegraded(res, { posts: fallbackPosts, notice });
    }

    // Do promptu wchodzi tylko ogon historii: za każdy znak płaci się przy
    // każdym wywołaniu, a realnie grożą powtórki z ostatnich partii.
    const banList = exclude.slice(-25).join("\n- ");

    try {
      const prompt = `You are the lead viral copywriter for @stark_focus (dark psychology, realistic discipline, focus, high standards, black background format 9:16).
Topic or niche focus: "${topic}".
${exclude.length ? `\nALREADY PUBLISHED — never repeat these lines or their close variants:\n- ${banList}\n` : ""}
Generate EXACTLY ${count} completely UNIQUE, high-variance posts in ENGLISH.

${HOOK_CRAFT_PROMPT}

CRITICAL ANTI-AI-SLOP & TONE RULES:
- BAN POMPOUS, ARCHAIC BUZZWORDS: Do NOT use "citadel", "sovereign", "bastion", "monolith", "throne", "decree", "gladiators".
- REALISTIC & LIFE-IMPACTING: Ground every line in real psychological observations, modern friction, distractions, self-respect, exhaustion, quiet consistency, and interpersonal boundaries.
- NATURAL SENTENCE CASING ONLY: Capitalize only the first letter. Never use all-caps.
- NO ARTIFICIAL HIGHLIGHTS: No asterisks or special markdown.

CRITICAL FORMAT RULES:
1. Pure brutal minimalism: Quotes must NEVER be long paragraphs or multi-line blocks.
2. Direct, thought-provoking & audience-facing: Address the reader/viewer directly in 2nd person ("you", "your").
3. Format choice per post:
   - OPTION A: Exactly ONE punchy line on the entire screen (strictly 3 to 7 words total). In this case, "sayingSub" MUST be empty string ("").
   - OPTION B: Exactly TWO ultra-short lines ("sayingMain" of 2-5 words + "sayingSub" of 2-5 words, e.g. "Keep quiet." / "until it is done.").
4. Under no circumstances produce multi-sentence or wrapped long text.
5. caption: 2-3 zdania po angielsku, które rozwijają myśl z kadru. Bez hashtagów, bez CTA, bez "Follow" — ogon doklejamy u siebie, więc dwa własne końce wyglądałyby jak pomyłka.
6. NEVER use black font. All posts use pure white font on pitch black background.

Return ONLY valid JSON:
{
  "posts": [
    {
      "pillar": "string",
      "sayingMain": "string (strictly 3-7 words, 1 line)",
      "sayingSub": "string (empty string OR strictly 2-5 words, 1 line)",
      "caption": "string"
    }
  ]
}`;

      const text = await generateContentWithFallback({
        contents: prompt,
        temperature: 0.95,
      });

      const parsed = safeJsonParse(text || "");
      // Wypełniacz tylko gdy jest z czego: przy wyczerpanym banku `idx % 0`
      // dałoby NaN i `filler.sayingMain` wywaliłoby całą odpowiedź.
      const fillers = fallbackPosts.length ? fallbackPosts : allPillars;
      const enriched = asArray(parsed.posts)
        .map((item: any, idx: number) => {
          const filler = fillers[idx % fillers.length];
          const fromModel = asString(item?.sayingMain) || asString(item?.hook);
          // Klisza od modelu nie trafia na kadr — w jej miejsce wchodzi bank.
          // Bez tego jedna zla partia zabralaby caly zestaw.
          const sayingMain = fromModel && auditHook(fromModel).ok ? fromModel : filler.sayingMain;
          return {
            id: `batch-${Date.now()}-${idx + 1}`,
            pillar: asString(item?.pillar, `Principle ${idx + 1}`),
            sayingMain,
            sayingSub: asString(item?.sayingSub) || asString(item?.sub),
            caption: starkCaption(sayingMain, asString(item?.caption)),
            template: "none_solid",
            fontColor: "white",
          };
        })
        .filter(
          (post) => post.sayingMain.length > 0 && !excluded.has(hookFingerprint(post.sayingMain)),
        )
        .slice(0, count);

      if (enriched.length > 0) {
        return res.json({ posts: enriched, notice });
      }

      return sendDegraded(res, { posts: fallbackPosts, notice });
    } catch (err) {
      console.warn("Błąd batch-generator:", err);
      return sendDegraded(res, { posts: fallbackPosts, notice });
    }
  });
}
