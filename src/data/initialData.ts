import { StarkFocusData } from "../types";

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
  social_handles: {
    instagram: "stark_focus",
    tiktok: "stark_focus",
    youtube: "@stark_focus",
  },
};
