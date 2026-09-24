import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatStarkCaption, isPolishCopy, starkCaption } from "./caption";

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

describe("isPolishCopy", () => {
  it("wyłapuje polską diakrytykę i rodzime słowa", () => {
    assert.equal(isPolishCopy("To jest opis dla ciebie."), true);
    assert.equal(isPolishCopy("Nie negocjuj ze swoim standardem."), true);
    assert.equal(isPolishCopy("Zawsze wykonuj w ciszy."), true);
  });

  it("nie bierze angielskiego za polski", () => {
    assert.equal(isPolishCopy("Silence cannot be misquoted."), false);
    assert.equal(isPolishCopy("You are not tired. You are uninspired."), false);
  });
});

describe("starkCaption", () => {
  it("bierze treść od modelu, ale ogon dokleja markowy", () => {
    const caption = starkCaption(
      "Comfort is expensive.",
      "Most people pay for comfort every day and never look at the bill.",
    );

    assert.ok(caption.startsWith("COMFORT IS EXPENSIVE.\n\n"));
    assert.ok(caption.includes("pay for comfort every day"));
    assert.ok(
      caption.endsWith("#stoicism #darkdiscipline #discipline #mindset #focus #starkfocus"),
    );
  });

  it("wyrzuca hashtagi i wezwanie do działania modelu, żeby feed miał jeden ogon", () => {
    const caption = starkCaption(
      "Walk alone.",
      "Spectators cheer the attempt, never the work.\n#darkmotivation #hardwork\nFollow me for more.",
    );

    assert.equal(caption.includes("darkmotivation"), false);
    assert.equal(caption.includes("Follow me"), false);
    assert.ok(caption.includes("Spectators cheer the attempt"));
  });

  it("przy polskiej lub pustej treści modelu wraca do stałego schematu marki", () => {
    assert.equal(
      starkCaption("Silence speaks.", "Nie tłumacz się. Rób swoje i milcz."),
      formatStarkCaption("Silence speaks."),
    );
    assert.equal(starkCaption("Silence speaks.", ""), formatStarkCaption("Silence speaks."));
  });
});
