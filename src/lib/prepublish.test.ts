import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checklistProblems, postChecklist, reelChecklist } from "./prepublish";
import { formatStarkCaption } from "./caption";

describe("reelChecklist", () => {
  it("przepuszcza zbudowana rolke bez zastrzezen", () => {
    const items = reelChecklist({
      phrases: [
        "Rust works while you sleep.",
        "Nobody is coming to fix your year.",
        "So do it scared, and do it alone.",
      ],
      durationSec: 12,
      audioEnabled: true,
    });

    assert.deepEqual(
      checklistProblems(items).map((i) => i.id),
      [],
    );
  });

  it("mowi o kliszy, gluszym takcie i dwoch akcentach", () => {
    const items = reelChecklist({
      phrases: [
        "Unlock your *potential* and *embrace* the grind.",
        "Discipline is the key.",
        "Believe in yourself.",
      ],
      durationSec: 5,
      audioEnabled: false,
    });
    const problems = checklistProblems(items).map((item) => item.id);

    assert.ok(problems.includes("cliches"));
    assert.ok(problems.includes("beats"));
    assert.ok(problems.includes("accent"));
    assert.ok(problems.includes("audio"));
  });

  it("wyłapuje polski material", () => {
    const items = reelChecklist({
      phrases: ["Nie tłumacz się, rób swoje."],
      durationSec: 6,
      audioEnabled: true,
    });

    assert.ok(checklistProblems(items).some((item) => item.id === "english"));
  });
});

describe("postChecklist", () => {
  it("opis z `formatStarkCaption` przechodzi kontrole", () => {
    const caption = formatStarkCaption("Rust works while you sleep.");
    const items = postChecklist({ primary: "Rust works while you sleep.", caption });

    assert.deepEqual(
      checklistProblems(items).map((item) => item.id),
      [],
    );
  });

  it("uchacony opis z polska trescia odpada", () => {
    const items = postChecklist({
      primary: "Discipline is everything, but it's worth it.",
      caption: "Nie poddawaj się. #stoicism #stoicism",
    });
    const problems = checklistProblems(items).map((item) => item.id);

    assert.ok(problems.includes("hook"));
    assert.ok(problems.includes("english"));
    assert.ok(problems.includes("hashtags"));
    assert.ok(problems.includes("cta"));
  });

  it("protokol nie dostaje falszywego „za dlugie na kadr” za cala swoja tresc", () => {
    const items = postChecklist({
      primary: "You don't lack discipline. You lack a sequence.",
      lines: [
        "Phone in another room before you decide anything.",
        "First block of the day belongs to the hardest task.",
        "No negotiations before noon. The deal is already signed.",
      ],
      caption: formatStarkCaption("You don't lack discipline."),
    });

    assert.deepEqual(
      checklistProblems(items).map((item) => item.id),
      [],
    );
  });

  it("klisza w kroku jest wylaprywana, nie tylko w tezie", () => {
    const items = postChecklist({
      primary: "The gym does not care what you meant.",
      lines: ["Unlock your potential every morning."],
      caption: formatStarkCaption("The gym does not care what you meant."),
    });

    assert.ok(
      checklistProblems(items).some((item) => item.id === "hook"),
      "krok z klisza nie moze byc OK",
    );
  });
});
