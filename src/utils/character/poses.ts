// src/utils/character/poses.ts
// Pozy i scenki naszego chłopaka.
//
// Kąt 0° = kończyna w dół, dodatni = do przodu (w prawo); `flip` odbija całą
// postać, więc „idzie w drugą stronę kadru" bez drugiej wersji pozy.
//
// Scenka to nie zbiór póz, tylko przyczyna i skutek: coś kosztuje, coś pęka,
// coś się prostuje. Bez ostatniego taktu animacja jest ilustracją cytatu,
// a nie opowieścią — a o to dokładnie chodziło.

import type { Expression, Pose } from "./rig";

export type PoseId = "stand" | "slump" | "alarm" | "carry" | "climb" | "fall" | "rise" | "phone";

export interface PoseSpec {
  pose: Pose;
  expression: Expression;
  /** Przedmiot w dłoniach — bez niego „niesie ciężar" jest tylko kątem w kolanach. */
  prop?: "none" | "boulder" | "phone" | "rope";
  /** Pochylenie całej sylwetki; upadek czyta się z niego, nie z miny. */
  rotate?: number;
  /** Kto stoi twarzą w którą stronę kadru. */
  flip?: boolean;
}

export const POSES: Record<PoseId, PoseSpec> = {
  stand: { pose: {}, expression: "empty" },
  slump: {
    // Siedzi na podłodze, łokcie na kolanach, głowa opada.
    pose: {
      spineLean: 18,
      headTilt: 16,
      lHip: 84,
      lKnee: -96,
      rHip: 74,
      rKnee: -88,
      lShoulder: 40,
      lElbow: 30,
      rShoulder: 34,
      rElbow: 26,
    },
    expression: "tired",
  },
  alarm: {
    // Jedna ręka wystrzeliwuje w stronę budzika, druga jeszcze wisi w śpiącym ciele.
    pose: {
      spineLean: 10,
      headTilt: 10,
      rShoulder: 92,
      rElbow: 6,
      lShoulder: -16,
      lElbow: -6,
      lHip: -10,
      rHip: 12,
    },
    expression: "grit",
  },
  carry: {
    // Ręce wzdłuż ciała, ale przechylone do przodu — coś ciąży.
    pose: {
      spineLean: 22,
      headTilt: 12,
      lShoulder: -4,
      lElbow: 8,
      rShoulder: 8,
      rElbow: 10,
      lHip: -10,
      lKnee: -6,
      rHip: 12,
      rKnee: -6,
    },
    expression: "grit",
    prop: "boulder",
  },
  climb: {
    // Przednia noga na stopniu, ręce ciągną tułów w górę.
    pose: {
      spineLean: -10,
      headTilt: -8,
      lHip: -14,
      lKnee: -4,
      rHip: 56,
      rKnee: -70,
      lShoulder: 30,
      lElbow: 20,
      rShoulder: 148,
      rElbow: -22,
    },
    expression: "focus",
    prop: "rope",
  },
  fall: {
    pose: {
      spineLean: -26,
      headTilt: -18,
      lShoulder: -150,
      lElbow: -14,
      rShoulder: 150,
      rElbow: 16,
      lHip: -28,
      lKnee: -12,
      rHip: 34,
      rKnee: -14,
    },
    expression: "falling",
    rotate: -24,
  },
  rise: {
    // Bez kciuka w górę: podbródek do góry, ręce luźno, plecy prosto.
    pose: { spineLean: -6, headTilt: -12, lShoulder: -20, rShoulder: 20 },
    expression: "calm",
  },
  phone: {
    // Oba przedramiona do przodu, głowa leci w dół ekranu.
    pose: {
      spineLean: 16,
      headTilt: 30,
      lShoulder: 48,
      lElbow: 40,
      rShoulder: 52,
      rElbow: 44,
      lHip: -8,
      rHip: 8,
    },
    expression: "tired",
    prop: "phone",
  },
};

export interface SceneBeat {
  pose: PoseId;
  /** Sekundy na tym kadrze — sumę sprawdza kontrola przed publikacją. */
  seconds: number;
  /** Ruch w taktu: 0 = statyczny, 1 = pełny cykl (oddech, krok, szarpnięcie). */
  motion?: number;
}

export interface Scene {
  id: string;
  label: string;
  /** Co scenka musi zostawić w widzowie — jedno zdanie dla autora, nie dla materiału. */
  arc: string;
  /** Słowa z treści, które wołają tę scenkę. */
  match: RegExp;
  beats: SceneBeat[];
}

/**
 * Cztery scenki na start. Każda ma ten sam kształt: koszt → pęknięcie →
 * decyzja → prostuje się. Różni się tym, CO kosztuje.
 */
export const SCENES: Scene[] = [
  {
    id: "morning",
    label: "Poranek",
    arc: "Łóżko wygrywa pierwszą rundę, przegrywa drugą.",
    match: /\b(alarm|bed|morning|wake|5 ?am|4 ?30|snooze|blanket|sunrise)\b/i,
    beats: [
      { pose: "slump", seconds: 2.4 },
      { pose: "alarm", seconds: 2.2, motion: 0.6 },
      { pose: "stand", seconds: 2.0 },
      { pose: "rise", seconds: 2.4 },
    ],
  },
  {
    id: "weight",
    label: "Ciężar",
    arc: "Noszenie tego, czego nikt nie widzi, aż do wyprostowania.",
    match: /\b(carry|weight|heavy|burden|load|boulder|shoulders|haul|lift|iron)\b/i,
    beats: [
      { pose: "carry", seconds: 2.6, motion: 0.5 },
      { pose: "carry", seconds: 2.4, motion: 1 },
      { pose: "slump", seconds: 2.2 },
      { pose: "rise", seconds: 2.6 },
    ],
  },
  {
    id: "relapse",
    label: "Powrót",
    arc: "Wchodzi, spada, wstaje — i wchodzi jeszcze raz.",
    match: /\b(fall|fell|drop|quit|again|fail|relapse|collapse|break|slip)\b/i,
    beats: [
      { pose: "climb", seconds: 2.2, motion: 0.7 },
      { pose: "fall", seconds: 1.8, motion: 1 },
      { pose: "slump", seconds: 2.4 },
      { pose: "climb", seconds: 2.6, motion: 0.4 },
    ],
  },
  {
    id: "scroll",
    label: "Scroll",
    arc: "Kradzione godziny oddane z powrotem.",
    match: /\b(scroll|phone|screen|feed|notification|doom|swipe|app|social)\b/i,
    beats: [
      { pose: "phone", seconds: 2.6, motion: 0.4 },
      { pose: "phone", seconds: 2.2, motion: 1 },
      { pose: "stand", seconds: 2.0 },
      { pose: "rise", seconds: 2.4 },
    ],
  },
];

/** Treść decyduje o scenice — ta sama zasada co przy układzie kadru i tle. */
export function pickScene(text: string): Scene {
  const lower = String(text || "").toLowerCase();
  return SCENES.find((scene) => scene.match.test(lower)) ?? SCENES[0];
}

/** Czas scenki w sekundach — pilnuje, żeby nie wyszła rolka na 4 sekundy. */
export function sceneSeconds(scene: Scene): number {
  return scene.beats.reduce((sum, beat) => sum + beat.seconds, 0);
}
