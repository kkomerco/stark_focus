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
  account_stats: [
    {
      id: "stat-baseline-ig",
      platform: "Instagram",
      followers: 0,
      views: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "Punkt startowy profilu.",
    },
    {
      id: "stat-baseline-tt",
      platform: "TikTok",
      followers: 0,
      views: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "Punkt startowy profilu.",
    },
    {
      id: "stat-baseline-yt",
      platform: "YouTube Shorts",
      followers: 0,
      views: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "Punkt startowy profilu.",
    },
  ],
  daily_logs: {},
  xp: 0,
  streak: 1,
  best_streak: 1,
  used_assets: [],
  created_at: new Date().toISOString().split("T")[0],
  carousel_packages: [], // Puste – tworzysz własne paczki
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
  monetization_goal: {
    monthlyTargetRevenue: 10000,
    productName: "The Ruthless Discipline Protocol",
    productPrice: 97,
    estimatedConversionRate: 1.5,
  },
  planner_tasks: [],
};
