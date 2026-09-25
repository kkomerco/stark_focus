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
 * ANIMACJA WEJŚCIA SŁÓW.
 *
 * Całe zdanie wchodzące jednym fade'em to dziś połowa rolek w tej niszy i
 * wygląda jak szablon. Słowo po słowie, z lekkim niedobrzmiem następnego,
 * czyta się tam, gdzie widz i tak patrzy — na kciuk zatrzymany nad treścią.
 *
 * `overlap > 1` steruje tym, jak bardzo wejścia na siebie zachodzą: przy 1,0
 * słowa wchodziłyby pojedynczo i zdanie trwałoby zbyt długo, przy ~1,6 idzie
 * jak fala. Zwraca alfa 0-1 dla każdego słowa; 1 = już na swoim miejscu.
 */
export function wordStagger(count: number, reveal: number, overlap = 1.6): number[] {
  if (count <= 0) return [];
  if (reveal >= 1) return Array.from({ length: count }, () => 1);
  if (reveal <= 0) return Array.from({ length: count }, () => 0);
  const window = count * overlap;
  return Array.from({ length: count }, (_, i) => Math.min(1, Math.max(0, reveal * window - i)));
}

/** Wejście wygładzone, nie liniowe — kadr ma „siadać", nie jechać jednostajnie. */
export function easedReveal(reveal: number): number {
  return easeOutCubic(reveal);
}

/**
 * Ile w górę wchodzi słowo, zanim znajdzie się na linii.
 * Jedna czwarta stopnia pisma: dość, żeby ruch było widać, za mało, żeby
 * litera uciekała z linii bazowej i kadr się trząsł.
 */
export function wordRise(alpha: number, fontSize: number): number {
  return (1 - Math.min(1, Math.max(0, alpha))) * fontSize * 0.25;
}

/**
 * Skok tła do 12 klatek na sekundę przy tekście idącym w 30.
 *
 * To trik z montażu „dokumentalnego": grafika klatkuje, tekst płynie, kadr
 * przestaje wyglądać na wygenerowany. Kwantujemy tylko warstwę tła — przy
 * kwantowaniu tekstu litera skacze i nie da się tego czytać.
 */
export function quantizeToFps(timeSec: number, fps = 12): number {
  if (!Number.isFinite(timeSec) || timeSec <= 0) return 0;
  return Math.floor(timeSec * fps) / fps;
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
