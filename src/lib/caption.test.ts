import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STARK_CTAS,
  formatStarkCaption,
  isPolishCopy,
  starkCaption,
  starkCta,
  starkHashtags,
} from "./caption";

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

  it("bez własnych linii nie wkleja banku zasad pod kazdy post", () => {
    const caption = formatStarkCaption("The stairwell does not ask how you feel.");

    assert.equal(caption.includes("Comfort is paid for in regret"), false);
    assert.equal(caption.includes("The standard you hold alone"), false);
    assert.equal(caption.includes("1."), false);
    // Zostaje to, co naprawde jest w materiale: teza, wezwanie, hashtagi.
    assert.ok(caption.startsWith("THE STAIRWELL DOES NOT ASK HOW YOU FEEL."));
    assert.ok(caption.includes("#starkfocus"));
  });

  it("opis bierze punkty z kadrow materialu, w ich kolejnosci", () => {
    const caption = formatStarkCaption("You lack a sequence.", [
      "Phone in another room.",
      "Hardest task first.",
    ]);

    assert.ok(caption.includes("1. Phone in another room."));
    assert.ok(caption.includes("2. Hardest task first."));
  });

  it("always appends the signature call to action and a short hashtag tail", () => {
    const caption = formatStarkCaption("Execution", ["A", "B", "C"]);

    assert.ok(STARK_CTAS.some((cta) => caption.includes(cta)));
    const tags = caption.trim().split("\n").pop()!.split(" ");
    assert.ok(tags.length <= 5, `Meta ucina powyzszej piatki: ${tags.join(" ")}`);
    assert.ok(tags.includes("#starkfocus"));
  });
});

describe("starkHashtags", () => {
  it("zbiera tagi z tematu posta, a nie ze stalej listy", () => {
    const silence = starkHashtags("Silence cannot be misquoted.");
    const time = starkHashtags("Maybe forty more summers. That is the whole budget.");

    assert.ok(silence.includes("#silence") || silence.includes("#quietconfidence"));
    assert.ok(time.includes("#mementomori") || time.includes("#perspective"));
    assert.notDeepEqual(silence, time);
  });

  it("trzymany w ryzach: piec to sufit, markowy jest zawsze", () => {
    const tags = starkHashtags(
      "discipline silence stoic alone time pain focus motivation standards",
    );
    assert.ok(tags.length <= 5);
    assert.ok(tags.includes("#starkfocus"));
  });

  it("ten sam tekst daje ten sam zestaw, wiec opis nie zmienia sie przy odswiezeniu", () => {
    const text = "You rehearse the excuses, not the work.";
    assert.deepEqual(starkHashtags(text), starkHashtags(text));
  });

  it("bez trafienia w temat idzie w pewniakow marki", () => {
    assert.deepEqual(starkHashtags("xyz abc"), ["#stoicism", "#discipline", "#starkfocus"]);
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
    const tail = caption.trim().split("\n").pop()!.split(" ");
    assert.ok(tail.length <= 5 && tail.includes("#starkfocus"));
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

describe("starkCta", () => {
  it("rotuje wezwanie po tresci posta, ale deterministycznie", () => {
    const a = "Rust works while you sleep.";
    const b = "Maybe forty more summers. That is the whole budget.";
    assert.equal(starkCta(a), starkCta(a));
    assert.ok(STARK_CTAS.includes(starkCta(a)));
    assert.ok(STARK_CTAS.includes(starkCta(b)));
    assert.notEqual(starkCta(a), starkCta(b), "dwa rozne posty nie moga miec identycznej stopki");
  });
});
