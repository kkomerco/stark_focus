// src/utils/backgroundPicker.ts
// Dobór ujęcia z bazy tłów na podstawie treści rolki.
//
// `pickBroll` operuje na sześciu scenach semantycznych — dość, by rozpoznać
// motyw treści, ale za mało, by każde kolejne „Wyślij do rolki" pokazywało inne
// ujęcie. Dlatego treść najpierw wybiera scenę, a scena tylko pulę kategorii;
// w jej obrębie ujęcie wybieramy po odcisku tekstu. Ta sama treść daje to samo
// tło (da się powtórzyć prompt), inna treść daje inne.
import { BrollScene } from "../data/brollLibrary";
import { BackgroundScene, EXPANDED_BACKGROUND_LIBRARY } from "../data/expandedBackgrounds";
import { hashKey } from "../lib/hash";
import { pickBroll } from "./brollPicker";

const POOL_STOIC_MARBLE = "Architektura & Rzeźba";
const POOL_NATURE = "Natura & Żywioły";
const POOL_GEOMETRY = "Geometria & Void";
const POOL_CITY = "Miasto & Monk Mode";

/** Kolejność pul ma znaczenie: pierwsza to naturalne środowisko sceny. */
const POOLS_BY_SCENE: Record<string, string[]> = {
  antyczny_marmur_posag: [POOL_STOIC_MARBLE, POOL_GEOMETRY],
  nocna_metropolia_stal: [POOL_CITY, POOL_GEOMETRY],
  brutalizm_monolit: [POOL_GEOMETRY, POOL_STOIC_MARBLE],
  deszcz_asfalt_430am: [POOL_CITY, POOL_NATURE],
  ciemna_sala_asceza: [POOL_CITY, POOL_GEOMETRY],
  mgla_horyzont_pustka: [POOL_NATURE, POOL_GEOMETRY],
};

export interface BackgroundPick {
  scene: BackgroundScene;
  /** Scena semantyczna, z której wyrosło to ujęcie — do debugowania doboru. */
  motif: BrollScene;
  reason: string;
}

function take(pool: BackgroundScene[], index: number): BackgroundScene {
  return pool[index % pool.length];
}

/**
 * `excludeIds` rotuje ujęcia w dłuższej paczce (autopilot tydzień) — inaczej
 * siedem rolek o dyscyplinie dostałoby siedem razy to samo asfaltowe ujęcie.
 */
export function pickBackground(
  text: string,
  theme?: string,
  excludeIds: readonly string[] = [],
): BackgroundPick {
  const copy = String(text || "");
  const matched = pickBroll(copy, theme);
  const excluded = new Set(excludeIds);
  const pools = POOLS_BY_SCENE[matched.scene.id] ?? [];

  const inPool = EXPANDED_BACKGROUND_LIBRARY.filter(
    (scene) => pools.includes(scene.category) && !excluded.has(scene.id),
  );
  const fallback = EXPANDED_BACKGROUND_LIBRARY.filter((scene) => !excluded.has(scene.id));
  const pool =
    inPool.length > 0 ? inPool : fallback.length > 0 ? fallback : EXPANDED_BACKGROUND_LIBRARY;

  const scene = take(pool, hashKey(copy || matched.scene.id));
  return {
    scene,
    motif: matched.scene,
    reason: `Tło „${scene.name}" dobrane do treści (${matched.confidenceReason}).`,
  };
}
