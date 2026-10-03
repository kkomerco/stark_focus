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
    });

    assert.deepEqual(
      checklistProblems(items).map((i) => i.id),
      [],
    );
  });

  it("mowi o kliszy, krótkim takcie i dwoch akcentach", () => {
    const items = reelChecklist({
      phrases: [
        "Unlock your *potential* and *embrace* the grind.",
        "Discipline is the key.",
        "Believe in yourself.",
      ],
      durationSec: 5,
    });
    const problems = checklistProblems(items).map((item) => item.id);

    assert.ok(problems.includes("cliches"));
    assert.ok(problems.includes("beats"));
    assert.ok(problems.includes("accent"));
    assert.ok(!items.some((item) => item.id === "audio"));
  });

  it("wyłapuje polski material", () => {
    const items = reelChecklist({
      phrases: ["Nie tłumacz się, rób swoje."],
      durationSec: 6,
    });

    assert.ok(checklistProblems(items).some((item) => item.id === "english"));
  });

  it("rolka z samych sentencji nie ma komu jej przesłać — i to tylko ostrzeżenie", () => {
    const items = reelChecklist({
      phrases: [
        "Discipline is a lifestyle.",
        "Mindset is everything.",
        "Success demands consistency.",
      ],
      durationSec: 12,
    });

    const sendTest = items.find((item) => item.id === "send-test");
    assert.ok(sendTest, "test wysyłki ma być na liście kontrolnej");
    assert.equal(sendTest.ok, false, "goła sentencja nie nazywa adresata ani sceny");
    assert.equal(typeof sendTest.hint, "string");
  });

  it("scena albo „you” daje rolce powód do wysyłki", () => {
    const items = reelChecklist({
      phrases: [
        "The kettle is cold again at 4:40.",
        "Nobody is coming to fix your year.",
        "So do it scared, and do it alone.",
      ],
      durationSec: 12,
    });

    assert.equal(
      checklistProblems(items).some((item) => item.id === "send-test"),
      false,
    );
  });

  it("rolka otwierająca się jak ostatnie klipy dostaje ostrzeżenie", () => {
    const items = reelChecklist({
      phrases: [
        "Nobody is coming to fix your year.",
        "Do it scared, and do it alone.",
        "The log does not care how you feel.",
      ],
      durationSec: 12,
      recentHooks: ["Nobody is coming to check your streak."],
    });

    assert.ok(!items.find((item) => item.id === "opening")?.ok);
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

  it("kadr bez adresata i sceny dostaje test wysyłki jako ostrzeżenie, nie blokadę", () => {
    const items = postChecklist({
      primary: "Discipline is a lifestyle.",
      caption: formatStarkCaption("Discipline is a lifestyle."),
    });
    const problems = checklistProblems(items).map((item) => item.id);

    assert.ok(problems.includes("send-test"), "goła sentencja nie ma komu jej przesłać");
    // Panel pozostaje doradczy: funkcja oddaje listę, decyzja o eksporcie zostaje przy właścicielu.
    assert.ok(items.length > 0);
  });

  it("konkret na kadrze przechodzi test wysyłki razem z całą kontrolą", () => {
    const caption = formatStarkCaption("The kettle is cold again at 4:40.");
    const items = postChecklist({ primary: "The kettle is cold again at 4:40.", caption });

    assert.deepEqual(
      checklistProblems(items).map((item) => item.id),
      [],
    );
  });

  it("pokazuje otwarcie, które było już w ostatnich postach", () => {
    const items = postChecklist({
      primary: "You are not tired, you are untrained.",
      caption: formatStarkCaption("You are not tired, you are untrained."),
      recentHooks: ["You are not lazy, you are unprotected."],
    });
    const opening = items.find((item) => item.id === "opening");

    assert.ok(opening, "kontrola otwarcia zniknęła z listy");
    assert.ok(!opening.ok, "dwa materiały startujące tak samo to nawyk, nie zbieg okoliczności");
    assert.match(opening.hint, /you are not/);
  });

  it("nie wymaga oryginalnego otwarcia, gdy nie ma do czego porównać", () => {
    const items = postChecklist({
      primary: "You are not tired, you are untrained.",
      caption: formatStarkCaption("You are not tired, you are untrained."),
    });

    assert.equal(items.find((item) => item.id === "opening")?.ok, true);
  });
});
