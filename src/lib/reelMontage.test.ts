import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStudioMediaUrl,
  montageShotAt,
  readReelShots,
  shotIsCurrent,
  shotVideoTime,
  type ReelShot,
} from "./reelMontage";

const lines = ["Your phone gets your first hour.", "Write one page before scrolling."];
const shot: ReelShot = {
  lineIndex: 1,
  sourceLine: lines[1],
  media: { id: "a", name: "Kadr", kind: "image", url: "/brand/rook-desk-v1.png" },
  trimStart: 2,
  trimEnd: 5,
  loop: false,
  review: { identity: true },
};
const beats = [
  { start: 0, end: 3 },
  { start: 3, end: 8 },
];

describe("montaż — przypisania i klatki", () => {
  it("cięcie wybiera nowe ujęcie dokładnie na początku fazy", () => {
    assert.equal(montageShotAt([shot], lines, beats, 2.99), null);
    assert.equal(montageShotAt([shot], lines, beats, 3), shot);
    assert.equal(montageShotAt([shot], lines, beats, 7.99), shot);
  });
  it("nowy sens zdania wymaga ponownego przypisania, łamanie wiersza go nie zmienia", () => {
    assert.equal(shotIsCurrent(shot, [lines[0], "Write one page\nbefore scrolling."]), true);
    assert.equal(montageShotAt([shot], [lines[0], "Tie your shoes."], beats, 4), null);
    assert.equal(shotIsCurrent(shot, [lines[0]]), false);
  });
  it("przewija lokalny czas od przyciętego początku i zatrzymuje ostatnią klatkę", () => {
    assert.equal(shotVideoTime(shot, 0, 10), 2);
    assert.equal(shotVideoTime(shot, 1.04, 10), 3);
    assert.equal(shotVideoTime(shot, 8, 10), 5);
    assert.equal(shotVideoTime({ ...shot, loop: true }, 4, 10), 3);
    assert.ok(shotVideoTime({ ...shot, trimEnd: null }, 100, 10) < 10);
  });
  it("złe przycięcie nie przewija poza plik", () => {
    assert.equal(shotVideoTime(shot, 10, NaN), 0);
    assert.equal(shotVideoTime({ ...shot, trimStart: 100, trimEnd: 2 }, -100, 6), 6 - 1 / 120);
  });
  it("do szkicu nie przechodzi obcy adres ani ścieżka wychodząca z sejfu", () => {
    for (const url of [
      "https://example.com/a.mp4",
      "/sejf/../x.mp4",
      "//example.com/x.mp4",
      "/brand/evil.svg",
      "blob:old-session",
    ])
      assert.equal(isStudioMediaUrl(url), false);
    assert.equal(
      readReelShots([{ ...shot, media: { ...shot.media, url: "https://example.com/a.mp4" } }])
        .length,
      0,
    );
    assert.deepEqual(readReelShots([shot])[0].review, {
      identity: true,
      cuff: false,
      contact: false,
      palette: false,
    });
  });
  it("własny plik pozostaje Blobem, stary URL odtwarzacza nie jest zapisem pliku", () => {
    const blob = new Blob(["local"], { type: "image/png" });
    const saved = readReelShots([{ ...shot, media: { ...shot.media, blob, url: undefined } }]);
    assert.equal(saved[0].media.blob, blob);
    assert.equal(readReelShots([null, { ...shot, lineIndex: 9 }]).length, 0);
  });
});
