// src/components/video/reel-helpers.ts
// Czyste typy, metadane motywow i helpery do renderu ramek rolek.
// Wyodrębnione z VideoStudioModal.tsx — brak zależności od Reacta.
import type { ReelVisualTheme } from "../../data/reelTemplates";
import type { ReelDuration } from "../../types";
import { MIN_TEXT_PX } from "../../utils/safeZones";

export type VisualTheme = ReelVisualTheme;
export type { ReelDuration };
export type HighlightStyle = "white_halo" | "bold";
export type FontFamily = "cinzel" | "sans" | "inter" | "cormorant";
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

const MAX_LINES = 4;

interface LaidLine {
  tokens: Token[];
  width: number;
}

// Łamanie po szerokości liczone z tokenów bez `*`, więc pomiar = to, co realnie malujemy.
// Zwraca null, gdy pojedynczy wyraz nie mieści się sam albo gdy linii wyszłoby zbyt dużo.
function breakToLines(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxW: number,
  maxLines: number,
): LaidLine[] | null {
  const spaceW = ctx.measureText(" ").width;
  const lines: LaidLine[] = [];

  for (const manualLine of text.split("\n")) {
    let curTokens: Token[] = [];
    let curW = 0;

    for (const tok of parseTokens(manualLine)) {
      const wordW = ctx.measureText(tok.raw).width;
      const testW = curTokens.length === 0 ? wordW : curW + spaceW + wordW;

      if (testW <= maxW) {
        curTokens.push(tok);
        curW = testW;
        continue;
      }
      if (curTokens.length === 0) return null;
      lines.push({ tokens: curTokens, width: curW });
      curTokens = [tok];
      curW = wordW;
    }

    if (curTokens.length > 0) lines.push({ tokens: curTokens, width: curW });
  }

  return lines.length <= maxLines ? lines : null;
}

export function layoutLines(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxW: number,
  targetFontSize: number,
  fontFamily: string,
  weight = 600,
): { lines: Array<{ tokens: Token[]; width: number }>; fontSize: number; lineHeight: number } {
  // Podłoga to minimum czytelności na telefonie, nie umowne 46 px.
  const minFontSize = Math.min(MIN_TEXT_PX, targetFontSize);

  // Mierzymy TYM samym krojem, którym rysujemy: pomiar przy 900 i rysowanie
  // przy 600 zawijało wiersze pod tekst, którego nikt nie maluje.
  for (let fontSize = targetFontSize; fontSize >= minFontSize; fontSize -= 2) {
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    const lines = breakToLines(text, ctx, maxW, MAX_LINES);
    if (lines) {
      return { lines, fontSize, lineHeight: Math.round(fontSize * 1.25) };
    }
  }

  // Fallback: tekst nie mieści się nawet w 4 liniach minimalnym pismem — twardo dzielimy go
  // na równe bloki (75 znaków w jednej linii to ~2200 px, czyli ucieczka za kadr 1080 px).
  ctx.font = `${weight} ${minFontSize}px ${fontFamily}`;
  const spaceW = ctx.measureText(" ").width;
  const tokens = parseTokens(text);
  const lines: LaidLine[] = [];

  if (tokens.length > 0) {
    const widths = tokens.map((tok) => ctx.measureText(tok.raw).width);
    const totalW = widths.reduce((acc, w) => acc + w, 0) + spaceW * (tokens.length - 1);
    // Ostatni blok bierze całą resztę, dlatego linii nigdy nie wyjdzie więcej niż MAX_LINES.
    const perLineW = Math.max(maxW, totalW / MAX_LINES);
    let curTokens: Token[] = [];
    let curW = 0;

    tokens.forEach((tok, i) => {
      const testW = curTokens.length === 0 ? widths[i] : curW + spaceW + widths[i];
      if (curTokens.length > 0 && testW > perLineW && lines.length < MAX_LINES - 1) {
        lines.push({ tokens: curTokens, width: curW });
        curTokens = [tok];
        curW = widths[i];
      } else {
        curTokens.push(tok);
        curW = testW;
      }
    });
    if (curTokens.length > 0) lines.push({ tokens: curTokens, width: curW });
  }

  return {
    lines,
    fontSize: minFontSize,
    lineHeight: Math.round(minFontSize * 1.25),
  };
}
