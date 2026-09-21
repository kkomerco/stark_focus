// Kinetyczna typografia klatki rolki: wybór aktywnej frazy + rysowanie tekstu i handle.
// Wycięte z renderFrame() VideoStudioModal.tsx (etap 3 refaktoryzacji).
import type { FontFamily, PacingMode } from "../reel-helpers";
import { getPhraseTimeline, layoutLines } from "../reel-helpers";

export interface KineticPhraseInput {
  phrases: string[];
  totalDuration: number;
  pacingMode: PacingMode;
  timeSec: number;
}

/** Sekcja 3: wybór aktywnej frazy i jej przezroczystości (fade in/out). */
export function computeKineticPhrase({
  phrases,
  totalDuration,
  pacingMode,
  timeSec,
}: KineticPhraseInput): { activeText: string; phraseOpacity: number } {
  if (phrases.length <= 1) {
    const activeText = phrases[0] || "";
    // Smooth loop blend edge (first 250ms & last 250ms)
    const edge = 0.25;
    let phraseOpacity: number;
    if (timeSec < edge) {
      phraseOpacity = Math.max(0, timeSec / edge);
    } else if (timeSec > totalDuration - edge) {
      phraseOpacity = Math.max(0, (totalDuration - timeSec) / edge);
    } else {
      phraseOpacity = 1;
    }
    return { activeText, phraseOpacity };
  }

  const timeline = getPhraseTimeline(phrases, totalDuration, pacingMode);
  const activeItem =
    timeline.find((item) => timeSec >= item.start && timeSec < item.end) ||
    timeline[timeline.length - 1];

  const localTime = timeSec - activeItem.start;
  const itemDur = activeItem.duration;

  // Smooth cinematic fade in & out tailored to item duration
  const fadeDuration = Math.min(0.22, itemDur * 0.15);

  let phraseOpacity: number;
  if (localTime < fadeDuration) {
    phraseOpacity = Math.min(1, Math.max(0, localTime / fadeDuration));
  } else if (localTime > itemDur - fadeDuration) {
    phraseOpacity = Math.min(1, Math.max(0, (itemDur - localTime) / fadeDuration));
  } else {
    phraseOpacity = 1;
  }

  return { activeText: activeItem.text, phraseOpacity };
}

export interface KineticTextOptions {
  width: number;
  height: number;
  activeText: string;
  phraseOpacity: number;
  fontFamily: FontFamily;
}

/** Sekcje 4–5: typografia (naturalna wielkość liter, 42% wysokości, margines lewy) + handle. */
export function drawKineticText(
  ctx: CanvasRenderingContext2D,
  { width, height, activeText, phraseOpacity, fontFamily }: KineticTextOptions,
) {
  let selectedFont = '"Cormorant Garamond", "Cormorant", Georgia, serif';
  if (fontFamily === "cinzel") {
    selectedFont = '"Cinzel", "Times New Roman", Georgia, serif';
  } else if (fontFamily === "sans") {
    selectedFont = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  } else if (fontFamily === "inter") {
    selectedFont = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
  } else if (fontFamily === "cormorant") {
    selectedFont = '"Cormorant Garamond", "Cormorant", Georgia, serif';
  }

  // Szerokość tekstu dopasowana do marginesu (1080 * 0.12 = 130px z lewej i prawej => max text width = 820px)
  const leftMargin = width * 0.12;
  const maxTextWidth = width - leftMargin * 2;
  const layout = layoutLines(activeText, ctx, maxTextWidth, 64, selectedFont);

  ctx.save();
  ctx.globalAlpha = phraseOpacity;
  // Kinowe delikatne rozmycie wejściowe zależne od przezroczystości (delikatny blur)
  if (phraseOpacity < 0.98) {
    const blurAmount = Math.max(0, (1 - phraseOpacity) * 6);
    ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
  }

  // Stała kinowa pozycja pionowa na 42% wysokości ekranu
  const targetY = height * 0.42;
  const totalH = (layout.lines.length - 1) * layout.lineHeight;
  const startY = targetY - totalH / 2;

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  layout.lines.forEach((line, lIdx) => {
    const lineY = startY + lIdx * layout.lineHeight;
    const spaceW = ctx.measureText(" ").width;
    let curX = leftMargin;

    line.tokens.forEach((tok) => {
      const wordW = ctx.measureText(tok.raw).width;

      // Naturalna czysta typografia (bez sztucznych wyróżnień)
      ctx.save();
      ctx.font = `600 ${layout.fontSize}px ${selectedFont}`;
      ctx.fillStyle = "#F8FAFC";
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 20;
      ctx.fillText(tok.raw, curX, lineY);
      ctx.restore();

      curX += wordW + spaceW;
    });
  });

  ctx.restore();

  // 5. Handle / Nick (@stark_focus) małym drukiem na dole ekranu (ponad strefą opisu)
  ctx.save();
  ctx.font = `400 24px ${selectedFont}`;
  ctx.fillStyle = "rgba(248, 250, 252, 0.45)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("@stark_focus", leftMargin, height * 0.88);
  ctx.restore();
}
