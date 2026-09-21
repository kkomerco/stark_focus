// Slajd "Monolith Ledger" (split 50/50 z listą punktów).
import { wrapTextLines } from "./tokens";
import { drawImageCover } from "./wall";

export function drawMonolithLedgerSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    headline: string;
    subtext?: string;
    points?: string[];
    handle?: string;
    bgImage?: CanvasImageSource | null;
    accentColor?: string;
    fontFamily?: string;
    textScale?: number;
  },
) {
  const {
    width = 1080,
    height = 1920,
    headline = "",
    subtext = "",
    points = [],
    handle = "stark_focus",
    bgImage,
    accentColor = "#E2E8F0",
    textScale = 1.0,
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const splitY = height <= 1080 ? height * 0.42 : height * 0.46;

  if (bgImage) {
    try {
      drawImageCover(ctx, bgImage, 0, 0, width, splitY);
    } catch {
      ctx.fillStyle = "#121212";
      ctx.fillRect(0, 0, width, splitY);
    }
  } else {
    const topGrad = ctx.createLinearGradient(0, 0, 0, splitY);
    topGrad.addColorStop(0, "#141414");
    topGrad.addColorStop(1, "#050505");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, splitY);
  }

  const seamGrad = ctx.createLinearGradient(0, splitY - 140, 0, splitY);
  seamGrad.addColorStop(0, "rgba(5, 5, 5, 0)");
  seamGrad.addColorStop(1, "#050505");
  ctx.fillStyle = seamGrad;
  ctx.fillRect(0, splitY - 140, width, 140);

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, splitY, width, height - splitY);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, splitY);
  ctx.lineTo(width - 60, splitY);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.fillRect(width / 2 - 45, splitY - 2, 90, 4);

  ctx.font = "700 16px monospace";
  ctx.fillStyle = accentColor;
  ctx.textAlign = "left";
  ctx.fillText("[ STANDARD OPERACYJNY // STARK_FOCUS ]", 70, splitY + 50);

  const headlineSize = Math.round((height <= 1080 ? 38 : 48) * textScale);
  ctx.font = `900 ${headlineSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  const headlineLines = wrapTextLines(ctx, headline.toUpperCase(), width - 140);
  let textY = splitY + (height <= 1080 ? 95 : 115);
  headlineLines.slice(0, 2).forEach((line) => {
    ctx.fillText(line, 70, textY);
    textY += headlineSize * 1.25;
  });

  if (subtext) {
    ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
    ctx.fillText(subtext, 70, textY + 8);
    textY += 45;
  }

  const cardH = height <= 1080 ? 58 : 74;
  let curY = Math.max(splitY + (height <= 1080 ? 170 : 230), textY + 12);
  const maxPts = height <= 1080 ? 2 : 3;
  points.slice(0, maxPts).forEach((pt, idx) => {
    ctx.fillStyle = "#121212";
    ctx.fillRect(70, curY, width - 140, cardH);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(70, curY, width - 140, cardH);

    ctx.font = "900 18px monospace";
    ctx.fillStyle = accentColor;
    ctx.fillText(`0${idx + 1}`, 95, curY + cardH * 0.6);

    ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = "#FFFFFF";
    const pointLines = wrapTextLines(ctx, pt, width - 240);
    ctx.fillText(pointLines[0] || pt, 150, curY + cardH * 0.6);
    curY += cardH + 14;
  });

  ctx.font = "700 18px monospace";
  ctx.fillStyle = "rgba(160, 160, 160, 0.7)";
  ctx.fillText(
    `@${handle.replace("@", "").toUpperCase()}`,
    70,
    height - (height <= 1080 ? 30 : 60),
  );
  ctx.textAlign = "right";
  ctx.fillText(
    "SAVE FOR MORNING DISCIPLINE // â™źď¸Ź",
    width - 70,
    height - (height <= 1080 ? 30 : 60),
  );
}

// =========================================================================
// UNIWERSALNY ROUTER RENDEROWANIA UKĹADĂ“W
// =========================================================================
