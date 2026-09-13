import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Download,
  Sparkles,
  Volume2,
  VolumeX,
  RefreshCw,
  Layers,
  Type,
  Film,
  Check,
  Music,
  Clock,
  Palette,
  Share2,
  Sliders,
  AudioWaveform,
  TrendingUp,
  Image as ImageIcon,
  Calendar,
  BookmarkCheck,
  Upload,
  Sun,
  Moon,
  Sunrise,
  Shield,
  Smartphone,
  Pipette
} from 'lucide-react';
import { Post, VaultAsset } from '../types';
const ThematicBingPrompter = React.lazy(() =>
  import('./ThematicBingPrompter').then((m) => ({ default: m.ThematicBingPrompter }))
);
import { STARK_TOP_HEADER_PRESETS, resolveTopHeaderText } from '../utils/starkBrandTheme';

interface VideoStudioModalProps {
  onClose: () => void;
  initialHook?: string;
  initialBgUrl?: string;
  availablePosts?: Post[];
  vaultAssets?: VaultAsset[];
  onSchedulePostFor1300?: (postData: {
    title: string;
    caption: string;
    bgUrl?: string;
    scheduledTime?: string;
    scheduledDate?: string;
  }) => void;
  onSchedulePost?: (postData: {
    title: string;
    caption: string;
    bgUrl?: string;
    scheduledTime?: string;
    scheduledDate?: string;
  }) => void;
}

export type VisualTheme =
  | 'obsidian_monolith'
  | 'titanium_slate'
  | 'pantheon_mist'
  | 'carbon_graphite'
  | 'cyber_cyan';

// Official Brand Logo Watermark Types & Safe-Zone Placements
export type LogoPlacement =
  | 'bottom_under'         // Pod napisem @stark_focus (na dole kadru)
  | 'top_left'             // Lewy górny róg (rekomendowana safe-zone dla TikTok/Reels/Shorts)
  | 'bottom_inline'        // W jednej linii obok @stark_focus
  | 'bottom_above'         // Nad napisem @stark_focus (z bezpiecznym buforem)
  | 'top_right'            // Prawy górny róg
  | 'top_center'           // Górny środek (pod/obok nagłówka)
  | 'background_watermark' // Dyskretny znak wodny w tle (ZA tekstem, nie zasłania słów)
  | 'none'                 // Wyłączone
  // Wsteczna kompatybilność
  | 'footer'
  | 'top'
  | 'center_watermark';
export type LogoSourceType = 'seal' | 'custom' | 'vector' | 'monogram';
export type LogoGlowChoice = 'cyan' | 'white' | 'none';

interface ThemeConfig {
  id: VisualTheme;
  name: string;
  badge: string;
  primaryColor: string;
  accentColor: string;
  desc: string;
}

const VISUAL_THEMES: ThemeConfig[] = [
  {
    id: 'obsidian_monolith',
    name: 'Obsidian Void (Głęboka Czerń)',
    badge: 'Czysta Czerń & Biel',
    primaryColor: '#FFFFFF',
    accentColor: '#FFFFFF',
    desc: 'Głęboki czarny obsydian, chłodny kosmiczny pył, monochromatyczna czerń i czysty kontrast.'
  },
  {
    id: 'titanium_slate',
    name: 'Titanium Slate (Stalowy Szary)',
    badge: 'Tytan & Stal',
    primaryColor: '#F1F5F9',
    accentColor: '#94A3B8',
    desc: 'Architektoniczny grafit, szczotkowany tytan i stalowy światłocień bez żadnych zbędnych barw.'
  },
  {
    id: 'pantheon_mist',
    name: 'Pantheon Noir (Marmur & Mgła)',
    badge: 'Monochromatyczny Chiaroscuro',
    primaryColor: '#F8FAFC',
    accentColor: '#CBD5E1',
    desc: 'Monumentalne rzymskie kolumny, nocna mgła i dramatyczny boczny światłocień marmuru.'
  },
  {
    id: 'carbon_graphite',
    name: 'Carbon Minimal (Matowy Karbon)',
    badge: 'Matowy Karbon & Grafit',
    primaryColor: '#E2E8F0',
    accentColor: '#71717A',
    desc: 'Surowy matowy węgiel, minimalistyczny ciemny horyzont i techniczny brutalistyczny minimalizm.'
  },
  {
    id: 'cyber_cyan',
    name: 'STARK Cyber Cyan (Elektryczny Błękit)',
    badge: 'Flagowy Akcent STARK',
    primaryColor: '#FFFFFF',
    accentColor: '#38BDF8',
    desc: 'Głęboka czerń z laserowym akcentem cyber-cyjanu STARK FOCUS i precyzyjnym celownikiem.'
  }
];

export const STARK_VIDEO_BACKGROUNDS = [
  { id: 'procedural', name: 'Shader Generatywny (Canvas FX - Czysty Obsidian)', url: '' }
];

// Curated Viral & Poetic English Hooks (Default strictly English)
const POETIC_VIRAL_HOOKS_EN = [
  'THE WORLD DOES NOT OWE YOU MEANING.\nYOU FORGE IT IN THE DARK.',
  'YOUR LACK OF DISCIPLINE IS NOT BURNOUT.\nYOU ARE COMFORTABLE BEING MEDIOCRE.',
  'SOLITUDE IS NOT AN ABSENCE.\nIT IS THE CONCENTRATION OF POWER.',
  'DISAPPEAR UNTIL YOUR DEMONS\nBECOME YOUR GREATEST ADVANTAGE.',
  'SILENCE CANNOT BE MISQUOTED.\nLET UNTOUCHABLE RESULTS MAKE THE NOISE.',
  'KILL THE NOISE.\nEXECUTE WHAT IS REQUIRED IN TOTAL SOLITUDE.',
  'DO NOT NEGOTIATE WITH WEAKNESS.\nSTAND UP AND CONQUER THE MORNING.',
  'COMFORT IS A SLOW POISON.\nDISCIPLINE IS THE ONLY CURE.'
];

export type DaySlotCategory = 'morning' | 'lunch' | 'evening' | 'all_day';

export interface DayPartPreset {
  id: string;
  label: string;
  hook: string;
  theme: VisualTheme;
  suggestedTime: string;
  topHeader: string;
  caption: string;
}

export const MORNING_PRESETS: DayPartPreset[] = [
  {
    id: 'm-1',
    label: '🌅 06:30 • Wstań Przed Światem',
    hook: 'WHILE THEY SLEEP, YOU BUILD.\nDO NOT NEGOTIATE WITH THE ALARM.',
    theme: 'obsidian_monolith',
    suggestedTime: '06:30',
    topHeader: '06:30 • MORNING DISCIPLINE',
    caption: `While they sleep in comfort, you lay the first stone in silence. The alarm is not an invitation to negotiate. It is your first test of non-negotiable standards.

Save this for tomorrow morning // @stark_focus

#discipline #morningroutine #stoicism #focus #mindset #execution #relentless`
  },
  {
    id: 'm-2',
    label: '⚡ 07:00 • Pierwsze Ciche Zwycięstwo',
    hook: 'DESTROY THE HARDEST TASK\nBEFORE THE WORLD WAKES UP.',
    theme: 'titanium_slate',
    suggestedTime: '07:00',
    topHeader: '07:00 • FIRST WIN',
    caption: `Win the morning, win the war. Execute your most dreaded task before 8:00 AM. Everything after that is momentum.

// @stark_focus

#deepwork #execution #stoicmindset #highperformance #focus #grind #stark_focus`
  },
  {
    id: 'm-3',
    label: '🛡️ 07:30 • Nikt Cię Nie Uratuje',
    hook: 'NO ONE IS COMING TO SAVE YOU.\nWAKE UP AND FORGE YOUR LIFE.',
    theme: 'carbon_graphite',
    suggestedTime: '07:30',
    topHeader: '07:30 • RAW ACCOUNTABILITY',
    caption: `No savior is coming. No perfect circumstance will arrive. Either you take radical accountability today, or you stay where you are.

// @stark_focus

#accountability #stoic #darkmotivation #truth #relentless #discipline`
  },
  {
    id: 'm-4',
    label: '🚫 08:00 • Zero Telefonu i Dopaminy',
    hook: 'NO PHONE. NO CHEAP DOPAMINE.\nPROTECT YOUR MORNING CLARITY.',
    theme: 'pantheon_mist',
    suggestedTime: '08:00',
    topHeader: '08:00 • ZERO DOPAMINE',
    caption: `If you check your notifications in the first hour, you surrender your mental clarity to the chaos of strangers. Guard your focus like your life depends on it.

// @stark_focus

#dopaminedetox #focus #mentalclarity #stoicism #solitude #mindset`
  }
];

export const LUNCH_1300_PRESETS: DayPartPreset[] = [
  {
    id: 'l-1',
    label: '⏰ 13:00 • Połowa Dnia Przepadła',
    hook: 'HALF THE DAY IS GONE.\nWHAT HAVE YOU ACTUALLY ACCOMPLISHED?',
    theme: 'obsidian_monolith',
    suggestedTime: '13:00',
    topHeader: '13:00 • MIDDAY RESET',
    caption: `Half the day is already history. Most people are zoning out on their lunch break, trading their future for cheap dopamine. Stop negotiating with comfort. Execute before the sun sets.

Save this reminder // @stark_focus

#stoicism #discipline #darkmotivation #relentless #execution #mindset #focus`
  },
  {
    id: 'l-2',
    label: '⚡ 13:00 • Koniec Przeglądania w Lunch',
    hook: 'STOP SCROLLING ON YOUR LUNCH BREAK.\nYOUR FUTURE IS WATCHING.',
    theme: 'titanium_slate',
    suggestedTime: '13:00',
    topHeader: '13:00 • BREAK RESET',
    caption: `While they scroll and complain about being stuck, you reset your mind in silence. Discipline is choosing between what you want now and what you want most. Stand up and conquer the second half of the day.

Save this reminder // @stark_focus

#darkmotivation #discipline #stoic #accountability #execution #success #grind`
  },
  {
    id: 'l-3',
    label: '🤫 13:00 • Cicha Praca bez Poklasku',
    hook: 'SILENCE CANNOT BE MISQUOTED.\nLET RESULTS MAKE THE NOISE.',
    theme: 'pantheon_mist',
    suggestedTime: '13:00',
    topHeader: '13:00 • SILENT EXECUTION',
    caption: `Do not announce your next move. Do not seek applause from spectators. The man who works in silence becomes dangerous.

// @stark_focus

#solitude #silence #stoicmindset #relentless #grind #focus #execution`
  },
  {
    id: 'l-4',
    label: '🛡️ 13:00 • Wygoda to Powolna Trucizna',
    hook: 'COMFORT IS A SLOW POISON.\nDISCIPLINE IS THE ONLY CURE.',
    theme: 'cyber_cyan',
    suggestedTime: '13:00',
    topHeader: '13:00 • COMFORT CURE',
    caption: `Comfort is a slow poison disguised as peace. Raise your standards. Demand more from yourself than anyone else ever could.

// @stark_focus

#discipline #accountability #truth #stoic #masculinity #focus #stark_focus`
  }
];

