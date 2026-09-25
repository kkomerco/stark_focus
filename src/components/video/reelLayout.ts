/**
 * Geometria klatek rolki — czysta, bez canvasu i bez Reacta.
 *
 * Wynika to z przymusu, nie z estetyki: pętla podglądu żyje na
 * `requestAnimationFrame`, a w tle przeglądarki nie dostaje ani jednej klatki.
 * Dopóki reguły „co widać o której sekundzie" siedziały w środku renderu, nie
 * dało się sprawdzić niczym poza okiem człowieka — a oko tej nocy jest
 * zamknięte na klucz.
 */
import { getPhraseTimeline, type PacingMode } from "./reel-helpers";

/** Ile sekund zajmuje wejście nowej frazy (maska lewo→prawo). */
export const REVEAL_SECONDS = 0.28;
/** Ile sekund przed końcem kadr wraca do stanu z klatki zero. */
export const LOOP_TAIL_SECONDS = 0.4;
/** Zaciemnienie poprzednich zdań pod bieżącym. */
export const DIMMED_OPACITY = 0.28;

export interface ReelBlock {
  text: string;
  opacity: number;
  /** 0-1: jak szeroko odsłonięty jest blok (maska lewo→prawo). */
  reveal: number;
}

/**
 * Które zdania są widoczne w danej sekundzie rolki.
 *
 * Zdania wchodzą i zostają ściemnione — trzy migające bloki wyglądały jak
 * awaria, nie jak narracja. Pierwszy kadr ma pełną nieprzezroczystość od zera:
 * decyzja o przewinięciu zapada około 1,7 s, a fade-in od zera znaczy czarny
 * ekran w tym jedynym momencie, który się liczy.
 */
export function reelBlocksAt(options: {
  phrases: string[];
  timeSec: number;
  durationSec: number;
  pacing: PacingMode;
}): ReelBlock[] {
  const { phrases, timeSec, durationSec, pacing } = options;
  const first = (phrases[0] || "").trim();

  if (phrases.length <= 1) {
    return first ? [{ text: first, opacity: 1, reveal: 1 }] : [];
  }

  const timeline = getPhraseTimeline(phrases, durationSec, pacing);

  if (timeSec >= durationSec - LOOP_TAIL_SECONDS) {
    return [{ text: first, opacity: 1, reveal: 1 }];
  }

  let active = 0;
  for (let index = 0; index < timeline.length; index++) {
    if (timeSec >= timeline[index].start) active = index;
  }

  return timeline
    .slice(Math.max(0, active - 2), active + 1)
    .map((item, index, arr) => {
      const isLast = index === arr.length - 1;
      const age = timeSec - item.start;
      if (!isLast) return { text: item.text, opacity: DIMMED_OPACITY, reveal: 1 };
      return {
        text: item.text,
        opacity: item.index === 0 ? 1 : Math.max(0, Math.min(1, age / 0.12)),
        reveal: item.index === 0 ? 1 : easeOutCubic(age / REVEAL_SECONDS),
      };
    })
    .filter((block) => block.text.trim() !== "");
}

function easeOutCubic(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Pionowy układ bloków w bezpiecznym pasie.
 *
 * Odstęp dokłada się DO pełnej wysokości bloku, nie od środka linii do środka
 * następnej — ta pomyłka sprawiła, że przy trzech zdaniach trzecie wchodziło
 * na drugie i kolumna stawała się nieczytelna.
 */
export function stackBlocks(
  heights: number[],
  band: { top: number; bottom: number },
  gap: number,
): number[] {
  const total =
    heights.reduce((sum, height) => sum + height, 0) + gap * Math.max(0, heights.length - 1);
  let cursor = Math.max(band.top, band.top + (band.bottom - band.top - total) / 2);

  return heights.map((height) => {
    const top = cursor;
    cursor += height + gap;
    return top;
  });
}
