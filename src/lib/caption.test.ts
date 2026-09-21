import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatStarkCaption } from "./caption";

describe("caption.ts - Stark Focus Caption Formatter", () => {
  it("formats hook in uppercase and removes quotes and markdown", () => {
    const hook = '"Your comfort zone is a coffin with Wi-Fi"';
    const principles: [string, string, string] = [
      "Cut the digital noise.",
      "Work in deep isolation.",
      "Do not negotiate with fatigue.",
    ];
    const caption = formatStarkCaption(hook, principles);

    assert.ok(
      caption.startsWith("YOUR COMFORT ZONE IS A COFFIN WITH WI-FI\n\n"),
      "Should start with cleaned uppercase hook",
    );
  });

  it("includes all 3 numbered principles sequentially", () => {
    const principles: [string, string, string] = [
      "Rule One: Never negotiate.",
      "Rule Two: Silence is loud.",
      "Rule Three: Results only.",
    ];
    const caption = formatStarkCaption("Discipline test", principles);

    assert.ok(caption.includes("1. Rule One: Never negotiate."));
    assert.ok(caption.includes("2. Rule Two: Silence is loud."));
    assert.ok(caption.includes("3. Rule Three: Results only."));
  });

  it("uses the custom directive when provided", () => {
    const customDirective = "Stop making promises to people who do not care.";
    const caption = formatStarkCaption(
      "Direct action",
      ["Step A", "Step B", "Step C"],
      customDirective,
    );

    assert.ok(caption.includes(customDirective));
  });

  it("always appends the signature call to action and Stark hashtags", () => {
    const caption = formatStarkCaption("Execution", ["A", "B", "C"]);

    assert.ok(caption.includes("Save this reminder. Execute in silence. Follow @stark_focus."));
    assert.ok(
      caption.includes("#stoicism #darkdiscipline #discipline #mindset #focus #starkfocus"),
    );
  });
});