export const EVENING_PRESETS: DayPartPreset[] = [
  {
    id: 'e-1',
    label: '🌙 20:30 • Gdy Świat Idzie Spać',
    hook: 'THE WORLD GOES TO SLEEP.\nTHE DISCIPLINED GO TO WORK.',
    theme: 'obsidian_monolith',
    suggestedTime: '20:30',
    topHeader: '20:30 • NIGHT FOCUS',
    caption: `When the notifications die and the world goes to sleep, your deepest work begins. The unfair advantage is built in the late hours of silence.

// @stark_focus

#nightshift #solitude #discipline #darkmotivation #relentless #mindset #grind`
  },
  {
    id: 'e-2',
    label: '🪞 21:00 • Rachunek Sumienia w Lustrze',
    hook: 'LOOK IN THE MIRROR TONIGHT.\nDID YOU WIN OR DID YOU SURRENDER?',
    theme: 'titanium_slate',
    suggestedTime: '21:00',
    topHeader: '21:00 • NIGHT AUDIT',
    caption: `No excuses before sleep. Look at your reflection. Did you honor your word today, or did you cave to laziness? Tomorrow is your redemption or your repeat.

// @stark_focus

#stoicism #accountability #truth #nightroutine #standards #relentless`
  },
  {
    id: 'e-3',
    label: '⏳ 22:00 • Zniknij na 6 Miesięcy',
    hook: 'DISAPPEAR FOR SIX MONTHS.\nRETURN WITH UNDENIABLE RESULTS.',
    theme: 'pantheon_mist',
    suggestedTime: '22:00',
    topHeader: '22:00 • DISAPPEAR PROTOCOL',
    caption: `Stop posting your goals. Disappear into obsession. In six months, let your results speak so loudly that explanations become irrelevant.

// @stark_focus

#disappear #obsession #darkaesthetic #stoic #silence #execution #mastery`
  },
  {
    id: 'e-4',
    label: '🌌 23:00 • Samotność i Koncentracja Mocy',
    hook: 'SOLITUDE AFTER MIDNIGHT.\nWHERE REAL MASTERY IS BORN.',
    theme: 'carbon_graphite',
    suggestedTime: '23:00',
    topHeader: '23:00 • MIDNIGHT SHIFT',
    caption: `Solitude is not loneliness. It is the purest concentration of human power. Cut the noise and build your empire.

// @stark_focus

#solitude #darkgrit #focus #mastery #stoicism #nightowl #stark_focus`
  }
];

export const ALL_DAY_PRESETS: DayPartPreset[] = [
  {
    id: 'a-1',
    label: '⚔️ Pancerz • Świat Nie Jest Ci Nic Winien',
    hook: 'THE WORLD DOES NOT OWE YOU MEANING.\nYOU FORGE IT IN THE DARK.',
    theme: 'obsidian_monolith',
    suggestedTime: '13:00',
    topHeader: '✦ DAILY PERSPECTIVE',
    caption: `Stop waiting for a sign or validation. The universe is indifferent. You must forge your own purpose in the heat of daily discipline.

// @stark_focus

#stoicism #warriormindset #resilience #darkmotivation #discipline #truth`
  },
  {
    id: 'a-2',
    label: '⚡ Standardy • Zapomnij o Motywacji',
    hook: 'YOU DO NOT NEED MOTIVATION.\nYOU NEED NON-NEGOTIABLE STANDARDS.',
    theme: 'titanium_slate',
    suggestedTime: '18:00',
    topHeader: '✦ IRON STANDARDS',
    caption: `Motivation is an emotional parasite that vanishes when things get difficult. Non-negotiable standards carry you regardless of how you feel.

// @stark_focus

#standards #discipline #stoic #execution #consistency #mindset`
  },
  {
    id: 'a-3',
    label: '🔥 Ból • Podnieś Swój Próg Tolerancji',
    hook: 'RAISE YOUR PAIN TOLERANCE.\nBECOME ENTIRELY UNSTOPPABLE.',
    theme: 'carbon_graphite',
    suggestedTime: '15:00',
    topHeader: '✦ HIGH THRESHOLD',
    caption: `The only difference between those who conquer and those who quit is how long they can endure discomfort without breaking character.

// @stark_focus

#resilience #unshakable #grit #darkmotivation #endurance #focus`
  },
  {
    id: 'a-4',
    label: '🤫 Milczenie • Nie Mów o Kolejnym Kroku',
    hook: 'NEVER ANNOUNCE YOUR MOVES.\nBECOME DANGEROUS IN TOTAL SILENCE.',
    theme: 'pantheon_mist',
    suggestedTime: '20:00',
    topHeader: '✦ SILENT MOVES',
    caption: `The talkers deplete their dopamine before the work even begins. The masters say nothing and deliver shockwaves.

// @stark_focus

#silence #moveinsilence #stoicwisdom #focus #execution #grind`
  }
];

export function getSmartDefaultDaySlot(): DaySlotCategory {
  const hr = new Date().getHours();
  if (hr >= 5 && hr < 11) return 'morning';
  if (hr >= 11 && hr < 17) return 'lunch';
  return 'evening';
}

// Top Header Badge Options (Replaces cringe PROTOCOL with mature aesthetic choices)
export type TopHeaderMode =
  | 'protocol_standard'
  | 'daily_discipline'
  | 'cold_truth'
  | 'memento_mori'
  | 'morning_0500'
  | 'morning_0700'
  | 'midday_1300'
  | 'night_2100'
  | 'evening_2100'
  | 'daily_perspective'
  | 'audio_on'
  | 'stark_minimal'
  | 'deep_work'
  | 'rule_01'
  | 'time_stamp'
  | 'quote_category'
  | 'minimal_pill'
  | 'none'
  | 'clean_void'
  | 'custom';

export const TOP_HEADER_OPTIONS: Array<{ id: TopHeaderMode; label: string; displayText: string; desc: string }> = [
  {
    id: 'morning_0700',
    label: '🌅 07:00 • Poranny Rygor',
    displayText: '07:00 • MORNING DISCIPLINE',
    desc: 'Pierwsza warta – start przed resztą świata'
  },
  {
    id: 'midday_1300',
    label: '⏰ 13:00 • Reset Dnia',
    displayText: '13:00 • MIDDAY RESET',
    desc: 'Kontekst przerwy obiadowej – bezpretensjonalny, mocny stoper'
  },
  {
    id: 'evening_2100',
    label: '🌙 21:00 • Nocny Protokół',
    displayText: '21:00 • NIGHT PROTOCOL',
    desc: 'Wieczorne skupienie i rachunek sumienia w ciszy'
  },
  {
    id: 'daily_perspective',
    label: '✦ Perspektywa Stoicka',
    displayText: '✦ DAILY PERSPECTIVE',
    desc: 'Elegancka belka redakcyjna w stylu luxury publication'
  },
  {
    id: 'audio_on',
    label: '🎧 Audio Włączone',
    displayText: '🎧 AUDIO ON • RECOMMENDED',
    desc: 'Klasyczny hook zwiększający retencję i użycie dźwięku'
  },
  {
    id: 'stark_minimal',
    label: '▪ Stark Minimal',
    displayText: 'S T A R K   F O C U S',
    desc: 'Dyskretny autorski monogram z szerokim trackingiem'
  },
  {
    id: 'clean_void',
    label: '✕ Czysty Kadr',
    displayText: '',
    desc: 'Maksymalny minimalizm – brak jakiegokolwiek tekstu na górze'
  },
  {
    id: 'custom',
    label: '✍️ Własny Napis',
    displayText: '',
    desc: 'Wpisz własny, spersonalizowany nagłówek'
  }
];

// Keyword Highlighting Types & System
export type KeywordHighlightStyle =
  | 'neon_glow'       // Vibrant accent color with cinematic drop-shadow aura
  | 'white_halo'      // Pure titanium white with cold silver glow (user preferred)
  | 'pill_badge'      // Frosted rounded container behind the keyword
  | 'underline_bar';  // Clean horizontal accent bar beneath keyword

export type KeywordColorChoice =
  | 'white'          // Czysta Platynowa Biel (#FFFFFF)
  | 'cyan'           // Elektryczny Cyjan STARK (#38BDF8)
  | 'gray'           // Tytanowy Szary (#94A3B8)
  | 'slate'          // Ciemniejszy Grafit (#64748B)
  | 'theme';         // Kolor akcentu z wybranego motywu

export const POWER_KEYWORDS = new Set([
  'ACCOMPLISHED', 'ACCOMPLISH', 'GONE', 'DISCIPLINE', 'SILENCE', 'RESULTS',
  'POISON', 'COMFORT', 'STOP', 'SCROLLING', 'FUTURE', 'TRUTH', 'STANDARDS',
  'STANDARD', 'UNTOUCHABLE', 'UNSTOPPABLE', 'FORGE', 'PAIN', 'SOLITUDE',
  'WARRIOR', 'TITAN', 'DARK', 'CONQUER', 'RELENTLESS', 'EXECUTE', 'EXECUTION',
  'ACTION', 'POWER', 'TIME', 'HOURS', 'NOW', 'NOISE', 'MEDIOCRE', 'EXCUSES',
  'EXCUSE', 'BURNED', 'BURNOUT', 'CURE', 'WATCHING', 'MISQUOTED', 'ALONE',
  'DANGEROUS', 'VICTORY', 'WIN', 'SACRIFICE', 'LIMITS', 'FOCUS', 'STARK',
  'HISTORY', 'DOPAMINE', 'WAR', 'IRON', 'COLD', 'MINDSET', 'ACHIEVE',
  'ANSWER', 'ANSWERS', 'FIGHT', 'SOLITARY', 'STAND', 'STANDS', 'WEAKNESS'
]);

export interface WordToken {
  raw: string;
  cleanWord: string;
  isKeyword: boolean;
}

export function parseWordsWithKeywords(phrase: string): WordToken[] {
  const words = phrase
    .replace(/\n/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (words.length === 0) return [];

  // Check if user manually marked words with asterisks, e.g. *ACCOMPLISHED*
  const hasManualAsterisks = words.some((w) => w.includes('*'));

  const tokens: WordToken[] = words.map((w) => {
    const isAsteriskMarked = w.includes('*');
    const cleanWord = w.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const rawNoAsterisk = w.replace(/\*/g, '');

    let isKeyword = false;
    if (hasManualAsterisks) {
      isKeyword = isAsteriskMarked;
    } else {
      isKeyword = POWER_KEYWORDS.has(cleanWord);
    }

    return {
      raw: rawNoAsterisk,
      cleanWord,
      isKeyword
    };
  });

  // Fallback: If no keyword was detected at all in this phrase,
  // mark the last word as the keyword so every thought has punchline emphasis!
  const hasAnyKeyword = tokens.some((t) => t.isKeyword);
  if (!hasAnyKeyword && tokens.length > 0) {
    tokens[tokens.length - 1].isKeyword = true;
  }

  return tokens;
}

export interface LineLayout {
  tokens: WordToken[];
  width: number;
}

// Helper: check if word is an orphan preposition/conjunction that should never dangle at line end
export function isOrphanWord(w: string): boolean {
  const clean = w.toLowerCase().replace(/[^a-z0-9a-ząćęłńóśźż]/gi, '');
  return [
    'a', 'i', 'o', 'u', 'w', 'z',
    'to', 'że', 'czy', 'co', 'na', 'do', 'od', 'po', 'ze', 'we', 'dla', 'jak',
    'the', 'an', 'in', 'on', 'at', 'of', 'by', 'as', 'or', 'if', 'no', 'not', 'is', 'it', 'he', 'we', 'so', 'my', 'me', 'to', 'for'
  ].includes(clean);
}

// Formats text into balanced lines without orphan words at line ends
export function formatHookSemanticLines(text: string, targetLineCount?: 1 | 2 | 3): string {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return '';
  if (targetLineCount === 1) {
    return clean.replace(/\n+/g, ' ').trim();
  }

  const words = clean.replace(/\n+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length <= 3) return words.join(' ');

  if (targetLineCount === 2 || (!targetLineCount && words.length <= 7)) {
    let mid = Math.round(words.length / 2);
    if (mid > 1 && isOrphanWord(words[mid - 1])) {
      mid--;
    }
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    return `${line1}\n${line2}`;
  }

  if (targetLineCount === 3 || (!targetLineCount && words.length > 7)) {
    const third = Math.round(words.length / 3);
    let p1 = third;
    if (p1 > 1 && isOrphanWord(words[p1 - 1])) p1--;
    let p2 = p1 + third;
    if (p2 > p1 + 1 && isOrphanWord(words[p2 - 1])) p2--;
    const line1 = words.slice(0, p1).join(' ');
    const line2 = words.slice(p1, p2).join(' ');
    const line3 = words.slice(p2).join(' ');
    return [line1, line2, line3].filter(Boolean).join('\n');
  }

  return clean;
}

// Rock-solid layout engine: strictly respects manual linebreaks, avoids orphan prepositions,
// and smoothly scales font to GUARANTEE text NEVER clips or overflows outside safe margins
export function layoutPhraseToLines(
  phrase: string,
  ctx: CanvasRenderingContext2D,
  maxSafeWidth: number = 560,
  baseFontSize: number = 44,
  fontFamily: string = '"Cinzel", "Times New Roman", Georgia, serif'
): { lines: LineLayout[]; finalFontSize: number; lineHeight: number } {
  const rawSegments = phrase.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);

  const initialLines: WordToken[][] = [];

  for (const seg of rawSegments) {
    const tokens = parseWordsWithKeywords(seg);
    if (tokens.length === 0) continue;

    // RULE 1: If user or preset explicitly provided a line break, and this segment has <= 6 words:
    // Strictly preserve that line! Do NOT chop it into pieces!
    if (tokens.length <= 6) {
      initialLines.push(tokens);
    } else {
      // For longer segments (7+ words on a single line), balance them gracefully without ending on orphan prepositions
      if (tokens.length <= 8) {
        let mid = Math.round(tokens.length / 2);
        if (mid > 1 && isOrphanWord(tokens[mid - 1].raw)) mid--;
        initialLines.push(tokens.slice(0, mid));
        initialLines.push(tokens.slice(mid));
      } else {
        let i = 0;
        while (i < tokens.length) {
          const remaining = tokens.length - i;
          let take = Math.min(4, remaining);
          if (i + take < tokens.length && isOrphanWord(tokens[i + take - 1].raw) && take > 1) {
            take--;
          }
          initialLines.push(tokens.slice(i, i + take));
          i += take;
        }
      }
    }
  }

  if (initialLines.length === 0) {
    initialLines.push(parseWordsWithKeywords(phrase));
  }

  let currentFontSize = baseFontSize;

  const measureLineWidth = (tokens: WordToken[], fSize: number) => {
    ctx.font = `900 ${fSize}px ${fontFamily}`;
    const spaceW = ctx.measureText(' ').width;
    let w = 0;
    for (let i = 0; i < tokens.length; i++) {
      w += ctx.measureText(tokens[i].raw).width;
      if (i < tokens.length - 1) w += spaceW;
    }
    return w;
  };

  // Find max width among lines at baseFontSize
  let maxW = 0;
  for (const lineTokens of initialLines) {
    const w = measureLineWidth(lineTokens, currentFontSize);
    if (w > maxW) maxW = w;
  }

  // Smoothly scale down font if it exceeds maxSafeWidth
  if (maxW > maxSafeWidth) {
    const scaleRatio = maxSafeWidth / maxW;
    currentFontSize = Math.max(26, Math.floor(currentFontSize * scaleRatio * 0.96));
  }

  // Double check in case a single huge word still exceeds
  maxW = 0;
  for (const lineTokens of initialLines) {
    const w = measureLineWidth(lineTokens, currentFontSize);
    if (w > maxW) maxW = w;
  }
  if (maxW > maxSafeWidth) {
    currentFontSize = Math.max(22, Math.floor(currentFontSize * (maxSafeWidth / maxW) * 0.95));
  }

  const finalLines: LineLayout[] = initialLines.map((lineTokens) => ({
    tokens: lineTokens,
    width: measureLineWidth(lineTokens, currentFontSize)
  }));

  const lineHeight = Math.round(currentFontSize * 1.3);

  return {
    lines: finalLines,
    finalFontSize: currentFontSize,
    lineHeight
  };
}

