// GŁÓWNY SILNIK RENDEROWANIA KARUZEL (layout + ozdobniki, wycięte z canvasRenderer.ts).
import type { CarouselFontFamily } from "../../types";
import { wrapTextLines } from "./tokens";

export function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: string,
  stroke?: string,
  lineWidth: number = 1,
) {
  ctx.save();
  ctx.beginPath();
  const r = Math.min(radius, h / 2, w / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCornerCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 8,
  color = "rgba(255, 255, 255, 0.16)",
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
  ctx.restore();
}

interface FittedSlideLayout {
  headlineFontSize: number;
  headlineLineHeight: number;
  headlineLines: string[];
  bodyFontSize: number;
  bodyLineHeight: number;
  bodyLines: string[];
  paragraphGap: number;
  totalContentH: number;
  startY: number;
}

export function getCarouselFontFamilyCSS(fontChoice?: CarouselFontFamily): {
  headlineFont: string;
  bodyFont: string;
} {
  switch (fontChoice) {
    case "cinzel":
      return {
        headlineFont: '"Cinzel", serif',
        bodyFont: '"Cinzel", serif',
      };
    case "cormorant":
      return {
        headlineFont: '"Cormorant Garamond", serif',
        bodyFont: '"Cormorant Garamond", serif',
      };
    case "inter":
      return {
        headlineFont: '"Inter", sans-serif',
        bodyFont: '"Inter", sans-serif',
      };
    case "plus_jakarta":
    default:
      return {
        headlineFont: '"Plus Jakarta Sans", sans-serif',
        bodyFont: '"Plus Jakarta Sans", sans-serif',
      };
  }
}

export function computeFittedSlideLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  bodyText: string,
  contentWidth: number,
  topLimit: number,
  bottomLimit: number,
  textOffsetY: number,
  headlineFontFamily: string = '"Plus Jakarta Sans", sans-serif',
  bodyFontFamily: string = '"Plus Jakarta Sans", sans-serif',
): FittedSlideLayout {
  const availableH = bottomLimit - topLimit;
  let headlineFontSize = headline.length > 55 ? 48 : headline.length > 30 ? 54 : 62;
  let bodyFontSize = bodyText.length > 250 ? 32 : bodyText.length > 140 ? 36 : 40;
  const minHeadlineSize = 30;
  const minBodySize = 20;

  let headlineLines: string[] = [];
  let bodyLines: string[] = [];
  let headlineLineHeight = Math.round(headlineFontSize * 1.25);
  let bodyLineHeight = Math.round(bodyFontSize * 1.48);
  let paragraphGap = Math.round(bodyFontSize * 0.85);
  const eyebrowH = 48;
  const dividerH = 46;
  let totalContentH = 0;

  for (let iter = 0; iter < 18; iter++) {
    headlineLineHeight = Math.round(headlineFontSize * 1.25);
    bodyLineHeight = Math.round(bodyFontSize * 1.48);
    paragraphGap = Math.round(bodyFontSize * 0.85);

    ctx.font = `900 ${headlineFontSize}px ${headlineFontFamily}`;
    headlineLines = wrapTextLines(ctx, headline.toUpperCase(), contentWidth);

    ctx.font = `500 ${bodyFontSize}px ${bodyFontFamily}`;
    bodyLines = wrapTextLines(ctx, bodyText, contentWidth);

    const headlineH = headlineLines.reduce(
      (acc, l) => acc + (l === "" ? Math.round(headlineLineHeight * 0.5) : headlineLineHeight),
      0,
    );
    const bodyH = bodyLines.reduce((acc, l) => acc + (l === "" ? paragraphGap : bodyLineHeight), 0);

    totalContentH = eyebrowH + headlineH + dividerH + bodyH;

    if (
      totalContentH <= availableH * 0.9 ||
      (headlineFontSize <= minHeadlineSize && bodyFontSize <= minBodySize)
    ) {
      break;
    }

    if (headlineFontSize > minHeadlineSize) {
      headlineFontSize = Math.max(minHeadlineSize, headlineFontSize - 2);
    }
    if (bodyFontSize > minBodySize) {
      bodyFontSize = Math.max(minBodySize, bodyFontSize - 1.5);
    }
  }

  // Calculate centered startY with safe clamping positioned in optical upper-center
  const naturalStartY = Math.round(topLimit + (availableH - totalContentH) * 0.38) + textOffsetY;
  const minStartY = topLimit + 16;
  const maxStartY = Math.max(minStartY, bottomLimit - totalContentH - 16);
  const startY = Math.max(minStartY, Math.min(maxStartY, naturalStartY));

  return {
    headlineFontSize,
    headlineLineHeight,
    headlineLines,
    bodyFontSize,
    bodyLineHeight,
    bodyLines,
    paragraphGap,
    totalContentH,
    startY,
  };
}

// GĹĂ“WNY SILNIK RENDEROWANIA KARUZEL - NOWY ARCHETYP: DARK STOIC EDITORIAL
