// Wspólne typy podmodułów AiRadarTab (wycięte z AiRadarTab.tsx — etap 2 refaktoryzacji).
export type SubModule = "radar" | "angles" | "friction" | "recycler" | "batch";

export interface AngleItem {
  angleId: string;
  angleName: string;
  hook: string;
  phrases: string[];
  caption: string;
  rationale: string;
}

export interface ParadoxItem {
  title: string;
  hook: string;
  explanation: string;
  phrases: string[];
}

export interface ViralFormatItem {
  formatKey: string;
  formatName: string;
  hook: string;
  phrases: string[];
  suggestedTheme: string;
  rationale: string;
}

export interface BatchPostItem {
  id: string;
  pillar: string;
  sayingMain: string;
  sayingSub?: string;
  caption: string;
  template?: string;
}
