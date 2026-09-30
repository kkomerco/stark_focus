import type { FrameAdjust, FrameTweak } from "../types";
import type { InkBox } from "./brandMark";

/**
 * Mikrokorekta kadru: domyślny układ zostaje tym, co narysowały drabinka pisma
 * i bezpieczny pas, a człowiek dokłada do niego lekki przesuw i lekką skalę.
 *
 * Wartości są zapisane w pikselach przy kadrze 1080 px i przeliczane na
 * rzeczywisty rozmiar, więc ten sam spec wygląda identycznie na podglądzie w
 * studiu i na eksporcie 1080×1920 — a to jest jedyna różnica między „poprawiłem
 * kadr" a „poprawiłem podgląd".
 */

/** Granica korekty. Poza nią kadr nie jest skorygowany, tylko zepsuty. */
export const TWEAK_LIMITS = {
  /** ±16% szerokości kadru. */
  offset: 172,
  scaleMin: 0.8,
  scaleMax: 1.25,
} as const;

const round = (value: number): number => Math.round(value * 100) / 100;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, value));
}

/** Liczba ujemna, zero albo string z kopii danych nie mogą wejść w render. */
function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizeTweak(tweak: unknown): FrameTweak {
  if (!tweak || typeof tweak !== "object") return { x: 0, y: 0, scale: 1 };
  const raw = tweak as Record<string, unknown>;
  const limit = TWEAK_LIMITS.offset;
  // Zero, liczba ujemna i NaN z pliku kopii to nie jest „mniejszy kadr" —
  // to dziura w renderze. Skala wraca do jedynki, przesuw do zera.
  const scale =
    typeof raw.scale === "number" && Number.isFinite(raw.scale) && raw.scale > 0 ? raw.scale : 1;
  return {
    x: Math.round(clamp(number(raw.x), -limit, limit)),
    y: Math.round(clamp(number(raw.y), -limit, limit)),
    scale: round(clamp(scale, TWEAK_LIMITS.scaleMin, TWEAK_LIMITS.scaleMax)),
  };
}

