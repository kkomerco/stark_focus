import { hookFingerprint } from "./similarity";
import { publishedHookFingerprints } from "./published";
import { PlannerTaskPayload } from "../types";

/**
 * CICHA ANTY-POWTÓRKA.
 *
 * Aplikacja ma sama wiedzieć, co już poszło, bez pokazywania listy i bez
 * klikania „to było". Historią jest więc to, co realnie wyszło z programu:
 * zapisane posty, zadania w planerze i pomysły z generatora. Każdy silnik
 * treści (pomysły, paczka dnia, seria postów) dostaje tę samą listę odcisków
 * i ma jej nie powtarzać — także po to, żeby ten sam cytat nie wrócił po
 * dwóch tygodniach tylko dlatego, że zamknięto kartę przeglądarki.
 */

/** Ile odcisków jedzie do serwera: za każdy znak w prompcie się płaci. */
export const USED_HOOK_LIMIT = 300;

function firstLine(text: string | undefined): string {
  return (text || "").split("\n")[0].trim();
}

/** Tyle, ile naprawdę czytamy ze stanu — reszta `StarkFocusData` nas nie obchodzi. */
export interface UsedContentSource {
  posts?: { title?: string; caption?: string }[];
  planner_tasks?: { payload?: PlannerTaskPayload }[];
  used_idea_fingerprints?: string[];
  /** To, co realnie wyszło na konto — najmocniejsze źródło „tego już nie powtarzaj". */
  published?: { hook: string }[];
}

export function usedHookFingerprints(
  data: UsedContentSource | null,
  limit: number = USED_HOOK_LIMIT,
): string[] {
  if (!data) return [];

  const sources: string[] = [];
  for (const post of data.posts ?? []) {
    sources.push(post.title ?? "", firstLine(post.caption));
  }
  for (const task of data.planner_tasks ?? []) {
    sources.push(
      task.payload?.post?.text ?? "",
      task.payload?.reel?.hook ?? "",
      task.payload?.carousel?.title ?? "",
    );
  }
  sources.push(...(data.used_idea_fingerprints ?? []));
  sources.push(...publishedHookFingerprints(data.published ?? []));

  const seen = new Set<string>();
  for (const source of sources) {
    const fp = hookFingerprint(source);
    // Jedno słowo to nie treść — „post", „protokół" i inne etykiety zapychałyby
    // listę wykluczeń i fałszowały podobieństwo.
    if (fp.length >= 8) seen.add(fp);
  }
  return Array.from(seen).slice(-limit);
}
