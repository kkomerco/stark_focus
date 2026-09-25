import { BRAND_ACCENT } from "../starkBrandTheme";
import { centeredTop as centeredInBand, safeBand } from "../safeZones";
import {
  drawImageCover,
  fitLines,
  getFontFamilySpec,
  parseLineTokens,
  stripHighlightSyntax,
  wrapTextLines,
} from "./primitives";

/**
 * UKŁADY DOŁĄCZONE PO TO, ŻE 80% MATERIAŁU TO BYŁ CYTAT NA CZERNI.
 *
 * Mają jedną rolę: zatrzymać kciuk nie krzykiem, tylko STRUCTURĄ albo
 * SCENĄ — człowiek ma przerwać scroll i dokończyć myśl sam.
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

/**
 * Stopka: tylko nick. Nazwa marki w rogu była dopiskiem, który zasłaniał
 * dolną strefę kadru i powtarzał to, co i tak widać na każdym poście.
 */
function footer(ctx: CanvasRenderingContext2D, width: number, height: number, handle: string) {
  const size = Math.round(width * 0.021);
  ctx.textAlign = "left";
  ctx.font = `700 ${size}px ${getFontFamilySpec("sans")}`;
  ctx.fillStyle = DIM;
  ctx.fillText(
    `@${handle.replace("@", "").toUpperCase()}`,
    Math.round(width * 0.09),
    height - size * 1.6,
  );
}

/**
 * Bezpieczny pas kadru bierze liczby z `src/utils/safeZones.ts` — dawno temu
 * każda warstwa miała własne: przewodnik po podglądzie rysował 210/360, treść
 * stała na 0,42, a handle na 0,88, czyli w strefie, którą sam przewodnik
 * oznaczał na czerwono.
 *
 * `video` to jedyna różnica, która tu decyduje: kadr idący do feedu nie ma na
 * sobie interfejsu, więc zostaje mu środek; rolka musi uciekać znad paska
 * opisu i komentarzy.
 */
export function centeredTop(blockHeight: number, height: number, video = false): number {
  return centeredInBand(blockHeight, safeBand(height, 1080, video));
}

export interface ProtocolSlideOptions extends LayoutTheme {
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
 * Bez nadtytułu i bez stopki z nazwą marki: kadr ma mówić treścią, a nie
 * etykietami.
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

  // Teza: Cinzel, duży ale z powietrzem — agresywnie, bez przesady.
  const statementSize = Math.round(width * 0.072);
  ctx.font = `700 ${statementSize}px ${getFontFamilySpec("cinzel")}`;
  const statementLines = wrapTextLines(ctx, stripHighlightSyntax(options.statement), usable).slice(
    0,
    4,
  );

  // Kroki z crimson numerem. Liczba jest tu kotwicą wzrokową.
  const stepSize = Math.round(width * 0.036);
  const numberSize = Math.round(width * 0.03);
  const steps = options.steps.slice(0, 4);
  ctx.font = `500 ${stepSize}px ${getFontFamilySpec("sans")}`;
  const stepLineCounts = steps.map((step) =>
    Math.min(
      3,
      Math.max(1, wrapTextLines(ctx, stripHighlightSyntax(step), usable - stepSize * 2.4).length),
    ),
  );

  const gapAboveRule = Math.round(height * 0.03);
  const gapBelowRule = Math.round(height * 0.055);
  const stepGap = height * 0.036;
  const blockHeight =
    statementLines.length * statementSize * 1.2 +
    gapAboveRule +
    gapBelowRule +
    stepLineCounts.reduce((total, lines) => total + lines * stepSize * 1.35 + stepGap, 0) -
    stepGap;

  let y = centeredTop(blockHeight, height);

  ctx.fillStyle = INK;
  for (const line of statementLines) {
    ctx.fillText(line, margin, y);
    y += statementSize * 1.2;
  }

  y += gapAboveRule;
  hairline(ctx, margin, y, usable, "rgba(243,240,234,0.14)");
  y += gapBelowRule;

  steps.forEach((step, index) => {
    // `wrapTextLines` mierzy bieżącym ctx.font — kroki muszą być łamane krojem
    // kroków, inaczej linia liczona pod 32 px wychodzi za margines przy 36 px.
    ctx.font = `500 ${stepSize}px ${getFontFamilySpec("sans")}`;
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

    y += Math.min(stepLines.length, 3) * stepSize * 1.35 + stepGap;
  });