/** Normalizacja całego zestawu korekt; puste role wracają jako null, nie jako zero. */
export function normalizeAdjust(adjust: unknown): FrameAdjust | null {
  if (!adjust || typeof adjust !== "object") return null;
  const raw = adjust as Record<string, unknown>;
  const out: FrameAdjust = {};
  for (const role of ["content", "mark"] as const) {
    if (!raw[role]) continue;
    const tweak = normalizeTweak(raw[role]);
    if (tweak.x !== 0 || tweak.y !== 0 || tweak.scale !== 1) out[role] = tweak;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function tweakOf(
  adjust: FrameAdjust | null | undefined,
  role: "content" | "mark",
): FrameTweak {
  return normalizeTweak(adjust?.[role]);
}

export function isIdentity(tweak: FrameTweak): boolean {
  return tweak.x === 0 && tweak.y === 0 && tweak.scale === 1;
}

/**
 * Przesunięcie i skala względem środka kadru — to jedyny punkt odniesienia,
 * który ma sens przy obu proporcjach: kwadratowy kadr i 9:16 nie mogą liczyć
 * skali od lewego górnego rogu, bo ten sam suwak dawałby inny efekt.
 */
export function applyTweak(
  ctx: CanvasRenderingContext2D,
  tweak: FrameTweak,
  width: number,
  height: number,
): void {
  if (isIdentity(tweak)) return;
  ctx.translate(tweak.x * (width / 1080), tweak.y * (height / 1920));
  if (tweak.scale !== 1) {
    ctx.translate(width / 2, height / 2);
    ctx.scale(tweak.scale, tweak.scale);
    ctx.translate(-width / 2, -height / 2);
  }
}

/**
 * Pole klamer po korekcie. Klamry liczone są od pola treści, więc muszą iść
 * tym samym przesuwem i tą samą skalą — inaczej znak marki zostałby tam, gdzie
 * stał przed poprawką, i odjechał od zdania, które obejmuje.
 */
export function tweakBox(box: InkBox, tweak: FrameTweak, width: number, height: number): InkBox {
  if (isIdentity(tweak)) return box;
  const dx = tweak.x * (width / 1080);
  const dy = tweak.y * (height / 1920);
  const cx = width / 2;
  const cy = height / 2;
  const scale = (value: number, center: number): number => center + (value - center) * tweak.scale;
  return {
    left: scale(box.left + dx, cx),
    right: scale(box.right + dx, cx),
    top: scale(box.top + dy, cy),
    bottom: scale(box.bottom + dy, cy),
  };
}

/**
 * Przesuw klawiaturą. Mysz jest dobra do grubszej poprawki, ale człowiek, który
 * chce odsunąć puentę o jeden piksel, nie zrobi tego ciągnięciem — więc strzałka
 * to 1 px przy kadrze 1080, a Shift to 10 px.
 */
export const NUDGE_STEPS = { key: 1, shift: 10 } as const;

/** Kierunek ze strzałki; null oznacza, że klawiatura nie ma tu nic do rzeczy. */
export function nudgeStep(key: string, shiftKey: boolean): { x: number; y: number } | null {
  const step = shiftKey ? NUDGE_STEPS.shift : NUDGE_STEPS.key;
  if (key === "ArrowLeft") return { x: -step, y: 0 };
  if (key === "ArrowRight") return { x: step, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -step };
  if (key === "ArrowDown") return { x: 0, y: step };
  return null;
}

/**
 * Krok klawiaturą z tym samym hamulcem co ciągnięcie myszą — inaczej dwadzieścia
 * naciśnięć strzałki wywlokłoby tekst pod pasek lajków, choć pojedynczy gest
 * nigdy by na to nie pozwolił.
 */
export function nudgeTweak(
  tweak: FrameTweak,
  step: { x: number; y: number },
  box: InkBox,
  band: { top: number; bottom: number; side: number },
  width: number,
  height: number,
): FrameTweak {
  return clampTweakToBand(
    normalizeTweak({ x: tweak.x + step.x, y: tweak.y + step.y, scale: tweak.scale }),
    box,
    band,
    width,
    height,
  );
}

/**
 * Ile wolno przesunąć i przeskalować blok, żeby NIE wyszedł z bezpiecznego
 * pasa. Bez tego hamulca pierwsza lepsza puenta wjechałaby pod pasek lajków,
 * a to jest dokładnie ta wada, na którą właściciel konta zwracał uwagę.
 *
 * `box` to pole treści PRZED korektą, w pikselach renderowanego kadru.
 */
export function clampTweakToBand(
  tweak: FrameTweak,
  box: InkBox,
  band: { top: number; bottom: number; side: number },
  width: number,
  height: number,
): FrameTweak {
  const base = normalizeTweak(tweak);
  const fits = (candidate: FrameTweak): boolean => {
    const moved = tweakBox(box, candidate, width, height);
    return (
      moved.left >= band.side - 1 &&
      moved.right <= width - band.side + 1 &&
      moved.top >= band.top - 1 &&
      moved.bottom <= band.bottom + 1
    );
  };
  if (fits(base)) return base;

  // Cofamy o 1 px na osi, aż blok wróci do pasa. Większy krok przeskakiwałby
  // przez granicę i przy korekcie klawiaturą cofałby uchwyt o cztery piksele
  // wstecz zamiast go zatrzymać.
  let { x, y } = base;
  while (x !== 0 && !fits({ x, y, scale: base.scale })) x -= Math.sign(x);
  while (y !== 0 && !fits({ x, y, scale: base.scale })) y -= Math.sign(y);
  let scale = base.scale;
  // Skala powyżej jedynki powiększa blok od środka, więc to ona wyczerpuje
  // pas ostatnia; poniżej jedynki zmniejsza i hamulca nie potrzebuje.
  while (scale > 1 && !fits({ x, y, scale })) scale = Math.max(1, round(scale - 0.01));
  return { x, y, scale };
}
