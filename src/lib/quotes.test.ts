import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attributionLine, clipFits, isVerbatim, normalizeQuote } from "./quotes";

const TRANSCRIPT = `So the thing people get wrong about discipline is that they think it's a feeling.
It isn't. Discipline is choosing between what you want now and what you want most.
You can't cheat the grind. Nobody can. The grind doesn't care about your mood.`;

describe("isVerbatim", () => {
  it("przyjmuję zdanie przepisane słowo w słowo", () => {
    assert.equal(isVerbatim("You can't cheat the grind.", TRANSCRIPT), true);
    assert.equal(isVerbatim("Nobody can.", TRANSCRIPT), true);
  });

  it("odrzuca cytat przeredagowany, nawet o jedno słowo", () => {
    assert.equal(isVerbatim("You cannot cheat the grind.", TRANSCRIPT), false);
    assert.equal(isVerbatim("You can cheat the grind.", TRANSCRIPT), false);
    assert.equal(isVerbatim("Discipline is a feeling.", TRANSCRIPT), false);
  });

  it("ignoruje cudzysłowy, myślniki i wielkość liter", () => {
    assert.equal(isVerbatim("“NOBODY CAN”", TRANSCRIPT), true);
    assert.equal(isVerbatim("the grind doesn't care about your mood", TRANSCRIPT), true);
  });

  it("zezwala na skrócenie środka, ale nie na zmianę słów", () => {
    assert.equal(isVerbatim("Discipline is choosing ... what you want most.", TRANSCRIPT), true);
    assert.equal(
      isVerbatim("Discipline is choosing ... what you deserve most.", TRANSCRIPT),
      false,
    );
  });

  it("pusty transkrypt nie daje żadnego cytatu", () => {
    assert.equal(isVerbatim("Nobody can.", ""), false);
  });
});

describe("clipFits", () => {
  it("cytat na kadr ma od trzech do czternastu słów", () => {
    assert.equal(clipFits("Nobody can."), false);
    assert.equal(clipFits("Discipline is choosing between want now and want most."), true);
    assert.equal(clipFits(Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ")), false);
  });
});

describe("attributionLine", () => {
  it("bez mówcy nie ma podpisu, bo cytat bez źródła to kradzież", () => {
    assert.equal(attributionLine("", "Jocko Podcast"), "");
    assert.equal(attributionLine("Jocko Willink"), "Jocko Willink");
    assert.equal(attributionLine("Jocko Willink", "Jocko Podcast"), "Jocko Willink, Jocko Podcast");
  });
});

describe("normalizeQuote", () => {
  it("spłaszcza znaki, które nie zmieniają sensu", () => {
    assert.equal(normalizeQuote("  The — grind…  DOESN'T care! "), "the grind doesnt care");
  });
});
