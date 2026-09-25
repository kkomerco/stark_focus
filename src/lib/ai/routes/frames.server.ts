import type { MiniApp } from "../../mini-express.server";
import { generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { asArray, asNumber, asString, asStringArray, sendDegraded } from "../normalize.server";
import { clampInt, clampText, clampTextList } from "../../limits";
import {
  HOOK_CRAFT_PROMPT,
  HOOK_REGISTER,
  SLOP_BAN_LIST,
  auditHook,
  auditLine,
} from "../../hookCraft";
import { hookFingerprint } from "../../similarity";
import { isPolishCopy } from "../../caption";
import { FRAME_FORMATS, FrameFormat, formatById, formatFieldSpec } from "../../formats";

/**
 * Wypełnianie kadru treścią pod WYBRANY format.
 *
 * Studio posta prosiło model o jedno zdanie, więc protokół, koszt i diagram
 * zapadały się z powrotem w cytat na czerni. Tu model dostaje kształt układu
 * (pole + limit wierszy) i dostaje odpowiedź filtrowaną tymi samymi zasadami,
 * które trzymają resztę treści. Jeden klik = jedno wywołanie = `count` kadrów.
 */

/** Nadmiar jest darmowy, każdy kolejny klik już nie (darmowy tier). */
const OVERGENERATE = 6;

export function buildFramePrompt(format: FrameFormat, topic: string, exclude: string[]): string {
  return `Jesteś autorem treści marki @stark_focus (brutalny stoicyzm, dyscyplina, wysokie standardy).
TEMAT: "${topic}".
FORMAT KADRU: ${format.label} — ${format.shape}

Napisz ${OVERGENERATE} warianty tego kadru. Kazdy wariant to INNA figura retoryczna i INNE rozwinięcie tematu.

KAZDA linia wariantu zostaje w temacie "${topic}" i dotyczy dnia czytelnika (jego telefon, jego godzina, jego praca, jego cialo). Rekwizyt bez zwiazku z tematem — mosiez, szklo, klucz — jest bledem, nie klimatem.

POLA WARIANTU (wszystkie po angielsku, bez polskiego, bez hashtagów, bez emoji):
${formatFieldSpec(format)}

${HOOK_CRAFT_PROMPT}
REJESTR: ${HOOK_REGISTER}
ZAKAZY: ${SLOP_BAN_LIST}
${
  exclude.length
    ? `JUŻ OPUBLIKOWANE — nie powtarzaj tych linii ani ich mutacji:\n${exclude
        .slice(0, 30)
        .map((line) => `- ${line}`)
        .join("\n")}\n`
    : ""
}
Zwróc WYŁĄCZNIE czysty JSON:
{
  "frames": [
    {
${format.fields.map((field) => `      "${field.key}": ${field.list ? '["linie po angielsku"]' : '"linia po angielsku"'},`).join("\n")}
      "archetype": "id figury, ktorej uzyles",
      "generic_risk": 0
    }
  ]
}
"generic_risk": 0-10 — ile w tym kadru jest prawdy, ktorej nie da sie wpisac w dowolny motywacyjny post. Oceny MUSZA byc roznicowane.`;
}

function cleanLine(value: unknown): string {
  return asString(value).replace(/[*#"]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Kadr przechodzi tylko w pełni poprawny: za długi krok albo polski wiersz
 * oznaczają odrzucenie całego wariantu, nie obcięcie — inaczej na kadr weszłaby
 * połowa zdania.
 */
export function rankFrameCandidates(
  raw: unknown,
  format: FrameFormat,
  exclude: string[],
  count: number,
): { frames: Record<string, unknown>[]; rejected: number } {
  const excluded = new Set(exclude.map((line) => hookFingerprint(line)));
  const seen = new Set<string>();
  const accepted: Record<string, unknown>[] = [];
  let rejected = 0;

  for (const entry of asArray(raw).map((item) => (item ?? {}) as Record<string, unknown>)) {
    const frame: Record<string, unknown> = {};
    const fingerprints: string[] = [];
    let broken = false;

    for (const field of format.fields) {
      if (field.list) {
        const lines = asStringArray(entry[field.key], field.list + 2).map(cleanLine);
        if (lines.length !== field.list) {
          broken = true;
          break;
        }
        for (const line of lines) {
          const fp = hookFingerprint(line);
          if (!auditLine(line, 16).ok || isPolishCopy(line) || excluded.has(fp) || seen.has(fp)) {
            broken = true;
            break;
          }
          fingerprints.push(fp);
        }
        if (broken) break;
        frame[field.key] = lines;
        continue;
      }

      const line = cleanLine(entry[field.key]);
      const fp = hookFingerprint(line);
      if (!line || !auditHook(line).ok || isPolishCopy(line) || excluded.has(fp) || seen.has(fp)) {
        broken = true;
        break;
      }
      frame[field.key] = line;
      fingerprints.push(fp);
    }

    if (broken) {
      rejected++;
      continue;
    }
    // Odcisk całego kadru: dwa warianty z tym samym zdaniem, ale innymi
    // krokami, to nadal ten sam materiał.
    const frameKey = fingerprints.join("|");
    if (seen.has(frameKey)) {
      rejected++;
      continue;
    }
    seen.add(frameKey);
    for (const fp of fingerprints) seen.add(fp);
    frame.archetype = asString(entry.archetype, "unlabeled");
    frame.genericRisk = asNumber(entry.generic_risk, 5);
    accepted.push(frame);
  }

  accepted.sort((a, b) => Number(a.genericRisk) - Number(b.genericRisk));
  return { frames: accepted.slice(0, count), rejected };
}

export function registerFrameRoutes(app: MiniApp): void {
  app.post("/api/ai/frame-fill", async (req, res) => {
    const format = formatById(clampText(req.body?.format, 24, "quote")) || FRAME_FORMATS[0];
    const topic = clampText(req.body?.topic, 200, "stoic discipline and quiet standards");
    const count = clampInt(req.body?.count, 1, 6, 3);
    const exclude = clampTextList(req.body?.excludeHooks);

    if (!getGeminiClient()) {
      return sendDegraded(res, {
        frames: [],
        rejected: 0,
        error: "Brak klucza GEMINI_API_KEY — generator kadrów nie ma skąd brać treści.",
      });
    }

    try {
      const parsed = await generateJsonWithFallback({
        contents: buildFramePrompt(format, topic, exclude),
        temperature: 1.0,
      });
      const { frames, rejected } = rankFrameCandidates(parsed?.frames, format, exclude, count);

      if (frames.length === 0) {
        return res.json({
          frames: [],
          rejected,
          notice: `Model dał ${rejected} warianty formatu „${format.label}" i żaden nie przeszedł kontroli. Zmień temat albo spróbuj ponownie.`,
        });
      }
      return res.json({ frames, rejected, format: format.id });
    } catch (error) {
      console.error("Błąd wypełniania kadru:", error);
      return sendDegraded(res, {
        frames: [],
        rejected: 0,
        error: "Wypełnianie kadru nie udało się — model nie odpowiedział.",
      });
    }
  });
}
