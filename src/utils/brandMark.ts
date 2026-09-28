/**
 * Znak marki — to, co odróżnia naszą czarną kartę od kilku tysięcy innych
 * czarnych kart ze szeryfem.
 *
 * Rozpoznawalność kupuje się powtórzeniem tego samego znaku na każdym kadrze,
 * nie ładnością pojedynczego układu. Dlatego są dokładnie dwa elementy i
 * rysuje je jedna funkcja, wywoływana na końcu każdego renderu: podgląd, PNG,
 * JPG i archiwum ZIP muszą mieć identyczny sygnet, inaczej to, co zatwierdził
 * właściciel konta, różni się od tego, co poszło na serwer.
 */
import { BRAND_ACCENT } from "./starkBrandTheme";

export interface BrandMarkOptions {
  width: number;
  height: number;
  accent?: string;
}

/** Pozycja szyny — jedno miejsce, żeby dało się ją sprawdzić testem. */
export function brandMarkGeometry(options: BrandMarkOptions) {
  const { width, height } = options;
  const spineWidth = Math.max(4, Math.round(width * 0.0065));
  const spineX = Math.round(width * 0.055);
  return {
    spineX,
    spineWidth,
    spineTop: 0,
    spineHeight: height,
    dotRadius: Math.max(7, Math.round(width * 0.012)),
    dotX: spineX + spineWidth / 2,
    dotY: Math.round(height - height * 0.075),
  };
}

export function drawBrandMark(ctx: CanvasRenderingContext2D, options: BrandMarkOptions): void {
  const { accent = BRAND_ACCENT } = options;
  const g = brandMarkGeometry(options);

  ctx.save();
  ctx.fillStyle = accent;
  ctx.fillRect(g.spineX, g.spineTop, g.spineWidth, g.spineHeight);
  ctx.beginPath();
  ctx.arc(g.dotX, g.dotY, g.dotRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
