import { BRAND_ACCENT } from "../starkBrandTheme";
import {
  drawImageCover,
  getFontFamilySpec,
  parseLineTokens,
  stripHighlightSyntax,
  wrapTextLines,
} from "./primitives";

/**
 * DWA UKŁADY DOŁĄCZONE PO TO, ŻE 80% MATERIAŁU TO BYŁ CYTAT NA CZERNI.
 *
 * Oba mają jedną rolę: zatrzymać kciuk nie krzykiem, tylko STRUCTURĄ —
 * człowiek ma przerwać scroll i dokończyć myśl sam. Dlatego liczba, rubryka
 * i niedomknięte zdanie, a nie kolejna sentencja.
 */

export interface LayoutTheme {
  width: number;
  height: number;
  handle: string;
  bgImage?: CanvasImageSource | null;
  accentColor?: string;
  headlineFont?: string;
  bodyFont?: string;
}

const INK = "#F3F0EA";
const DIM = "rgba(243,240,234,0.45)";

function prepare(
  canvas: HTMLCanvasElement,
  theme: LayoutTheme,
): { ctx: CanvasRenderingContext2D; width: number; height: number; accent: string } | null {
  const { width, height, bgImage } = theme;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);

  if (bgImage) {
    drawImageCover(ctx, bgImage, 0, 0, width, height);
    // Tło ma angażować, ale nie może zjeść tekstu — bez tej maski litera
    // na jaśniejszej partii zdjęcia znika po ekspercie.
    ctx.fillStyle = "rgba(5,5,5,0.72)";
    ctx.fillRect(0, 0, width, height);
  }

  return { ctx, width, height, accent: theme.accentColor || BRAND_ACCENT };
}

/** Cienka linia porządkująca kadr — wizualny „skręt" między sekcjami. */
function hairline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 2);
}

function footer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  handle: string,
  note?: string,
) {
  const size = Math.round(width * 0.021);
  ctx.textAlign = "left";
  ctx.font = `700 ${size}px ${getFontFamilySpec("sans")}`;
  ctx.fillStyle = DIM;
  ctx.fillText(
    `@${handle.replace("@", "").toUpperCase()}`,
    Math.round(width * 0.09),
    height - size * 1.6,
  );
  if (note) {
    ctx.textAlign = "right";
    ctx.fillText(note.toUpperCase(), width - Math.round(width * 0.09), height - size * 1.6);
    ctx.textAlign = "left";
  }
}

export interface ProtocolSlideOptions extends LayoutTheme {
  /** Nagłówek protokołu, np. "PROTOCOL 04:30". */
  eyebrow: string;
  /** Teza, którą protokół rozbraja. */
  statement: string;
  /** Kroki — numerowane, zawsze najważniejsza część kadru. */
  steps: string[];
  /** Liczba w pieczęci, np. "72h" albo "1%". */
  figure?: string;
}

/**
 * PROTOKÓŁ — numerowane kroki pod mocną tezą.
 * Działa, bo obiecuje użytek: nie „bądź twardy", tylko „zrób te trzy rzeczy".
 */
export function drawProtocolListSlide(
  canvas: HTMLCanvasElement,
  options: ProtocolSlideOptions,
): void {
  const base = prepare(canvas, options);
  if (!base) return;
  const { ctx, width, height, accent } = base;

  const margin = Math.round(width * 0.09);
  const usable = width - margin * 2;

  // Nagłówek + rytmiczna kreska po prawej — porządek, nie dekoracja.
  const eyebrowSize = Math.round(width * 0.028);
  ctx.font = `700 ${eyebrowSize}px ${getFontFamilySpec("sans")}`;
  ctx.fillStyle = accent;
  ctx.fillText(options.eyebrow.toUpperCase(), margin, Math.round(height * 0.11));
  const eyebrowWidth = ctx.measureText(options.eyebrow.toUpperCase()).width;
  hairline(
    ctx,
    margin + eyebrowWidth + 18,
    Math.round(height * 0.11) - eyebrowSize * 0.32,
    width - margin - (margin + eyebrowWidth + 18),
    "rgba(243,240,234,0.18)",
  );

  // Teza: Cinzel, duży ale z powietrzem — agresywnie, bez przesady.
  const statementSize = Math.round(width * 0.072);
  ctx.font = `700 ${statementSize}px ${getFontFamilySpec("cinzel")}`;
  const statementLines = wrapTextLines(ctx, stripHighlightSyntax(options.statement), usable);
  let y = Math.round(height * 0.175);
  ctx.fillStyle = INK;
  for (const line of statementLines.slice(0, 4)) {
    ctx.fillText(line, margin, y);
    y += statementSize * 1.2;
  }

  y += Math.round(height * 0.03);
  hairline(ctx, margin, y, usable, "rgba(243,240,234,0.14)");
  y += Math.round(height * 0.055);

  // Kroki z crimson numerem. Liczba jest tu kotwicą wzrokową.
  const stepSize = Math.round(width * 0.036);
  const numberSize = Math.round(width * 0.03);
  const steps = options.steps.slice(0, 4);

  steps.forEach((step, index) => {
    const stepLines = wrapTextLines(ctx, stripHighlightSyntax(step), usable - stepSize * 2.4);
    const lineTop = y;

    ctx.font = `800 ${numberSize}px ${getFontFamilySpec("sans")}`;
    ctx.fillStyle = accent;
    ctx.fillText(String(index + 1).padStart(2, "0"), margin, lineTop + numberSize);

    ctx.font = `500 ${stepSize}px ${getFontFamilySpec("sans")}`;
    ctx.fillStyle = INK;
    stepLines.slice(0, 3).forEach((line, lineIndex) => {
      ctx.fillText(line, margin + stepSize * 2.4, lineTop + stepSize + lineIndex * stepSize * 1.35);
    });

    y += Math.max(stepLines.length, 1) * stepSize * 1.35 + height * 0.036;
  });

  // Pieczęć z liczbą w prawym dolnym rogu — to, co zostaje w pamięci.
  if (options.figure) {
    const figureSize = Math.round(width * 0.13);
    ctx.textAlign = "right";
    ctx.font = `700 ${figureSize}px ${getFontFamilySpec("cinzel")}`;
    ctx.fillStyle = "rgba(243,240,234,0.13)";
    ctx.fillText(options.figure, width - margin, height - Math.round(height * 0.1));
    ctx.textAlign = "left";
  }

  footer(ctx, width, height, options.handle, "STARK STANDARD");
}