  // Pieczęć z liczbą — przy tezie, nie w rogu: róg to strefa interfejsu.
  if (options.figure) {
    const figureSize = Math.round(width * 0.13);
    ctx.textAlign = "right";
    ctx.font = `700 ${figureSize}px ${getFontFamilySpec("cinzel")}`;
    ctx.fillStyle = "rgba(243,240,234,0.13)";
    ctx.fillText(options.figure, width - margin, y - stepGap + figureSize * 0.2);
    ctx.textAlign = "left";
  }

  footer(ctx, width, height, options.handle);
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
 * KOSZT vs UTRATA — dwa słupki tabeli, na końcu pytanie bez odpowiedzi.
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
  const contentWidth = width - margin * 2;

  const questionSize = Math.round(width * 0.062);
  const question = fitLines(
    ctx,
    stripHighlightSyntax(options.question),
    contentWidth,
    3,
    (size) => `700 ${size}px ${getFontFamilySpec("cinzel")}`,
    questionSize,
  );

  const closingSize = Math.round(width * 0.045);
  const closing = options.closing
    ? fitLines(
        ctx,
        stripHighlightSyntax(options.closing),
        contentWidth,
        2,
        (size) => `700 ${size}px ${getFontFamilySpec("cinzel")}`,
        closingSize,
      )
    : null;

  const headerSize = Math.round(width * 0.026);
  const bodySize = Math.round(width * 0.034);
  ctx.font = `500 ${bodySize}px ${getFontFamilySpec("sans")}`;
  // Wysokość wiersza liczona z realnie złamanego tekstu, nie z liczby pozycji.
  const rowLines = (items: string[]) =>
    items.slice(0, 5).map((item) => {
      const lines = wrapTextLines(ctx, stripHighlightSyntax(item), columnWidth);
      return Math.min(3, Math.max(1, lines.length));
    });
  const costRows = rowLines(options.cost);
  const forfeitRows = rowLines(options.forfeit);
  const rowCount = Math.max(costRows.length, forfeitRows.length, 1);
  const tallestRow = Math.max(1, ...costRows, ...forfeitRows);
  const rowSpan = tallestRow * bodySize * 1.3 + bodySize * 1.2;

  const questionGap = Math.round(height * 0.022);
  const tableTopGap = Math.round(height * 0.075);
  const closingGap = Math.round(height * 0.05);
  const headerBlock = headerSize * 2.2;
  const closingBlock = closing ? closing.lines.length * closing.size * 1.25 : 0;
  const blockHeight =
    question.lines.length * question.size * 1.22 +
    questionGap +
    tableTopGap +
    headerBlock +
    rowCount * rowSpan +
    (closing ? closingGap + closingBlock : 0);

  let y = centeredTop(blockHeight, height);
  ctx.font = `700 ${question.size}px ${getFontFamilySpec("cinzel")}`;
  ctx.fillStyle = INK;
  for (const line of question.lines) {
    ctx.fillText(line, margin, y);
    y += question.size * 1.22;
  }

  y += questionGap;
  hairline(ctx, margin, y, contentWidth, "rgba(243,240,234,0.16)");

  const rowsTop = y + tableTopGap;

  const column = (title: string, items: string[], x: number, highlight: boolean) => {
    ctx.font = `800 ${headerSize}px ${getFontFamilySpec("sans")}`;
    ctx.fillStyle = highlight ? accent : DIM;
    ctx.fillText(title.toUpperCase(), x, rowsTop - headerSize * 1.5);
    hairline(
      ctx,
      x,
      rowsTop - headerSize * 0.7,
      columnWidth,
      highlight ? accent : "rgba(243,240,234,0.2)",
    );

    ctx.font = `500 ${bodySize}px ${getFontFamilySpec("sans")}`;
    items.slice(0, 5).forEach((item, index) => {
      const lines = wrapTextLines(ctx, stripHighlightSyntax(item), columnWidth).slice(0, 3);
      const cellHeight = lines.length * bodySize * 1.3;
      const rowTop = rowsTop + index * rowSpan;
      ctx.fillStyle = INK;
      lines.forEach((line, lineIndex) => {
        ctx.fillText(
          line,
          x,
          rowTop + (rowSpan - cellHeight) / 2 + bodySize + lineIndex * bodySize * 1.3,
        );
      });
    });
  };

  // Treść kadru po angielsku — aplikacja jest polska, materiał nie.
  column("Cost today", options.cost, margin, false);
  column("What it forfeits", options.forfeit, margin + columnWidth + gutter, true);

  if (closing) {
    ctx.font = `700 ${closing.size}px ${getFontFamilySpec("cinzel")}`;
    ctx.fillStyle = accent;
    const closingTop = rowsTop + rowCount * rowSpan + closingGap;
    closing.lines.forEach((line, index) => {
      ctx.fillText(line, margin, closingTop + closing.size + index * closing.size * 1.25);
    });
  }

