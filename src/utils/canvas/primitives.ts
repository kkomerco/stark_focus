/**
 * Prymitywy renderowania tekstu i obrazu — wyniesione z `canvasRenderer.ts`,
 * żeby nowe układy mogły z nich korzystać bez kopiowania i bez dokladania
 * kolejnych setek linii do i tak przekroczonego budżetu rozmiaru monolitu.
 */

export interface TextToken {
  text: string;
  isHighlight: boolean;
}

/** Model sypie markdownem (`**słowo**`); na kadru ma zostać samo słowo. */
export function stripHighlightSyntax(t: string): string {
  return t.replace(/\*\*/g, "").replace(/\*/g, "");
}

/**
 * Podział linii na słowa z oznaczeniem, które z nich wyróżnić akcentem marki.
 * Łączy dwa źródła: markery markdown z tekstu i listę pojęć zwróconą przez model.
 */
export function parseLineTokens(line: string, highlightTerms: string[]): TextToken[] {
  const normalizedTerms = new Set<string>();
  for (const term of highlightTerms) {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) continue;
    normalizedTerms.add(cleanTerm);
    const subWords = cleanTerm.split(/\s+/).filter((w) => w.length >= 2);
    for (const sw of subWords) normalizedTerms.add(sw);
  }

  const rawWords = line.split(" ");
  const tokens: TextToken[] = [];
  let inMarkdownHighlight = false;

  for (const rawWord of rawWords) {
    if (!rawWord) continue;

    let isMarked = false;
    let wordText = rawWord;

    const startsBold = wordText.startsWith("**") || wordText.startsWith("*");
    if (startsBold) {
      inMarkdownHighlight = true;
      wordText = wordText.replace(/^(\*\*|\*)/, "");
    }

    if (inMarkdownHighlight) isMarked = true;

    const endsBold = wordText.includes("**") || wordText.includes("*");
    if (endsBold) {
      wordText = wordText.replace(/(\*\*|\*)/g, "");
      inMarkdownHighlight = false;
    }

    const stripped = wordText.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, "").toLowerCase();

    // Tylko pelne slowo. Wczesniejsze dopasowanie po podstringach
    // („silen" trafialo w „silence", a „the" w „them") barwilo cale linie —
    // wyroznienie, ktore zajmuje pol wiersza, przestaje wyrozniac.
    if (stripped && normalizedTerms.has(stripped)) isMarked = true;

    tokens.push({ text: wordText, isHighlight: isMarked });
  }

  // Jeden akcent na wiersz — marka ma JEDEN karmazynowy wyraz, nie zdanie.
  let accentUsed = false;
  for (const token of tokens) {
    if (!token.isHighlight) continue;
    if (accentUsed) token.isHighlight = false;
    accentUsed = true;
  }

  return tokens;
}

/** Łamanie po szerokości liczone z tekstu BEZ markerów — pomiar musi równać się temu, co malujemy. */
export function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const paragraphs = text.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      resultLines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = "";

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

/**
 * Dobiera stopień pisma tak, żeby tekst zmieścił się w `maxLines`.
 * Zwraca rozmiar razem z wierszami — rysujący musi użyć TYCH samych wartości,
 * bo miara branego z innego kroju niż malowany wypycha linie za margines.
 */
export function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  font: (size: number) => string,
  startSize: number,
  minSize = Math.round(startSize * 0.55),
): { size: number; lines: string[] } {
  let size = startSize;
  let lines: string[] = [];
  for (;;) {
    ctx.font = font(size);
    lines = wrapTextLines(ctx, text, maxWidth);
    if (lines.length <= maxLines || size <= minSize) break;
    size = Math.max(minSize, size - Math.max(2, Math.round(size * 0.06)));
  }
  return { size, lines: lines.slice(0, maxLines) };
}

/** Wypełnienie obszaru obrazem bez zniekształcenia (cover + środkowe kadrowanie). */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const naturalWidth =
    (img as any).naturalWidth || (img as any).videoWidth || (img as any).width || 800;
  const naturalHeight =
    (img as any).naturalHeight || (img as any).videoHeight || (img as any).height || 600;

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

/** Kroje markowe. Canvas używa tylko fontów już pobranych — patrz `src/utils/fonts.ts`. */
export function getFontFamilySpec(fontFamily: string = "sans"): string {
  const f = fontFamily.toLowerCase();
  if (f === "cinzel" || f === "serif" || f === "cinzel roman") return `"Cinzel", serif`;
  if (f === "cormorant" || f === "cormorant garamond")
    return `"Cormorant Garamond", Georgia, serif`;
  if (f === "inter") return `"Inter", sans-serif`;
  return `"Plus Jakarta Sans", sans-serif`;
}

/** Jedna linia tekstu z wyróżnionymi słowami akcentem, bez przesuwania reszty. */
export function drawTokenLine(
  ctx: CanvasRenderingContext2D,
  tokens: TextToken[],
  x: number,
  y: number,
  baseColor: string,
  accentColor: string,
) {
  let cursor = x;
  for (const token of tokens) {
    ctx.fillStyle = token.isHighlight ? accentColor : baseColor;
    ctx.fillText(token.text, cursor, y);
    cursor += ctx.measureText(`${token.text} `).width;
  }
}

/** Zmierz szerokość linii tokenów — do wyśrodkowania i sprawdzenia, czy się mieści. */
export function measureTokenLine(ctx: CanvasRenderingContext2D, tokens: TextToken[]): number {
  return tokens.reduce((total, token) => total + ctx.measureText(`${token.text} `).width, 0);
}
