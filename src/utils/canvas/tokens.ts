// Tokenizacja i zawijanie tekstu dla rendererów canvas (wycięte z canvasRenderer.ts).
export function stripHighlightSyntax(t: string): string {
  return t.replace(/\*\*/g, "").replace(/\*/g, "");
}

interface TextToken {
  text: string;
  isHighlight: boolean;
}

export function parseLineTokens(line: string, highlightTerms: string[]): TextToken[] {
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

  const rawWords = line.split(" ");
  const tokens: TextToken[] = [];
  let inMarkdownHighlight = false;

  for (const rawWord of rawWords) {
    if (!rawWord) continue;

    let isMarked = false;
    let wordText = rawWord;

    // Check if word starts or ends markdown highlight (** or *)
    const startsBold = wordText.startsWith("**") || wordText.startsWith("*");
    if (startsBold) {
      inMarkdownHighlight = true;
      wordText = wordText.replace(/^(\*\*|\*)/, "");
    }

    if (inMarkdownHighlight) {
      isMarked = true;
    }

    const endsBold = wordText.includes("**") || wordText.includes("*");
    if (endsBold) {
      wordText = wordText.replace(/(\*\*|\*)/g, "");
      inMarkdownHighlight = false;
    }

    // Check against highlight terms list
    const stripped = wordText
      .replace(/[^a-zA-Z0-9Ä…Ä‡Ä™Ĺ‚Ĺ„ĂłĹ›ĹşĹĽÄ„Ä†ÄĹĹĂ“ĹšĹąĹ»]/g, "")
      .toLowerCase();

    if (
      stripped &&
      (normalizedTerms.has(stripped) ||
        Array.from(normalizedTerms).some(
          (t) => stripped === t || stripped.includes(t) || (t.length >= 3 && t.includes(stripped)),
        ))
    ) {
      isMarked = true;
    }

    tokens.push({
      text: wordText,
      isHighlight: isMarked,
    });
  }

  return tokens;
}

export function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  // Respect manual Enter line breaks first
  const paragraphs = text.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      resultLines.push(""); // Empty line spacing
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
