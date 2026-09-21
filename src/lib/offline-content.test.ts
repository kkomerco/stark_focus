import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getOfflineStarkVariants,
  getOfflineAbVariants,
  buildOfflineIdeaStream,
  DARK_MOTIVATION_CATEGORIES,
} from "./ai/offline-content";

describe("offline-content.ts - Stark Focus Offline Content Generator", () => {
  describe("getOfflineStarkVariants", () => {
    it("returns the requested number of variants with complete fields", () => {
      const variants = getOfflineStarkVariants(Date.now(), 3);
      assert.equal(variants.length, 3);

      for (const variant of variants) {
        assert.ok(variant.hook.length > 5, "Hook must be non-empty");
        assert.ok(variant.angle.length > 3, "Angle must be defined");
        assert.ok(variant.phrases.length >= 2, "Phrases must contain at least 2 lines");
        assert.ok(variant.cta, "CTA must be present");
      }
    });

    it("respects the custom timestamp seed", () => {
      const v1 = getOfflineStarkVariants(1000, 2);
      const v2 = getOfflineStarkVariants(2000, 2);
      assert.notEqual(v1[0].id, v2[0].id);
    });
  });

  describe("getOfflineAbVariants", () => {
    it("returns distinct A/B test variations", () => {
      const variants = getOfflineAbVariants(100);
      assert.equal(variants.length, 2);

      const [a, b] = variants;
      assert.equal(a.label, "A");
      assert.equal(b.label, "B");
      assert.notEqual(a.hook, b.hook);
      assert.ok(a.angle !== b.angle || a.theme !== b.theme);
    });
  });

  describe("buildOfflineIdeaStream", () => {
    it("generates structured ideas across dark motivation categories", () => {
      const ideas = buildOfflineIdeaStream(4, 0, []);
      assert.equal(ideas.length, 4);

      for (const idea of ideas) {
        assert.ok(idea.id.startsWith("offline-idea-"));
        assert.ok(idea.hook.length > 5);
        assert.ok(DARK_MOTIVATION_CATEGORIES.includes(idea.category as any));
        assert.ok(idea.caption.includes("Save this reminder"));
        assert.ok(idea.hashtags.length >= 2);
      }
    });

    it("filters out excluded hooks to prevent repetitive suggestions", () => {
      const initial = buildOfflineIdeaStream(3, 0, []);
      const excludedHook = initial[0].hook;

      const filtered = buildOfflineIdeaStream(3, 0, [excludedHook]);
      const hasExcluded = filtered.some((item) => item.hook === excludedHook);
      assert.equal(hasExcluded, false, "Should not return excluded hook");
    });
  });
});