  footer(ctx, width, height, options.handle);
}

export interface SignSlideOptions extends LayoutTheme {
  textLines: string[];
}

/**
 * Rysunek jest tylko szkicem linii — bez zdjęcia, bez cudzej grafiki, bez
 * generowania obrazów. Dzięki temu kadr da się zrobić dziś, na darmowym tierze,
 * i nikt nie może zarzucić kopiowania.
 */
export type DiagramKind = "chart" | "scales" | "path" | "split";

export interface ConceptDiagramOptions extends LayoutTheme {
  /** Wers nad rysunkiem — krótki, wielkimi literami. */
  line: string;
  diagram: DiagramKind;
  /** Jedno zdanie pod rysunkiem; puste = czysty szkic. */
  caption?: string;
  /** Ziarno do „Losuj inny szkic" — ten sam wers, inna kompozycja. */
  seed?: string;
}

const STROKE = "rgba(243,240,234,0.82)";

/**
 * Generator liczb z odcisku tekstu: ten sam wers daje ten sam szkic (da się
 * go powtórzyć i porównać), inny wers — inny. Diagram nie może być jedną
 * grafiką z biblioteki, bo po jednym użyciu przestaje cokolwiek znaczyć.
 */
function rngFor(seedText: string) {
  let state = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    state ^= seedText.charCodeAt(i);
    state = Math.imul(state, 16777619) >>> 0;
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function polyline(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

/**
 * Trzy kształty linii, bo „wykres z dołkiem" po trzech postach przestaje
 * cokolwiek mówić: załamanie i powrót, równe wspinanie się, plateau po którym
 * kreska wreszcie przebija sufit.
 */
function drawChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  seed: string,
) {
  const next = rngFor(seed);
  const shape = Math.floor(next() * 3);
  const points = 5 + Math.floor(next() * 4);
  const box = { x: cx - size * 0.34, y: cy - size * 0.34, w: size * 0.68, h: size * 0.68 };
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  const inner = { x: box.x + 10, y: box.y + 10, w: box.w - 20, h: box.h - 20 };
  const walk = Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const noise = (next() - 0.5) * inner.h * 0.18;
    const depth = 0.35 + next() * 0.5;
    let y: number;
    if (shape === 0) {
      // Najpierw równo, potem uderzenie w dno i powrót do góry.
      y =
        t < 0.45
          ? inner.y + noise * 0.4
          : t < 0.7
            ? inner.y + inner.h * depth
            : inner.y + inner.h * 0.1;
    } else if (shape === 1) {
      y = inner.y + inner.h * (1 - t) * 0.9 + noise;
    } else {
      y = t < 0.65 ? inner.y + inner.h * 0.62 + noise * 0.3 : inner.y + inner.h * 0.12;
    }
    return { x: inner.x + inner.w * t, y };
  });
  polyline(ctx, walk);

  // Kropka na końcu: kadr ma mówić, że linia gdzieś stanęła, a nie że faluje.
  const last = walk[walk.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, Math.max(3, size * 0.014), 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();

  if (shape === 2) {
    // Kreska „standard", do której plateau nie doszło — wyznacza ją sufit kadru.
    ctx.setLineDash([size * 0.03, size * 0.025]);
    ctx.beginPath();
    ctx.moveTo(inner.x, inner.y + inner.h * 0.3);
    ctx.lineTo(inner.x + inner.w, inner.y + inner.h * 0.3);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Która szala ciągnie w dół i ile na niej leży — to jest teza kadru. */
function drawScales(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  seed: string,
) {
  const next = rngFor(seed);
  const tilt = (0.06 + next() * 0.1) * (next() > 0.5 ? 1 : -1);
  const arm = size * (0.3 + next() * 0.08);
  const top = cy - size * 0.42;
  const heavyY = cy + size * 0.34;

  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx, heavyY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx - arm, top + tilt * size);
  ctx.moveTo(cx, top);
  ctx.lineTo(cx + arm, top - tilt * size);
  ctx.stroke();

  [-1, 1].forEach((side) => {
    const x = cx + arm * side;
    const y = top + tilt * size * side;
    const drop = size * (0.14 + next() * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * 0.13, y + drop);
    ctx.lineTo(x + size * 0.13, y + drop);
    ctx.closePath();
    ctx.stroke();
    // Ciężar widać po liczbie kresek na szali, nie po opisie.
    const pips = side * tilt > 0 ? 3 + Math.floor(next() * 3) : 1 + Math.floor(next() * 2);
    for (let i = 0; i < pips; i++) {
      const px = x - size * 0.09 + (i * size * 0.18) / Math.max(1, pips - 1);
      ctx.beginPath();
      ctx.moveTo(px, y + drop + size * 0.03);
      ctx.lineTo(px, y + drop + size * 0.075);
      ctx.stroke();
    }
  });
}

/** Ilu przystanków droga ma i którędy wychodzi ze zdjęcia. */
function drawPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  seed: string,
) {
  const next = rngFor(seed);
  const stops = 3 + Math.floor(next() * 3);
  const drop = next() > 0.5 ? 1 : -1;
  const pts = Array.from({ length: stops + 2 }, (_, i) => {
    const t = i / (stops + 1);
    return {
      x: cx - size * 0.44 + size * 0.88 * t,
      y: cy + Math.sin(t * Math.PI * (1 + next())) * size * 0.3 * drop,
    };
  });

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();

  const end = pts[pts.length - 1];
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - size * 0.07, end.y - size * 0.02);
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - size * 0.02, end.y + size * 0.07);
  ctx.stroke();

  // Kropki to dni/rundy — bez nich „ścieżka" jest tylko zawijasem.
  pts.slice(1, -1).forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2.5, size * 0.012), 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
  });
}

