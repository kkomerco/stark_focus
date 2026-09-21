// src/components/video/reel-helpers.ts
// Czyste typy, metadane motywow i helpery do renderu ramek rolek.
// Wyodrębnione z VideoStudioModal.tsx — brak zależności od Reacta.
import { ReelVisualTheme } from "../../data/reelTemplates";

export type VisualTheme = ReelVisualTheme;
export type HighlightStyle = "white_halo" | "bold";
export type FontFamily = "cinzel" | "sans" | "inter" | "cormorant";
export type ReelDuration = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 15;
export type PacingMode = "climax_hold" | "stoic_steady" | "uniform";

export interface PhraseTimeInterval {
  index: number;
  text: string;
  start: number;
  end: number;
  duration: number;
  isClimax: boolean;
}

export function getPhraseTimeline(
  phrases: string[],
  totalDuration: number,
  pacingMode: PacingMode,
): PhraseTimeInterval[] {
  if (phrases.length === 0) {
    return [
      {
        index: 0,
        text: "",
        start: 0,
        end: totalDuration,
        duration: totalDuration,
        isClimax: true,
      },
    ];
  }
  if (phrases.length === 1) {
    return [
      {
        index: 0,
        text: phrases[0],
        start: 0,
        end: totalDuration,
        duration: totalDuration,
        isClimax: true,
      },
    ];
  }

  const N = phrases.length;
  // Word count analysis per phrase for reading comfort
  const wordCounts = phrases.map((p) => Math.max(3, p.trim().split(/\s+/).filter(Boolean).length));
  const avgWords = wordCounts.reduce((acc, c) => acc + c, 0) / N;

  let baseWeights: number[];

  if (pacingMode === "climax_hold") {
    // Climax Hold: Earlier phrases deliver hook and build-up with comfortable reading time (~3s+),
    // while the final punchline holds 1.35x - 1.45x longer for maximum psychological retention.
    if (N === 2) {
      baseWeights = [1.1, 1.45];
    } else if (N === 3) {
      baseWeights = [1.15, 1.1, 1.45];
    } else if (N === 4) {
      baseWeights = [1.1, 1.0, 1.0, 1.4];
    } else {
      baseWeights = Array(N).fill(1.0);
      baseWeights[N - 1] = 1.4;
    }
  } else if (pacingMode === "stoic_steady") {
    // Stoic Steady: Meditative, evenly distributed cadence across all slides.
    if (N === 2) {
      baseWeights = [1.1, 1.25];
    } else if (N === 3) {
      baseWeights = [1.15, 1.05, 1.25];
    } else if (N === 4) {
      baseWeights = [1.1, 1.0, 1.0, 1.2];
    } else {
      baseWeights = Array(N).fill(1.0);
      baseWeights[0] = 1.1;
      baseWeights[N - 1] = 1.2;
    }
  } else {
    // uniform
    baseWeights = Array(N).fill(1.0);
  }

  // Multiply base weight by a soft word-count factor so longer phrases get proportionally more time
  const weights = baseWeights.map((bw, i) => {
    const wordFactor = 0.7 + 0.3 * (wordCounts[i] / (avgWords || 1));
    return bw * wordFactor;
  });

  const sumWeights = weights.reduce((acc, w) => acc + w, 0);
  let currentStart = 0;

  return phrases.map((text, idx) => {
    const rawDur = (weights[idx] / sumWeights) * totalDuration;
    const start = Math.round(currentStart * 100) / 100;
    const end = idx === N - 1 ? totalDuration : Math.round((currentStart + rawDur) * 100) / 100;
    currentStart = end;
    return {
      index: idx,
      text,
      start,
      end,
      duration: Math.max(0.4, Math.round((end - start) * 100) / 100),
      isClimax: idx === N - 1,
    };
  });
}

export interface ThemeMeta {
  id: VisualTheme;
  name: string;
  badge: string;
  desc: string;
}

