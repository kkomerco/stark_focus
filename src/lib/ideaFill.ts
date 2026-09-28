/**
 * Druga noga strumienia pomysłów.
 *
 * Tani prompt pyta tylko o tezę i układ, bo darmowa warstwa zrzuca zapytania,
 * przy których model ma napisać pięć pełnych kadrów naraz. Wiersze, pary i opis
 * dopisuje więc osobne zapytanie — w momencie, gdy człowiek zabiera kartę do
 * edytora. Płaci się za kadr użyty, nie za partię, z której czterech pomysłów
 * nikt by nie otworzył.
 */
import type { IdeaItem } from "../types";
import { starkCaption } from "./caption";
import { fetchJson } from "./fetchJson";

const asLine = (value: unknown, max = 300): string =>
  typeof value === "string"
    ? value.replace(/[*#"]/g, "").replace(/\s+/g, " ").trim().slice(0, max)
    : "";

const asLines = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value
        .map((entry) => asLine(entry))
        .filter(Boolean)
        .slice(0, max)
    : [];

/**
 * Dokleja to, co model dopisał pod wybraną tezą. Teza jest przypięta:
 * wypełnienie nie może jej wymienić na parafrazę, bo to ją człowiek wybrał,
 * nie to, co model uznał za lepsze zdanie na ten sam temat.
 */
export function applyFrameFill(idea: IdeaItem, frame: Record<string, unknown> | null): IdeaItem {
  const steps = asLines(frame?.steps, 4);
  const cost = asLines(frame?.cost, 3);
  const forfeit = asLines(frame?.forfeit, 3);
  const closing = asLine(frame?.closing);
  const figure = asLine(frame?.figure, 12);
  const caption = asLine(frame?.caption, 5000);

  return {
    ...idea,
    needsFill: false,
    structure: {
      ...idea.structure,
      statement: idea.hook,
      ...(steps.length ? { steps } : {}),
      // Para bez swojej połówki jest innym rzędem, nie rzędem krótszym.
      ...(cost.length && cost.length === forfeit.length ? { cost, forfeit } : {}),
      ...(closing ? { closing } : {}),
      ...(figure ? { figure } : {}),
    },
    caption: caption ? starkCaption(idea.hook, caption) : idea.caption,
  };
}

/**
 * Jedno zapytanie o pełny kadr dla jednej tezy. Awaria nie zamyka drogi do
 * studia: bez odpowiedzi oddajemy samą tezę i człowiek dopisuje wiersze ręcznie.
 */
export async function fillIdeaForPost(
  idea: IdeaItem,
  excludeHooks: string[] = [],
  signal?: AbortSignal,
): Promise<IdeaItem> {
  if (!idea.needsFill) return idea;
  try {
    const { data } = await fetchJson("/api/ai/frame-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layout: idea.layout ?? "none_solid",
        thesis: idea.hook,
        count: 1,
        excludeHooks,
      }),
      signal,
    });
    const frame = (Array.isArray(data.frames) ? data.frames : []).find(
      (entry) => entry && typeof entry === "object",
    ) as Record<string, unknown> | undefined;
    return applyFrameFill(idea, frame ?? null);
  } catch {
    return applyFrameFill(idea, null);
  }
}
