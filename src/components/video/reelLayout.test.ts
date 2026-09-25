import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DIMMED_OPACITY, LOOP_TAIL_SECONDS, reelBlocksAt, stackBlocks } from "./reelLayout";

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
