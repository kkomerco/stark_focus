import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeHook,
  hookTokens,
  hookSimilarity,
  maxSimilarity,
  openingSignature,
  repeatedOpenings,
  SIMILARITY,
} from "./similarity";

describe("similarity.ts - Hook Similarity Detector", () => {
  describe("normalizeHook", () => {
    it("converts text to lowercase and strips punctuation", () => {
      const result = normalizeHook("Your Comfort Zone, Is A Coffin with Wi-Fi!");
      assert.equal(result, "your comfort zone is a coffin with wifi");
    });

    it("collapses multiple consecutive whitespace characters", () => {
      const result = normalizeHook("  Discipline   over   motivation.  ");
      assert.equal(result, "discipline over motivation");
    });
  });

  describe("hookTokens", () => {
    it("filters out short words (< 2 characters) and common stop words", () => {
      const tokens = hookTokens("You are in the zone of comfort");
      // "you", "are", "in", "the", "of" are in STOP_WORDS
      assert.ok(tokens.has("zone"));
      assert.ok(tokens.has("comfort"));
      assert.ok(!tokens.has("you"));
      assert.ok(!tokens.has("the"));
    });
  });

  describe("hookSimilarity", () => {
    it("returns close to 1 for identical hooks", () => {
      const hook = "Your comfort zone is a coffin with Wi-Fi.";
      const score = hookSimilarity(hook, hook);
      assert.ok(score >= 0.95);
    });

    it("returns very low score for completely different hooks", () => {
      const a = "Your comfort zone is a coffin with Wi-Fi.";
      const b = "Cold shower protocols for dopamine detox.";
      const score = hookSimilarity(a, b);
      assert.ok(score < 0.25, `Expected low score but got ${score}`);
    });

    it("detects high similarity for slight variations of the same message", () => {
      const a = "Your comfort zone is a coffin with Wi-Fi.";
      const b = "Comfort zone is just a coffin with Wi-Fi.";
      const score = hookSimilarity(a, b);
      assert.ok(score >= 0.6, `Expected high similarity for variants, got ${score}`);
    });
  });

  describe("maxSimilarity & SIMILARITY thresholds", () => {
    it("identifies the closest match and max score in history", () => {
      const history = [
        "Silence is the loudest answer to doubt.",
        "Your comfort zone is a coffin with Wi-Fi.",
        "3 AM is the only honest hour you have left.",
      ];
      const candidate = "The comfort zone is a coffin with wifi";
      const match = maxSimilarity(candidate, history);
      assert.equal(match.similarTo, "Your comfort zone is a coffin with Wi-Fi.");
      assert.ok(match.score > SIMILARITY.WARN);
    });

    it("handles empty history gracefully", () => {
      const match = maxSimilarity("Any hook", []);
      assert.equal(match.similarTo, null);
      assert.equal(match.score, 0);
    });

    it("exceeds HARD_BLOCK threshold for nearly identical hooks", () => {
      const history = ["Your comfort zone is a coffin with Wi-Fi."];
      const candidate = "Your comfort zone is a coffin with Wi-Fi";
      const match = maxSimilarity(candidate, history);
      assert.ok(match.score >= SIMILARITY.HARD_BLOCK);
    });
  });

  describe("openingSignature & repeatedOpenings", () => {
    it("takes the first three words, lowercased and stripped of punctuation", () => {
      assert.equal(openingSignature("You Are — not tired."), "you are not");
    });

    it("counts a repeated opening frame, not a single sentence", () => {
      const hooks = [
        "You are not tired, you are untrained.",
        "You are not lazy, you are unprotected.",
        "Nobody checks whether you showed up.",
      ];
      assert.deepEqual(repeatedOpenings(hooks), [{ opening: "you are not", count: 2 }]);
      assert.deepEqual(repeatedOpenings([hooks[0]]), []);
    });

    it("reads only the newest tail when a limit is given", () => {
      const older = ["Nobody is coming to check.", "Nobody is coming to fix it."];
      const newest = ["The kettle is cold again at four.", "Discipline outlives the mood."];
      assert.deepEqual(repeatedOpenings([...older, ...newest], 2), [
        { opening: "nobody is coming", count: 2 },
      ]);
      assert.deepEqual(repeatedOpenings([...older, ...newest], 2, 2), []);
    });

    it("sorts the worst repetition first", () => {
      const hooks = [
        "You are not tired.",
        "You are not lazy.",
        "Nobody is coming.",
        "Nobody is coming.",
        "Nobody is coming.",
      ];
      assert.deepEqual(
        repeatedOpenings(hooks).map((entry) => entry.opening),
        ["nobody is coming", "you are not"],
      );
    });
  });
});
