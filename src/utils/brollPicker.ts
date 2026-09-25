// src/utils/brollPicker.ts
// Auto-dobór klipu B-Roll z biblioteki na podstawie treści (keywords) i motywu (theme).
// Działa zarówno po stronie klienta jak i serwera (brak zależności DOM).
import { CINEMATIC_BROLL_LIBRARY, BrollScene } from "../data/brollLibrary";
import { hashKey } from "../lib/hash";

export interface BrollMatch {
  scene: BrollScene;
  score: number;
  matchedKeywords: string[];
  matchedTags: string[];
  /** Krótkie uzasadnienie wyboru (offline lub od AI). */
  confidenceReason: string;
}

/**
 * Trafienie liczy się tylko jako osobne słowo. `lower.includes("iron")`
 * łapało "environment", a `"time"` łapało "sometimes" — przez to dobór
 * potrafił trafić w zupełnie obcą scenę.
 */
function containsWord(haystack: string, needle: string): boolean {
  const escaped = needle.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!escaped) return false;
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

interface SceneScore {
  scene: BrollScene;
  score: number;
  matchedKeywords: string[];
  matchedTags: string[];
}

function scoreScene(scene: BrollScene, lower: string, theme?: string): SceneScore {
  const matchedKeywords = scene.matchKeywords.filter((kw) => containsWord(lower, kw));
  const matchedTags = (scene.tags || []).filter((t) => containsWord(lower, t));
  let score = matchedKeywords.length * 2 + matchedTags.length * 2;
  if (theme && scene.suggestedTheme === theme) score += 1.5;
  return { scene, score, matchedKeywords, matchedTags };
}

function describe(match: SceneScore): string {
  const hits = match.matchedKeywords.length + match.matchedTags.length;
  return hits > 0
    ? `Dobrano "${match.scene.name}" na podstawie ${hits} trafień (score ${match.score})`
    : `Brak trafień w słowach-kluczach — ujęcie po odcisku treści: ${match.scene.name}`;
}

/**
 * Punktuj każdą scenę: trafienia keywords w tekście + zgodność motywu.
 * `excludeIds` pozwala rotować klipy w dłuższej paczce (autopilot), inaczej
 * każda rolka z tym samym słowem-kluczem dostawałaby ten sam B-roll.
 */
export function pickBroll(text: string, theme?: string, excludeIds: string[] = []): BrollMatch {
  const lower = String(text || "").toLowerCase();
  const excluded = new Set(excludeIds);

  let best: SceneScore | null = null;
  for (const scene of CINEMATIC_BROLL_LIBRARY) {
    if (excluded.has(scene.id)) continue;
    const scored = scoreScene(scene, lower, theme);
    // Scena kandyduje dopiero z realnym trafieniem — dawniej `best` ustawiał
    // się już przy pierwszej scenie (nawet ze score 0), więc gałąź fallbacku
    // poniżej była nieosiągalna.
    if (scored.score <= 0) continue;
    if (!best || scored.score > best.score) best = scored;
  }

  const chosen: SceneScore = best ?? {
    scene: fallbackScene(lower, excluded),
    score: 0,
    matchedKeywords: [],
    matchedTags: [],
  };

  return { ...chosen, confidenceReason: describe(chosen) };
}

/**
 * Bez trafień nie ma „domyślnej sceny STARK": stały default sprawiał, że każda
 * treść poza słowami-kluczami (np. polski szkic) dostawała to samo ujęcie.
 * Odcisk tekstu rozbija wybór po bibliotece, więc jest powtarzalny, ale nie
 * identyczny dla wszystkiego.
 */
function fallbackScene(text: string, excluded: Set<string>): BrollScene {
  const pool = CINEMATIC_BROLL_LIBRARY.filter((scene) => !excluded.has(scene.id));
  const list = pool.length > 0 ? pool : CINEMATIC_BROLL_LIBRARY;
  return list[hashKey(text) % list.length];
}

/** Ranking — top N scen (sortowane po score). Do wyboru potwierdzonego przez AI. */
export function rankBroll(text: string, theme?: string, limit = 3): BrollMatch[] {
  const lower = String(text || "").toLowerCase();
  return CINEMATIC_BROLL_LIBRARY.map((scene) => scoreScene(scene, lower, theme))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, CINEMATIC_BROLL_LIBRARY.length)))
    .map((match) => ({ ...match, confidenceReason: describe(match) }));
}

/** Skrót: gotowy opis do wklejenia w studio. */
export function brollSuggestion(text: string, theme?: string): BrollMatch {
  return pickBroll(text, theme);
}
