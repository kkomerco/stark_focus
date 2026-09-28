/**
 * Znak marki — klamry narożne pola treści.
 *
 * Rozpoznawalność kupuje się powtórzeniem tego samego znaku na każdym kadrze,
 * nie ładnością pojedynczego układu. Klamry nie są ramką wokół całego kadru:
 * obejmują pole, w którym leży treść, więc na cytacie siedzą przy zdaniu, a na
 * kolażu przy siatce zdjęć. Karmazynowy jest tylko górny lewy róg — jeden
 * akcent na kadr, zgodnie z paletą marki.
 *
 * Rysuje to jedna funkcja wywoływana na końcu `renderUniversalLayout`, nigdy
 * wewnątrz pojedynczych układów: podgląd, PNG i archiwum ZIP muszą mieć
 * identyczny sygnet.
 */
import { BRAND_ACCENT } from "./starkBrandTheme";

/** Pole faktycznie zajęte przez treść kadru — z geometrii samego układu. */
export interface InkBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface BracketGeometry {
  left: number;
  top: number;
  right: number;
  bottom: number;
  arm: number;
  lineWidth: number;
}

/**
 * Odstęp od treści i długość ramienia są liczone z szerokości kadru, a nie z
 * rozmiaru pisma — ten sam sygnet musi wyglądać identycznie na kadrze 1080 i
 * na pomniejszonym podglądzie w studiu.
 */
export function bracketGeometry(
  width: number,
  height: number,
  box: InkBox,
  minInsetRatio = 0.035,
): BracketGeometry {
  const pad = Math.round(width * 0.042);
  const minInset = Math.round(width * minInsetRatio);
  return {
    left: Math.max(minInset, box.left - pad),
    right: Math.min(width - minInset, box.right + pad),
    top: Math.max(minInset, box.top - pad),
    bottom: Math.min(height - minInset, box.bottom + pad),
    arm: Math.round(width * 0.05),
    lineWidth: Math.max(2, Math.round(width * 0.0028)),
  };
}

export function drawBrandBrackets(
  ctx: CanvasRenderingContext2D,
  options: { width: number; height: number; box: InkBox; onLight?: boolean; accent?: string },
): void {
  const { width, height, box, onLight = false, accent = BRAND_ACCENT } = options;
  const g = bracketGeometry(width, height, box);
  const quiet = onLight ? "rgba(10, 11, 13, 0.34)" : "rgba(243, 240, 234, 0.30)";

  ctx.save();
  ctx.lineWidth = g.lineWidth;
  ctx.lineCap = "butt";
  const corners: Array<[number, number, number, number, string]> = [
    [g.left, g.top, 1, 1, accent],
    [g.right, g.top, -1, 1, quiet],
    [g.left, g.bottom, 1, -1, quiet],
    [g.right, g.bottom, -1, -1, quiet],
  ];
  for (const [x, y, dx, dy, color] of corners) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + dx * g.arm, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * g.arm);
    ctx.stroke();
  }
  ctx.restore();
}