/** Podział to nie dwie identyczne połówki: raz jedną stronę wypełnia czas, raz drugą. */
function drawSplit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  seed: string,
) {
  const next = rngFor(seed);
  const panelW = size * (0.34 + next() * 0.08);
  const panelH = size * (0.44 + next() * 0.12);
  const gap = size * 0.04;
  const left = cx - panelW - gap / 2;
  const right = cx + gap / 2;
  const top = cy - panelH / 2;
  ctx.strokeRect(left, top, panelW, panelH);
  ctx.strokeRect(right, top, panelW, panelH);

  const busyLeft = next() > 0.6;
  const marks = 8 + Math.floor(next() * 10);
  const fill = (x0: number, x1: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const px = x0 + next() * (x1 - x0);
      const py = top + 12 + next() * (panelH - 24);
      ctx.beginPath();
      ctx.moveTo(px - 6, py - 6);
      ctx.lineTo(px + 6, py + 6);
      ctx.moveTo(px + 6, py - 6);
      ctx.lineTo(px - 6, py + 6);
      ctx.stroke();
    }
  };
  fill(left + 8, left + panelW - 8, busyLeft ? marks : 0);
  fill(right + 8, right + panelW - 8, busyLeft ? 0 : marks);

  // Kreska dzieląca: „tu stałem" oddzielone od „tu jestem".
  ctx.setLineDash([size * 0.028, size * 0.022]);
  ctx.beginPath();
  ctx.moveTo(cx, top - size * 0.03);
  ctx.lineTo(cx, top + panelH + size * 0.03);
  ctx.stroke();
  ctx.setLineDash([]);
}

/**
 * DIAGRAM + WIERSZ — kadr, w którym rysunek niesie myśl, a nie ją ilustruje.
 * Wers stoi u góry małą kursywą markową, pod nim szkic na kość.
 */
export function drawConceptDiagramSlide(
  canvas: HTMLCanvasElement,
  options: ConceptDiagramOptions,
): void {
  const base = prepare(canvas, options);
  if (!base) return;
  const { ctx, width, height, accent } = base;

  const margin = Math.round(width * 0.09);
  const line = options.line.toUpperCase();
  const lineSize = Math.round(width * 0.036);
  const fitted = fitLines(
    ctx,
    stripHighlightSyntax(line),
    width - margin * 2,
    2,
    (size) => `800 ${size}px ${getFontFamilySpec("sans")}`,
    lineSize,
    Math.round(lineSize * 0.7),
  );
  const captionSize = Math.round(width * 0.026);
  const caption = options.caption
    ? fitLines(
        ctx,
        stripHighlightSyntax(options.caption),
        width - margin * 2,
        2,
        (s) => `500 ${s}px ${getFontFamilySpec("sans")}`,
        captionSize,
      )
    : null;

  // Wiersz, szkic i podpis to jeden blok — cały stoi środkiem bezpiecznego
  // pasa, bo góra i dół kadru to pod TikTokiem teren interfejsu.
  const size = Math.round(Math.min(width, height) * 0.4);
  const gap = Math.round(height * 0.05);
  const lineBlock = fitted.lines.length * fitted.size * 1.4;
  const captionBlock = caption ? caption.lines.length * caption.size * 1.4 : 0;
  const blockHeight = lineBlock + gap + size + (caption ? gap * 0.6 + captionBlock : 0);

  let y = centeredTop(blockHeight, height) + fitted.size;
  ctx.font = `800 ${fitted.size}px ${getFontFamilySpec("sans")}`;
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  for (const row of fitted.lines) {
    ctx.fillText(row, width / 2, y);
    y += fitted.size * 1.4;
  }

  const cy = centeredTop(blockHeight, height) + lineBlock + gap + size / 2;
  ctx.strokeStyle = STROKE;
  ctx.lineWidth = Math.max(2, Math.round(width * 0.0022));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const sketchSeed = `${options.line}|${options.seed ?? ""}`;
  if (options.diagram === "scales") drawScales(ctx, width / 2, cy, size, sketchSeed);
  else if (options.diagram === "path") drawPath(ctx, width / 2, cy, size, sketchSeed);
  else if (options.diagram === "split") drawSplit(ctx, width / 2, cy, size, sketchSeed);
  else drawChart(ctx, width / 2, cy, size, sketchSeed);

  if (caption) {
    ctx.font = `500 ${caption.size}px ${getFontFamilySpec("sans")}`;
    ctx.fillStyle = accent;
    let captionY = cy + size / 2 + gap * 0.6 + caption.size;
    for (const row of caption.lines) {
      ctx.fillText(row, width / 2, captionY);
      captionY += caption.size * 1.4;
    }
  }

  ctx.textAlign = "left";
  footer(ctx, width, height, options.handle);
}

