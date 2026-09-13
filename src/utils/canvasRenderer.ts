import JSZip from 'jszip';
import type {
  VisualTheme,
  LogoPlacement,
  LogoGlowChoice,
  LogoSourceType,
  TopHeaderMode,
  SlideData,
  UniversalLayoutSpec,
  UniversalTextLayer
} from '../types';
import {
  getStarkThemeConfig,
  normalizeLogoPlacement,
  resolveTopHeaderText,
  drawBrandLogoOnContext
} from './starkBrandTheme';

export type { SlideData };

export interface RenderSlideOptions {
  width: number;
  height: number;
  slideNumber: number;
  totalSlides: number;
  headline: string;
  bodyText: string;
  handle: string;
  theme?: VisualTheme | string;
  bgImage?: CanvasImageSource | null;
  logoImg?: HTMLImageElement | null;
  logoSourceType?: LogoSourceType;
  logoPlacement?: LogoPlacement;
  logoSize?: number;
  logoOpacity?: number;
  logoGlow?: LogoGlowChoice;
  topHeaderMode?: TopHeaderMode;
  topHeaderCustom?: string;
  textOffsetY?: number;
  highlightWords?: string;
}

function stripHighlightSyntax(t: string): string {
  return t.replace(/\*\*/g, '').replace(/\*/g, '');
}

interface TextToken {
  text: string;
  isHighlight: boolean;
}

