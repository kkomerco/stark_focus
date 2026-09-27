import type { MiniApp } from "../../mini-express.server";
import { generateContentWithFallback, getGeminiClient, safeJsonParse } from "../gemini.server";
import { clampCount, clampText, clampTextList } from "../../limits";
import { HOOK_CRAFT_PROMPT, exemplarBlock } from "../../hookCraft";
import { asArray, asString, asStringArray, sendDegraded } from "../normalize.server";
import { formatStarkCaption, starkCaption } from "../../caption";
import { hookFingerprint } from "../../similarity";
import { FRAME_FORMATS, formatById, formatFieldSpec } from "../../formats";
import { rankFrameCandidates } from "./frames.server";

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
    caption: formatStarkCaption(p.hook),
    template: "none_solid" as const,
    fontColor: "white" as const,
  }));
}

/**
 * Mieszanka układów z jednej odpowiedzi modelu — wydzielone, żeby dało się
 * sprawdzić bez sieci. Trasa pyta o każdy format z osobna, więc odpowiedź, w
 * której model zignorował polecenie i oddał same cytaty, musi choć nie zrobić
 * czegoś głupszego niż pozory mieszanki.
 */
export function mixBatchPosts(
  parsed: unknown,
  exclude: string[],
  count: number,
  quota: number,
): Record<string, unknown>[] {
  const posts = asArray((parsed as { posts?: unknown } | null)?.posts);

  // Każdy układ przechodzi przez tę samą miarkę co studio kadru: kształt
  // (liczba wierszy, pary cena/strata) jest twardy, rzemiosło wiersza miękkie.
  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const item of posts) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const format = formatById(asString(entry.format).toLowerCase()) ?? FRAME_FORMATS[0];
    buckets.set(format.id, [...(buckets.get(format.id) ?? []), entry]);
  }

  const groups = FRAME_FORMATS.map((format) =>
    rankFrameCandidates(buckets.get(format.id) ?? [], format, exclude, quota + 2).frames.map(
      (frame) => ({ ...frame, formatId: format.id }),
    ),
  );

  // Round-robin: seria ma być mieszanką od pierwszego kadru, a nie „najpierw
  // cztery cytaty, potem reszta".
  const mixed: Record<string, unknown>[] = [];
  for (let round = 0; mixed.length < count; round++) {
    let taken = false;
    for (const group of groups) {
      const frame = group[round];
      if (!frame) continue;
      mixed.push(frame);
      taken = true;
      if (mixed.length >= count) break;
    }
    if (!taken) break;
  }

  return mixed.map((frame, idx) => {
    const format = formatById(asString(frame.formatId)) ?? FRAME_FORMATS[0];
    const primary = asString(frame.primary);
    const steps = asStringArray(frame.steps, 4);
    const cost = asStringArray(frame.cost, 3);
    const forfeit = asStringArray(frame.forfeit, 3);
    const closing = asString(frame.closing);
    // Siatka podglądu zna dwa wiersze; pełną strukturę niesie kadr.
    const preview = steps[0] ?? cost[0] ?? closing;
    return {
      id: `batch-${idx + 1}`,
      format: format.id,
      layoutName: format.layoutName,
      gridType: format.gridType,
      pillar: format.label,
      primary,
      steps,
      cost,
      forfeit,
      closing,
      sayingMain: primary,
      sayingSub: preview,
      caption: starkCaption(primary, asString(frame.caption)),
      question: asString(frame.question),
      template: format.gridType,
      fontColor: "white",
    };
  });
}

// 6. SERIA POSTÓW — jedna partia kadrów, wiele układów (nie tylko cytat na czerni).
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
    const exemplars = clampTextList(req.body?.exemplars).slice(0, 8);
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
    // Jedno wywołanie, cztery układy: prosimy o tyle wariantów formatu, ile
    // trzeba, żeby cała seria była mieszanką, a nie jednym cytatem.
    const quota = Math.max(1, Math.ceil(count / FRAME_FORMATS.length));

    try {
      const prompt = `You are the lead viral copywriter for @stark_focus (dark psychology, realistic discipline, focus, high standards, black background format 9:16).
Topic or niche focus: "${topic}".
${exclude.length ? `\nALREADY PUBLISHED — never repeat these lines or their close variants:\n- ${banList}\n` : ""}
Generate EXACTLY ${count} completely UNIQUE, high-variance posts in ENGLISH.

${HOOK_CRAFT_PROMPT}
${exemplarBlock(exemplars)}

CRITICAL ANTI-AI-SLOP & TONE RULES:
- BAN POMPOUS, ARCHAIC BUZZWORDS: Do NOT use "citadel", "sovereign", "bastion", "monolith", "throne", "decree", "gladiators".
- REALISTIC & LIFE-IMPACTING: Ground every line in real psychological observations, modern friction, distractions, self-respect, exhaustion, quiet consistency, and interpersonal boundaries.
- NATURAL SENTENCE CASING ONLY: Capitalize only the first letter. Never use all-caps.
- NO ARTIFICIAL HIGHLIGHTS: No asterisks or special markdown.

CRITICAL FORMAT RULES:
1. Seria NIE moze byc jednym ukladem. Napisz po ${quota} wariantow KAZDEGO ponizszego formatu i oznacz kazdy wpisem "format":
${FRAME_FORMATS.map(
  (format) =>
    `   - "${format.id}" (${format.label}) — ${format.shape}\n     Pola: ${formatFieldSpec(
      format,
    ).replace(/\n/g, " ")}`,
).join("\n")}
2. Pure brutal minimalism: wiersz kadru jest krotki, nigdy paragraf.
3. Direct, thought-provoking & audience-facing: Address the reader/viewer directly in 2nd person ("you", "your").
4. Under no circumstances produce multi-sentence or wrapped long text.
5. caption: 2-3 zdania po angielsku, które rozwijają myśl z kadru. Bez hashtagów, bez CTA, bez "Follow" — ogon doklejamy u siebie, więc dwa własne końce wyglądałyby jak pomyłka.
6. NEVER use black font. All posts use pure white font on pitch black background.

Return ONLY valid JSON:
{
  "posts": [
    {
      "format": "${FRAME_FORMATS.map((format) => format.id).join("|")}",
      "pillar": "string",
${FRAME_FORMATS.flatMap((format) => format.fields)
  .filter((field, index, all) => all.findIndex((other) => other.key === field.key) === index)
  .map(
    (field) =>
      `      "${field.key}": ${
        field.pair
          ? '["Cena -> Utrata"]'
          : field.list
            ? '["linie po angielsku"]'
            : '"linia po angielsku"'
      },`,
  )
  .join("\n")}
      "caption": "string"
    }
  ]
}`;

      const text = await generateContentWithFallback({
        contents: prompt,
        temperature: 0.95,
      });

      const enriched = mixBatchPosts(safeJsonParse(text || ""), exclude, count, quota);

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