/** Ten sam tekst ma lądować w różnym miejscu kadru — inaczej każdy post to ta sama kompozycja. */
function seedFrom(lines: string[]): number {
  let seed = 11;
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) seed = (seed * 33 + line.charCodeAt(i)) >>> 0;
  }
  return seed;
}

function darkWall(ctx: CanvasRenderingContext2D, width: number, height: number, seed: number) {
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#15161A");
  base.addColorStop(0.5, "#0B0C0E");
  base.addColorStop(1, "#050506");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Placki zaprawy — bez tego ściana jest wektorem, a napis wygląda na naklejkę.
  for (let i = 0; i < 90; i++) {
    const x = ((seed + i * 7919) % width) | 0;
    const y = ((seed + i * 104729) % height) | 0;
    const size = 40 + ((seed + i * 31) % 120);
    ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.012)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(x, y, size, size * 0.5);
  }
}

/**
 * NEON — rurka w karmazynie na ciemnej ścianie. Rdzeń jest prawie biały,
 * bo prawdziwy neon nie świeci jednym kolorem.
 */
export function drawNeonSignSlide(canvas: HTMLCanvasElement, options: SignSlideOptions): void {
  const base = prepare(canvas, { ...options, bgImage: null });
  if (!base) return;
  const { ctx, width, height, accent } = base;
  const seed = seedFrom(options.textLines);
  darkWall(ctx, width, height, seed);

  const margin = Math.round(width * 0.09);
  const size = Math.round(width * 0.088);
  const fitted = fitLines(
    ctx,
    options.textLines.join("\n"),
    width - margin * 2,
    5,
    (s) => `700 ${s}px ${getFontFamilySpec("cinzel")}`,
    size,
    Math.round(size * 0.6),
  );
  const lineHeight = fitted.size * 1.32;
  const blockHeight = fitted.lines.length * lineHeight;
  let y = centeredTop(blockHeight, height) + fitted.size;

  ctx.textAlign = "left";
  ctx.font = `700 ${fitted.size}px ${getFontFamilySpec("cinzel")}`;

  const spill = ctx.createRadialGradient(
    width * 0.5,
    y + blockHeight / 2,
    40,
    width * 0.5,
    y + blockHeight / 2,
    height * 0.6,
  );
  spill.addColorStop(0, "rgba(225,29,72,0.16)");
  spill.addColorStop(1, "rgba(225,29,72,0)");
  ctx.fillStyle = spill;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = accent;
  for (const line of fitted.lines) {
    ctx.shadowBlur = fitted.size * 0.9;
    ctx.fillStyle = accent;
    ctx.fillText(line, margin, y);
    ctx.fillText(line, margin, y);
    ctx.shadowBlur = fitted.size * 0.35;
    ctx.fillStyle = "#FFD9DE";
    ctx.fillText(line, margin, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFF3F4";
    ctx.fillText(line, margin, y);
    y += lineHeight;
  }
  ctx.restore();

  footer(ctx, width, height, options.handle);
}

/**
 * BANER — kościana tablica z ciemnym napisem w miejskim tle o zmierzchu.
 * Kontrast odwrócony, więc kadr nie ginie w feedzie pełnym czerni.
 */
export function drawBillboardSignSlide(canvas: HTMLCanvasElement, options: SignSlideOptions): void {
  const base = prepare(canvas, { ...options, bgImage: null });
  if (!base) return;
  const { ctx, width, height } = base;
  const seed = seedFrom(options.textLines);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#1A1C21");
  sky.addColorStop(0.55, "#2A2C33");
  sky.addColorStop(1, "#0A0A0C");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Sylweta miasta u dołu — kilka brył zamiast zdjęcia.
  ctx.fillStyle = "#07070A";
  for (let i = 0; i < 9; i++) {
    const blockWidth = width * (0.08 + ((seed + i * 37) % 9) / 100);
    const blockHeight = height * (0.06 + ((seed + i * 53) % 12) / 100);
    ctx.fillRect(i * (width / 9), height - blockHeight, blockWidth, blockHeight);
  }

  const panelLeft = Math.round(width * (seed % 2 ? 0.08 : 0.14));
  const panelRight = Math.round(width - panelLeft);
  const panelWidth = panelRight - panelLeft;
  const inset = Math.round(panelWidth * 0.09);

  // Tablica dopasowuje się do napisu, a potem cały blok siada środkiem —
  // panel przy krawędzi znika pod paskiem opisu w Rolce i pod audio na TikToku.
  const textSize = Math.round(panelWidth * 0.085);
  const fitted = fitLines(
    ctx,
    options.textLines.join("\n"),
    panelWidth - inset * 2,
    4,
    (s) => `700 ${s}px ${getFontFamilySpec("cinzel")}`,
    textSize,
    Math.round(textSize * 0.55),
  );
  const lineHeight = fitted.size * 1.28;
  const panelHeight = Math.round(fitted.lines.length * lineHeight + inset * 1.4);
  const panelTop = centeredTop(panelHeight, height);
  const panelBottom = panelTop + panelHeight;

  ctx.fillStyle = "#101115";
  ctx.fillRect(panelLeft + panelWidth * 0.18, panelBottom, width * 0.02, height - panelBottom);
  ctx.fillRect(panelRight - panelWidth * 0.2, panelBottom, width * 0.02, height - panelBottom);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = INK;
  ctx.fillRect(panelLeft, panelTop, panelWidth, panelHeight);
  ctx.restore();

  ctx.strokeStyle = "rgba(10,10,12,0.85)";
  ctx.lineWidth = Math.round(width * 0.012);
  ctx.strokeRect(panelLeft, panelTop, panelWidth, panelHeight);

  let y = panelTop + panelHeight / 2 - (fitted.lines.length * lineHeight) / 2 + fitted.size * 0.85;

  ctx.textAlign = "center";
  ctx.font = `700 ${fitted.size}px ${getFontFamilySpec("cinzel")}`;
  ctx.fillStyle = "#0B0C0E";
  for (const line of fitted.lines) {
    ctx.fillText(line, panelLeft + panelWidth / 2, y);
    y += lineHeight;
  }
  ctx.textAlign = "left";

  footer(ctx, width, height, options.handle);
}

/**
 * KADRY LICZBOWE.
 *
 * Materiał nie miał czym odpowiedzieć sąsiedniemu kontu. Te dwa układy
 * zamieniają twierdzenie w dowód: siatka tygodni pokazuje, ile życia już
 * minęło, a audyt tygodnia pokazuje, gdzie ten tydzień poszedł. Jeden
 * kwadrat to jeden tydzień albo jedna godzina — bez osi bez etykiet.
 */

export const WEEKS_PER_YEAR = 52;
/** Horyzont 76 lat to ~4000 tygodni — tyle, ile liczy klasyk gatunku. */
export const LIFE_HORIZON_YEARS = 76;

export interface LifeGridOptions extends LayoutTheme {
  /** Teza nad siatką. */
  line: string;
  /** Puenta pod liczbą. */
  caption?: string;
  yearsLived: number;
  horizonYears?: number;
}

export interface TimeAuditOptions extends LayoutTheme {
  line: string;
  caption?: string;
  /** Godziny na ekran w tygodniu (nie na dobę). */
  screenHours: number;
  sleepHours?: number;
  workHours?: number;
}

/** Siatka kwadratów: krok liczony ze SZEROKOŚCI, więc wypełnia kadr. */
function cellGrid(
  ctx: CanvasRenderingContext2D,
  cols: number,
  rows: number,
  box: { x: number; y: number; w: number },
  paint: (col: number, row: number, x: number, y: number, size: number) => void,
): number {
  const step = box.w / cols;
  const size = step * 0.66;
  const originX = box.x;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      paint(
        col,
        row,
        originX + col * step + (step - size) / 2,
        box.y + row * step + (step - size) / 2,
        size,
      );
    }
  }
  return step * rows;
}

