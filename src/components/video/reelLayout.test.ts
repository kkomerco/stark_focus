import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DIMMED_OPACITY,
  LOOP_TAIL_SECONDS,
  easedReveal,
  quantizeToFps,
  reelBlocksAt,
  stackBlocks,
  wordRise,
  wordStagger,
} from "./reelLayout";

const PHRASES = [
  "Rust works while you sleep.",
  "Nobody is coming to fix your year.",
  "So do it scared, and do it alone.",
];

const base = { phrases: PHRASES, durationSec: 12, pacing: "climax_hold" as const };

describe("reelBlocksAt", () => {
  it("w klatce zero pokazuje pierwsze zdanie pelna biela", () => {
    const blocks = reelBlocksAt({ ...base, timeSec: 0 });

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].text, PHRASES[0]);
    assert.equal(blocks[0].opacity, 1);
    assert.equal(blocks[0].reveal, 1);
  });

  it("jedno zdanie na rolke nie gaśnie w polowie czasu", () => {
    const single = reelBlocksAt({
      phrases: ["Rust works while you sleep."],
      timeSec: 5,
      durationSec: 6,
      pacing: "uniform",
    });

    assert.deepEqual(single, [{ text: "Rust works while you sleep.", opacity: 1, reveal: 1 }]);
  });

  it("poprzednie zdania zostaja pod biezacym, tylko sciemnione", () => {
    const blocks = reelBlocksAt({ ...base, timeSec: 9 });

    assert.ok(blocks.length >= 2);
    assert.equal(blocks[blocks.length - 1].text, PHRASES[2]);
    assert.equal(blocks[0].opacity, DIMMED_OPACITY);
  });

  it("ogon pętli pokazuje dokładnie to samo co klatka zero", () => {
    const tail = reelBlocksAt({ ...base, timeSec: 12 - LOOP_TAIL_SECONDS / 2 });
    const head = reelBlocksAt({ ...base, timeSec: 0 });

    assert.deepEqual(tail, head);
  });

  it("nie zwraca pustych bloków, gdy model oddał puste zdanie", () => {
    const blocks = reelBlocksAt({
      phrases: ["", "   ", "Rust works while you sleep."],
      timeSec: 0,
      durationSec: 9,
      pacing: "uniform",
    });

    assert.ok(blocks.every((block) => block.text.trim().length > 0));
  });
});

describe("stackBlocks", () => {
  const band = { top: 250, bottom: 1440 };

  it("nie pozwala blokom wejść na siebie", () => {
    const heights = [80, 160, 80];
    const tops = stackBlocks(heights, band, 28);

    for (let index = 1; index < tops.length; index++) {
      assert.ok(tops[index] >= tops[index - 1] + heights[index - 1]);
    }
  });

  it("trima kolumne wewnatrz bezpiecznego pasa", () => {
    const tops = stackBlocks([80, 160, 80], band, 28);
    const bottom = tops[2] + 80;

    assert.ok(tops[0] >= band.top);
    assert.ok(bottom <= band.bottom);
  });

  it("gdy kolumna jest wyższa niż pas, zaczyna się od jego górnej krawędzi", () => {
    const tops = stackBlocks([900, 900], band, 28);

    assert.equal(tops[0], band.top);
  });
});

describe("animacja wejścia", () => {
  it("słowa wchodzą po kolei, nie wszystkie naraz", () => {
    const mid = wordStagger(6, 0.3);
    assert.ok(mid[0] > mid[3], "wcześniejsze słowo musi być dalej niż późniejsze");
    assert.equal(mid[5], 0, "ostatnie słowo nie mogło jeszcze wejść");
  });

  it("przy pełnym odsłonięciu całe zdanie jest na miejscu", () => {
    assert.deepEqual(wordStagger(5, 1), [1, 1, 1, 1, 1]);
    assert.deepEqual(wordStagger(5, 0), [0, 0, 0, 0, 0]);
  });

  it("żadne słowo nie ma alfa poza zakresem", () => {
    for (const reveal of [0, 0.1, 0.35, 0.7, 0.99, 1]) {
      for (const alpha of wordStagger(8, reveal)) {
        assert.ok(alpha >= 0 && alpha <= 1, `alfa ${alpha} przy reveal ${reveal}`);
      }
    }
  });

  it("wznoszenie słowa jest proporcjonalne do stopnia pisma i znika na końcu", () => {
    assert.equal(wordRise(1, 64), 0);
    assert.ok(wordRise(0, 64) > 0);
    assert.ok(wordRise(0, 64) < 64 * 0.3, "skok nie może wynosić połowy linii");
  });

  it("tło klatkuje do 12 fps, ale nie cofa czasu", () => {
    const seen = new Set<number>();
    for (let i = 0; i <= 60; i++) seen.add(quantizeToFps(i / 10, 12));
    assert.equal(quantizeToFps(0.5, 12), quantizeToFps(0.55, 12));
    assert.ok(seen.size <= 61);
    let last = -1;
    for (const value of [...seen].sort((a, b) => a - b)) {
      assert.ok(value > last);
      last = value;
    }
  });

  it("wygładzenie startuje od zera i kończy na jedynce", () => {
    assert.equal(easedReveal(0), 0);
    assert.equal(easedReveal(1), 1);
    assert.ok(easedReveal(0.5) > 0.5, "easeOut ma iść szybko na początku");
  });
});
