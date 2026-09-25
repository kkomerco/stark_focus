import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usedHookFingerprints } from "./usedContent";

const data = {
  posts: [
    { title: "Silence cannot be misquoted.", caption: "Silence cannot be misquoted.\n\nopis..." },
    { title: "Comfort is slow poison.", caption: "" },
  ],
  published: [{ hook: "Disappear for six months." }],
  used_idea_fingerprints: [
    "keep score in private",
    "walk like a king",
    "silence cannot be misquoted",
  ],
};

describe("usedContent - cicha anty-powtórka", () => {
  it("zbiera treść z postów, dziennika i generatora w jedną listę", () => {
    const used = usedHookFingerprints(data);
    assert.ok(used.includes("silence cannot be misquoted"));
    assert.ok(used.includes("comfort is slow poison"));
    assert.ok(used.includes("disappear for six months"));
    assert.ok(used.includes("keep score in private"));
    assert.ok(used.includes("walk like a king"));
  });

  it("nie dubluje tego samego zdania z dwóch źródeł", () => {
    const used = usedHookFingerprints(data);
    assert.equal(used.filter((fp) => fp === "silence cannot be misquoted").length, 1);
  });

  it("olewa etykiety krótsze niż treść materiału", () => {
    const noisy = {
      posts: [{ title: "Post", caption: "" }],
      used_idea_fingerprints: ["protokół", "Ruthless standards in the quiet hours."],
    };
    const used = usedHookFingerprints(noisy);

    assert.ok(used.includes("ruthless standards in the quiet hours"));
    assert.equal(used.filter((fp) => fp.startsWith("protok")).length, 0);
    assert.equal(used.filter((fp) => fp === "post").length, 0);
  });

  it("zmieści się w limicie, zatrzymując to, co najnowsze", () => {
    const used = usedHookFingerprints(data, 2);
    assert.deepEqual(used, ["walk like a king", "disappear for six months"]);
  });

  it("pusty stan nie wyrzuca wyjątku", () => {
    assert.deepEqual(usedHookFingerprints(null), []);
  });
});
