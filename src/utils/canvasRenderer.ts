// Fasada zachowująca dotychczasowe API modułu canvasRenderer po podziale na src/utils/canvas/.
// Wszyscy dotychczasowi konsumenci (import z "../utils/canvasRenderer") działają bez zmian.
// W nowym kodzie importuj bezpośrednio z modułów src/utils/canvas/.
export type { SlideData } from "../types";
export type { RenderSlideOptions } from "./canvas/slide-entry";
export { stripHighlightSyntax, parseLineTokens, wrapTextLines } from "./canvas/tokens";
export { drawImageCover, drawProceduralWall, getFontFamilySpec } from "./canvas/wall";
export { draw3DWallQuoteSlide } from "./canvas/slides-three-d-wall-quote";
export { draw4GridCollageSlide } from "./canvas/slides-grid-collage";
export { drawMinimalBlackQuoteSlide } from "./canvas/slides-black-quote";
export { drawMonolithLedgerSlide } from "./canvas/slides-monolith-ledger";
export { renderUniversalLayout } from "./canvas/universal";
export { computeFittedSlideLayout, getCarouselFontFamilyCSS } from "./canvas/carousel";
export { drawSlideToCanvas } from "./canvas/slide-entry";
export { exportSlideToBlob, exportAllSlidesAsZip } from "./canvas/export";
