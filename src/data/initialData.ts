import { StarkFocusData } from "../types";
import { DEFAULT_PRESETS_EN } from "./mentorTemplates";

export const POLISH_DAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

export const POLISH_MONTHS = [
  "",
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

export const INITIAL_DATA: StarkFocusData = {
  posts: [],
  xp: 0,
  streak: 1,
  created_at: new Date().toISOString().split("T")[0],
  vault_assets: [], // Puste – zero sztucznych teł
  dynamic_db: {
    formats: [
      "🎬 Rolka 7-Sekundowa (Short Reel)",
      "🎠 Karuzela 5-Slajdowa (IG / TikTok Slides)",
      "🏛️ Monolith Ledger (Split 50/50)",
      "❓ Prowokacja / Debate Bait",
      "📜 Minimalistyczny Cytat (One-Liner)",
    ],
    cta_presets: DEFAULT_PRESETS_EN,
  },
  social_handles: {
    instagram: "stark_focus",
    tiktok: "stark_focus",
    youtube: "@stark_focus",
  },
  planner_tasks: [],
};
