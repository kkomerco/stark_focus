// src/utils/brollPicker.ts
// Auto-dobór klipu B-Roll z biblioteki na podstawie treści (keywords) i motywu (theme).
// Działa zarówno po stronie klienta jak i serwera (brak zależności DOM).
import { CINEMATIC_BROLL_LIBRARY, BrollScene } from "../data/brollLibrary";

export interface BrollMatch {
  scene: BrollScene;
  score: number;
  matchedKeywords: string[];
  matchedTags: string[];
  /** Krótkie uzasadnienie wyboru (offline lub od AI). */
  confidenceReason: string;
}

/** Punktuj każdą scenę: trafienia keywords w tekście + zgodność motywu wizualnego. */
export function pickBroll(text: string, theme?: string): BrollMatch {
  const lower = text.toLowerCase();
  let best: Omit<BrollMatch, "confidenceReason"> | null = null;

  for (const scene of CINEMATIC_BROLL_LIBRARY) {
    const matchedKeywords = scene.matchKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
    const matchedTags = (scene.tags || []).filter((t) => lower.includes(t.toLowerCase()));
    let score = matchedKeywords.length * 2 + matchedTags.length * 2;
    if (theme && scene.suggestedTheme === theme) score += 1.5;

    if (!best || score > best.score) {
      best = { scene, score, matchedKeywords, matchedTags };
    }
  }

  // Fallback: pierwsza scena (biblioteka jest cała "on-brand")
  const chosen = best ?? {
    scene: CINEMATIC_BROLL_LIBRARY[0],
    score: 0,
    matchedKeywords: [],
    matchedTags: [],
  };
  const hits = chosen.matchedKeywords.length + chosen.matchedTags.length;
  return {
    ...chosen,
    confidenceReason:
      hits > 0
        ? `Dobrano "${chosen.scene.name}" na podstawie ${hits} trafień (score ${chosen.score})`
        : `Brak trafień — domyślna scena STARK: ${chosen.scene.name}`,
  };
}

/** Ranking — top N scen (sortowane po score). Do wyboru potwierdzonego przez AI. */
export function rankBroll(text: string, theme?: string, limit = 3): BrollMatch[] {
  const lower = text.toLowerCase();
  const scored = CINEMATIC_BROLL_LIBRARY.map((scene) => {
    const matchedKeywords = scene.matchKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
    const matchedTags = (scene.tags || []).filter((t) => lower.includes(t.toLowerCase()));
    let score = matchedKeywords.length * 2 + matchedTags.length * 2;
    if (theme && scene.suggestedTheme === theme) score += 1.5;
    const hits = matchedKeywords.length + matchedTags.length;
    return {
      scene,
      score,
      matchedKeywords,
      matchedTags,
      confidenceReason:
        hits > 0
          ? `Dobrano "${scene.name}" na podstawie ${hits} trafień (score ${score})`
          : `Brak trafień — domyślna scena STARK: ${scene.name}`,
    };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, scored.length)));
}

/** Skrót: gotowy opis do wklejenia w studio. */
export function brollSuggestion(text: string, theme?: string): BrollMatch {
  return pickBroll(text, theme);
}