function parseLineTokens(line: string, highlightTerms: string[]): TextToken[] {
  // Normalize highlight terms and expand multi-word phrases into individual word components
  const normalizedTerms = new Set<string>();
  for (const term of highlightTerms) {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) continue;
    normalizedTerms.add(cleanTerm);
    const subWords = cleanTerm.split(/\s+/).filter((w) => w.length >= 2);
    for (const sw of subWords) {
      normalizedTerms.add(sw);
    }
  }

  const rawWords = line.split(' ');
  const tokens: TextToken[] = [];
  let inMarkdownHighlight = false;

  for (const rawWord of rawWords) {
    if (!rawWord) continue;

    let isMarked = false;
    let wordText = rawWord;

    // Check if word starts or ends markdown highlight (** or *)
    const startsBold = wordText.startsWith('**') || wordText.startsWith('*');
    if (startsBold) {
      inMarkdownHighlight = true;
      wordText = wordText.replace(/^(\*\*|\*)/, '');
    }

    if (inMarkdownHighlight) {
      isMarked = true;
    }

    const endsBold = wordText.includes('**') || wordText.includes('*');
    if (endsBold) {
      wordText = wordText.replace(/(\*\*|\*)/g, '');
      inMarkdownHighlight = false;
    }

    // Check against highlight terms list
    const stripped = wordText
      .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, '')
      .toLowerCase();

    if (
      stripped &&
      (normalizedTerms.has(stripped) ||
        Array.from(normalizedTerms).some((t) => stripped === t || stripped.includes(t) || (t.length >= 3 && t.includes(stripped))))
    ) {
      isMarked = true;
    }

    tokens.push({
      text: wordText,
      isHighlight: isMarked
    });
  }

  return tokens;
}

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // Respect manual Enter line breaks first
  const paragraphs = text.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      resultLines.push(''); // Empty line spacing
      continue;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      if (ctx.measureText(stripHighlightSyntax(testLine)).width > maxWidth && currentLine) {
        resultLines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) resultLines.push(currentLine);
  }
  return resultLines;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const naturalWidth = (img as any).naturalWidth || (img as any).videoWidth || (img as any).width || 800;
  const naturalHeight = (img as any).naturalHeight || (img as any).videoHeight || (img as any).height || 600;

  const targetRatio = w / h;
  const imageRatio = naturalWidth / naturalHeight;

  let sx = 0;
  let sy = 0;
  let sWidth = naturalWidth;
  let sHeight = naturalHeight;

  if (imageRatio > targetRatio) {
    sWidth = naturalHeight * targetRatio;
    sx = (naturalWidth - sWidth) / 2;
  } else {
    sHeight = naturalWidth / targetRatio;
    sy = (naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

// =========================================================================
// PROFESJONALNY FORMAT: LITERY 3D NA ŚCIANIE (PERSPEKTYWA 3D + KINOWE ŚWIATŁO)
// =========================================================================
export function draw3DWallQuoteSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    textLines: string[];
    wallImage?: CanvasImageSource | null;
    handle?: string;
  }
) {
  const {
    width = 1080,
    height = 1920,
    textLines = [
      'Stay coachable',
      'through all',
      'phases of life.',
      'Never stop',
      'learning and',
      'listening.'
    ],
    wallImage = null,
    handle = 'stark_focus'
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. TŁO: Jeśli wgrano prawdziwe zdjęcie ściany – użyj go. Jeśli nie – wygeneruj fotorealistyczny beton studyjny
  if (wallImage) {
    drawImageCover(ctx, wallImage, 0, 0, width, height);
  } else {
    // Fotorealistyczna ściana z narożnikiem po prawej stronie i światłem z góry
    const wallGrad = ctx.createLinearGradient(0, 0, width, height);
    wallGrad.addColorStop(0, '#B2B7C1');
    wallGrad.addColorStop(0.4, '#8E95A2');
    wallGrad.addColorStop(0.85, '#5D6472');
    wallGrad.addColorStop(1, '#343A45');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, width, height);

    // Naturalny snop światła padający z góry
    const spotX = width * 0.88;
    const spotY = height * 0.02;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 50, spotX, spotY, height * 0.95);
    spotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    spotGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.18)');
    spotGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
    spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, width, height);

    // Cień w prawym rogu (narożnik ściany)
    const cornerGrad = ctx.createLinearGradient(width * 0.82, 0, width, 0);
    cornerGrad.addColorStop(0, 'rgba(0,0,0,0)');
    cornerGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = cornerGrad;
    ctx.fillRect(width * 0.82, 0, width * 0.18, height);
  }

  // 2. NAŁOŻENIE MACIERZY PERSPEKTYWY 3D (Ściana ucieka w głąb kadru w stronę narożnika)
  ctx.save();
  // Transformacja perspektywiczna: pochylenie w pionie i poziomie, dokładnie jak w rzucie z kamery
  ctx.setTransform(1, -0.055, 0.065, 1, width * 0.05, height * 0.08);

  const fontSize = 72;
  const lineHeight = fontSize * 1.34;
  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const startX = width * 0.14;
  let curY = height * 0.26;

  textLines.forEach((line) => {
    // Źródło światła jest w prawym górnym rogu -> Cień MUSI padać w LEWO-DÓŁ!
    const shadowOffsetX = -14;
    const shadowOffsetY = 18;

    // A. Miękki cień rozproszony na ścianie (Ambient Shadow)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetX = shadowOffsetX * 1.3;
    ctx.shadowOffsetY = shadowOffsetY * 1.3;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillText(line, startX, curY);
    ctx.restore();

    // B. Ostry cień kontaktowy przy krawędzi litery
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = shadowOffsetX * 0.5;
    ctx.shadowOffsetY = shadowOffsetY * 0.5;
    ctx.fillStyle = '#0B0C10';
    ctx.fillText(line, startX, curY);
    ctx.restore();

    // C. Wypukłość 3D (boki liter rzeźbione w stronę cienia)
    for (let d = 4; d >= 1; d--) {
      ctx.fillStyle = '#0E1015';
      ctx.fillText(line, startX - d * 1.2, curY + d * 1.4);
    }

    // D. Front litery: Głęboka matowa stal węglowa z delikatnym mikro-kontrastem
    ctx.fillStyle = '#181A20';
    ctx.fillText(line, startX, curY);

    curY += lineHeight;
  });

  ctx.restore(); // Przywrócenie normalnego układu współrzędnych

  // Dyskretna sygnatura na dole ściany
  ctx.font = '500 20px monospace';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.textAlign = 'left';
  ctx.fillText(`@${handle.replace('@', '')}`, width * 0.16, height * 0.94);
}

