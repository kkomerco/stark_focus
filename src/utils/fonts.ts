/**
 * Canvas NIE pobiera fontów, których potrzebuje — używa tylko tych, które
 * są już w `document.fonts`. Rodziny markowe (Cinzel, Cormorant Garamond,
 * Plus Jakarta Sans, Space Grotesk) pojawiają się wyłącznie w `ctx.font`,
 * więc bez tego modułu każdy eksport wychodził w Arial/Georgia.
 *
 * `document.fonts.load()` wymusza ściągnięcie konkretnego cięcia (weight),
 * a nie całej rodziny — dlatego spec jest parami `weight family`, dokładnie
 * takimi, jakich używa renderer.
 */
const BRAND_FONT_SPECS = [
  '700 64px "Cinzel"',
  '900 64px "Cinzel"',
  '400 32px "Cormorant Garamond"',
  '700 64px "Cormorant Garamond"',
  '800 64px "Cormorant Garamond"',
  '900 64px "Cormorant Garamond"',
  '400 32px "Inter"',
  '600 32px "Inter"',
  '700 64px "Inter"',
  '900 64px "Inter"',
  '400 32px "Plus Jakarta Sans"',
  '500 32px "Plus Jakarta Sans"',
  '600 32px "Plus Jakarta Sans"',
  '700 64px "Plus Jakarta Sans"',
  '800 64px "Plus Jakarta Sans"',
  '900 64px "Plus Jakarta Sans"',
  '500 24px "Space Grotesk"',
  '600 24px "Space Grotesk"',
  '700 24px "Space Grotesk"',
  '600 24px "JetBrains Mono"',
  '700 24px "JetBrains Mono"',
];

let loading: Promise<void> | null = null;

/** Idempotentne: pierwsze wołanie ściąga fonty, kolejne czekają na ten sam promise. */
export function ensureBrandFonts(): Promise<void> {
  if (!loading) {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    loading = fonts
      ? Promise.all(BRAND_FONT_SPECS.map((spec) => fonts.load(spec).catch(() => null))).then(
          () => undefined,
        )
      : Promise.resolve();
  }
  return loading;
}

/**
 * Canvas narysowany przed dotarciem fontów zostaje w krój awaryjny — wywołaj
 * przed każdym renderem klatki przeznaczonej do eksportu.
 */
export async function prepareCanvasFonts(
  canvas: HTMLCanvasElement | null,
  redraw: () => void,
): Promise<void> {
  await ensureBrandFonts();
  if (canvas) redraw();
}
