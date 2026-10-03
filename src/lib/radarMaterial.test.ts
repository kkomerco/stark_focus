import assert from "node:assert/strict";
import { it } from "node:test";
import { radarMaterial } from "./radarMaterial";
import type { TrendItem } from "../types";

const trend: TrendItem = {
  id: "one",
  title: "Polski tytuł autora",
  source_context: "",
  audience_pain: "",
  core_message: "",
  suggested_format: "",
  viral_hooks: [
    "Leave your phone outside the bedroom.",
    "Write one page before breakfast.",
    "Move your shoes beside the door.",
  ],
};
it("radar przekazuje jeden hook i jego rozwinięcie, zamiast sklejać alternatywne pomysły", () => {
  assert.deepEqual(radarMaterial(trend)?.phrases, [trend.viral_hooks[0]]);
  const draft = {
    hook: "Put your phone in another room.",
    supportingText: "Write one page before opening the app.",
    caption: "Your own caption.",
  };
  assert.deepEqual(radarMaterial({ ...trend, copy_draft: draft })?.phrases, [
    draft.hook,
    draft.supportingText,
  ]);
  assert.equal(radarMaterial({ ...trend, copy_draft: draft })?.caption, draft.caption);
});
it("pusty radar nie zastępuje materiału polską notatką ani nie powtarza hooka", () => {
  assert.equal(radarMaterial({ ...trend, viral_hooks: [] }), null);
  assert.deepEqual(
    radarMaterial({
      ...trend,
      copy_draft: { hook: trend.viral_hooks[0], supportingText: trend.viral_hooks[0] },
    })?.phrases,
    [trend.viral_hooks[0]],
  );
});
