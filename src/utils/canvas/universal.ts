// =========================================================================
// UNIWERSALNY ROUTER RENDEROWANIA UKĹADĂ“W
// =========================================================================
// Uniwersalny router renderowania układów (na podstawie UniversalLayoutSpec).
import type { UniversalLayoutSpec } from "../../types";
import { draw4GridCollageSlide } from "./slides-grid-collage";
import { drawMinimalBlackQuoteSlide } from "./slides-black-quote";

export function renderUniversalLayout(
  canvas: HTMLCanvasElement,
  spec: UniversalLayoutSpec,
  images: (CanvasImageSource | null)[] = [],
  options: {
    width?: number;
    height?: number;
    fontFamily?: string;
    textScale?: number;
    handle?: string;
    fontColor?: "white" | "black";
  } = {},
) {
  const width = options.width || 1080;
  const height = options.height || 1080;
  const handle = options.handle || "stark_focus";
  const fontFamily = options.fontFamily || "sans";
  const textScale = options.textScale || 1.0;
  const fontColor: "white" | "black" =
    options.fontColor ||
    spec.fontColorMode ||
    (spec.textLayers[0]?.color === "#000000" ||
    spec.textLayers[0]?.color === "#161920" ||
    spec.textLayers[0]?.color === "#111215"
      ? "black"
      : "white");

  // Format 1: KolaĹĽ 4 KadrĂłw
  if (spec.gridType === "grid_2x2") {
    const centerText = spec.textLayers[0]?.text || "This winter";
    draw4GridCollageSlide(canvas, {
      width,
      height,
      centerText,
      images,
      handle,
      fontColor,
    });
    return;
  }

  // Format 2: DomyĹ›lny, nieskazitelny Cytat na Czerni (9:16)
  const l1 = spec.textLayers[0]?.text?.trim() || "Silence cannot be misquoted.";
  // Subtext jest uwzglÄ™dniany TYLKO jeĹ›li uĹĽytkownik celowo dodaĹ‚ 2. warstwÄ™ z tekstem
  const l2 = spec.textLayers.length > 1 ? spec.textLayers[1]?.text?.trim() || "" : "";

  drawMinimalBlackQuoteSlide(canvas, {
    width,
    height,
    mainText: l1,
    subText: l2,
    align: "left",
    fontFamily: spec.fontFamilyCustom || fontFamily,
    textScale,
    fontColor,
    handle,
  });
}
