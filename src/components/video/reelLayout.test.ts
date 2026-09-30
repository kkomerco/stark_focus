import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CAMERA_PUSH_IN,
  DIMMED_OPACITY,
  LOOP_TAIL_SECONDS,
  OUTRO_SECONDS,
  backgroundFrameTime,
  cameraScaleAt,
  easedReveal,
  maskRevealFraction,
  outroBracketProgress,
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

describe("oddech kamery", () => {
  it("skala startuje od 1,00 i kończy na ~1,04", () => {
    assert.equal(cameraScaleAt(0, 12), 1);
    assert.ok(
      Math.abs(cameraScaleAt(12, 12) - (1 + CAMERA_PUSH_IN)) < 1e-9,
      "na koncu klipu kamera ma byc najblizej kadru",
    );
  });

  it("najazd jest monotoniczny i nie wyjezdza poza 1,04", () => {
    let last = 1;
    for (let i = 0; i <= 120; i++) {
      const scale = cameraScaleAt((i / 120) * 9, 9);
      assert.ok(scale >= last, `skala cofnela sie przy kroku ${i}`);
      assert.ok(scale <= 1 + CAMERA_PUSH_IN + 1e-9, "skala wyjechala poza najazd");
      last = scale;
    }
  });

  it("bez czasu trwania albo czasu kamera stoi w miejscu", () => {
    assert.equal(cameraScaleAt(3, 0), 1);
    assert.equal(cameraScaleAt(Number.NaN, 9), 1);
    assert.equal(cameraScaleAt(-1, 9), 1);
  });
});

describe("maska wiersza", () => {
  it("ulamek maski rosnie monotonicznie z odslonieciem", () => {
    for (let line = 0; line < 3; line++) {
      let last = 0;
      for (let i = 0; i <= 100; i++) {
        const reveal = i / 100;
        const fraction = maskRevealFraction(reveal, line, 3);
        assert.ok(fraction >= last, `wiersz ${line} cofnal sie przy reveal ${reveal}`);
        assert.ok(fraction >= 0 && fraction <= 1, `ulamek ${fraction} poza zakresem`);
        last = fraction;
      }
    }
  });

  it("pierwszy wiersz odslania sie przed ostatnim", () => {
    const mid = 0.2;
    assert.ok(
      maskRevealFraction(mid, 0, 3) > maskRevealFraction(mid, 2, 3),
      "fala ma isc od gory akapitu",
    );
    assert.equal(maskRevealFraction(mid, 2, 3), 0, "ostatni wiersz jeszcze czeka pod maska");
  });

  it("przy pelnym odslonieciu kazdy wiersz jest w calosci, przy zerowym zakryty", () => {
    for (let line = 0; line < 4; line++) {
      assert.equal(maskRevealFraction(1, line, 4), 1);
      assert.equal(maskRevealFraction(0, line, 4), 0);
    }
  });
});

describe("outro ze znakiem marki", () => {
  it("klamry nie rysuja sie przed oknem koncowki", () => {
    assert.equal(outroBracketProgress(0, 12), 0);
    assert.equal(outroBracketProgress(12 - OUTRO_SECONDS, 12), 0);
    assert.equal(outroBracketProgress(12 - OUTRO_SECONDS - 0.4, 12), 0);
  });

  it("na koncu klipu kreska jest domknieta", () => {
    assert.equal(outroBracketProgress(12, 12), 1);
    assert.ok(
      outroBracketProgress(12 - 0.05, 12) > 0.9,
      "ostatnia klatka nie moze pokazywac polowy znaku",
    );
  });

  it("postep rosnie monotonicznie w oknie outro", () => {
    let last = 0;
    for (let i = 0; i <= 100; i++) {
      const time = 9 - OUTRO_SECONDS + (i / 100) * OUTRO_SECONDS;
      const progress = outroBracketProgress(time, 9);
      assert.ok(progress >= last, `kreska cofnela sie przy ${time} s`);
      last = progress;
    }
  });

  it("klip krotszy niz okno outro rysuje znak od klatki zero", () => {
    assert.ok(outroBracketProgress(0.4, 0.8) > 0, "okno nie moze byc dluzsze niz klip");
    assert.equal(outroBracketProgress(0.8, 0.8), 1);
  });
});

describe("tło wideo liczone pod eksport", () => {
  it("zostaje na tym samym skoku 12 fps co klatkaż tła", () => {
    assert.equal(backgroundFrameTime(0, 14), 0);
    assert.equal(backgroundFrameTime(1 / 30, 14), 0);
    assert.equal(backgroundFrameTime(0.25, 14), 0.25);
    assert.equal(backgroundFrameTime(0.3, 14), 0.25);
  });

  it("klip krótszy niż rolka wraca na początek zamiast wypaść poza materiał", () => {
    assert.equal(backgroundFrameTime(4, 4), 0);
    assert.equal(backgroundFrameTime(5.5, 4), 1.5);
  });

  it("bez znanego czasu klipu nie zgaduje — zostaje sam skwantowany czas", () => {
    assert.equal(backgroundFrameTime(3.7, 0), 44 / 12);
    assert.equal(backgroundFrameTime(2, Number.NaN), 2);
  });
});