export const VISUAL_THEMES: ThemeMeta[] = [
  {
    id: "obsidian_void",
    name: "Obsidian Void",
    badge: "Głęboka Czerń",
    desc: "Czysty czarny obsydian, subtelna grafitowa oś i minimalistyczny mrok.",
  },
  {
    id: "crimson_eclipse",
    name: "Crimson Eclipse",
    badge: "Zaćmienie Karmazynu",
    desc: "Głębokie winietowanie, zaćmienie z żarzącą się subtelną poświatą krwistego antracytu.",
  },
  {
    id: "emerald_abyss",
    name: "Emerald Abyss",
    badge: "Mroczny Szmaragd",
    desc: "Otchłań nefrytowej czerni, stoicki spokój i głębokie cienie leśnego granitu.",
  },
  {
    id: "carbon_aura",
    name: "Carbon Aura",
    badge: "Aura Antracytu",
    desc: "Aksamitny węgiel, subtelna eliptyczna poświata ze złotawym, zimnym żarem w tle.",
  },
  {
    id: "silver_mist",
    name: "Silver Mist",
    badge: "Srebrzysty Zmierzch",
    desc: "Głęboki grafit z delikatną poziomą poświatą platynowego światłocienia.",
  },
];

export interface Token {
  raw: string;
  clean: string;
  isKeyword: boolean;
}

export function parseTokens(text: string): Token[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.map((w) => {
    // Only explicit *word* marks are highlighted
    const hasAsterisks = w.startsWith("*") && w.endsWith("*") && w.length > 2;
    const stripped = w.replace(/\*/g, "");
    return {
      raw: stripped,
      clean: stripped.replace(/^[^\w\d]+|[^\w\d]+$/g, "").toUpperCase(),
      isKeyword: hasAsterisks,
    };
  });
}

export function isOrphanWord(w: string): boolean {
  const t = w.replace(/[^\w]/g, "").toUpperCase();
  return [
    "A",
    "AN",
    "THE",
    "IN",
    "ON",
    "AT",
    "TO",
    "OF",
    "FOR",
    "BY",
    "WITH",
    "AND",
    "OR",
    "IS",
  ].includes(t);
}

export function layoutLines(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxW: number,
  targetFontSize: number,
  fontFamily: string,
): {
  lines: Array<{ tokens: Token[]; width: number }>;
  fontSize: number;
  lineHeight: number;
} {
  let fontSize = targetFontSize;
  const minFontSize = 46;

  while (fontSize >= minFontSize) {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    const manualLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const resultLines: Array<{ tokens: Token[]; width: number }> = [];
    let fits = true;

    for (const mLine of manualLines) {
      const tokens = parseTokens(mLine);
      let curTokens: Token[] = [];
      let curW = 0;
      const spaceW = ctx.measureText(" ").width;

      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const wordW = ctx.measureText(tok.raw).width;
        const testW = curTokens.length === 0 ? wordW : curW + spaceW + wordW;

        if (testW <= maxW) {
          curTokens.push(tok);
          curW = testW;
        } else {
          if (curTokens.length === 0) {
            fits = false;
            break;
          }
          resultLines.push({ tokens: curTokens, width: curW });
          curTokens = [tok];
          curW = wordW;
        }
      }

      if (!fits) break;
      if (curTokens.length > 0) {
        resultLines.push({ tokens: curTokens, width: curW });
      }
    }

    if (fits && resultLines.length <= 4) {
      return {
        lines: resultLines,
        fontSize,
        lineHeight: Math.round(fontSize * 1.25),
      };
    }

    fontSize -= 2;
  }

  // Fallback
  ctx.font = `900 ${minFontSize}px ${fontFamily}`;
  const tokens = parseTokens(text);
  return {
    lines: [{ tokens, width: ctx.measureText(text).width }],
    fontSize: minFontSize,
    lineHeight: Math.round(minFontSize * 1.25),
  };
}
