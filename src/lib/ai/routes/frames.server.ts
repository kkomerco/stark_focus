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
import { softenForPlatform } from "../../platformSafe";
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

${PAIRING_RULE[format.id] ?? ""}

DOPISZ JESZCZE DWA POLA — one trafia POD kadr, nie na kadr:
- "caption": 2-3 zdania po angielsku, ktore ROZWIJAJA temat. Nowa scena, nowy konkret, nowa konsekwencja. Zdanie powtorzone z pola wyzej jest bledem — pod kadrem nie ma byc tego, co widz wlasnie przeczytal.
- "question": jedno pytanie po angielsku (max 18 slow) do przypiecia pod postem. Pyta o konkretna decyzje czytelnika z jego dnia, nie o opinie ani nie o to, czy sie zgadza.

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
${format.fields
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
      "caption": "rozwiniecie tematu pod kadrem",
      "question": "pytanie do przypiecia",
      "archetype": "id figury, ktorej uzyles",
      "generic_risk": 0
    }
  ]
}
"generic_risk": 0-10 — ile w tym kadru jest prawdy, ktorej nie da sie wpisac w dowolny motywacyjny post. Oceny MUSZA byc roznicowane.`;
}

/** Reguła dopisana tylko tam, gdzie układ rysuje wiersze parami. */
const PAIRING_RULE: Record<string, string> = {
  cost: 'ZASADA PAR: „forfeit[0]" jest bezposlednia konsekwencja „cost[0]", „forfeit[1]" konsekwencja „cost[1]" itd. Ten sam rzad to ta sama scena i ten sam rekwizyt — nie dwie niezalezne listy straconych rzeczy. Trzy rzedy to trzy ROZNE decyzje: zadne dwa wiersze nie moga zaczynac sie od tego samego slowa.',
};

/** Zdanie z kadru nie może wrócić w opisie — inaczej opis jest powtórką podglądu. */
function repeatsFrame(caption: string, lines: string[]): boolean {
  const flat = ` ${caption
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")} `;
  return lines.some((line) => {
    const needle = line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return needle.length > 8 && flat.includes(` ${needle}`);
  });
}

