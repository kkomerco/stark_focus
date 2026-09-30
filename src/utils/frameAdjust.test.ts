import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyTweak,
  clampTweakToBand,
  isIdentity,
  normalizeTweak,
  tweakBox,
  TWEAK_LIMITS,
} from "./frameAdjust";

/**
 * Korekta myszą to jedyna rzecz w rendererze, którą człowiek wprowadza palcem,
 * więc jej granice muszą być liczone w kodzie, nie w zaufaniu do UI: suwak
 * może przyjść ze starej kopii danych, a przesunięcie z pliku JSON.
 */

const W = 1080;
const H = 1920;
const BOX = { left: 130, top: 700, right: 950, bottom: 1200 };
const BAND = { top: 154, bottom: 1766, side: 86 };
const ID = { x: 0, y: 0, scale: 1 };

describe("normalizeTweak", () => {
  it("zabiera liczby spoza skali i sprzed granicy przesuwu", () => {
    assert.deepEqual(normalizeTweak({ x: 9999, y: -9999, scale: 4 }), {
      x: TWEAK_LIMITS.offset,
      y: -TWEAK_LIMITS.offset,
      scale: TWEAK_LIMITS.scaleMax,
    });
  });

  it("string, null i NaN z kopii danych nie wchodzą w render", () => {
    assert.deepEqual(normalizeTweak({ x: "60", y: null, scale: Number.NaN }), ID);
    assert.deepEqual(normalizeTweak(undefined), ID);
    // Zero skali nie może zostać zerem: kadr zniknąłby z eksportu.
    assert.equal(normalizeTweak({ x: 0, y: 0, scale: 0 }).scale, 1);
    assert.equal(normalizeTweak({ x: 0, y: 0, scale: -3 }).scale, 1);
  });
});

describe("tweakBox", () => {
  it("przesuw zapisany w kadrze 1080 daje ten sam procent na większym renderze", () => {
    const moved = tweakBox(BOX, { ...ID, x: 100, y: 50 }, W, H);
    assert.equal(moved.left, BOX.left + 100);
    assert.equal(moved.bottom, BOX.bottom + 50);

    // Kadr 2×: pole treści też jest dwa razy większe, a przesuw ma dać ten sam
    // ułamek szerokości — stąd 200 px, nie 100.
    const doubled = { left: 260, top: 1400, right: 1900, bottom: 2400 };
    const big = tweakBox(doubled, { ...ID, x: 100, y: 50 }, W * 2, H * 2);
    assert.equal(big.left, doubled.left + 200);
    assert.equal(big.bottom, doubled.bottom + 100);
  });

  it("skala liczona jest od środka kadru, nie od lewego górnego rogu", () => {
    const grown = tweakBox(BOX, { ...ID, scale: 1.2 }, W, H);
    assert.ok(grown.left < BOX.left && grown.right > BOX.right);
    assert.ok(Math.abs((grown.left + grown.right) / 2 - (BOX.left + BOX.right) / 2) < 0.01);
  });

  it("korekta zerowa nie rusza pola", () => {
    assert.deepEqual(tweakBox(BOX, ID, W, H), BOX);
  });
});

describe("clampTweakToBand", () => {
  it("zostawia korektę, która mieści się w pasie", () => {
    assert.deepEqual(clampTweakToBand({ ...ID, x: 40, y: -30, scale: 1 }, BOX, BAND, W, H), {
      x: 40,
      y: -30,
      scale: 1,
    });
  });

  it("staje na granicy pasa, gdy blok ma wejść pod interfejs platformy", () => {
    const clamped = clampTweakToBand({ ...ID, x: -600, y: 0, scale: 1 }, BOX, BAND, W, H);
    const moved = tweakBox(BOX, clamped, W, H);
    assert.ok(moved.left >= BAND.side - 1, `lewa krawędź wyszła z pasa: ${moved.left}`);
    assert.ok(clamped.x < 0, "korekta miała zostać, tylko skrócona");

    const down = clampTweakToBand({ ...ID, x: 0, y: 900, scale: 1 }, BOX, BAND, W, H);
    assert.ok(tweakBox(BOX, down, W, H).bottom <= BAND.bottom + 1);
    assert.ok(down.y > 0);
  });

  it("cofa skalę, kiedy powiększony blok przestaje się mieścić", () => {
    const clamped = clampTweakToBand({ ...ID, x: 0, y: 0, scale: 1.25 }, BOX, BAND, W, H);
    assert.ok(clamped.scale <= 1.25 && clamped.scale >= TWEAK_LIMITS.scaleMin);
    const moved = tweakBox(BOX, clamped, W, H);
    assert.ok(moved.top >= BAND.top - 1 && moved.bottom <= BAND.bottom + 1);
  });
});

describe("applyTweak", () => {
  it("przy korekcie zerowej nie dotyka kontekstu", () => {
    let calls = 0;
    const ctx = {
      translate: () => {
        calls++;
      },
      scale: () => {
        calls++;
      },
    } as unknown as CanvasRenderingContext2D;
    applyTweak(ctx, ID, W, H);
    assert.equal(calls, 0);
  });

  it("przesuw i skala idą razem, skala wokół środka", () => {
    const ops: string[] = [];
    const ctx = {
      translate: (x: number, y: number) => ops.push(`t ${Math.round(x)} ${Math.round(y)}`),
      scale: (x: number) => ops.push(`s ${x}`),
    } as unknown as CanvasRenderingContext2D;
    applyTweak(ctx, { x: 100, y: 0, scale: 1.1 }, W, H);
    assert.deepEqual(ops, ["t 100 0", "t 540 960", "s 1.1", "t -540 -960"]);
  });
});