// Intelligently splits text into balanced rhythmic chunks that end on complete thoughts
function splitScriptIntoRhythmicPhrases(script: string): string[] {
  const trimmed = script.trim();
  if (!trimmed) return ['STARK FOCUS'];

  // Respect intentional linebreaks first
  const rawLines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length >= 2) {
    return rawLines;
  }

  const words = trimmed
    .replace(/\n/g, ' ')
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  // If short (<= 6 words), keep it as a single cohesive sentence/hook
  if (words.length <= 6) {
    return [words.join(' ')];
  }

  // If 7-10 words, split into 2 balanced thoughts without ending on orphan prepositions
  if (words.length <= 10) {
    let mid = Math.round(words.length / 2);
    if (mid > 1 && isOrphanWord(words[mid - 1])) mid--;
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  const phrases: string[] = [];
  let i = 0;
  while (i < words.length) {
    const remaining = words.length - i;
    let take = 4;
    if (remaining === 5) take = 3;
    if (remaining === 6) take = 3;
    if (remaining <= 4) take = remaining;
    if (i + take < words.length && isOrphanWord(words[i + take - 1]) && take > 1) {
      take--;
    }
    phrases.push(words.slice(i, i + take).join(' '));
    i += take;
  }

  return phrases.length > 0 ? phrases : [trimmed];
}

interface AudioRecommendation {
  name: string;
  tag: string;
  reason: string;
  bpm: number;
  boost: string;
}