export function drawLifeGridSlide(canvas: HTMLCanvasElement, options: LifeGridOptions): void {
  const base = prepare(canvas, options);
  if (!base) return;
  const { ctx, width, height, accent } = base;

  const margin = Math.round(width * 0.08);
  const usable = width - margin * 2;
  const horizon = Math.max(20, Math.min(95, options.horizonYears ?? LIFE_HORIZON_YEARS));
  const lived = Math.max(0, Math.min(horizon, Math.round(options.yearsLived)));
  const weeksLived = lived * WEEKS_PER_YEAR;
  const weeksLeft = horizon * WEEKS_PER_YEAR - weeksLived;

  const lineSize = Math.round(width * 0.052);
  const line = fitLines(
    ctx,
    stripHighlightSyntax(options.line),
    usable,
    3,
    (size) => `700 ${size}px ${getFontFamilySpec("cinzel")}`,
    lineSize,
  );

  const numberSize = Math.round(width * 0.115);
  const captionSize = Math.round(width * 0.032);
  const caption = options.caption
    ? fitLines(
        ctx,
        stripHighlightSyntax(options.caption),
        usable,
        2,
        (size) => `500 ${size}px ${getFontFamilySpec("sans")}`,
        captionSize,
      )
    : null;

  // Siatka: 52 kolumn (tygodnie w roku), wierszy tyle, ile lat horyzontu.
  // Krok bierzemy z szerokości — inaczej kwadraty kurczą się do kreski.
  const cols = WEEKS_PER_YEAR;
  const rows = horizon;
  const gridH = (usable / cols) * rows;

  const number = fitLines(
    ctx,
    `${weeksLeft.toLocaleString("en-US")} WEEKS`,
    usable,
    1,
    (size) => `800 ${size}px ${getFontFamilySpec("sans")}`,
    numberSize,
    Math.round(numberSize * 0.55),
  );

  const blockHeight =
    line.lines.length * lineSize * 1.3 +
    gridH +
    number.size * 1.7 +
    (caption ? caption.lines.length * captionSize * 1.4 + 60 : 0);
  let y = centeredTop(blockHeight, height) + lineSize;

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `700 ${line.size}px ${getFontFamilySpec("cinzel")}`;
  for (const row of line.lines) {
    ctx.fillText(row, width / 2, y);
    y += line.size * 1.3;
  }

  const gridTop = y + height * 0.015;
  cellGrid(ctx, cols, rows, { x: margin, y: gridTop, w: usable }, (col, row, x, cy, size) => {
    const index = row * cols + col;
    if (index === weeksLived) {
      // Bieżący tydzień: jeden karmazyn w całym kadrze, celowo większy.
      ctx.fillStyle = accent;
      ctx.fillRect(x - size * 0.3, cy - size * 0.3, size * 1.6, size * 1.6);
    } else if (index < weeksLived) {
      ctx.fillStyle = INK;
      ctx.fillRect(x, cy, size, size);
    } else {
      ctx.strokeStyle = "rgba(243,240,234,0.15)";
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.strokeRect(x, cy, size, size);
    }
  });

  y = gridTop + gridH + number.size;
  ctx.fillStyle = accent;
  ctx.font = `800 ${number.size}px ${getFontFamilySpec("sans")}`;
  ctx.fillText(number.lines[0] ?? "", width / 2, y);

  ctx.fillStyle = DIM;
  ctx.font = `500 ${Math.round(width * 0.025)}px ${getFontFamilySpec("sans")}`;
  ctx.fillText(
    `LEFT IF YOU REACH ${horizon} - ${lived} YEARS BEHIND YOU`,
    width / 2,
    y + numberSize * 0.45,
  );

  if (caption) {
    let captionY = y + numberSize * 1.1;
    ctx.fillStyle = INK;
    ctx.font = `500 ${caption.size}px ${getFontFamilySpec("sans")}`;
    for (const row of caption.lines) {
      ctx.fillText(row, width / 2, captionY);
      captionY += caption.size * 1.4;
    }
  }

  ctx.textAlign = "left";
  footer(ctx, width, height, options.handle);
}

