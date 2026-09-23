import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usedHookFingerprints } from "./usedContent";

const data = {
  posts: [
    { title: "Silence cannot be misquoted.", caption: "Silence cannot be misquoted.\n\nopis..." },
    { title: "Comfort is slow poison.", caption: "" },
  ],
  planner_tasks: [
    { payload: { reel: { hook: "Disappear for six months." } } },
    { payload: { post: { text: "Keep score in private." } } },
    { title: "rutyna poranna" },
  ],
  used_idea_fingerprints: ["walk like a king", "silence cannot be misquoted"],
};

describe("usedContent - cicha anty-powtórka", () => {
  it("zbiera treść z postów, planera i generatora w jedną listę", () => {
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

  it("olewa etykiety zadań, które nie są treścią materiału", () => {
    assert.ok(!usedHookFingerprints(data).some((fp) => fp.startsWith("rutyna")));
  });

  it("zmieści się w limicie, zatrzymując to, co najnowsze", () => {
    const used = usedHookFingerprints(data, 2);
    assert.deepEqual(used, ["keep score in private", "walk like a king"]);
  });

  it("pusty stan nie wyrzuca wyjątku", () => {
    assert.deepEqual(usedHookFingerprints(null), []);
  });
});
