import type { MiniApp } from "../../mini-express.server";
import { generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { asArray, asNumber, asString, sendDegraded } from "../normalize.server";
import { clampInt, clampText, clampTextList } from "../../limits";
import {
  HOOK_ARCHETYPES,
  HOOK_IDEAL_WORDS,
  HOOK_REGISTER,
  SLOP_BAN_LIST,
  auditHook,
} from "../../hookCraft";
import { hookFingerprint } from "../../similarity";

/**
 * Silnik hooków: JEDNO wywołanie, dwanaście kandydatów, selekcja w kodzie.
 *
 * Limitem jest liczba zapytań na dobę (darmowy tier), nie tokeny — więc
 * dokładanie kandydatów do jednego promptu jest za darmo, a każdy kolejny
 * klik kosztuje realnie. Badania nad copy AI pokazują, że generowanie nadmiaru
 * i odrzucanie słabo ocenionych bije pojedynczy strzał w skuteczności.
 *
 * Krytyka jest POLEM w tej samej odpowiedzi, nie osobnym wywołaniem:
 * samo-korekta w pętlach draft -> ocena -> poprawka nie działa, a zjada
 * trzykrotność budżetu.
 */
const OVERGENERATE = 12;

/** Nie więcej niż dwa kandydaci z jednej figury — feed nie może iść jednym rytmem. */
const MAX_PER_ARCHETYPE = 2;

const ARCHETYPE_TABLE = HOOK_ARCHETYPES.map(
  (a) => `- ${a.id}: ${a.instruction}. Przykład: "${a.examples[0]}"`,
).join("\n");

export function buildHookPrompt(options: {
  topic: string;
  shape: string;
  exclude: string[];
  count: number;
}): string {
  const { topic, shape, exclude } = options;
  return `Jesteś głównym autorem tekstu marki @stark_focus (brutalny stoicyzm, dyscyplina, wysokie standardy, zero kompromisów).

TEMAT: "${topic}".
KSZTALT KADRU: ${shape || "jedno zdanie 4-10 slow, które mieści się na kadrze 9:16"}.

Napisz ${OVERGENERATE} kandydatów po ANGIELSKU. Każdy musi być inną figurą retoryczną, nie parafrazą poprzedniego.

FIGURY DO UŻYCIA (wybieraj świadomie, podaj id w polu "archetype"):
${ARCHETYPE_TABLE}

REJESTR: ${HOOK_REGISTER}

ZAKAZY: ${SLOP_BAN_LIST}
Podmiot zdania musi dać się sfotografować: rzecz, gest, liczba, człowiek.
${
  exclude.length
    ? `\nJUŻ OPUBLIKOWANE — nie powtarzaj tych linii ani ich mutacji:\n${exclude
        .slice(0, 40)
        .map((h) => `- ${h}`)
        .join("\n")}\n`
    : ""
}
Zwróc WYŁĄCZNIE czysty JSON:
{
  "candidates": [
    {
      "line": "zdanie po angielsku, ${HOOK_IDEAL_WORDS} słów",
      "archetype": "id figury z listy",
      "generic_risk": 0
    }
  ]
}
"generic_risk" to Twoja uczciwa ocena 0-10: ile w tym zdaniu jest prawdy, której nie da się wpisać w dowolny motywacyjny post. 0 = tylko to zdanie mogło paść, 10 = mogłoby być pod dowolnym zdjęciem góry.
Oceny MUSZĄ być różnicowane: co najmniej dwaj kandydaci z 0-2 i co najmniej dwaj z 5-9. Same jedynki nic nie znaczą i nie pozwalają niczego wybrać.`;
}

export interface HookCandidate {
  line: string;
  archetype: string;
  genericRisk: number;
}

/**
 * Selekcja w kodzie, nie w modelu: auditHook() to te same reguły, które
 * trzymają kadry w czytelności, więc słaby model nie wciśnie kliszy do UI.
 */
export function rankHookCandidates(
  raw: unknown,
  exclude: string[],
  count: number,
): {
  candidates: HookCandidate[];
  rejected: number;
} {
  const excluded = new Set(exclude.map((hook) => hookFingerprint(hook)));
  const seen = new Set<string>();
  const perArchetype = new Map<string, number>();
  const accepted: HookCandidate[] = [];
  let rejected = 0;

  const items = asArray(raw)
    .map((entry) => (entry ?? {}) as Record<string, unknown>)
    .filter((entry) => {
      const line = asString(entry.line).replace(/[*#"]/g, "").trim();
      if (!line || !auditHook(line).ok) {
        rejected++;
        return false;
      }
      const fp = hookFingerprint(line);
      if (excluded.has(fp) || seen.has(fp)) {
        rejected++;
        return false;
      }
      seen.add(fp);
      return true;
    })
    .map((entry) => ({
      line: asString(entry.line).replace(/[*#"]/g, "").trim(),
      archetype: asString(entry.archetype, "unlabeled"),
      genericRisk: asNumber(entry.generic_risk, 5),
    }))
    .sort((a, b) => a.genericRisk - b.genericRisk);

  for (const candidate of items) {
    const used = perArchetype.get(candidate.archetype) ?? 0;
    if (used >= MAX_PER_ARCHETYPE) continue;
    perArchetype.set(candidate.archetype, used + 1);
    accepted.push(candidate);
    if (accepted.length >= count) break;
  }

  return { candidates: accepted, rejected };
}

export function registerHookRoutes(app: MiniApp): void {
  app.post("/api/ai/hooks", async (req, res) => {
    const topic = clampText(req.body?.topic, 200, "stoic discipline and quiet standards");
    const shape = clampText(req.body?.shape, 200);
    const count = clampInt(req.body?.count, 1, 10, 5);
    const exclude = clampTextList(req.body?.excludeHooks);

    if (!getGeminiClient()) {
      return sendDegraded(res, {
        candidates: [],
        rejected: 0,
        error: "Brak skonfigurowanego klucza GEMINI_API_KEY",
      });
    }

    try {
      const parsed = await generateJsonWithFallback({
        contents: buildHookPrompt({ topic, shape, exclude, count }),
        temperature: 1.0,
      });
      const { candidates, rejected } = rankHookCandidates(parsed?.candidates, exclude, count);

      if (candidates.length === 0) {
        // Uczciwie: model dał tekst, który nie przeszedł kontroli, więc UI
        // nie może pokazywać pustej listy, jakby nic się nie stało.
        return res.json({
          candidates: [],
          rejected,
          notice: `Model dał ${rejected} kandydatów i żaden nie przeszedł kontroli klisz. Zmień temat albo spróbuj ponownie.`,
        });
      }

      return res.json({ candidates, rejected });
    } catch (error) {
      console.error("Błąd generatora hooków:", error);
      return sendDegraded(res, {
        candidates: [],
        rejected: 0,
        error: "Generowanie hooków nie udało się",
      });
    }
  });
}