export interface CostRewardSlideOptions extends LayoutTheme {
  question: string;
  /** Cena, którą płaci się dziś. */
  cost: string[];
  /** Co to odbiera później. */
  forfeit: string[];
  /** Pytanie domykające kadr. */
  closing?: string;
}

/**
 * KOSZT vs UTRATA — dwa słupce tabeli, na końcu pytanie bez odpowiedzi.
 * Konfrontacja działa, bo czytelnik sam musi dokończyć zdanie.
 */
export function drawCostVsRewardSlide(
  canvas: HTMLCanvasElement,
  options: CostRewardSlideOptions,
): void {
  const base = prepare(canvas, options);
  if (!base) return;
  const { ctx, width, height, accent } = base;

  const margin = Math.round(width * 0.09);
  const gutter = Math.round(width * 0.06);
  const columnWidth = (width - margin * 2 - gutter) / 2;

  const questionSize = Math.round(width * 0.062);
  ctx.font = `700 ${questionSize}px ${getFontFamilySpec("cinzel")}`;
  ctx.fillStyle = INK;
  const questionLines = wrapTextLines(
    ctx,
    stripHighlightSyntax(options.question),
    width - margin * 2,
  );
  let y = Math.round(height * 0.115);
  questionLines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, margin, y);
    y += questionSize * 1.22;
  });

  y += Math.round(height * 0.025);
  hairline(ctx, margin, y, width - margin * 2, "rgba(243,240,234,0.16)");
  y += Math.round(height * 0.05);

  const headerSize = Math.round(width * 0.026);
  const bodySize = Math.round(width * 0.034);

  const column = (title: string, items: string[], x: number, highlight: boolean) => {
    ctx.font = `800 ${headerSize}px ${getFontFamilySpec("sans")}`;
    ctx.fillStyle = highlight ? accent : DIM;
    ctx.fillText(title.toUpperCase(), x, y + headerSize);
    hairline(
      ctx,
      x,
      y + headerSize * 1.7,
      columnWidth,
      highlight ? accent : "rgba(243,240,234,0.2)",
    );

    let rowY = y + headerSize * 2.9;
    items.slice(0, 4).forEach((item) => {
      const lines = wrapTextLines(ctx, stripHighlightSyntax(item), columnWidth);
      ctx.font = `500 ${bodySize}px ${getFontFamilySpec("sans")}`;
      ctx.fillStyle = INK;
      lines.slice(0, 3).forEach((line, index) => {
        ctx.fillText(line, x, rowY + index * bodySize * 1.3);
      });
      rowY += Math.max(lines.length, 1) * bodySize * 1.3 + bodySize * 0.5;
    });
  };

  column("Cena dziś", options.cost, margin, false);
  column("Utrata potem", options.forfeit, margin + columnWidth + gutter, true);

  y =
    Math.max(...[options.cost.length, options.forfeit.length]) > 3
      ? height - Math.round(height * 0.19)
      : y + height * 0.2;

  if (options.closing) {
    const closingSize = Math.round(width * 0.045);
    ctx.font = `700 ${closingSize}px ${getFontFamilySpec("cinzel")}`;
    ctx.fillStyle = accent;
    const closingLines = wrapTextLines(
      ctx,
      stripHighlightSyntax(options.closing),
      width - margin * 2,
    );
    closingLines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, margin, Math.min(y, height * 0.86) + index * closingSize * 1.25);
    });
  }

  footer(ctx, width, height, options.handle, "STARK STANDARD");
}
