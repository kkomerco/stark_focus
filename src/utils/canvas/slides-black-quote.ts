// Slajd "Minimalistyczny Cytat na Czerni".
import { wrapTextLines } from "./tokens";
import { getFontFamilySpec } from "./wall";

export function drawMinimalBlackQuoteSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    mainText: string;
    subText?: string;
    boldKeyword?: string;
    align?: "left" | "center";
    fontFamily?: string;
    textScale?: number;
    fontColor?: "white" | "black";
    handle?: string;
  },
) {
  const {
    width = 1080,
    height = 1920,
    mainText = "Silence cannot be misquoted.",
    subText = "",
    align = "left",
    fontFamily = "sans",
    textScale = 1.0,
    fontColor = "white",
    handle = "stark_focus",
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const isBlackFont = fontColor === "black";

  // WypeĹ‚nienie tĹ‚a: czarne dla biaĹ‚ej czcionki, czyste biaĹ‚e dla czarnej czcionki
  ctx.fillStyle = isBlackFont ? "#FFFFFF" : "#000000";
  ctx.fillRect(0, 0, width, height);

  const paddingX = Math.round(width * 0.12);
  const maxLineWidth = width - paddingX * 2;
  const fontSpec = getFontFamilySpec(fontFamily);

  const cleanMain = mainText.trim();
  const cleanSub = (subText || "").trim();
  const hasSub = cleanSub.length > 0;

  const textColor = isBlackFont ? "#0A0B0D" : "#FFFFFF";
  const textMutedColor = isBlackFont ? "rgba(10, 11, 13, 0.72)" : "rgba(255, 255, 255, 0.72)";
  const drawX = align === "center" ? width / 2 : paddingX;
  ctx.textAlign = align === "center" ? "center" : "left";

  if (!hasSub) {
    // TRYB 1: POJEDYNCZA MOCNA TEZA (np. 3-6 sĹ‚Ăłw na ekranie i koniec)
    let baseFontSize = height >= 1800 ? 84 : 70;
    if (cleanMain.length > 25) baseFontSize = height >= 1800 ? 74 : 62;
    if (cleanMain.length > 45) baseFontSize = height >= 1800 ? 64 : 52;
    if (cleanMain.length > 70) baseFontSize = height >= 1800 ? 54 : 44;

    const mainFontSize = Math.max(36, Math.round(baseFontSize * textScale));
    ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    const mainLines = wrapTextLines(ctx, cleanMain, maxLineWidth);

    const lineHeight = Math.round(mainFontSize * 1.34);
    const totalH = mainLines.length * lineHeight;

    // Idealne optyczne wyĹ›rodkowanie w pionie dla 9:16
    let curY = Math.round((height - totalH) * 0.46) + mainFontSize;

    mainLines.forEach((line) => {
      ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
      ctx.fillStyle = textColor;
      ctx.fillText(line, drawX, curY);
      curY += lineHeight;
    });
  } else {
    // TRYB 2: DWA WERSY (NagĹ‚Ăłwek + dopisek â€“ Ĺ›ciĹ›le po 1 linijce kaĹĽdy)
    let mainFontSize = Math.round((height >= 1800 ? 72 : 60) * textScale);
    ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    while (ctx.measureText(cleanMain).width > maxLineWidth && mainFontSize > 34) {
      mainFontSize -= 2;
      ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    }

    let subFontSize = Math.round((height >= 1800 ? 44 : 36) * textScale);
    ctx.font = `400 ${subFontSize}px ${fontSpec}`;
    while (ctx.measureText(cleanSub).width > maxLineWidth && subFontSize > 22) {
      subFontSize -= 2;
      ctx.font = `400 ${subFontSize}px ${fontSpec}`;
    }

    const gap = Math.round(28 * textScale);
    const totalH = mainFontSize + gap + subFontSize;
    const startY = Math.round((height - totalH) * 0.46) + mainFontSize;

    // Linijka 1: NagĹ‚Ăłwek (Ĺ›ciĹ›le 1 linijka)
    ctx.font = `700 ${mainFontSize}px ${fontSpec}`;
    ctx.fillStyle = textColor;
    ctx.fillText(cleanMain, drawX, startY);

    // Linijka 2: Dopisek (Ĺ›ciĹ›le 1 linijka)
    ctx.font = `400 ${subFontSize}px ${fontSpec}`;
    ctx.fillStyle = textMutedColor;
    ctx.fillText(cleanSub, drawX, startY + gap + subFontSize);
  }

  // Dyskretna sygnatura na dole kadru 9:16
  const cleanHandle = handle.replace("@", "") || "stark_focus";
  ctx.font = '600 22px "Space Grotesk", "JetBrains Mono", monospace';
  ctx.fillStyle = isBlackFont ? "rgba(0, 0, 0, 0.38)" : "rgba(255, 255, 255, 0.38)";
  ctx.textAlign = align === "center" ? "center" : "left";
  ctx.fillText(`@${cleanHandle}`, drawX, height - 120);
}

// =========================================================================
// DZIELONY KADR MONOLITH LEDGER (50/50)
// =========================================================================