function cleanLine(value: unknown): string {
  return asString(value).replace(/[*#"]/g, "").replace(/\s+/g, " ").trim();
}

/** Miara wiersza zostaje dawna: rząd pary jest ciaśniejszy niż krok z listy. */
const ROW_MAX_WORDS = 16;
const PAIR_MAX_WORDS = 12;

/**
 * Powody, które trafiają do raportu. Twarde zabijają cały wariant, bo nie da
 * się ich naprawić przycinaniem. Rzemiosło z `hookCraft` jest miękkie: to sprawa
 * jednego wiersza, więc wiersz znika, a kadr zostaje — przy ośmiu wierszach
 * kosztu odrzucanie wszystkiego było zdarzeniem losowym, nie wyrokiem.
 */
const REASON = {
  polish: "polski w materiale",
  duplicate: "powtórka tego, co już poszło w feedzie",
  risk: "treść ryzykowna dla platformy",
  shape: "inna liczba wierszy, niż wymaga układ",
  empty: "puste pole w kadrze",
  unpaired: "wiersz bez pary «cena → utrata»",
  repeated: "powtórka wiersza w tym samym kadrze",
  /** Wiersze wyczyściło rzemiosło — ten napis sam w sobie nic nie znaczy. */
  noRows: "żaden wiersz nie przeszedł kontroli",
};

/** Śmierć wariantu, za który realnie stoi rzemiosło pojedynczych wierszy. */
const CRAFT_DEATHS = new Set<string>([REASON.noRows]);

/**
 * Rada musi nazywać przyczynę i musi z niej wynikać działanie. Dawniej każda
 * pusta lista kończyła się „zmień temat", czyli robotą, której nie było co
 * robić: tekst był dobry, a wykosził go jeden rym w jednym wierszu.
 */
const ADVICE: Record<string, string> = {
  [REASON.polish]:
    "model odpowiedział po polsku, a materiał ma być po angielsku — spróbuj ponownie",
  [REASON.duplicate]:
    "każdy wariant powtarzał to, co już leży w feedzie — dopiero inny temat da coś nowego",
  [REASON.risk]: "zdania ocierały się o treść ryzykowną dla platformy — spróbuj ponownie",
  [REASON.shape]: "model nie trzymał się liczby wierszy tego układu — spróbuj ponownie",
  [REASON.empty]: "model oddał puste pola — spróbuj ponownie",
  [REASON.unpaired]:
    "model nie rozdzielił ceny od utraty, a układ rysuje rzędy parami — spróbuj ponownie",
  [REASON.noRows]: "każdy wiersz z osobna odpadł w kontroli — spróbuj ponownie",
};

/** Fallback dla etykiet z `hookCraft`: przychodzą z zewnątrz i wszystkie są rzemiosłem. */
const CRAFT_ADVICE = "to rzemiosło jednego wiersza, nie temat — spróbuj ponownie bez zmiany tematu";

/** Problem w jednym zdaniu: twardy albo rzemiosło tego jednego wiersza. */
interface LineCheck {
  fatal: string | null;
  issues: string[];
}

interface DuplicateState {
  excluded: Set<string>;
  seen: Set<string>;
  used: Set<string>;
}

/**
 * Wyrok dla jednego zdania kadru. Twarde są tylko rzeczy, których nie naprawi
 * przycinanie: polszczyzna w materiale, powtórka treści już opublikowanej oraz
 * treść ryzykowna dla platformy. `softenForPlatform` z `gemini.server`
 * zmiękcza odpowiedź modelu, więc trzeci warunek jest zabezpieczeniem dla
 * treści, która przyszłaby inną drogą — to ta sama funkcja, nie druga lista.
 */
function checkLine(line: string, maxWords: number | null, state: DuplicateState): LineCheck {
  if (!line) return { fatal: REASON.empty, issues: [] };
  if (isPolishCopy(line)) return { fatal: REASON.polish, issues: [] };
  if (softenForPlatform(line) !== line) return { fatal: REASON.risk, issues: [] };

  const fp = hookFingerprint(line);
  if (state.excluded.has(fp) || state.seen.has(fp)) return { fatal: REASON.duplicate, issues: [] };
  // Drugi raz w tym samym kadrze to wiersz do skreślenia, nie wariant do wyrzucenia.
  if (state.used.has(fp)) return { fatal: null, issues: [REASON.repeated] };

  const audit = maxWords === null ? auditHook(line) : auditLine(line, maxWords);
  return { fatal: null, issues: audit.issues.map(issueLabel) };
}

/** Etykieta powodu: bez cytowanego fragmentu, żeby dało się to zliczyć. */
function issueLabel(issue: string): string {
  return issue.split(/[\s]*[("„]/)[0].trim() || issue;
}

function uniqueLabels(labels: string[]): string[] {
  return [...new Set(labels)];
}

/** Agregacja do raportu: „rym (4)", „polski w materiale (1)". */
function tally(labels: string[]): string[] {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pl"))
    .map(([label, n]) => `${label} (${n})`);
}

export interface FrameRanking {
  frames: Record<string, unknown>[];
  rejected: number;
  /** Dlaczego wypadły warianty — etykiety rzemiosła plus powody twarde. */
  rejectedDetails: string[];
  /** Dlaczego z kadrów, które zostały, wypadły pojedyncze wiersze. */
  trimmedDetails: string[];
}

/**
 * Kadr przechodzi, gdy da się go pokazać. Kształt układu (liczba wierszy, teza,
 * puenta) i treść, która nie może wejść na ekran, są twarde — wariant odpada.
 * Rzemiosło pojedynczego wiersza jest miękkie: wiersz odpada, kadr zostaje i
 * mówi o tym wprost (`droppedFields` / `droppedReasons`), żeby UI nie kłamał,
 * że kadr jest pełny.
 */
export function rankFrameCandidates(
  raw: unknown,
  format: FrameFormat,
  exclude: string[],
  count: number,
): FrameRanking {
  const excluded = new Set(exclude.map((line) => hookFingerprint(line)));
  const seen = new Set<string>();
  const accepted: Record<string, unknown>[] = [];
  const deadReasons: string[] = [];
  const trimReasons: string[] = [];
  let rejected = 0;

  for (const entry of asArray(raw).map((item) => (item ?? {}) as Record<string, unknown>)) {
    const frame: Record<string, unknown> = {};
    const fingerprints: string[] = [];
    const used = new Set<string>();
    const state: DuplicateState = { excluded, seen, used };
    const droppedFields: string[] = [];
    let droppedIssues: string[] = [];
    let fatal: string | null = null;

    const keep = (line: string) => {
      const fp = hookFingerprint(line);
      fingerprints.push(fp);
      used.add(fp);
    };

    for (const field of format.fields) {
      if (field.pair) {
        // Para to JEDNO zdanie modelu z rozdzielnikiem: dopiero tak rząd
        // „Utrata" musi odpowiadać rządowi „Cena". Dwie osobne listy model
        // zawsze rozjeżdżał o jeden wiersz.
        const rows = asStringArray(entry[field.key], (field.list ?? 0) + 2).map(cleanLine);
        if (!field.list || rows.length !== field.list) {
          fatal = REASON.shape;
          break;
        }
        const pairs: string[][] = [];
        for (const row of rows) {
          const halves = row.split(/\s*(?:->|→|—)\s*/).map((part) => part.trim());
          if (halves.length !== 2 || !halves[0] || !halves[1]) {
            droppedIssues = droppedIssues.concat(REASON.unpaired);
            continue;
          }
          const verdicts = halves.map((half) => checkLine(half, PAIR_MAX_WORDS, state));
          const hard = verdicts.find((verdict) => verdict.fatal)?.fatal ?? null;
          if (hard) {
            fatal = hard;
            break;
          }
          // Para spada W CAŁOŚCI: utrata bez swojej ceny to inny rząd, a nie
          // rząd krótszy.
          if (verdicts.some((verdict) => verdict.issues.length)) {
            droppedIssues = droppedIssues.concat(verdicts.flatMap((verdict) => verdict.issues));
            continue;
          }
          pairs.push([halves[0], halves[1]]);
          halves.forEach(keep);
        }
        if (fatal) break;
        if (pairs.length === 0) {
          fatal = REASON.noRows;
          break;
        }
        frame.cost = pairs.map((pair) => pair[0]);
        frame.forfeit = pairs.map((pair) => pair[1]);
        if (pairs.length < field.list) droppedFields.push(field.label);
        continue;
      }

      if (field.list) {
        const lines = asStringArray(entry[field.key], field.list + 2).map(cleanLine);
        if (lines.length !== field.list) {
          fatal = REASON.shape;
          break;
        }
        const kept: string[] = [];
        for (const line of lines) {
          const check = checkLine(line, ROW_MAX_WORDS, state);
          if (check.fatal) {
            fatal = check.fatal;
            break;
          }
          if (check.issues.length) {
            droppedIssues = droppedIssues.concat(check.issues);
            continue;
          }
          kept.push(line);
          keep(line);
        }
        if (fatal) break;
        // Protokół bez ani jednego kroku nie jest protokołem, więc tu nie ma
        // czego oddawać — ten wariant odpada tak jak wcześniej.
        if (kept.length === 0) {
          fatal = REASON.noRows;
          break;
        }
        frame[field.key] = kept;
        if (kept.length < field.list) droppedFields.push(field.label);
        continue;
      }

      // Pole pojedyncze (teza, pytanie, puenta) nie ma „wiersza do wycięcia":
      // bez tego zdania kadr jest innym układem, więc odmowa zostaje twarda.
      const line = cleanLine(entry[field.key]);
      const check = checkLine(line, null, state);
      if (check.fatal) {
        fatal = check.fatal;
        break;
      }
      if (check.issues.length) {
        // Teza nie ma z czego wyciąć wiersza, więc kadr zostaje bez swojego
        // zdania: marker jest ten sam co przy wyczyszczonej liście, a raport
        // i tak pokaże rzemiosło z `issues` (patrz `deathCause`).
        droppedIssues = droppedIssues.concat(check.issues);
        fatal = REASON.noRows;
        break;
      }
      frame[field.key] = line;
      keep(line);
    }

    if (fatal) {
      rejected++;
      deadReasons.push(...uniqueLabels(deathCause(fatal, droppedIssues)));
      continue;
    }

    // Opis i pytanie są dobrowolne: gdy model napisze powtórkę kadru, wolimy
    // oddać kadr bez opisu niż odrzucić cały wariant (darmowy tier liczy
    // każde wywołanie, nie każde pole).
    const frameLines = [frame.primary, frame.closing, frame.steps, frame.cost, frame.forfeit]
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    const caption = cleanLine(entry.caption);
    if (
      caption.length >= 40 &&
      caption.length <= 480 &&
      !isPolishCopy(caption) &&
      !repeatsFrame(caption, frameLines)
    ) {
      frame.caption = caption;
    }
    const question = cleanLine(entry.question);
    if (question && !isPolishCopy(question) && auditLine(question, 20).ok) {
      frame.question = question;
    }
    // Odcisk całego kadru: dwa warianty z tym samym zdaniem, ale innymi
    // krokami, to nadal ten sam materiał.
    const frameKey = fingerprints.join("|");
    if (seen.has(frameKey)) {
      rejected++;
      deadReasons.push(REASON.duplicate);
      continue;
    }
    seen.add(frameKey);
    for (const fp of fingerprints) seen.add(fp);
    frame.archetype = asString(entry.archetype, "unlabeled");
    frame.genericRisk = asNumber(entry.generic_risk, 5);
    if (droppedFields.length > 0) {
      const droppedReasons = uniqueLabels(droppedIssues);
      frame.droppedFields = droppedFields;
      frame.droppedReasons = droppedReasons;
      trimReasons.push(...droppedReasons);
    }
    accepted.push(frame);
  }

  accepted.sort((a, b) => Number(a.genericRisk) - Number(b.genericRisk));
  return {
    frames: accepted.slice(0, count),
    rejected,
    rejectedDetails: tally(deadReasons),
    trimmedDetails: tally(trimReasons),
  };
}

/**
 * „Żaden wiersz nie przeszedł kontroli" nie jest winą samą w sobie — wyczyściło
 * je rzemiosło pojedynczych zdań, więc raportujemy rzemiosło. Inaczej pusta
 * lista kończyłaby się radą o zmianie tematu, gdy temat był dobry.
 */
function deathCause(fatal: string, issues: string[]): string[] {
  return CRAFT_DEATHS.has(fatal) && issues.length > 0 ? issues : [fatal];
}

/** Jedno zdanie po polsku: UI wiesza je bez zmian tam, gdzie nie ma co pokazać. */
export function buildFrameNotice(
  format: FrameFormat,
  rejected: number,
  details: readonly string[] = [],
): string {
  if (rejected <= 0) {
    return `Model nie oddał żadnego wariantu formatu „${format.label}" — spróbuj ponownie.`;
  }
  if (details.length === 0) {
    return `Model dał ${rejected} warianty formatu „${format.label}" i żaden nie trafił do układu — spróbuj ponownie.`;
  }
  const cause = String(details[0]).replace(/\s\(\d+\)$/, "");
  const advice = ADVICE[cause] ?? CRAFT_ADVICE;
  return `Z ${rejected} wariantów formatu „${format.label}" nie przeszedł żaden, a powód był taki: ${details.join(", ")} — ${advice}.`;
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
        rejectedDetails: [],
        trimmedDetails: [],
        error: "Brak klucza GEMINI_API_KEY — generator kadrów nie ma skąd brać treści.",
      });
    }

    try {
      const parsed = await generateJsonWithFallback({
        contents: buildFramePrompt(format, topic, exclude),
        temperature: 1.0,
      });
      const { frames, rejected, rejectedDetails, trimmedDetails } = rankFrameCandidates(
        parsed?.frames,
        format,
        exclude,
        count,
      );

      if (frames.length === 0) {
        return res.json({
          frames: [],
          rejected,
          rejectedDetails,
          trimmedDetails,
          notice: buildFrameNotice(format, rejected, rejectedDetails),
        });
      }
      // `trimmedDetails` idzie razem z udaną odpowiedzią: kadr z wyciętym
      // wierszem jest oddany uczciwie tylko wtedy, gdy UI może powiedzieć, co
      // wypadło i dlaczego.
      return res.json({ frames, rejected, rejectedDetails, trimmedDetails, format: format.id });
    } catch (error) {
      console.error("Błąd wypełniania kadru:", error);
      return sendDegraded(res, {
        frames: [],
        rejected: 0,
        rejectedDetails: [],
        trimmedDetails: [],
        error: "Wypełnianie kadru nie udało się — model nie odpowiedział.",
      });
    }
  });
}
