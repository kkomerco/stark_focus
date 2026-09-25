/**
 * Podpowiedzi do dziennika publikacji.
 *
 * Wpis do ledgera to pięć sekund roboty, ale tylko wtedy, kiedy nie trzeba
 * przepisywać tego, co aplikacja już skądś wie. Stąd `guessLedgerFields`:
 * z nazwy zadania, formatu i treści materiału odgadujemy gatunek, czas
 * trwania i układ, a użytkownik tylko potwierdza albo poprawia.
 */
import type { PlannerTask } from "../types";

export interface LedgerGuess {
  kind: "reel" | "post" | "carousel";
  format: string;
  hook: string;
  /** Nazwa formatu do wpisania w polu „Format / układ". */
  formatLabel: string;
}

const FORMAT_LABELS: Record<string, string> = {
  viral_loop_6s: "Pętla 6s",
  hook_payoff_5s: "Wstrząs 5s",
  dynamic_broll_cut: "B-Roll Cut",
  three_phases: "3 Fazy 9s",
  five_beats_20s: "5 Taktów 20s",
  none_solid: "Cytat na czerni",
  protocol_list: "Protokół",
  cost_vs_reward: "Koszt",
  concept_diagram: "Diagram",
  studio_wall_3d: "Napis w scenie",
  grid_2x2: "Kolaż",
  single: "Post 1:1",
  split_horizontal: "Podział poziomy",
};

function firstLine(text: string): string {
  return (text || "").split("\n")[0].trim();
}

function kindFromText(text: string): LedgerGuess["kind"] {
  const lower = text.toLowerCase();
  if (lower.includes("karuzel") || lower.includes("carousel") || lower.includes("slajd")) {
    return "carousel";
  }
  if (lower.includes("rolk") || lower.includes("reel")) return "reel";
  return "post";
}

/** Sekundy z nazwy („Rolka 20s”, „5 Taktów 20 s”) — bez tego format jest pusty. */
function secondsFromText(text: string): number | null {
  const match = /(\d{1,2})\s*s/i.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 60 ? value : null;
}

export function guessLedgerFields(input: {
  task?: PlannerTask | null;
  text?: string;
  format?: string;
}): LedgerGuess {
  const haystack = [input.task?.title, input.task?.format, input.format, input.text]
    .filter(Boolean)
    .join(" ");
  const kind = kindFromText(haystack);
  const seconds = secondsFromText(haystack);
  const formatKey = input.format || input.task?.format || "";

  const formatLabel =
    FORMAT_LABELS[formatKey] ??
    (kind === "reel" && seconds
      ? `Rolka ${seconds}s`
      : kind === "carousel"
        ? "Karuzela"
        : "Post 1:1");

  return {
    kind,
    format: formatKey || formatLabel.toLowerCase().replace(/\s+/g, "_"),
    formatLabel,
    hook:
      firstLine(input.text ?? "") ||
      firstLine(input.task?.payload?.reel?.hook ?? "") ||
      firstLine(input.task?.payload?.post?.text ?? "") ||
      (input.task?.title ?? ""),
  };
}

export function formatLabelFor(key: string): string {
  return FORMAT_LABELS[key] ?? key;
}
