/**
 * Strefy, które interfejs platformy zakrywa na telefonie. Liczone dla kadru
 * 1080x1920 i skalowane na inne wysokości — dotąd każda warstwa aplikacji
 * miała własną liczbę (przewodnik po podglądzie rysował 210/360, treść
 * siedziała na 0,42, a handle na 0,88, czyli w środku strefy, którą sam
 * przewodnik oznaczał na czerwono).
 */
export const REEL_SAFE = { top: 250, bottom: 480, side: 120 } as const;

/** Kadr kwadratowy i 4:5 idzie do feedu — tam nic nie leży na wierzchu. */
const FEED_INSET = 0.08;

export interface SafeBand {
  top: number;
  bottom: number;
  side: number;
}

/**
 * `video` = kadr, który będzie oglądany w rolce (nakładka interfejsu),
 * w przeciwnym razie kadr feedowy, gdzie liczy się tylko margines.
 */
export function safeBand(height: number, width: number, video: boolean): SafeBand {
  if (!video) {
    return {
      top: Math.round(height * FEED_INSET),
      bottom: Math.round(height * (1 - FEED_INSET)),
      side: Math.round(width * 0.08),
    };
  }
  const scale = height / 1920;
  return {
    top: Math.round(REEL_SAFE.top * scale),
    bottom: Math.round(height - REEL_SAFE.bottom * scale),
    side: Math.round(REEL_SAFE.side * scale),
  };
}

/** Środek bezpiecznego pasa — tam, między interfejsem TikToka a paskiem IG, widać wszystko. */
export function bandCenter(band: SafeBand): number {
  return (band.top + band.bottom) / 2;
}

/** Góra bloku o danej wysokości, wyśrodkowana w pasie. */
export function centeredTop(blockHeight: number, band: SafeBand): number {
  return Math.round(band.top + (band.bottom - band.top - blockHeight) / 2);
}

/**
 * Podłoga pisma. 48 px przy 1080 px szerokości to minimum, które da się
 * przeczytać na telefonie trzymanym w jednej ręce; wszystko poniżej było
 * w praktyce dekoracją, nie tekstem.
 */
export const MIN_TEXT_PX = 48;

/**
 * Który tekst wolno zmniejszyć poniżej 48 px: tylko ten, który ktoś świadomie
 * ustawił mniejszy (stopka, nadtytuł, podpis warstwy z analizy linku).
 * Reszta — teza, wiersze, dopiski — musi zostać czytelna, bo inaczej kadr
 * wygląda jak plakat, tylko nikt go nie przeczyta z telefonu.
 */
export function floorFor(desired: number): number {
  return Math.min(MIN_TEXT_PX, desired);
}