// =========================================================================
// KOLAŻ 4 KADRÓW (WINTER ARC / SIATKA 2x2)
// =========================================================================
export function draw4GridCollageSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    centerText: string;
    images: (CanvasImageSource | null)[];
    handle?: string;
  }
) {
  const {
    width = 1080,
    height = 1920,
    centerText = 'This winter',
    images = [null, null, null, null]
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const halfW = width / 2;
  const halfH = height / 2;

  const quadrants = [
    { x: 0, y: 0, w: halfW, h: halfH },
    { x: halfW, y: 0, w: halfW, h: halfH },
    { x: 0, y: halfH, w: halfW, h: halfH },
    { x: halfW, y: halfH, w: halfW, h: halfH }
  ];

  quadrants.forEach((q, idx) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(q.x, q.y, q.w, q.h);
    ctx.clip();

    const img = images[idx];
    if (img && (img as any).complete !== false) {
      try {
        drawImageCover(ctx, img, q.x, q.y, q.w, q.h);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(q.x, q.y, q.w, q.h);
      } catch {
        ctx.fillStyle = '#0F1420';
        ctx.fillRect(q.x, q.y, q.w, q.h);
      }
    } else {
      ctx.fillStyle = '#090D16';
      ctx.fillRect(q.x, q.y, q.w, q.h);
    }
    ctx.restore();
  });

  // Czarne linie dzielące siatkę (10px)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(halfW, 0);
  ctx.lineTo(halfW, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, halfH);
  ctx.lineTo(width, halfH);
  ctx.stroke();

  // Centralny napis szeryfowy z grubym czarnym obrysem
  const fontSize = 76;
  ctx.font = `700 ${fontSize}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textY = halfH;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 14;
  ctx.lineJoin = 'round';
  ctx.strokeText(centerText, width / 2, textY);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(centerText, width / 2, textY);
}

// =========================================================================
// CYTAT NA CZERNI
// =========================================================================
export function drawMinimalBlackQuoteSlide(
  canvas: HTMLCanvasElement,
  options: {
    width?: number;
    height?: number;
    mainText: string;
    subText?: string;
    boldKeyword?: string;
    align?: 'left' | 'center';
  }
) {
  const {
    width = 1080,
    height = 1920,
    mainText = 'Focus on yourself.',
    subText = 'people come & go.',
    boldKeyword = 'Focus',
    align = 'left'
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const paddingX = width * 0.14;
  const maxLineWidth = width - paddingX * 2;

  let mainFontSize = 62;
  if (mainText.length > 40) mainFontSize = 48;
  if (mainText.length > 70) mainFontSize = 38;

  const mainFont = `700 ${mainFontSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
  ctx.font = mainFont;
  const mainLines = wrapTextLines(ctx, mainText, maxLineWidth);

  let curY = height * 0.44;
  const lineHeight = mainFontSize * 1.35;
  const drawX = align === 'center' ? width / 2 : paddingX;
  ctx.textAlign = align === 'center' ? 'center' : 'left';

  mainLines.forEach((line) => {
    ctx.font = mainFont;
    ctx.fillStyle = '#FFFFFF';

    if (boldKeyword && line.toLowerCase().startsWith(boldKeyword.toLowerCase()) && align === 'left') {
      ctx.font = `900 ${mainFontSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
      ctx.fillText(boldKeyword, drawX, curY);
      const kwWidth = ctx.measureText(boldKeyword + ' ').width;

      const rest = line.slice(boldKeyword.length).trim();
      ctx.font = `500 ${mainFontSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(rest, drawX + kwWidth, curY);
    } else {
      ctx.fillText(line, drawX, curY);
    }
    curY += lineHeight;
  });

  if (subText) {
    curY += 50;
    const subFontSize = Math.max(30, Math.round(mainFontSize * 0.68));
    const subFont = `400 ${subFontSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
    ctx.font = subFont;
    const subLines = wrapTextLines(ctx, subText.toLowerCase(), maxLineWidth);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    subLines.forEach((line) => {
      ctx.fillText(line, drawX, curY);
      curY += subFontSize * 1.4;
    });
  }
}

// =========================================================================
// DZIELONY KADR MONOLITH LEDGER (50/50)
// =========================================================================
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
  }
) {
  const {
    width = 1080,
    height = 1920,
    headline = '',
    subtext = '',
    points = [],
    handle = 'stark_focus',
    bgImage,
    accentColor = '#38BDF8'
  } = options;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const splitY = height * 0.46;

  if (bgImage) {
    try {
      drawImageCover(ctx, bgImage, 0, 0, width, splitY);
    } catch {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, width, splitY);
    }
  } else {
    const topGrad = ctx.createLinearGradient(0, 0, 0, splitY);
    topGrad.addColorStop(0, '#101726');
    topGrad.addColorStop(1, '#04060A');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, splitY);
  }

  const seamGrad = ctx.createLinearGradient(0, splitY - 160, 0, splitY);
  seamGrad.addColorStop(0, 'rgba(8, 11, 18, 0)');
  seamGrad.addColorStop(1, '#080B12');
  ctx.fillStyle = seamGrad;
  ctx.fillRect(0, splitY - 160, width, 160);

  ctx.fillStyle = '#080B12';
  ctx.fillRect(0, splitY, width, height - splitY);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, splitY);
  ctx.lineTo(width - 60, splitY);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.fillRect(width / 2 - 45, splitY - 2, 90, 4);

  ctx.font = '700 16px monospace';
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.fillText('[ STANDARD OPERACYJNY // STARK_FOCUS ]', 70, splitY + 55);

  ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  const headlineLines = wrapTextLines(ctx, headline.toUpperCase(), width - 140);
  let textY = splitY + 120;
  headlineLines.slice(0, 2).forEach((line) => {
    ctx.fillText(line, 70, textY);
    textY += 58;
  });

  if (subtext) {
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    ctx.fillText(subtext, 70, textY + 10);
    textY += 55;
  }

  let curY = Math.max(splitY + 235, textY + 15);
  points.slice(0, 3).forEach((pt, idx) => {
    ctx.fillStyle = '#101522';
    ctx.fillRect(70, curY, width - 140, 74);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(70, curY, width - 140, 74);

    ctx.font = '900 20px monospace';
    ctx.fillStyle = accentColor;
    ctx.fillText(`0${idx + 1}`, 95, curY + 45);

    ctx.font = '600 21px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const pointLines = wrapTextLines(ctx, pt, width - 240);
    ctx.fillText(pointLines[0] || pt, 155, curY + 45);
    curY += 90;
  });

  ctx.font = '700 20px monospace';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.fillText(`@${handle.replace('@', '').toUpperCase()}`, 70, height - 70);
  ctx.textAlign = 'right';
  ctx.fillText('SAVE FOR MORNING DISCIPLINE // ♟️', width - 70, height - 70);
}

// =========================================================================
// UNIWERSALNY ROUTER RENDEROWANIA UKŁADÓW
// =========================================================================
export function renderUniversalLayout(
  canvas: HTMLCanvasElement,
  spec: UniversalLayoutSpec,
  images: (CanvasImageSource | null)[] = [],
  options: { width?: number; height?: number } = {}
) {
  const width = options.width || 1080;
  const height = options.height || 1920;

  // Format 1: Litery 3D na ścianie z lampą
  if (spec.gridType === 'studio_wall_3d' || spec.textEffect === '3d_wall') {
    const lines = spec.textLayers.map((l) => l.text);
    draw3DWallQuoteSlide(canvas, {
      width,
      height,
      textLines: lines.length > 0 ? lines : ['Stay ruthless', 'through all', 'phases of life.'],
      wallImage: images[0] || null,
      handle: 'stark_focus'
    });
    return;
  }

  // Format 2: Kolaż 4 Kadrów
  if (spec.gridType === 'grid_2x2') {
    const centerText = spec.textLayers[0]?.text || 'This winter';
    draw4GridCollageSlide(canvas, {
      width,
      height,
      centerText,
      images,
      handle: 'stark_focus'
    });
    return;
  }

  // Format 3: Dzielony kadr 50/50
  if (spec.gridType === 'split_horizontal') {
    const headline = spec.textLayers[0]?.text || 'STANDARDS OVER MOOD';
    drawMonolithLedgerSlide(canvas, {
      width,
      height,
      headline,
      subtext: 'Silence cannot be misquoted.',
      bgImage: images[0] || null,
      handle: 'stark_focus'
    });
    return;
  }

  // Format 4: Domyślny czarny cytat
  const l1 = spec.textLayers[0]?.text || 'Focus on yourself.';
  const l2 = spec.textLayers[1]?.text || 'people come & go.';
  drawMinimalBlackQuoteSlide(canvas, {
    width,
    height,
    mainText: l1,
    subText: l2,
    align: 'left'
  });
}

// GŁÓWNY SILNIK RENDEROWANIA KARUZEL
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fill?: string,
  stroke?: string,
  lineWidth: number = 1
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

function drawCornerCrosshair(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 8,
  color = 'rgba(255, 255, 255, 0.16)'
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

function computeFittedSlideLayout(
  ctx: CanvasRenderingContext2D,
  headline: string,
  bodyText: string,
  contentWidth: number,
  topLimit: number,
  bottomLimit: number,
  textOffsetY: number
): FittedSlideLayout {
  const availableH = bottomLimit - topLimit;
  let headlineFontSize = headline.length > 55 ? 50 : headline.length > 30 ? 56 : 64;
  let bodyFontSize = bodyText.length > 250 ? 34 : bodyText.length > 140 ? 38 : 42;
  const minHeadlineSize = 32;
  const minBodySize = 22;

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

    ctx.font = `900 ${headlineFontSize}px "Plus Jakarta Sans", sans-serif`;
    headlineLines = wrapTextLines(ctx, headline.toUpperCase(), contentWidth);

    ctx.font = `500 ${bodyFontSize}px "Plus Jakarta Sans", sans-serif`;
    bodyLines = wrapTextLines(ctx, bodyText, contentWidth);

    const headlineH = headlineLines.reduce(
      (acc, l) => acc + (l === '' ? Math.round(headlineLineHeight * 0.5) : headlineLineHeight),
      0
    );
    const bodyH = bodyLines.reduce(
      (acc, l) => acc + (l === '' ? paragraphGap : bodyLineHeight),
      0
    );

    totalContentH = eyebrowH + headlineH + dividerH + bodyH;

    if (
      totalContentH <= availableH * 0.90 ||
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
    startY
  };
}

// GŁÓWNY SILNIK RENDEROWANIA KARUZEL - NOWY ARCHETYP: DARK STOIC EDITORIAL
export function drawSlideToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderSlideOptions
) {
  const {
    width,
    height,
    slideNumber,
    totalSlides,
    headline,
    bodyText,
    handle,
    theme = 'obsidian_monolith',
    bgImage,
    logoImg = null,
    logoSourceType = 'seal',
    logoPlacement = 'background_watermark',
    logoSize = 44,
    logoOpacity = 25,
    logoGlow = 'none',
    topHeaderMode = 'protocol_standard',
    topHeaderCustom,
    textOffsetY = 0,
    highlightWords = ''
  } = options;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const themeConfig = getStarkThemeConfig(theme);
  const normPlacement = normalizeLogoPlacement(logoPlacement);

  // 1. TŁO & ATMOSFERA
  if (bgImage) {
    try {
      drawImageCover(ctx, bgImage, 0, 0, width, height);
    } catch {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, themeConfig.bgGradStart);
      bgGrad.addColorStop(0.5, themeConfig.bgGradMid);
      bgGrad.addColorStop(1, themeConfig.bgGradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }
    // Mroczna winieta kinowa o wysokim kontraście
    ctx.fillStyle = 'rgba(5, 7, 12, 0.76)';
    ctx.fillRect(0, 0, width, height);
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, themeConfig.bgGradStart);
    bgGrad.addColorStop(0.5, themeConfig.bgGradMid);
    bgGrad.addColorStop(1, themeConfig.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Dyskretny blask światła radialnego dla głębi editorial
    const bloom = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      10,
      width / 2,
      height * 0.35,
      width * 0.75
    );
    bloom.addColorStop(0, 'rgba(255, 255, 255, 0.035)');
    bloom.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. RAMKA ARCHITEKTONICZNA & ZNACZNIKI REJESTRACYJNE (CROSSHAIRS)
  const frameMargin = 52;
  drawCornerCrosshair(ctx, frameMargin, frameMargin, 8, 'rgba(255, 255, 255, 0.16)');
  drawCornerCrosshair(ctx, width - frameMargin, frameMargin, 8, 'rgba(255, 255, 255, 0.16)');
  drawCornerCrosshair(ctx, frameMargin, height - frameMargin, 8, 'rgba(255, 255, 255, 0.16)');
  drawCornerCrosshair(ctx, width - frameMargin, height - frameMargin, 8, 'rgba(255, 255, 255, 0.16)');

  // Linie podziału nagłówka i stopki
  const topRuleY = 136;
  const bottomRuleY = height - 136;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(frameMargin, topRuleY);
  ctx.lineTo(width - frameMargin, topRuleY);
  ctx.moveTo(frameMargin, bottomRuleY);
  ctx.lineTo(width - frameMargin, bottomRuleY);
  ctx.stroke();

  const renderLogo = (lx: number, ly: number, size: number, alpha: number, glow: LogoGlowChoice) => {
    drawBrandLogoOnContext({
      ctx,
      lx,
      ly,
      targetSize: size,
      alphaPct: alpha,
      halo: glow,
      logoImg,
      logoSourceType
    });
  };

  // 3. LOGO: ZNAK WODNY W TLE (W CENTRUM KADRU)
  if (normPlacement === 'background_watermark') {
    renderLogo(width / 2, height * 0.48, Math.max(logoSize * 4.6, 280), logoOpacity, 'none');
  }

  // 4. GÓRNY PASEK NAGŁÓWKA (SERIES TAG + PROGRESS CAPSULES)
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const headerText = resolveTopHeaderText(topHeaderMode, topHeaderCustom);
  const headerY = 88;

  const isGold = theme === 'pantheon_mist';
  const highlightColor = isGold
    ? '#F59E0B'
    : (themeConfig.accentColor &&
       themeConfig.accentColor !== '#E2E8F0' &&
       themeConfig.accentColor !== '#94A3B8'
        ? themeConfig.accentColor
        : '#38BDF8');

  // 4A. Lewa strona nagłówka
  if (topHeaderMode !== 'none' && topHeaderMode !== 'clean_void') {
    let startTagX = 74;

    if (normPlacement === 'top_left') {
      const topLogoSize = 42;
      renderLogo(startTagX + 16, headerY, topLogoSize, Math.max(logoOpacity, 85), logoGlow);
      startTagX += topLogoSize + 24;
    }

    if (headerText) {
      ctx.font = 'bold 14px "Space Grotesk", monospace, sans-serif';
      const tagTextWidth = ctx.measureText(headerText).width;
      const pillW = tagTextWidth + 24;
      drawPill(
        ctx,
        startTagX,
        headerY - 17,
        pillW,
        34,
        6,
        'rgba(255, 255, 255, 0.04)',
        'rgba(255, 255, 255, 0.12)'
      );

      ctx.fillStyle = highlightColor;
      ctx.textAlign = 'left';
      ctx.fillText(headerText, startTagX + 12, headerY + 5);
    }
  }

  // 4B. Prawa strona nagłówka: Segmentowy pasek postępu karuzeli
  const counterString = `${pad(slideNumber)} / ${pad(totalSlides)}`;
  ctx.font = 'bold 15px "Space Grotesk", monospace, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'right';
  ctx.fillText(counterString, width - 74, headerY + 5);

  const counterWidth = ctx.measureText(counterString).width;
  const capsuleCount = Math.max(1, totalSlides);
  const capsuleW = Math.max(16, Math.min(28, Math.floor(130 / capsuleCount)));
  const capsuleH = 5;
  const capsuleGap = 4;
  const totalCapsulesW = capsuleCount * capsuleW + (capsuleCount - 1) * capsuleGap;
  const capsulesStartX = width - 74 - counterWidth - 16 - totalCapsulesW;

  for (let i = 0; i < capsuleCount; i++) {
    const capX = capsulesStartX + i * (capsuleW + capsuleGap);
    const capY = headerY - 3;
    const isLit = i < slideNumber;
    drawPill(
      ctx,
      capX,
      capY,
      capsuleW,
      capsuleH,
      2,
      isLit ? highlightColor : 'rgba(255, 255, 255, 0.14)'
    );
  }

  // 5. INTELIGENTNY SILNIK DOPASOWYWANIA TREŚCI (AUTO-FIT)
  const maxContentW = width - 176; // 88px marginesu z każdej strony
  const topSafeLimit = topRuleY + 34;
  const bottomSafeLimit = bottomRuleY - 34;

  const layout = computeFittedSlideLayout(
    ctx,
    headline,
    bodyText,
    maxContentW,
    topSafeLimit,
    bottomSafeLimit,
    textOffsetY
  );

  const parsedHighlightTerms = highlightWords
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 0);

  let curY = layout.startY;
  const contentLeftX = 88;

  // 5A. Slide Category / Eyebrow Indicator
  const eyebrowFontSize = 15;
  ctx.font = `bold ${eyebrowFontSize}px "Space Grotesk", monospace, sans-serif`;
  ctx.fillStyle = highlightColor;
  ctx.fillRect(contentLeftX, curY - 9, 6, 6);

  ctx.textAlign = 'left';
  const eyebrowLabel =
    slideNumber === 1
      ? 'HOOK // THE UNFORGIVING REALITY'
      : `RULE ${pad(slideNumber)} // PRINCIPLE`;
  ctx.fillText(eyebrowLabel, contentLeftX + 16, curY);

  // Bezpieczny odstęp przed nagłówkiem, zapobiegający nakładaniu się liter
  curY += layout.headlineFontSize + 14;

  // 5B. Headline z obsługą Enter i wyróżnianiem słów
  ctx.font = `900 ${layout.headlineFontSize}px "Plus Jakarta Sans", sans-serif`;

  layout.headlineLines.forEach((line) => {
    if (line === '') {
      curY += Math.round(layout.headlineLineHeight * 0.5);
      return;
    }

    const tokens = parseLineTokens(line, parsedHighlightTerms);
    let currentX = contentLeftX;

    tokens.forEach((token) => {
      const isHighlighted = token.isHighlight;
      ctx.font = `900 ${layout.headlineFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = isHighlighted ? highlightColor : '#FFFFFF';
      ctx.fillText(token.text, currentX, curY);

      const tokenW = ctx.measureText(token.text).width;
      const spaceW = ctx.measureText(' ').width;

      if (isHighlighted) {
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(currentX, curY + 6);
        ctx.lineTo(currentX + tokenW, curY + 6);
        ctx.stroke();
      }

      currentX += tokenW + spaceW;
    });

    curY += layout.headlineLineHeight;
  });

  // 5C. Architektoniczny divider między nagłówkiem a tekstem
  curY += 14;
  ctx.fillStyle = highlightColor;
  ctx.fillRect(contentLeftX, curY - 3, 6, 6);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(contentLeftX + 16, curY);
  ctx.lineTo(contentLeftX + Math.min(maxContentW, 260), curY);
  ctx.stroke();

  curY += layout.bodyFontSize + 14;

  // 5D. Body Text z obsługą akapitów, Enterów i wyraźnym wyróżnianiem słów
  layout.bodyLines.forEach((line) => {
    if (line === '') {
      curY += layout.paragraphGap;
      return;
    }

    const tokens = parseLineTokens(line, parsedHighlightTerms);
    let currentX = contentLeftX;

    tokens.forEach((token) => {
      const isHighlighted = token.isHighlight;
      const fontToUse = isHighlighted
        ? `800 ${layout.bodyFontSize}px "Plus Jakarta Sans", sans-serif`
        : `500 ${layout.bodyFontSize}px "Plus Jakarta Sans", sans-serif`;

      ctx.font = fontToUse;
      const tokenW = ctx.measureText(token.text).width;
      const spaceW = ctx.measureText(' ').width;

      if (isHighlighted) {
        // Nowoczesne tło kapsułki wyróżniającej w stylu editorial
        const pillPadX = 5;
        const pillH = Math.round(layout.bodyFontSize * 1.2);
        const pillY = curY - Math.round(layout.bodyFontSize * 0.92);
        const pillBg = isGold ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.16)';
        const pillBorder = isGold ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)';
        drawPill(ctx, currentX - pillPadX, pillY, tokenW + pillPadX * 2, pillH, 4, pillBg, pillBorder, 1);

        // Wyraz w wyrazistym, czytelnym kolorze akcentu
        ctx.fillStyle = highlightColor;
        ctx.fillText(token.text, currentX, curY);

        // Akcentowa linia podkreślająca
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(currentX - 2, curY + 5);
        ctx.lineTo(currentX + tokenW + 2, curY + 5);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#CBD5E1';
        ctx.fillText(token.text, currentX, curY);
      }

      currentX += tokenW + spaceW;
    });

    curY += layout.bodyLineHeight;
  });

  // 6. NOWOCZESNA STOPKA ARCHITEKTONICZNA
  const footerY = height - 88;
  const cleanHandle = handle.replace('@', '') || 'stark_focus';

  // 6A. Lewa strona stopki
  if (normPlacement === 'bottom_under') {
    const bottomLogoSize = 38;
    renderLogo(contentLeftX + 12, footerY, bottomLogoSize, Math.max(logoOpacity, 85), logoGlow);

    ctx.font = 'bold 20px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`@${cleanHandle}`, contentLeftX + bottomLogoSize + 18, footerY + 6);

    ctx.font = '600 13px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#64748B';
    const handleW = ctx.measureText(`@${cleanHandle}`).width;
    ctx.fillText('• THE UNFORGIVING STANDARD', contentLeftX + bottomLogoSize + 28 + handleW, footerY + 6);
  } else {
    ctx.font = 'bold 20px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(`@${cleanHandle}`, contentLeftX, footerY + 6);

    ctx.font = '600 13px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#64748B';
    const handleW = ctx.measureText(`@${cleanHandle}`).width;
    ctx.fillText('• THE UNFORGIVING STANDARD', contentLeftX + handleW + 12, footerY + 6);
  }

  // 6B. Prawa strona stopki: Interaktywny przycisk akcji (Pill badge)
  if (slideNumber === totalSlides) {
    const badgeW = 186;
    const badgeH = 40;
    const badgeX = width - 74 - badgeW;
    const badgeY = footerY - 18;
    drawPill(ctx, badgeX, badgeY, badgeW, badgeH, 8, highlightColor, undefined);

    ctx.font = 'bold 13px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#080C14';
    ctx.textAlign = 'center';
    ctx.fillText('SAVE THIS POST ⚑', badgeX + badgeW / 2, footerY + 6);
  } else {
    const badgeW = 116;
    const badgeH = 38;
    const badgeX = width - 74 - badgeW;
    const badgeY = footerY - 17;
    drawPill(
      ctx,
      badgeX,
      badgeY,
      badgeW,
      badgeH,
      8,
      'rgba(255, 255, 255, 0.04)',
      'rgba(255, 255, 255, 0.18)'
    );

    ctx.font = 'bold 13px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('SWIPE ➔', badgeX + badgeW / 2, footerY + 6);
  }
}

export async function exportSlideToBlob(
  canvas: HTMLCanvasElement,
  options: RenderSlideOptions
): Promise<Blob> {
  drawSlideToCanvas(canvas, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Błąd renderowania Canvas'))), 'image/png');
  });
}

export async function exportAllSlidesAsZip(slides: SlideData[], options: any) {
  const zip = new JSZip();
  const hiddenCanvas = document.createElement('canvas');

  for (let i = 0; i < slides.length; i++) {
    const blob = await exportSlideToBlob(hiddenCanvas, {
      ...options,
      slideNumber: i + 1,
      totalSlides: slides.length,
      headline: slides[i].headline,
      bodyText: slides[i].bodyText,
      textOffsetY: slides[i].textOffsetY ?? options.textOffsetY,
      highlightWords: slides[i].highlightWords ?? options.highlightWords
    });
    zip.file(`slide_${i + 1}.png`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.zipName || 'stark_focus_carousel.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}