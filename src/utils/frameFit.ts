// src/utils/frameFit.ts
// Treść decyduje o układzie kadru.
//
// Radar, paczka dnia i strumień pomysłów oddawały studio posta goły tekst, a
// studio zawsze stawał w "Cytat na Czerni" — nawet gdy model napisał trzy
// fazy, listę kroków albo kontrast kosztów. Ten moduł składa to, co już
// wyszło z modelu, w układ, który ten kształt pokazuje. Nic tu nie jest
// dopisywane z banku treści: jeśli model dał jedno zdanie, kadr ma jedno
// zdanie, tylko w dobranej figurze.
import { UniversalLayoutSpec } from "../types";
import { StructuredContent, structuredSpec } from "./ideaLayout";

const LAYOUT_BY_GRID: Record<string, string> = {
  none_solid: "Cytat",
  protocol_list: "Protokół",
  cost_vs_reward: "Koszt i utrata",
  studio_wall_3d: "Napis w scenie",
  grid_2x2: "Kolaż",
};

export type FrameGrid = UniversalLayoutSpec["gridType"];

export interface FittedFrame {
  gridType: FrameGrid;
  content: StructuredContent;
  /** Skąd taki układ — do wyświetlenia obok kadru, żeby wybór nie był magią. */
  reason: string;
}

function words(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

/**
 * Ile słów zmieści jeden takt. Radar zwraca pod fazy całe akapity retoryki
 * (40+ słów) — to materiał na opis, nie na kadr 9:16, więc taki wiersz nie
 * wchodzi do listy kroków nawet jeśli format jest protokołem.
 */
const MAX_STEP_WORDS = 14;

/** "1.", "Step 1:", "- " — znaki wyliczenia, po których widać listę kroków. */
const ENUMERATED = /^\s*(?:\d+[.)]|step\s*\d+|rule\s*\d+|phase\s*\d+|[-*•])\s*/i;

/** Kontrast dwóch słupków: cena po lewej, to co się traci po prawej. */
const COST_MARKERS = /\b(cost|price|pay|paid|charge|tax|buys|bought|forfeit|trade|gave up)\b/i;

const NUMBER_MARKERS = /\b\d+([.,]\d+)?\s*(%|percent|hours|minutes|days|years|reps|sets)?\b/i;

function normalizeLines(lines: (string | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = (raw || "").replace(/\s+/g, " ").trim();
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

function stripEnumerators(lines: string[]): string[] {
  return lines.map((line) => line.replace(ENUMERATED, "").trim());
}

/**
 * Jedno zdanie to jeden kadr: cała siła w tym, żeby nie rozlało się na listę,
 * której model nie napisał.
 */
function singleLineFrame(text: string): FittedFrame {
  return {
    gridType: "none_solid",
    content: { primary: text },
    reason: "Jedno zdanie — układa się jako cytat.",
  };
}

/** Kontrast albo dwie kolumny: to, co się płaci, przeciw temu, co się traci. */
function contrastFrame(lines: string[]): FittedFrame {
  const half = Math.ceil(lines.length / 2);
  const short = (list: string[]) => list.filter((line) => words(line) <= MAX_STEP_WORDS);
  const closing = lines[lines.length - 1];
  const cost = short(lines.slice(1, half + 1));
  const seen = new Set(cost.map((line) => line.toLowerCase()));
  return {
    gridType: "cost_vs_reward",
    content: {
      primary: lines[0],
      cost,
      // Ten sam wers po obu stronach słupka wygląda jak błąd, nie jak kontrast.
      forfeit: short(lines.slice(half + 1)).filter(
        (line) => !seen.has(line.toLowerCase()) && words(line) <= MAX_STEP_WORDS,
      ),
      closing: words(closing) <= MAX_STEP_WORDS ? closing : "",
    },
    reason: "Treść mówi o koszcie i stracie — układa się w dwa słupki.",
  };
}

function listFrame(lines: string[]): FittedFrame {
  const steps = stripEnumerators(lines.slice(1))
    .filter(Boolean)
    .filter((line) => words(line) <= MAX_STEP_WORDS);
  const hasNumber = NUMBER_MARKERS.test(lines[0]);
  // Został sam akapit? To nie protokół, tylko cytat z długim opisem — lepiej
  // uczciwy cytat niż kadr, którego nikt nie przeczyta.
  if (steps.length === 0) return singleLineFrame(lines[0]);
  // Cyfra na kadr to ta największa: „4 h dziennie, 300 dni" uderza 300, nie 4.
  const figure = (lines[0].match(/\d+(?:[.,]\d+)?/g) ?? []).reduce(
    (best, value) => (Number(value.replace(",", ".")) > Number(best) ? value : best),
    "",
  );
  return {
    gridType: steps.length >= 4 ? "grid_2x2" : "protocol_list",
    content: {
      primary: lines[0],
      steps: steps.slice(0, 4),
      figure: hasNumber ? figure : "",
    },
    reason:
      steps.length >= 4
        ? "Cztery lub więcej punktów — kolaż z jednej siatki czyta się szybciej niż lista."
        : "Teza plus wyliczenie — protokół z krokami.",
  };
}

/**
 * Klucz: dostajemy to, co model już napisał (hook + fazy), i tylko układamy
 * to w figurę. `hint` to ewentualna podpowiedź formatu z analizy linku.
 */
export function fitFrame(
  input: { hook?: string; phrases?: string[]; caption?: string },
  hint?: string,
): FittedFrame {
  const lines = normalizeLines([input.hook, ...(input.phrases ?? [])]);

  if (lines.length === 0) {
    const fromCaption = normalizeLines((input.caption || "").split(/[.!?\n]/).slice(0, 3));
    if (fromCaption.length > 0) return fitFrame({ hook: fromCaption[0] }, hint);
    return singleLineFrame("Silence cannot be misquoted.");
  }

  if (hint === "studio_wall_3d" || /wall|3d|neon|billboard/i.test(hint || "")) {
    return {
      gridType: "studio_wall_3d",
      content: { primary: lines.join(" ") },
      reason: "Analiza wskazała napis w scenie — treść wchodzi na ścianę.",
    };
  }
  if (hint === "collage" || /kola|collage|grid/i.test(hint || "")) {
    const steps = stripEnumerators(lines.slice(1)).filter(Boolean);
    return {
      gridType: "grid_2x2",
      content: { primary: lines[0], steps: steps.slice(0, 4) },
      reason: "Format wskazuje na kolaż — cztery kadry z jednej treści.",
    };
  }

  if (lines.length === 1) return singleLineFrame(lines[0]);

  const joined = lines.join(" ");
  if (COST_MARKERS.test(joined) && lines.length >= 3) return contrastFrame(lines);
  return listFrame(lines);
}

/** Gotowy spec dla studia posta — to samo źródło co preset wybrany ręcznie. */
export function specFromFrame(frame: FittedFrame): UniversalLayoutSpec {
  return structuredSpec(
    LAYOUT_BY_GRID[frame.gridType] ?? "Cytat",
    frame.gridType,
    frame.content,
    {},
  );
}
