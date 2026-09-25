import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_SAMPLE,
  ledgerVerdict,
  median,
  normalizePublished,
  publishedHookFingerprints,
  statsByFormat,
  topPublishedHooks,
} from "./published";
import type { PublishedItem } from "../types";

function entry(overrides: Partial<PublishedItem> = {}): PublishedItem {
  return {
    id: overrides.id ?? "p1",
    postedAt: "2026-09-20",
    platform: "instagram",
    kind: "reel",
    hook: "Rust works while you sleep.",
    format: "viral_loop_6s",
    loggedAt: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizePublished", () => {
  it("odrzuca wpisy bez hooka i bez daty publikacji", () => {
    const items = normalizePublished([
      entry(),
      { ...entry(), hook: "  " },
      { ...entry(), postedAt: "wczoraj" },
      null,
      "bzdura",
    ]);

    assert.equal(items.length, 1);
  });

  it("klampuje procenty i nie zmyśla metryk z byle czego", () => {
    const [item] = normalizePublished([
      entry({ metrics: { reach: 1200, hold3s: 140, watchPct: 55, shares: -3 } as never }),
    ]);

    assert.equal(item.metrics?.hold3s, 100);
    assert.equal(item.metrics?.watchPct, 55);
    assert.equal(item.metrics?.shares, undefined);
  });

  it("sortuje od najnowszej publikacji", () => {
    const items = normalizePublished([
      entry({ postedAt: "2026-09-01" }),
      entry({ postedAt: "2026-09-15" }),
    ]);

    assert.equal(items[0].postedAt, "2026-09-15");
  });
});

describe("median", () => {
  it("liczy środek, nie średnią — jeden wiral nie przekłamuje formatu", () => {
    assert.equal(median([100, 120, 30000]), 120);
    assert.equal(median([]), null);
  });
});

describe("statsByFormat", () => {
  it("oznacza grupę jako za małą do wniosku", () => {
    const stats = statsByFormat([entry(), entry({ id: "p2", postedAt: "2026-09-19" })]);

    assert.equal(stats.length, 1);
    assert.equal(stats[0].count, 2);
    assert.equal(stats[0].enough, false);
  });

  it("liczy wysyłki na tysiąc odbiorców, nie gołe lajki", () => {
    const stats = statsByFormat(
      Array.from({ length: MIN_SAMPLE }, (_, i) =>
        entry({ id: `p${i}`, metrics: { reach: 2000, shares: 40 } }),
      ),
    );

    assert.equal(stats[0].medianSharesPerK, 20);
  });
});

describe("ledgerVerdict", () => {
  it("mówi wprost, że nie ma z czego wnioskować", () => {
    const verdict = ledgerVerdict([entry(), entry({ id: "p2" })]);

    assert.equal(verdict.conclusive, false);
    assert.match(verdict.headline, /Za mało danych/);
  });

  it("przy dość licznym próbkowaniu wskazuje format z największą liczbą wysyłek", () => {
    const items = [
      ...Array.from({ length: MIN_SAMPLE }, (_, i) =>
        entry({
          id: `a${i}`,
          format: "viral_loop_6s",
          metrics: { reach: 5000, shares: 10, hold3s: 70 },
        }),
      ),
      ...Array.from({ length: MIN_SAMPLE }, (_, i) =>
        entry({
          id: `b${i}`,
          format: "three_phases",
          metrics: { reach: 5000, shares: 90, hold3s: 44 },
        }),
      ),
    ];
    const verdict = ledgerVerdict(items);

    assert.equal(verdict.conclusive, true);
    assert.match(verdict.headline, /three_phases/);
    assert.match(verdict.detail, /przytrzymanie/);
  });
});

describe("topPublishedHooks", () => {
  it("bierze tylko zdania z mierzalnym zasiegiem", () => {
    assert.deepEqual(
      topPublishedHooks([entry({ metrics: { reach: 120, shares: 40 } })]),
      [],
      "120 odbiorcow to za malo, mowic o 'najlepiej zarabiajacym'",
    );
  });

  it("stawia na wysylki, nie na lajki", () => {
    const likes = entry({
      id: "l",
      hook: "You rehearse the excuses, not the work.",
      metrics: { reach: 5000, likes: 900, shares: 2 },
    });
    const sends = entry({
      id: "s",
      hook: "Rust works while you sleep.",
      metrics: { reach: 5000, likes: 40, shares: 120 },
    });

    assert.deepEqual(topPublishedHooks([likes, sends]), [sends.hook, likes.hook]);
  });
});

describe("publishedHookFingerprints", () => {
  it("zwraca odciski tych samych co `hookFingerprint`, więc silniki się nie miną", () => {
    const [fp] = publishedHookFingerprints([entry()]);
    assert.ok(fp.length >= 8);
  });
});