export function drawTimeAuditSlide(canvas: HTMLCanvasElement, options: TimeAuditOptions): void {
  const base = prepare(canvas, options);
  if (!base) return;
  const { ctx, width, height, accent } = base;

  const margin = Math.round(width * 0.1);
  const usable = width - margin * 2;
  const sleep = Math.max(0, Math.min(24, options.sleepHours ?? 8));
  const work = Math.max(0, Math.min(24, options.workHours ?? 9));
  const screenPerDay = Math.max(0, Math.min(24, options.screenHours / 7));

  const lineSize = Math.round(width * 0.055);
  const line = fitLines(
    ctx,
    stripHighlightSyntax(options.line),
    usable,
    3,
    (size) => `700 ${size}px ${getFontFamilySpec("cinzel")}`,
    lineSize,
  );

  const numberSize = Math.round(width * 0.17);
  const captionSize = Math.round(width * 0.032);
  const caption = options.caption
    ? fitLines(
        ctx,
        stripHighlightSyntax(options.caption),
        usable,
        2,
        (size) => `500 ${size}px ${getFontFamilySpec("sans")}`,
        captionSize,
      )
    : null;

  // Godziny w poziomie, dni w pionie: przy 7 kolumnach na 24 komórki siatka
  // zwężała się do słupeczka i nie wypełniała kadru.
  const cols = 24;
  const rows = 7;
  const step = usable / cols;
  const rowGap = step * 0.55;
  const boxH = rows * step + (rows - 1) * rowGap;

  const number = fitLines(
    ctx,
    `${Math.round(options.screenHours)} HOURS`,
    usable,
    1,
    (size) => `800 ${size}px ${getFontFamilySpec("sans")}`,
    numberSize,
    Math.round(numberSize * 0.5),
  );

  const blockHeight =
    line.lines.length * lineSize * 1.3 +
    boxH +
    number.size * 1.7 +
    (caption ? caption.lines.length * captionSize * 1.4 + 60 : 0);
  let y = centeredTop(blockHeight, height) + lineSize;

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `700 ${line.size}px ${getFontFamilySpec("cinzel")}`;
  for (const row of line.lines) {
    ctx.fillText(row, width / 2, y);
    y += line.size * 1.3;
  }

  const boxTop = y + step * 1.4;
  for (let day = 0; day < rows; day++) {
    cellGrid(
      ctx,
      cols,
      1,
      { x: margin, y: boxTop + day * (step + rowGap), w: usable },
      (hour, _row, x, cy, size) => {
        let fill = "rgba(243,240,234,0.10)";
        if (hour < sleep) fill = "rgba(243,240,234,0.34)";
        else if (hour < sleep + work) fill = "rgba(243,240,234,0.66)";
        else if (hour < sleep + work + screenPerDay) fill = accent;
        ctx.fillStyle = fill;
        ctx.fillRect(x, cy, size, size);
      },
    );
  }

  y = boxTop + boxH + number.size;
  ctx.fillStyle = accent;
  ctx.font = `800 ${number.size}px ${getFontFamilySpec("sans")}`;
  ctx.fillText(number.lines[0] ?? "", width / 2, y);

  // Trzy szarości bez etykiety to zgadywanka. Siatka życia obroni się sama,
  // tu legenda jest częścią argumentu.
  const legendSize = Math.round(width * 0.022);
  const legendY = boxTop - Math.round(step * 0.35);
  const legend: Array<[string, string]> = [
    ["SLEEP", "rgba(243,240,234,0.34)"],
    ["WORK", "rgba(243,240,234,0.66)"],
    ["SCREEN", accent],
  ];
  const legendWidth = legend.length * legendSize * 6.4;
  ctx.textAlign = "left";
  ctx.font = `500 ${legendSize}px ${getFontFamilySpec("sans")}`;
  legend.forEach(([label, color], i) => {
    const x = width / 2 - legendWidth / 2 + i * legendSize * 6.4;
    ctx.fillStyle = color;
    ctx.fillRect(x, legendY - legendSize * 0.75, legendSize, legendSize);
    ctx.fillStyle = DIM;
    ctx.fillText(label, x + legendSize * 1.5, legendY - legendSize * 0.05);
  });
  ctx.textAlign = "center";

  ctx.fillStyle = DIM;
  ctx.font = `500 ${Math.round(width * 0.025)}px ${getFontFamilySpec("sans")}`;
  ctx.fillText(
    `ON A SCREEN A WEEK - ${(options.screenHours / 24).toFixed(1)} WHOLE DAYS AWAKE`,
    width / 2,
    y + number.size * 0.45,
  );

  if (caption) {
    let captionY = y + numberSize * 1.05;
    ctx.fillStyle = INK;
    ctx.font = `500 ${caption.size}px ${getFontFamilySpec("sans")}`;
    for (const row of caption.lines) {
      ctx.fillText(row, width / 2, captionY);
      captionY += caption.size * 1.4;
    }
  }

  ctx.textAlign = "left";
  footer(ctx, width, height, options.handle);
}
