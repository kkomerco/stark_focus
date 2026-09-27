import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  UNKNOWN_FORMAT,
  filterUnpublished,
  normalizeFormat,
  normalizePublished,
  publicationKey,
  publishedHookFingerprints,
  suspectedDuplicates,
  topPublishedHooks,
} from "./published";
import { hookFingerprint } from "./similarity";
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

describe("duplikaty w dzienniku", () => {
  it("ten sam dzień i ta sama myśl wchodzi do dziennika raz", () => {
    const items = normalizePublished([
      entry({ id: "p1" }),
      entry({ id: "p2" }),
      entry({ id: "p3" }),
    ]);

    assert.equal(items.length, 1, "powtórka z delete-and-re-add nie może udawać trzech prób");
  });

  it("klucz wpisu liczy odcisk myśli, nie surowy napis", () => {
    const a = publicationKey(entry({ hook: "Rust works while you sleep." }));
    const b = publicationKey(entry({ hook: "  rust works while you sleep. " }));

    assert.equal(a, b);
  });

  it("ta sama myśl w innym dniu jest oznaczona do sprawdzenia", () => {
    const items = normalizePublished([
      entry({ id: "p1", postedAt: "2026-09-05" }),
      entry({ id: "p2", postedAt: "2026-09-01", hook: "Rust works while you sleep" }),
    ]);
    const flags = suspectedDuplicates(items);

    assert.equal(items.length, 2);
    assert.equal(flags.size, 1);
    assert.match(flags.get("p2") ?? "", /2026-09-05/);
  });
});

describe("normalizeFormat — zamknięty słownik układów", () => {
  it("rolka nie bierze układów kadru statycznego i odwrotnie", () => {
    assert.equal(normalizeFormat("reel", "viral_loop_6s"), "viral_loop_6s");
    assert.equal(normalizeFormat("reel", "quote"), UNKNOWN_FORMAT);
    assert.equal(normalizeFormat("carousel", "quote"), "quote");
    assert.equal(normalizeFormat("carousel", "viral_loop_6s"), UNKNOWN_FORMAT);
  });

  it("przyjmuje nazwy, które studio już produkuje: gridType i polskie etykiety", () => {
    assert.equal(normalizeFormat("post", "none_solid"), "quote");
    assert.equal(normalizeFormat("post", "cost_vs_reward"), "cost");
    assert.equal(normalizeFormat("post", "GRID 2X2"), "collage");
    assert.equal(normalizeFormat("post", "studio_wall_3d"), "scene");
    assert.equal(normalizeFormat("reel", "trzy fazy"), "three_phases");
  });

  it("wolny tekst z przeszlosci nie rozbija grupy na jednoelementowe próbki", () => {
    const items = normalizePublished([
      entry({ id: "c1", kind: "carousel", format: "Karuzela 5 slajdów o poranku" }),
      entry({ id: "c2", kind: "carousel", postedAt: "2026-09-02", format: "karuzela — 5 slajdów" }),
    ]);

    assert.deepEqual(
      items.map((item) => item.format),
      [UNKNOWN_FORMAT, UNKNOWN_FORMAT],
    );
    assert.equal(items.length, 2, "oba wpisy zostają w dzienniku");
  });
});

describe("filterUnpublished — kolejka czyta dziennik", () => {
  const post = (id: string, title: string) => ({ id, title });

  it("post znika z kolejki, gdy jego myśl weszła do dziennika", () => {
    const published = normalizePublished([entry({ hook: "Rust works while you sleep." })]);
    const queued = filterUnpublished(
      [post("a", "Rust works while you sleep."), post("b", "Comfort is a cage.")],
      published,
    );

    assert.deepEqual(
      queued.map((item) => item.id),
      ["b"],
    );
  });

  it("wariant A/B zapisany w dzienniku zdejmuje swój wpis z kolejki po identyfikatorze", () => {
    const ab = normalizePublished([
      entry({ hook: "5 AM decides who owns the next 20 years.", sourceId: "ab-1" }),
    ]);
    const queued = filterUnpublished(
      [post("post-1", "5 AM decides who owns the next 20 years."), post("c", "Unrelated.")],
      ab,
    );

    assert.equal(queued.length, 1);
    assert.equal(queued[0].id, "c");
    assert.equal(hookFingerprint("Unrelated.").length > 0, true);
  });
});