export const VideoStudioModal: React.FC<VideoStudioModalProps> = ({
  onClose,
  initialHook = '',
  initialBgUrl = '',
  availablePosts = [],
  vaultAssets = [],
  onSchedulePostFor1300,
  onSchedulePost
}) => {
  // TikTok safe zone guides preview overlay
  const [showTikTokGuides, setShowTikTokGuides] = useState<boolean>(false);

  // Video text / script (Strictly English by default)
  const [scriptText, setScriptText] = useState<string>(
    initialHook ? initialHook.toUpperCase() : POETIC_VIRAL_HOOKS_EN[0]
  );
  const [selectedTheme, setSelectedTheme] = useState<VisualTheme>('obsidian_monolith');

  // Top Header & Cringe Elimination State
  const [topHeaderMode, setTopHeaderMode] = useState<TopHeaderMode>('midday_1300');
  const [customTopHeaderText, setCustomTopHeaderText] = useState<string>('13:00 • MIDDAY RESET');

  // Keyword Highlighting Customization
  const [keywordHighlightStyle, setKeywordHighlightStyle] = useState<KeywordHighlightStyle>('white_halo');
  const [keywordColorChoice, setKeywordColorChoice] = useState<KeywordColorChoice>('white');

  // Official Brand Logo Watermark State
  const [logoSourceType, setLogoSourceType] = useState<LogoSourceType>('seal');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('stark_custom_logo_url') || '';
    } catch {
      return '';
    }
  });
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>('bottom_under');
  const [logoSize, setLogoSize] = useState<number>(44);
  const [logoOpacity, setLogoOpacity] = useState<number>(100);
  const [logoGlow, setLogoGlow] = useState<LogoGlowChoice>('cyan');
  const [logoLoadTick, setLogoLoadTick] = useState<number>(0);
  const loadedLogoImgRef = useRef<HTMLImageElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Export configuration & Lock Ref
  const [exportFps, setExportFps] = useState<30 | 60>(60);
  const isExportingRef = useRef<boolean>(false);
  const [copiedAudioTag, setCopiedAudioTag] = useState<boolean>(false);
  const [videoExportError, setVideoExportError] = useState<string | null>(null);

  // Typography & Color Options
  const [fontFamilyChoice, setFontFamilyChoice] = useState<'cinzel' | 'space_grotesk' | 'inter'>('cinzel');
  const [preferredFontSize, setPreferredFontSize] = useState<number>(44);
  const [fontColor, setFontColor] = useState<string>('#FFFFFF');
  const [isSamplingCanvasColor, setIsSamplingCanvasColor] = useState<boolean>(false);

  // Eyedropper Color Picker Handlers
  const handlePickColorWithEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          setFontColor(result.sRGBHex.toUpperCase());
          return;
        }
      } catch {
        // Fall back to canvas click sampling
      }
    }
    setIsSamplingCanvasColor(true);
  };

  const handleCanvasClickToSampleColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSamplingCanvasColor) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = Math.floor((e.clientX - rect.left) * scaleX);
    const clickY = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const pixel = ctx.getImageData(clickX, clickY, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;
      setFontColor(hex);
    } catch (err) {
      console.error('Failed to sample color from canvas', err);
    } finally {
      setIsSamplingCanvasColor(false);
    }
  };

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [audioPreviewEnabled, setAudioPreviewEnabled] = useState<boolean>(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState<boolean>(false);
  const [showBingModal, setShowBingModal] = useState<boolean>(false);
  // Active Day Slot & Scheduling
  const [activeDaySlot, setActiveDaySlot] = useState<DaySlotCategory>(getSmartDefaultDaySlot);
  const [selectedScheduledTime, setSelectedScheduledTime] = useState<string>(() => {
    const slot = getSmartDefaultDaySlot();
    if (slot === 'morning') return '07:00';
    if (slot === 'lunch') return '13:00';
    return '21:00';
  });
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>('20:30');

  const [scheduledToast, setScheduledToast] = useState<boolean>(false);
  const [scheduledToastTime, setScheduledToastTime] = useState<string>('');
  const videoBgFileInputRef = useRef<HTMLInputElement | null>(null);

  const detectedKeywordsList = useMemo(() => {
    const tokens = parseWordsWithKeywords(scriptText);
    return Array.from(new Set(tokens.filter((t) => t.isKeyword).map((t) => t.raw)));
  }, [scriptText]);

  const allVideoBgs = [
    ...STARK_VIDEO_BACKGROUNDS,
    ...(vaultAssets || [])
      .filter((a) => a.type === 'bg')
      .map((a) => ({
        id: a.id,
        name: `📁 [Skarbiec] ${a.filename}`,
        url: a.url
      }))
  ];

  // Background Image Selection (Curated dark assets or procedural canvas)
  const [selectedBgId, setSelectedBgId] = useState<string>(() => {
    if (initialBgUrl) return 'custom';
    return 'procedural';
  });
  const [customBgUrl, setCustomBgUrl] = useState<string>(initialBgUrl || '');
  const loadedBgImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let url = '';
    if (selectedBgId === 'custom') {
      url = customBgUrl.trim();
    } else {
      const found = allVideoBgs.find((b) => b.id === selectedBgId);
      url = found ? found.url : '';
    }

    if (url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        loadedBgImgRef.current = img;
      };
      img.onerror = () => {
        loadedBgImgRef.current = null;
      };
    } else {
      loadedBgImgRef.current = null;
    }
  }, [selectedBgId, customBgUrl]);

  const handleBgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomBgUrl(dataUrl);
        setSelectedBgId('custom');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Pre-load Brand Logo for Canvas Rendering
  useEffect(() => {
    let targetSrc = '/stark_seal_logo.png';
    if (logoSourceType === 'custom' && customLogoUrl) {
      targetSrc = customLogoUrl;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = targetSrc;
    img.onload = () => {
      loadedLogoImgRef.current = img;
      setLogoLoadTick((t) => t + 1);
    };
    img.onerror = () => {
      if (targetSrc !== '/stark_seal_logo.png') {
        const fallback = new Image();
        fallback.crossOrigin = 'anonymous';
        fallback.src = '/stark_seal_logo.png';
        fallback.onload = () => {
          loadedLogoImgRef.current = fallback;
          setLogoLoadTick((t) => t + 1);
        };
      }
    };
  }, [logoSourceType, customLogoUrl]);

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomLogoUrl(dataUrl);
        setLogoSourceType('custom');
        try {
          localStorage.setItem('stark_custom_logo_url', dataUrl);
        } catch {
          // Ignore quota error
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleScheduleFor1300 = () => {
    const scheduleFn = onSchedulePost || onSchedulePostFor1300;
    if (scheduleFn) {
      const cleanScript = scriptText.replace(/\n/g, ' ');
      const allPresets = [
        ...MORNING_PRESETS,
        ...LUNCH_1300_PRESETS,
        ...EVENING_PRESETS,
        ...ALL_DAY_PRESETS
      ];
      const activePreset = allPresets.find(
        (p) => p.hook.replace(/\n/g, ' ') === cleanScript
      );
      const caption =
        activePreset?.caption ||
        `${scriptText}\n\nExecute what is necessary in total silence. // @stark_focus\n\nSound tag: "${recommendedAudio.tag}"\n#discipline #stoicism #relentless #execution #mindset #focus #stark_focus`;

      let bgUrl = '';
      if (selectedBgId === 'custom') {
        bgUrl = customBgUrl;
      } else {
        const found = allVideoBgs.find((b) => b.id === selectedBgId);
        bgUrl = found?.url || '';
      }

      const targetTime = isCustomTime ? customTimeInput : selectedScheduledTime;
      const todayStr = new Date().toISOString().split('T')[0];

      scheduleFn({
        title: cleanScript,
        caption,
        bgUrl,
        scheduledTime: targetTime,
        scheduledDate: todayStr
      });
      setScheduledToastTime(targetTime);
      setScheduledToast(true);
      setTimeout(() => setScheduledToast(false), 5000);
    }
  };

  // Exact 7.00s Duration Constraint
  const durationSec = 7.0;
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const pulseTimerRef = useRef<any>(null);

  // High-precision time reference for 60fps loop
  const timeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Dynamic Audio Recommendation based on script content
  const recommendedAudio = useMemo<AudioRecommendation>(() => {
    const upper = scriptText.toUpperCase();
    if (upper.includes('WAR') || upper.includes('MEDIOCRE') || upper.includes('CONQUER') || upper.includes('KILL')) {
      return {
        name: 'Phonk Montagem (Brazilian Dark 140BPM)',
        tag: 'Montagem Diamante / Phonk Viral',
        reason: 'Wykryto agresywny ton i przełamanie wymówek (+140% thumb-stop).',
        bpm: 140,
        boost: '+140% Retencja w rolkach'
      };
    }
    if (upper.includes('SOLITUDE') || upper.includes('DARK') || upper.includes('SILENCE') || upper.includes('POISON')) {
      return {
        name: 'Interstellar / Dark Piano Synth (Slowed + Reverb)',
        tag: 'Cornfield Chase Slowed Reverb',
        reason: 'Wykryto poetycki nastrój i samotną pracę w ciszy (+125% zapisań).',
        bpm: 85,
        boost: '+125% Udostępnienia i Zapisy'
      };
    }
    if (upper.includes('MEANING') || upper.includes('DEMONS') || upper.includes('ADVANTAGE') || upper.includes('SOVEREIGN')) {
      return {
        name: 'Hans Zimmer - Time (Subliminal 432Hz)',
        tag: 'Dark Ambient Solitude 432Hz',
        reason: 'Wykryto głęboki stoicki aforyzm o wysokiej wartości wirusowej.',
        bpm: 75,
        boost: '+110% Dłuższe Oglądanie'
      };
    }
    return {
      name: 'Tevvez / GigaChad Awakening (Hardstyle 150BPM)',
      tag: 'Legend / Gym Hardstyle',
      reason: 'Idealne tempo do budowania natychmiastowego napięcia w pierwszych 3 sekundach.',
      bpm: 150,
      boost: '+95% Zatrzymanie Kciuka'
    };
  }, [scriptText]);

  // Audio preview sound pulse
  const stopAudioImmediate = () => {
    if (pulseTimerRef.current) {
      clearInterval(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
  };

  const startAudioPulse = () => {
    stopAudioImmediate();
    if (!audioPreviewEnabled) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const intervalMs = (60 / recommendedAudio.bpm) * 1000;

      const playHit = () => {
        if (!audioContextRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = recommendedAudio.bpm >= 120 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      };

      playHit();
      pulseTimerRef.current = setInterval(playHit, intervalMs);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  useEffect(() => {
    if (audioPreviewEnabled && isPlaying) {
      startAudioPulse();
    } else {
      stopAudioImmediate();
    }
  }, [audioPreviewEnabled, isPlaying, recommendedAudio]);

  useEffect(() => {
    return () => {
      stopAudioImmediate();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Split script into meaningful rhythmic phrases that end on natural thoughts
  const effectivePhrases = splitScriptIntoRhythmicPhrases(scriptText);
  const phraseDuration = durationSec / Math.max(1, effectivePhrases.length);

  // Particle Engine
  const particlesRef = useRef<Array<{ x: number; y: number; size: number; speed: number; opacity: number }>>([]);
  useEffect(() => {
    const list = [];
    for (let i = 0; i < 70; i++) {
      list.push({
        x: Math.random() * 720,
        y: Math.random() * 1280,
        size: Math.random() * 2.8 + 0.8,
        speed: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.6 + 0.15
      });
    }
    particlesRef.current = list;
  }, []);

  // Render Frame function
  const renderFrame = (timeSec: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;

    const progress = Math.min(1, Math.max(0, timeSec / durationSec));
    const normalizedTheme: VisualTheme =
      selectedTheme === ('spartan_forge' as any)
        ? 'titanium_slate'
        : selectedTheme === ('brutalist_apex' as any)
        ? 'carbon_graphite'
        : selectedTheme;
    const currentThemeConfig = VISUAL_THEMES.find((t) => t.id === normalizedTheme) || VISUAL_THEMES[0];

    // 1. Background Base (Image texture or upgraded generative theme)
    if (loadedBgImgRef.current) {
      // Slow cinematic push-in (Ken Burns zoom 1.0 to 1.045 over 7s)
      const zoom = 1.0 + progress * 0.045;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.drawImage(loadedBgImgRef.current, -width / 2, -height / 2, width, height);
      ctx.restore();

      // Atmospheric gradient tone map overlay so typography is 100% readable
      const overlay = ctx.createLinearGradient(0, 0, 0, height);
      overlay.addColorStop(0, 'rgba(3, 5, 8, 0.72)');
      overlay.addColorStop(0.35, 'rgba(5, 7, 12, 0.42)');
      overlay.addColorStop(0.7, 'rgba(5, 7, 12, 0.52)');
      overlay.addColorStop(1, 'rgba(3, 5, 8, 0.88)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, width, height);

      // Theme-colored stardust particles overlay
      particlesRef.current.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = height;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.65})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (normalizedTheme === 'titanium_slate') {
      // 1. Titanium Slate (Architectural graphite, brushed steel chiaroscuro & cold silver stardust)
      const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 60, width / 2, height / 2, height * 0.75);
      bgGrad.addColorStop(0, '#161E2E');
      bgGrad.addColorStop(0.45, '#0B0F19');
      bgGrad.addColorStop(1, '#030508');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Heavy architectural vertical slate slabs & fracture lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.22, 0);
      ctx.lineTo(width * 0.22, height);
      ctx.moveTo(width * 0.78, 0);
      ctx.lineTo(width * 0.78, height);
      ctx.stroke();

      // Horizontal micro-dividers
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width * 0.15, height * 0.35);
      ctx.lineTo(width * 0.85, height * 0.35);
      ctx.moveTo(width * 0.15, height * 0.65);
      ctx.lineTo(width * 0.85, height * 0.65);
      ctx.stroke();

      // Rising cold platinum/slate embers
      particlesRef.current.forEach((p) => {
        p.y -= p.speed * 1.3;
        if (p.y < 0) p.y = height;
        ctx.fillStyle = `rgba(203, 213, 225, ${p.opacity * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (normalizedTheme === 'pantheon_mist') {
      // 2. Roman Pantheon Noir Chiaroscuro (Classical monumental colonnade, rolling midnight mist)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#04060A');
      bgGrad.addColorStop(0.5, '#0B0F18');
      bgGrad.addColorStop(1, '#020306');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Four monumental fluted Roman pillars in dramatic chiaroscuro perspective
      const cols = [width * 0.14, width * 0.34, width * 0.66, width * 0.86];
      cols.forEach((colX) => {
        const colGrad = ctx.createLinearGradient(colX - 45, 0, colX + 45, 0);
        colGrad.addColorStop(0, 'rgba(248, 250, 252, 0.16)');
        colGrad.addColorStop(0.35, 'rgba(226, 232, 240, 0.09)');
        colGrad.addColorStop(0.75, 'rgba(148, 163, 184, 0.03)');
        colGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = colGrad;
        ctx.fillRect(colX - 35, height * 0.12, 70, height * 0.76);

        // Fluting vertical ridges
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.14)';
        ctx.lineWidth = 1;
        for (let r = -20; r <= 20; r += 12) {
          ctx.beginPath();
          ctx.moveTo(colX + r, height * 0.15);
          ctx.lineTo(colX + r, height * 0.85);
          ctx.stroke();
        }
      });

      // Classical architrave beam across top
      ctx.fillStyle = 'rgba(241, 245, 249, 0.08)';
      ctx.fillRect(width * 0.08, height * 0.14, width * 0.84, 28);
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(width * 0.08, height * 0.14, width * 0.84, 28);

      // Ethereal rolling midnight mist particles
      particlesRef.current.forEach((p) => {
        p.x += Math.sin(timeSec + p.y) * 0.4;
        p.y -= p.speed * 0.6;
        if (p.y < 0) p.y = height;
        ctx.fillStyle = `rgba(226, 232, 240, ${p.opacity * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (normalizedTheme === 'carbon_graphite') {
      // 3. Carbon Minimal (Raw matte carbon fiber, technical precision & dark horizon)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0D0F16');
      bgGrad.addColorStop(0.4, '#07090E');
      bgGrad.addColorStop(1, '#020305');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Central monolithic tower silhouette in deep slate
      const monoGrad = ctx.createLinearGradient(0, height * 0.2, 0, height * 0.78);
      monoGrad.addColorStop(0, 'rgba(148, 163, 184, 0.18)');
      monoGrad.addColorStop(1, 'rgba(30, 41, 59, 0.04)');
      ctx.fillStyle = monoGrad;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, height * 0.78);
      ctx.lineTo(width / 2 - 80, height * 0.22);
      ctx.lineTo(width / 2 + 80, height * 0.22);
      ctx.lineTo(width / 2 + 120, height * 0.78);
      ctx.closePath();
      ctx.fill();

      // Clean isometric grid lines in cold zinc
      const horizonY = height * 0.68;
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.25)';
      ctx.lineWidth = 1;
      for (let x = -width; x <= width * 2; x += 90) {
        ctx.beginPath();
        ctx.moveTo(width / 2, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Floating carbon micro-particles
      particlesRef.current.forEach((p) => {
        p.y -= p.speed * 0.8;
        if (p.y < 0) p.y = height;
        ctx.fillStyle = `rgba(161, 161, 170, ${p.opacity * 0.6})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.1, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (normalizedTheme === 'cyber_cyan') {
      // 4. STARK Cyber Cyan (Signature laser optic crosshair & deep obsidian)
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 60, width / 2, height / 2, height * 0.75);
      bgGrad.addColorStop(0, '#061325');
      bgGrad.addColorStop(0.5, '#030914');
      bgGrad.addColorStop(1, '#010307');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floating cyan stardust
      particlesRef.current.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = height;
        ctx.fillStyle = `rgba(56, 189, 248, ${p.opacity * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Precision cyan crosshair laser reticle
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(width / 2, height * 0.25);
      ctx.lineTo(width / 2, height * 0.72);
      ctx.moveTo(width * 0.15, height * 0.48);
      ctx.lineTo(width * 0.85, height * 0.48);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width / 2, height * 0.48, 160, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // 5. Obsidian Void (Pure Deepest Black & Cold Stardust)
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 60, width / 2, height / 2, height * 0.75);
      bgGrad.addColorStop(0, '#0C0F17');
      bgGrad.addColorStop(0.5, '#05070D');
      bgGrad.addColorStop(1, '#000000');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floating cold white/silver stardust
      particlesRef.current.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) p.y = height;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Minimalist vertical hairline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2, height * 0.2);
      ctx.lineTo(width / 2, height * 0.8);
      ctx.stroke();
    }

    // 2. Cinematic Safe Zone Vignette
    const vignetteGrad = ctx.createLinearGradient(0, 0, 0, height);
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    vignetteGrad.addColorStop(0.18, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(0.82, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Top Header Bar: Clean Non-Cringe Context Badge (Replaced forced PROTOCOL)
    if (topHeaderMode !== 'clean_void') {
      const headerText = resolveTopHeaderText(topHeaderMode, customTopHeaderText);

      if (headerText) {
        ctx.save();
        ctx.font = '700 15px "Space Grotesk", -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textMetrics = ctx.measureText(headerText);
        const pillPadX = 16;
        const pillW = textMetrics.width + pillPadX * 2;
        const pillH = 30;
        const pillX = width / 2 - pillW / 2;
        // Position at Y = 160 to sit cleanly below TikTok top status and tabs (Safe Zone)
        const pillCenterY = 160;
        const pillY = pillCenterY - pillH / 2;

        // Frosted dark pill container
        ctx.fillStyle = 'rgba(10, 14, 23, 0.75)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(pillX, pillY, pillW, pillH, 15);
        } else {
          ctx.rect(pillX, pillY, pillW, pillH);
        }
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = currentThemeConfig.accentColor;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 8;
        ctx.fillText(headerText, width / 2, pillCenterY);
        ctx.restore();
      }
    }

    // Helper to draw the actual Logo image with circular clipping or vector SVG
    const drawBrandLogo = (
      lx: number,
      ly: number,
      targetSize: number,
      alphaPct: number,
      halo: LogoGlowChoice
    ) => {
      ctx.save();
      const logoImg = loadedLogoImgRef.current;
      ctx.globalAlpha = Math.max(0.02, Math.min(1, alphaPct / 100));

      if (halo === 'cyan') {
        ctx.shadowColor = 'rgba(56, 189, 248, 0.85)';
        ctx.shadowBlur = 16;
      } else if (halo === 'white') {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
        ctx.shadowBlur = 16;
      } else {
        ctx.shadowBlur = 0;
      }

      if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
        let dw = targetSize;
        let dh = targetSize;
        if (aspect > 1) {
          dh = dw / aspect;
        } else {
          dw = dh * aspect;
        }

        if (logoSourceType === 'seal') {
          // Circular clip for official seal logo
          ctx.beginPath();
          ctx.arc(lx, ly, dw / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.save();
          ctx.clip();
          ctx.drawImage(logoImg, lx - dw / 2, ly - dh / 2, dw, dh);
          ctx.restore();

          // Protective outer rim
          if (halo !== 'none') {
            ctx.strokeStyle =
              halo === 'cyan'
                ? 'rgba(56, 189, 248, 0.75)'
                : 'rgba(226, 232, 240, 0.7)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(lx, ly, dw / 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          // Custom Upload
          ctx.drawImage(logoImg, lx - dw / 2, ly - dh / 2, dw, dh);
        }
      } else {
        // Clean geometric emblem fallback while loading (no "SF" text)
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(lx, ly, targetSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(lx, ly, targetSize / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38BDF8';
        ctx.fill();
      }
      ctx.restore();
    };

    // Normalized placement for backward compatibility
    const normPlacement =
      logoPlacement === 'footer'
        ? 'bottom_under'
        : logoPlacement === 'top'
        ? 'top_left'
        : logoPlacement === 'center_watermark'
        ? 'background_watermark'
        : logoPlacement;

    // 3.5. Background Watermark (Rendered BEHIND text; slider works 100% from 2% to 100%)
    if (normPlacement === 'background_watermark') {
      const watermarkSize = Math.max(logoSize * 3.4, 220);
      const watermarkAlpha = logoOpacity;
      drawBrandLogo(width / 2, height * 0.46, watermarkSize, watermarkAlpha, 'none');
    }

    // 4. Kinetic Typography (Rhythmic Phrase Engine with Safe Auto-Fit & Keyword Glow)
    const currentPhraseIndex = Math.min(
      effectivePhrases.length - 1,
      Math.floor(timeSec / phraseDuration)
    );
    const activeText = effectivePhrases[currentPhraseIndex] || '';
    const phraseLocalTime = timeSec % phraseDuration;
    const entranceScale = Math.min(1.025, 0.97 + phraseLocalTime * 0.18);

    const activeFontFamily =
      fontFamilyChoice === 'cinzel'
        ? '"Cinzel", "Times New Roman", Georgia, serif'
        : fontFamilyChoice === 'space_grotesk'
        ? '"Space Grotesk", sans-serif'
        : '"Inter", -apple-system, sans-serif';

    // Safe width is strictly 560px on a 720px canvas to leave comfortable 80px side margins
    const layoutResult = layoutPhraseToLines(activeText, ctx, 560, preferredFontSize, activeFontFamily);

    ctx.save();
    ctx.translate(width / 2, height * 0.47);
    ctx.scale(entranceScale, entranceScale);

    ctx.font = `900 ${layoutResult.finalFontSize}px ${activeFontFamily}`;
    ctx.textBaseline = 'middle';

    const totalHeight = (layoutResult.lines.length - 1) * layoutResult.lineHeight;
    const startY = -totalHeight / 2;

    const resolvedKeywordColor =
      keywordColorChoice === 'theme'
        ? currentThemeConfig.accentColor
        : keywordColorChoice === 'cyan'
        ? '#38BDF8'
        : keywordColorChoice === 'gray'
        ? '#94A3B8'
        : keywordColorChoice === 'slate'
        ? '#64748B'
        : '#FFFFFF';

    layoutResult.lines.forEach((line, lIdx) => {
      const lineY = startY + lIdx * layoutResult.lineHeight;
      const spaceW = ctx.measureText(' ').width;
      let curX = -line.width / 2;

      line.tokens.forEach((token) => {
        const wordW = ctx.measureText(token.raw).width;

        if (token.isKeyword) {
          // 1. Badge Pill Style (if selected)
          if (keywordHighlightStyle === 'pill_badge') {
            const padX = 10;
            const padY = 4;
            const bx = curX - padX;
            const by = lineY - layoutResult.finalFontSize * 0.52 - padY;
            const bw = wordW + padX * 2;
            const bh = layoutResult.finalFontSize * 1.04 + padY * 2;

            ctx.save();
            ctx.fillStyle = `${resolvedKeywordColor}24`;
            ctx.strokeStyle = resolvedKeywordColor;
            ctx.lineWidth = 1.5;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(bx, by, bw, bh, 6);
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(bx, by, bw, bh);
              ctx.strokeRect(bx, by, bw, bh);
            }
            ctx.restore();
          } else if (keywordHighlightStyle === 'underline_bar') {
            // 2. Underline Bar Style (if selected)
            ctx.save();
            ctx.fillStyle = resolvedKeywordColor;
            ctx.shadowColor = resolvedKeywordColor;
            ctx.shadowBlur = 14;
            ctx.fillRect(curX - 2, lineY + layoutResult.finalFontSize * 0.44, wordW + 4, 4);
            ctx.restore();
          }

          // Draw the keyword text with cinematic glow
          ctx.save();
          ctx.fillStyle = resolvedKeywordColor;
          ctx.shadowColor = resolvedKeywordColor;
          ctx.shadowBlur = keywordHighlightStyle === 'white_halo' ? 26 : keywordHighlightStyle === 'neon_glow' ? 32 : 18;
          ctx.fillText(token.raw, curX, lineY);
          ctx.restore();
        } else {
          // Standard Word: Styled with user-selected fontColor (or EyeDropper sampled color)
          ctx.save();
          ctx.fillStyle = fontColor || '#FFFFFF';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.98)';
          ctx.shadowBlur = 24;
          ctx.fillText(token.raw, curX, lineY);
          ctx.restore();
        }

        curX += wordW + spaceW;
      });
    });

    ctx.restore();

    // 5. Rhythmic Audio Visualizer Bar - Elevated to safe zone height - 340
    const barCount = 28;
    const barWidth = 6;
    const spacing = 5;
    const totalW = barCount * (barWidth + spacing);
    const startX = width / 2 - totalW / 2;

    ctx.fillStyle = currentThemeConfig.accentColor;
    for (let b = 0; b < barCount; b++) {
      const freq = Math.sin(timeSec * 7 + b * 0.45);
      const h = 6 + Math.abs(freq) * 22;
      ctx.fillRect(startX + b * (barWidth + spacing), height - 340 - h / 2, barWidth, h);
    }

    // 6. Loop Progress Line (Strict 0.0s - 7.0s) - elevated to height - 310 (100% above TikTok caption and handle)
    const barY = height - 310;
    const barW = 440;
    const barH = 3.5;
    const barX = width / 2 - barW / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = currentThemeConfig.accentColor;
    ctx.fillRect(barX, barY, barW * progress, barH);

    // 7. & 8. Platform Safe-Zone Brand Signature & Logo (Completely avoids TikTok / Reels bottom bars)
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';

    if (normPlacement === 'bottom_under') {
      // 1. Signature text above, Logo directly below (spacious, zero collision with TikTok navigation)
      ctx.textAlign = 'center';
      ctx.fillText('@stark_focus', width / 2, height - 280);
      drawBrandLogo(width / 2, height - 235, Math.min(logoSize, 40), logoOpacity, logoGlow);
    } else if (normPlacement === 'bottom_inline') {
      // 2. Unified horizontal brand lockup on a single line
      const textMetrics = ctx.measureText('@stark_focus');
      const iconSize = Math.min(logoSize, 32);
      const gap = 12;
      const totalLockupW = iconSize + gap + textMetrics.width;
      const startX = width / 2 - totalLockupW / 2;
      const lineY = height - 268;

      drawBrandLogo(startX + iconSize / 2, lineY, iconSize, logoOpacity, logoGlow);
      ctx.textAlign = 'left';
      ctx.fillText('@stark_focus', startX + iconSize + gap, lineY);
    } else if (normPlacement === 'bottom_above') {
      // 3. Logo above signature
      drawBrandLogo(width / 2, height - 285, Math.min(logoSize, 40), logoOpacity, logoGlow);
      ctx.textAlign = 'center';
      ctx.fillText('@stark_focus', width / 2, height - 245);
    } else if (normPlacement === 'top_left') {
      // 4. Safe Zone: Top-Left corner (below TikTok top status at Y=160)
      drawBrandLogo(64, 160, Math.min(logoSize, 42), logoOpacity, logoGlow);
      ctx.textAlign = 'center';
      ctx.fillText('@stark_focus', width / 2, height - 265);
    } else if (normPlacement === 'top_right') {
      // 5. Safe Zone: Top-Right corner (below TikTok search at Y=160)
      drawBrandLogo(width - 64, 160, Math.min(logoSize, 42), logoOpacity, logoGlow);
      ctx.textAlign = 'center';
      ctx.fillText('@stark_focus', width / 2, height - 265);
    } else if (normPlacement === 'top_center') {
      // 6. Top Center (placed at Y=205 if top header is active, else Y=160)
      const topY = topHeaderMode !== 'clean_void' ? 205 : 160;
      const topS = topHeaderMode !== 'clean_void' ? Math.min(logoSize, 34) : Math.min(logoSize, 42);
      drawBrandLogo(width / 2, topY, topS, logoOpacity, logoGlow);
      ctx.textAlign = 'center';
      ctx.fillText('@stark_focus', width / 2, height - 265);
    } else {
      // Background watermark or None
      ctx.textAlign = 'center';
      ctx.fillText('@stark_focus', width / 2, height - 265);
    }

    // 9. TikTok UI Safe Zone Guide Overlay (Active only in preview mode when toggled)
    if (showTikTokGuides && !isExportingRef.current) {
      ctx.save();
      // 1. Top Danger Zone (0 to 140px)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.fillRect(0, 0, width, 140);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(0, 140);
      ctx.lineTo(width, 140);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '600 13px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('LIVE', 28, 65);
      ctx.textAlign = 'center';
      ctx.fillText('Obserwujesz  |  Dla Ciebie', width / 2, 65);
      ctx.textAlign = 'right';
      ctx.fillText('🔍 Szukaj', width - 28, 65);

      ctx.fillStyle = '#F87171';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ GÓRNY PASEK TIKTOK (ZAKRYTE)', width / 2, 115);

      // 2. Right Action Sidebar Zone (width - 85 to width)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
      ctx.fillRect(width - 85, 460, 85, 600);
      ctx.beginPath();
      ctx.moveTo(width - 85, 460);
      ctx.lineTo(width - 85, 1060);
      ctx.stroke();

      const rightX = width - 42;
      const mockIcons = [
        { y: 520, label: 'Profil', sym: '👤' },
        { y: 605, label: '84K', sym: '❤️' },
        { y: 690, label: '1.4K', sym: '💬' },
        { y: 775, label: '12K', sym: '🔖' },
        { y: 860, label: 'Share', sym: '↗️' },
        { y: 945, label: 'Audio', sym: '💿' }
      ];
      mockIcons.forEach((ic) => {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(ic.sym, rightX, ic.y);
        ctx.font = 'bold 10px -apple-system, sans-serif';
        ctx.fillText(ic.label, rightX, ic.y + 16);
      });

      // 3. Bottom TikTok Interface (1050 to 1280px)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(0, 1050, width, 230);
      ctx.beginPath();
      ctx.moveTo(0, 1050);
      ctx.lineTo(width, 1050);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.fillText('@stark_focus', 32, 1080);
      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText('Dyscyplina to fundament wolności... #focus #stoic', 32, 1105);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fillText('♫ Dźwięk oryginalny - stark_focus', 32, 1130);

      // Bottom Navigation Bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.fillRect(0, 1205, width, 75);
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('Główna', 60, 1245);
      ctx.fillText('Znajomi', 180, 1245);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('[ + ]', width / 2, 1245);
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Skrzynka', width - 180, 1245);
      ctx.fillText('Profil', width - 60, 1245);

      // 4. Golden Safe Zone Box Indicator
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(36, 148, width - 128, 890);

      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(44, 156, 215, 24);
      ctx.fillStyle = '#064E3B';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('✓ 100% SAFE ZONE TIKTOK', 52, 172);

      ctx.restore();
    }
  };

  // Video recording state
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [videoExportProgress, setVideoExportProgress] = useState<number>(0);

  // Download Full 7.00s Looping Video (MP4 / WebM) - Ultra-Smooth, Zero-Stutter Export
  const handleExportFullVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Lock preview loop so background RAF doesn't collide with recording!
    isExportingRef.current = true;
    setIsExportingVideo(true);
    setVideoExportProgress(0);
    setIsPlaying(false);

    try {
      const targetFps = exportFps || 60;
      const stream = canvas.captureStream(targetFps);
      const mimeTypes = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: targetFps === 60 ? 14000000 : 8000000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const isMp4 = selectedMime.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stark_focus_reel_7s_${selectedTheme}_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        isExportingRef.current = false;
        setIsExportingVideo(false);
        setIsPlaying(true);
      };

      recorder.start();

      // Perform silky smooth, frame-perfect recording synchronized with RAF
      const startTime = performance.now();
      const totalDuration = durationSec;

      const recordStep = (stamp: number) => {
        const elapsed = (stamp - startTime) / 1000;
        if (elapsed >= totalDuration) {
          renderFrame(totalDuration);
          setVideoExportProgress(100);
          setTimeout(() => {
            try {
              if (recorder.state === 'recording') {
                recorder.stop();
              }
            } catch (e) {
              console.error(e);
            }
          }, 150);
          return;
        }

        renderFrame(elapsed);
        setVideoExportProgress(Math.min(99, Math.round((elapsed / totalDuration) * 100)));
        requestAnimationFrame(recordStep);
      };

      requestAnimationFrame(recordStep);
    } catch (err) {
      console.error('Error recording full video loop:', err);
      setVideoExportError('Nie udało się nagrać wideo w przeglądarce. Skorzystaj z opcji pobrania klatki PNG.');
      isExportingRef.current = false;
      setIsExportingVideo(false);
      setIsPlaying(true);
    }
  };

  // 60 FPS Accurate Animation Loop with STRICT 7.00s wrap and export lock
  useEffect(() => {
    let lastStamp = performance.now();

    const loop = (stamp: number) => {
      const delta = (stamp - lastStamp) / 1000;
      lastStamp = stamp;

      // When export is running, do NOT touch canvas from preview loop!
      if (isExportingRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (isPlayingRef.current) {
        timeRef.current += delta;
        if (timeRef.current >= durationSec) {
          timeRef.current = 0; // Strictly loops at 7.00s
        }
      }

      setCurrentTimeDisplay(timeRef.current);
      renderFrame(timeRef.current);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    selectedTheme,
    scriptText,
    topHeaderMode,
    customTopHeaderText,
    keywordHighlightStyle,
    keywordColorChoice,
    logoPlacement,
    logoSourceType,
    customLogoUrl,
    logoSize,
    logoOpacity,
    logoGlow,
    logoLoadTick,
    fontFamilyChoice,
    preferredFontSize
  ]);

  // Generate fresh English stoic/poetic hook
  const handleGenerateFreshHook = async () => {
    setIsGeneratingIdea(true);
    try {
      const res = await fetch('/api/ghostwrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'High-leverage stoic discipline, ruthless focus, solitude, poetic dark motivation',
          format: 'Viral Reel Hook in ENGLISH (2 short lines, under 10 words, brutal and poetic)'
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.content) {
          const clean = json.content.replace(/["#*]/g, '').trim().toUpperCase();
          setScriptText(clean);
          timeRef.current = 0;
          setIsGeneratingIdea(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    // Pick next from curated English pool
    const next = POETIC_VIRAL_HOOKS_EN[Math.floor(Math.random() * POETIC_VIRAL_HOOKS_EN.length)];
    setScriptText(next);
    timeRef.current = 0;
    setIsGeneratingIdea(false);
  };

  // Download Frame as HQ Image (720x1280 9:16)
  const handleExportFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `stark_focus_reel_7s_${selectedTheme}_${Date.now()}.png`;
    a.click();
  };

  return (
    <div
      id="video-studio-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#141824] border border-[#2C354B] rounded-xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C354B] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-sm bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30">
              <Film className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                AUTOMONTAŻYSTA ROLEK // VIRAL 7.00s ENGINE
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Rygorystyczny 7-sekundowy loop z kinetic typography po angielsku, motywy konta @stark_focus i auto-rekomendacja audio.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopAudioImmediate();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-[#1D2333] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Grid: Left Stage (9:16 Preview) + Right Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-y-auto pr-1">
          {/* Left: 9:16 Canvas Stage */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#0B0D14] border border-[#2C354B] rounded-xl p-3 sm:p-4 relative">
            <div className={`relative w-full max-w-[280px] sm:max-w-[310px] aspect-[9/16] rounded-lg overflow-hidden shadow-2xl border ${isSamplingCanvasColor ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/60 cursor-crosshair' : 'border-[#2C354B]'}`}>
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClickToSampleColor}
                className={`w-full h-full object-cover ${isSamplingCanvasColor ? 'cursor-crosshair' : ''}`}
              />

              {/* Eyedropper Sampling Overlay */}
              {isSamplingCanvasColor && (
                <div
                  onClick={() => setIsSamplingCanvasColor(false)}
                  className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 text-center cursor-crosshair z-20"
                >
                  <div className="p-2.5 rounded-full bg-[#38BDF8]/20 border border-[#38BDF8] text-[#38BDF8] animate-bounce mb-2">
                    <Pipette className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white bg-black/90 px-3 py-1.5 rounded-md border border-[#38BDF8] shadow-lg">
                    KLIKNIJ W TŁO, ABY POBRAĆ KOLOR
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono mt-2 underline cursor-pointer">
                    (lub kliknij tutaj aby anulować)
                  </span>
                </div>
              )}

              {/* Exact 7.00s Stopwatch HUD */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 border border-white/20 font-mono text-[10px] text-white font-bold backdrop-blur-sm flex items-center gap-1 z-10">
                <Clock className="w-3 h-3 text-[#38BDF8]" />
                <span>{currentTimeDisplay.toFixed(2)}s</span>
                <span className="text-slate-400">/ 7.00s</span>
              </div>
            </div>

            {/* Playback bar & TikTok Safe Zone toggle */}
            <div className="flex items-center gap-2 mt-3 w-full max-w-[310px]">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-sm bg-[#38BDF8] text-[#141824] hover:bg-[#38BDF8]/90 font-bold transition-all cursor-pointer flex-1 flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                {isPlaying ? 'Pauza' : 'Odtwórz'}
              </button>

              <button
                onClick={() => setAudioPreviewEnabled(!audioPreviewEnabled)}
                className={`p-2 rounded-sm border text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                  audioPreviewEnabled
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                    : 'bg-[#1D2333] border-[#2C354B] text-slate-400'
                }`}
                title="Włącz odsłuch rytmu audio w tle"
              >
                {audioPreviewEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Beat
              </button>

              <button
                type="button"
                onClick={() => setShowTikTokGuides(!showTikTokGuides)}
                className={`p-2 rounded-sm border text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                  showTikTokGuides
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold'
                    : 'bg-[#1D2333] border-[#2C354B] text-slate-400 hover:text-white'
                }`}
                title="Włącz / Wyłącz podgląd bezpiecznych stref TikToka (Safe Zone)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                TikTok UI
              </button>
            </div>
          </div>

          {/* Right: Customization Engine */}
          <div className="lg:col-span-7 space-y-4">
            {/* Visual Theme Selector (4 Distinct Themes) */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
                  1. Motyw Wizualny Konta @stark_focus:
                </span>
                <span className="font-mono text-[9px] text-[#38BDF8]">4 Oficjalne Szablony</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VISUAL_THEMES.map((theme) => {
                  const isCurrent = selectedTheme === theme.id;
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-[#1D2333] border-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                          : 'bg-[#141824] border-[#2C354B] hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-mono font-black text-white">{theme.name}</span>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                          style={{ backgroundColor: `${theme.accentColor}20`, color: theme.accentColor }}
                        >
                          {theme.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono leading-tight">{theme.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Background Selector (Procedural vs Real Dark Vault Assets) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                  2. Tło Graficzne (Fotografia 9:16 lub Shader):
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={videoBgFileInputRef}
                    onChange={handleBgFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoBgFileInputRef.current?.click()}
                    className="text-[9px] font-mono font-bold text-slate-300 hover:text-white bg-[#141824] hover:bg-[#1D2333] border border-[#2C354B] px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                    title="Wgraj własną grafikę z dysku lub pobraną z Binga"
                  >
                    <Upload className="w-3 h-3 text-[#38BDF8]" />
                    Wgraj z Dysku
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBingModal(true)}
                    className="text-[9px] font-mono font-bold text-[#38BDF8] hover:text-white bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                    title="Wygeneruj idealny prompt do Bing Image Creator dopasowany do treści tej rolki"
                  >
                    <Sparkles className="w-3 h-3" />
                    ⚡ Prompt Bing pod tę Rolkę
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={selectedBgId}
                  onChange={(e) => setSelectedBgId(e.target.value)}
                  className="w-full text-xs font-bold py-2 px-2.5 bg-[#1D2333] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
                >
                  {allVideoBgs.map((bg) => (
                    <option key={bg.id} value={bg.id}>
                      {bg.name}
                    </option>
                  ))}
                  <option value="custom">🔗 Własny Link URL / Wgrany Plik...</option>
                </select>

                {selectedBgId === 'custom' && (
                  <input
                    type="url"
                    value={customBgUrl.startsWith('data:') ? '[Wgrany plik graficzny z dysku]' : customBgUrl}
                    onChange={(e) => setCustomBgUrl(e.target.value)}
                    placeholder="https://... wklej URL grafiki tła"
                    className="w-full text-xs py-2 px-2.5 bg-[#1D2333] border border-[#38BDF8] rounded text-white focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* Dynamiczne Szablony wg Pory Dnia & Kontekstu */}
            <div className="bg-[#141824] p-3 rounded-lg border border-[#2C354B] space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <span className="text-[10px] font-mono font-black uppercase text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#38BDF8]" />
                  🎯 SZABLONY WG PORY DNIA & KONTEKSTU:
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  Wybierz slot poranny, lunchowy, wieczorny lub stoicki
                </span>
              </div>

              {/* Day-Part Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-[#0F121C] rounded-md border border-[#2C354B]">
                <button
                  type="button"
                  onClick={() => setActiveDaySlot('morning')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeDaySlot === 'morning'
                      ? 'bg-[#F59E0B] text-[#141824] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#1D2333]'
                  }`}
                >
                  <Sunrise className="w-3 h-3" />
                  <span>Poranek 06:30</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDaySlot('lunch')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeDaySlot === 'lunch'
                      ? 'bg-[#38BDF8] text-[#141824] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#1D2333]'
                  }`}
                >
                  <Sun className="w-3 h-3" />
                  <span>Lunch 13:00</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDaySlot('evening')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeDaySlot === 'evening'
                      ? 'bg-purple-400 text-[#141824] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#1D2333]'
                  }`}
                >
                  <Moon className="w-3 h-3" />
                  <span>Wieczór 21:00</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDaySlot('all_day')}
                  className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeDaySlot === 'all_day'
                      ? 'bg-emerald-400 text-[#141824] shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#1D2333]'
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>Stoickie 24/7</span>
                </button>
              </div>

              {/* Active Presets Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {(activeDaySlot === 'morning'
                  ? MORNING_PRESETS
                  : activeDaySlot === 'lunch'
                  ? LUNCH_1300_PRESETS
                  : activeDaySlot === 'evening'
                  ? EVENING_PRESETS
                  : ALL_DAY_PRESETS
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setScriptText(preset.hook);
                      setSelectedTheme(preset.theme);
                      setSelectedScheduledTime(preset.suggestedTime);
                      setIsCustomTime(false);
                      setTopHeaderMode('custom');
                      setCustomTopHeaderText(preset.topHeader);
                      timeRef.current = 0;
                    }}
                    className="text-left p-2 rounded bg-[#1D2333] hover:bg-[#252E42] border border-[#2C354B] hover:border-[#38BDF8]/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-white group-hover:text-[#38BDF8]">
                        {preset.label}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 bg-black/40 px-1 py-0.2 rounded border border-[#2C354B]">
                        {preset.suggestedTime}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                      "{preset.hook.replace(/\n/g, ' ')}"
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Górna Belka Kadru (Praktyczne warianty) */}
            <div className="bg-[#141824] p-2.5 rounded-lg border border-[#2C354B] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Górna Belka Kadru (Aesthetic Context Badge):
                </span>
                <span className="text-[9px] font-mono text-[#38BDF8]">
                  Pełna edycja tekstu
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {STARK_TOP_HEADER_PRESETS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTopHeaderMode(opt.id);
                      if (opt.displayText) {
                        setCustomTopHeaderText(opt.displayText);
                      }
                      timeRef.current = 0;
                    }}
                    className={`text-left p-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                      topHeaderMode === opt.id
                        ? 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]'
                        : 'bg-[#1D2333] text-slate-300 border-[#2C354B] hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold truncate">{opt.label}</div>
                    <div className="text-[8px] text-slate-400 truncate">{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
                  <span>Edytuj / Wpisz własny napis górnej belki:</span>
                  <span className="text-slate-500">Bezpieczna strefa Y:160</span>
                </div>
                <input
                  type="text"
                  value={topHeaderMode === 'clean_void' ? '' : customTopHeaderText || resolveTopHeaderText(topHeaderMode)}
                  onChange={(e) => {
                    setTopHeaderMode('custom');
                    setCustomTopHeaderText(e.target.value.toUpperCase());
                    timeRef.current = 0;
                  }}
                  disabled={topHeaderMode === 'clean_void'}
                  placeholder="WPISZ DOWOLNY WŁASNY NAGŁÓWEK GÓRNEJ BELKI..."
                  className="w-full text-xs font-mono py-1.5 px-2.5 bg-[#1D2333] border border-[#2C354B] focus:border-[#38BDF8] rounded text-white focus:outline-none uppercase disabled:opacity-40"
                />
              </div>
            </div>

            {/* Script Text Input (Strictly English default) with Keyword Detection & Syllable/Line Balancer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#38BDF8]" />
                  3. Tekst Rolki (Maks. 10 słów, Poetycki Stoicyzm EN):
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const words = scriptText.replace(/\n+/g, ' ').trim().split(/\s+/);
                      if (words.length > 2) {
                        let mid = Math.round(words.length / 2);
                        if (mid > 1 && isOrphanWord(words[mid - 1])) mid--;
                        setScriptText(`${words.slice(0, mid).join(' ')}\n${words.slice(mid).join(' ')}`);
                      }
                    }}
                    className="text-[9px] font-mono text-slate-300 hover:text-[#38BDF8] bg-[#1D2333] hover:bg-[#252E42] border border-[#2C354B] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    title="Automatycznie rozdziel tekst na 2 równe, zbalansowane linie bez uciętych sylab i wiszących spójników"
                  >
                    ⚖️ 2 linie (balans)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const words = scriptText.replace(/\n+/g, ' ').trim().split(/\s+/);
                      if (words.length >= 6) {
                        const chunkSize = Math.ceil(words.length / 3);
                        let i1 = chunkSize;
                        if (i1 > 1 && isOrphanWord(words[i1 - 1])) i1--;
                        let i2 = i1 + chunkSize;
                        if (i2 > i1 + 1 && i2 < words.length && isOrphanWord(words[i2 - 1])) i2--;
                        setScriptText(`${words.slice(0, i1).join(' ')}\n${words.slice(i1, i2).join(' ')}\n${words.slice(i2).join(' ')}`);
                      }
                    }}
                    className="text-[9px] font-mono text-slate-300 hover:text-[#38BDF8] bg-[#1D2333] hover:bg-[#252E42] border border-[#2C354B] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    title="Automatycznie rozdziel tekst na 3 równe linie"
                  >
                    ⚖️ 3 linie
                  </button>

                  <button
                    onClick={handleGenerateFreshHook}
                    disabled={isGeneratingIdea}
                    className="text-[10px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGeneratingIdea ? 'Generowanie...' : 'Generuj Hook EN'}
                  </button>
                </div>
              </div>

              <textarea
                value={scriptText}
                onChange={(e) => {
                  setScriptText(e.target.value.toUpperCase());
                  timeRef.current = 0;
                }}
                rows={3}
                className="w-full text-xs font-mono py-2 px-3 bg-[#1D2333] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none tracking-wide uppercase font-bold leading-relaxed"
                placeholder="WPISZ TEKST ROLKI PO ANGIELSKU... MOŻESZ WPISAĆ *SŁOWO* ABY WYRÓŻNIĆ JE RĘCZNIE"
              />

              {/* Wykryte słowa kluczowe & wskazówka */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[9px] font-mono text-slate-400">Wyróżnione słowa:</span>
                {detectedKeywordsList.length > 0 ? (
                  detectedKeywordsList.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-bold"
                    >
                      {kw}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-mono text-slate-500 italic">
                    (ostatnie słowo w każdej myśli będzie podświetlone)
                  </span>
                )}
                <span className="text-[9px] font-mono text-slate-500 ml-auto">
                  Tip: Wpisz np. <code>*WORD*</code>, aby wymusić wyróżnienie dowolnego słowa.
                </span>
              </div>
            </div>

            {/* Wyróżnienie Słów Kluczowych & Typografia */}
            <div className="bg-[#141824] p-2.5 rounded-lg border border-[#2C354B] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Styl Akcentu Słów Kluczowych & Typografia:
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  🛡️ Auto-Fit: Tekst zawsze mieści się w kadrze
                </span>
              </div>

              {/* Style selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'white_halo' as KeywordHighlightStyle, label: '❄️ Platynowy Halo', desc: 'Zimna poświata tytanowa' },
                  { id: 'neon_glow' as KeywordHighlightStyle, label: '⚡ Neon Glow', desc: 'Aura kinowa STARK' },
                  { id: 'pill_badge' as KeywordHighlightStyle, label: '🏷️ Ramka / Pill', desc: 'Kapsuła frosted' },
                  { id: 'underline_bar' as KeywordHighlightStyle, label: '➖ Podkreślenie', desc: 'Belka akcentowa' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setKeywordHighlightStyle(s.id)}
                    className={`p-1.5 rounded text-left border text-[10px] font-mono transition-all cursor-pointer ${
                      keywordHighlightStyle === s.id
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                        : 'bg-[#1D2333] text-slate-300 border-[#2C354B] hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold truncate">{s.label}</div>
                    <div className="text-[8px] text-slate-400 truncate">{s.desc}</div>
                  </button>
                ))}
              </div>

              {/* Color picker pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#2C354B]/70">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-slate-400">Kolor akcentu:</span>
                  {[
                    { id: 'white' as KeywordColorChoice, label: 'Platyna', color: '#FFFFFF' },
                    { id: 'cyan' as KeywordColorChoice, label: 'Cyjan STARK', color: '#38BDF8' },
                    { id: 'gray' as KeywordColorChoice, label: 'Tytan Szary', color: '#94A3B8' },
                    { id: 'slate' as KeywordColorChoice, label: 'Grafit', color: '#64748B' },
                    { id: 'theme' as KeywordColorChoice, label: 'Motyw', color: '#CBD5E1' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setKeywordColorChoice(c.id)}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        keywordColorChoice === c.id
                          ? 'bg-white/10 text-white border-white'
                          : 'bg-[#1D2333] text-slate-400 border-[#2C354B] hover:border-slate-500'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Font Family selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-slate-400">Krój:</span>
                  {[
                    { id: 'cinzel' as const, label: 'Cinzel (Serif)' },
                    { id: 'space_grotesk' as const, label: 'Space Grotesk' },
                    { id: 'inter' as const, label: 'Inter' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamilyChoice(f.id)}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                        fontFamilyChoice === f.id
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                          : 'bg-[#1D2333] text-slate-400 border-[#2C354B] hover:border-slate-500'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eyedropper / Pipeta: Dobór koloru czcionki do tła */}
              <div className="pt-2 border-t border-[#2C354B]/70 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-slate-300 font-bold flex items-center gap-1">
                    <Pipette className="w-3 h-3 text-[#38BDF8]" />
                    Kolor czcionki tekstu:
                  </span>

                  <button
                    type="button"
                    onClick={handlePickColorWithEyeDropper}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSamplingCanvasColor
                        ? 'bg-[#38BDF8] text-[#141824] border-[#38BDF8] animate-pulse shadow-md'
                        : 'bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border-[#38BDF8]/40'
                    }`}
                    title="Uruchom pipetę, aby pobrać dokładny odcień bezpośrednio z tła lub klatki wideo"
                  >
                    <Pipette className="w-3.5 h-3.5" />
                    <span>{isSamplingCanvasColor ? 'Kliknij w tło wideo...' : '💧 Pipeta (Pobierz z tła)'}</span>
                  </button>

                  {/* Native color picker & preview */}
                  <div className="flex items-center gap-1.5 bg-[#0B0D14] px-2 py-0.5 rounded border border-[#2C354B]">
                    <input
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value.toUpperCase())}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                      title="Wybierz dokładny kolor z palety"
                    />
                    <span className="font-mono text-[10px] font-bold text-white uppercase">{fontColor}</span>
                  </div>
                </div>

                {/* Quick Swatches */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono text-slate-500 mr-0.5">Szybkie:</span>
                  {[
                    { hex: '#FFFFFF', label: 'Biel' },
                    { hex: '#E2E8F0', label: 'Tytan' },
                    { hex: '#CBD5E1', label: 'Marmur' },
                    { hex: '#94A3B8', label: 'Stal' },
                    { hex: '#FCD34D', label: 'Złoto' },
                    { hex: '#38BDF8', label: 'Cyjan' }
                  ].map((sw) => (
                    <button
                      key={sw.hex}
                      type="button"
                      onClick={() => setFontColor(sw.hex)}
                      className={`w-4 h-4 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                        fontColor === sw.hex ? 'ring-2 ring-[#38BDF8] border-white scale-105' : 'border-[#2C354B]'
                      }`}
                      style={{ backgroundColor: sw.hex }}
                      title={`${sw.label} (${sw.hex})`}
                    />
                  ))}
                  {fontColor !== '#FFFFFF' && (
                    <button
                      type="button"
                      onClick={() => setFontColor('#FFFFFF')}
                      className="text-[8px] font-mono text-slate-400 hover:text-white underline ml-1 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Oficjalne Logo Marki & Znak Wodny STARK FOCUS */}
            <div className="bg-[#141824] p-3 rounded-lg border border-[#38BDF8]/40 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Oficjalne Logo Marki na Kadrze:
                </span>
                
                {/* Active logo preview badge */}
                <div className="flex items-center gap-1.5 bg-[#0B0D14] px-2 py-0.5 rounded border border-[#38BDF8]/40">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-black flex items-center justify-center border border-[#38BDF8]/60 shadow-[0_0_8px_rgba(56,189,248,0.3)]">
                    <img
                      src={
                        logoSourceType === 'monogram'
                          ? '/stark_logo.svg'
                          : logoSourceType === 'custom' && customLogoUrl
                          ? customLogoUrl
                          : '/stark_seal_logo.png'
                      }
                      alt="Active Logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[9px] font-mono text-[#38BDF8] font-bold uppercase">
                    {logoPlacement === 'none'
                      ? 'Ukryte'
                      : logoSourceType === 'seal'
                      ? '🛡️ Twoje Logo STARK'
                      : '📁 Własne Logo'}
                  </span>
                </div>
              </div>

              {/* Źródło Logo */}
              <div>
                <label className="text-[9px] font-mono text-slate-400 block mb-1">
                  Wybierz Twoje Logo / Wgraj Własny Plik:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLogoSourceType('seal')}
                    className={`py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      logoSourceType === 'seal'
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                        : 'bg-[#1D2333] text-slate-300 border-[#2C354B] hover:border-slate-500'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full overflow-hidden flex-shrink-0 border border-current">
                      <img src="/stark_seal_logo.png" alt="Seal" className="w-full h-full object-cover" />
                    </span>
                    <span>🛡️ Twoje Oficjalne Logo STARK</span>
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      accept="image/png,image/svg+xml,image/jpeg,image/webp"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className={`w-full py-1.5 px-2 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        logoSourceType === 'custom'
                          ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                          : 'bg-[#1D2333] text-slate-300 border-[#2C354B] hover:border-slate-500'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{customLogoUrl ? 'Zmień Własne Logo' : 'Wgraj Własny Plik...'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Pozycja na Kadrze (Bezpieczne strefy TikTok / Reels / Shorts) */}
              <div className="pt-2 border-t border-[#2C354B]/60 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="text-[10px] font-mono font-bold uppercase text-slate-300">
                    Pozycja Logo na Kadrze (Safe-Zones):
                  </label>
                  <span className="text-[9px] font-mono text-[#38BDF8]">
                    ✓ Bez kolizji z suwakiem, tekstem i UI platform
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    {
                      id: 'bottom_under' as LogoPlacement,
                      label: 'Pod @stark_focus',
                      desc: 'Dół kadru (rekomendowane)',
                      badge: 'DÓŁ'
                    },
                    {
                      id: 'top_left' as LogoPlacement,
                      label: 'Lewy górny róg',
                      desc: '100% Safe-Zone platform',
                      badge: 'RÓG'
                    },
                    {
                      id: 'bottom_inline' as LogoPlacement,
                      label: 'W linii z @stark_focus',
                      desc: 'Zintegrowany badge',
                      badge: 'INLINE'
                    },
                    {
                      id: 'bottom_above' as LogoPlacement,
                      label: 'Nad @stark_focus',
                      desc: 'Odsunięte od suwaka',
                      badge: 'DÓŁ'
                    },
                    {
                      id: 'top_right' as LogoPlacement,
                      label: 'Prawy górny róg',
                      desc: 'Klasyczny znak stacji',
                      badge: 'RÓG'
                    },
                    {
                      id: 'top_center' as LogoPlacement,
                      label: 'Górny środek',
                      desc: 'Centralnie pod nagłówkiem',
                      badge: 'GÓRA'
                    },
                    {
                      id: 'background_watermark' as LogoPlacement,
                      label: 'Znak wodny w tle',
                      desc: 'ZA tekstem (nie zasłania)',
                      badge: 'TŁO'
                    },
                    {
                      id: 'none' as LogoPlacement,
                      label: 'Bez logo',
                      desc: 'Czysty kadr',
                      badge: 'BRAK'
                    }
                  ].map((p) => {
                    const isSelected =
                      logoPlacement === p.id ||
                      (p.id === 'bottom_under' && logoPlacement === 'footer') ||
                      (p.id === 'top_left' && logoPlacement === 'top') ||
                      (p.id === 'background_watermark' && logoPlacement === 'center_watermark');

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLogoPlacement(p.id)}
                        className={`p-1.5 rounded text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#38BDF8]/20 text-white border-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.25)]'
                            : 'bg-[#1D2333] text-slate-300 border-[#2C354B] hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono font-bold truncate">{p.label}</span>
                          <span
                            className={`text-[7px] font-mono px-1 rounded uppercase ${
                              isSelected ? 'bg-[#38BDF8] text-black font-bold' : 'bg-black/40 text-slate-400'
                            }`}
                          >
                            {p.badge}
                          </span>
                        </div>
                        <div className="text-[8px] font-mono text-slate-400 truncate mt-0.5">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Parametry dostrojenia: Rozmiar, Przezroczystość, Poświata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#2C354B]/60">
                {/* Rozmiar Logo */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-mono text-slate-400">Rozmiar:</label>
                    <span className="text-[9px] font-mono text-white font-bold">{logoSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={28}
                    max={84}
                    step={2}
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    disabled={logoPlacement === 'none'}
                    className="w-full accent-[#38BDF8] cursor-pointer disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-400">
                    <span>28px</span>
                    <span>44px</span>
                    <span>84px</span>
                  </div>
                </div>

                {/* Krycie / Opacity */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-mono text-slate-400">Przezroczystość (działa na znak wodny):</label>
                    <span className="text-[9px] font-mono text-[#38BDF8] font-bold">{logoOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={100}
                    step={1}
                    value={logoOpacity}
                    onChange={(e) => setLogoOpacity(Number(e.target.value))}
                    disabled={logoPlacement === 'none'}
                    className="w-full accent-[#38BDF8] cursor-pointer disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-400">
                    <span>2% (dyskretne tło)</span>
                    <span>100% (pełne)</span>
                  </div>
                </div>

                {/* Poświata / Aura */}
                <div>
                  <label className="text-[9px] font-mono text-slate-400 block mb-1">Aura / Poświata:</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'cyan' as LogoGlowChoice, label: 'Cyjan', color: '#38BDF8' },
                      { id: 'white' as LogoGlowChoice, label: 'Platyna', color: '#FFFFFF' },
                      { id: 'none' as LogoGlowChoice, label: 'Brak', color: '#64748B' }
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setLogoGlow(g.id)}
                        disabled={logoPlacement === 'none'}
                        className={`py-1 px-1 rounded text-[9px] font-mono font-bold border truncate transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 ${
                          logoGlow === g.id
                            ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                            : 'bg-[#1D2333] text-slate-400 border-[#2C354B] hover:border-slate-500'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Automatic Sound Recommendation based on content */}
            <div className="bg-[#1D2333] p-3 rounded-lg border border-[#38BDF8]/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#38BDF8] flex items-center gap-1.5 tracking-wider">
                  <Music className="w-3.5 h-3.5" />
                  AUTOMATYCZNA REKOMENDACJA DŹWIĘKU (ALGORYTM REELS)
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] font-bold">
                  {recommendedAudio.boost}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#141824] p-2.5 rounded border border-[#2C354B]">
                <div>
                  <div className="text-xs font-mono font-bold text-white">{recommendedAudio.name}</div>
                  <div className="text-[10px] text-slate-300 font-mono">Tag w Instagramie: "{recommendedAudio.tag}"</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">{recommendedAudio.reason}</div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(recommendedAudio.tag);
                    setCopiedAudioTag(true);
                    setTimeout(() => setCopiedAudioTag(false), 3000);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/40 text-[10px] font-mono font-bold whitespace-nowrap cursor-pointer transition-colors"
                >
                  {copiedAudioTag ? '✓ Skopiowano Tag!' : 'Kopiuj Tag Dźwięku'}
                </button>
              </div>
            </div>

            {/* Video Export Error Notice */}
            {videoExportError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded text-xs font-mono text-rose-300 flex items-center justify-between">
                <span>{videoExportError}</span>
                <button
                  type="button"
                  onClick={() => setVideoExportError(null)}
                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Export & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-[#2C354B]">
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <span>
                  Format: <strong className="text-white">9:16</strong> • Długość:{' '}
                  <strong className="text-[#38BDF8]">7.00s</strong>
                </span>

                {/* FPS Selector */}
                <div className="flex items-center bg-[#141824] border border-[#2C354B] rounded p-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => setExportFps(60)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                      exportFps === 60
                        ? 'bg-[#38BDF8] text-[#141824]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Płynny eksport 60 klatek na sekundę (bez zacinania)"
                  >
                    60 FPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFps(30)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                      exportFps === 30
                        ? 'bg-[#38BDF8] text-[#141824]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Standardowy eksport 30 klatek na sekundę"
                  >
                    30 FPS
                  </button>
                </div>

                {isExportingVideo && (
                  <span className="ml-2 text-[#38BDF8] font-bold animate-pulse">
                    [Eksport Ultra-Smooth {exportFps} FPS: {videoExportProgress}%]
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(onSchedulePost || onSchedulePostFor1300) && (
                  <div className="flex flex-wrap items-center gap-1.5 bg-[#141824] p-1 rounded border border-[#2C354B]">
                    {/* Szybkie sloty godzinowe */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScheduledTime('07:00');
                          setIsCustomTime(false);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          !isCustomTime && selectedScheduledTime === '07:00'
                            ? 'bg-[#F59E0B] text-[#141824]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Ustaw godzinę publikacji na 07:00 (Poranny slot)"
                      >
                        07:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScheduledTime('13:00');
                          setIsCustomTime(false);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          !isCustomTime && selectedScheduledTime === '13:00'
                            ? 'bg-[#38BDF8] text-[#141824]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Ustaw godzinę publikacji na 13:00 (Lunch slot)"
                      >
                        13:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScheduledTime('21:00');
                          setIsCustomTime(false);
                        }}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          !isCustomTime && selectedScheduledTime === '21:00'
                            ? 'bg-purple-400 text-[#141824]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Ustaw godzinę publikacji na 21:00 (Wieczorny slot)"
                      >
                        21:00
                      </button>

                      {isCustomTime ? (
                        <input
                          type="time"
                          value={customTimeInput}
                          onChange={(e) => setCustomTimeInput(e.target.value)}
                          className="bg-[#1D2333] border border-[#38BDF8] text-white text-[10px] font-mono font-bold px-1 py-0.5 rounded w-16 text-center focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsCustomTime(true)}
                          className="px-1.5 py-1 rounded text-[9px] font-mono text-slate-400 hover:text-white hover:bg-[#1D2333] transition-all cursor-pointer"
                          title="Wpisz dowolną inną godzinę publikacji"
                        >
                          Inna
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleScheduleFor1300}
                      disabled={isExportingVideo}
                      className={`px-3 py-1.5 rounded-sm border text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        scheduledToast
                          ? 'bg-[#38BDF8] text-[#0B0D14] border-[#38BDF8]'
                          : 'bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border-[#38BDF8]/40 hover:border-[#38BDF8]'
                      }`}
                      title={`Zaplanuj tę rolkę do Kalendarza na ${isCustomTime ? customTimeInput : selectedScheduledTime}`}
                    >
                      {scheduledToast ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          Zaplanowano ({scheduledToastTime || (isCustomTime ? customTimeInput : selectedScheduledTime)})!
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3.5 h-3.5" />
                          Zaplanuj na {isCustomTime ? customTimeInput : selectedScheduledTime}
                        </>
                      )}
                    </button>
                  </div>
                )}

                <button
                  onClick={handleExportFrame}
                  disabled={isExportingVideo}
                  className="px-3 py-2 rounded-sm bg-[#141824] hover:bg-[#1D2333] border border-[#2C354B] hover:border-slate-500 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Pobierz aktualną klatkę w wysokiej rozdzielczości PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  Klatka PNG
                </button>

                <button
                  onClick={handleExportFullVideo}
                  disabled={isExportingVideo}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-sm bg-[#38BDF8] hover:bg-[#0EA5E9] text-[#0B0D14] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all cursor-pointer disabled:opacity-60"
                  title="Wyrenderuj i pobierz całe 7-sekundowe wideo w pętli na Reels / TikTok (60 FPS, brak zacięć)"
                >
                  <Film className="w-4 h-4" />
                  {isExportingVideo ? `Eksport Wideo (${videoExportProgress}%)...` : `🎬 Pobierz Całe Wideo (${exportFps} FPS MP4)`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Thematic Bing Prompter overlay for this Reel */}
        {showBingModal && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0B0D14] border border-[#2C354B] rounded-xl shadow-2xl p-1">
              <div className="flex items-center justify-between p-3 border-b border-[#2C354B]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Generator Promptów Bing dopasowany do bieżącej rolki
                  </span>
                </div>
                <button
                  onClick={() => setShowBingModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1D2333]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3">
                <React.Suspense fallback={<div className="p-6 text-center text-slate-400 text-sm">Ładowanie…</div>}>
                  <ThematicBingPrompter
                    initialTheme={scriptText}
                    onSelectBackground={(url) => {
                      setCustomBgUrl(url);
                      setSelectedBgId('custom');
                      setShowBingModal(false);
                    }}
                  />
                </React.Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
