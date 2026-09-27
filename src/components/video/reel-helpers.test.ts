// src/components/video/reel-helpers.test.ts
// Kontrakt formatu rolki: ile taktów zamówić i ile zostawić. Studio wysyłało
// własne id układów, trasa nie rozpoznawała żadnego i brała cztery frazy, a
// studio sklejało je w jeden kadr — stąd sześć linijek w „2 szybkich taktach".
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beatsForReelFormat, clipToBeats, narrativeFormatFor } from "./reel-helpers";

const FOUR = [
  "You stare at your phone screen.",
  "Yesterday you paid with four hours.",
  "A sharp knife cuts clean.",
  "Lock the phone away.",
];

describe("kontrakt formatu rolki", () => {
  it("każdy układ studia ma własną liczbę taktów, nie wspólny domyślny", () => {
    assert.equal(beatsForReelFormat("viral_loop_6s"), 1);
    assert.equal(beatsForReelFormat("hook_payoff_5s"), 2);
    assert.equal(beatsForReelFormat("three_phases"), 3);
    assert.equal(beatsForReelFormat("five_beats_20s"), 5);
  });

  it("trasa dostaje słownik, który rozumie, inaczej zwraca cztery frazy", () => {
    assert.equal(narrativeFormatFor("viral_loop_6s"), "single_quote");
    assert.equal(narrativeFormatFor("hook_payoff_5s"), "two_phases");
    assert.equal(narrativeFormatFor("dynamic_broll_cut"), "three_phases");
    assert.equal(narrativeFormatFor("five_beats_20s"), "five_phrases");
    // Id spoza słownika nie może udawać pętli jednym zdaniem.
    assert.equal(narrativeFormatFor("viral_loop_6x"), "three_phases");
  });

  it("nadmiar taktów jest odcinany, nigdy sklejany w jeden kadr", () => {
    const two = clipToBeats(FOUR, "hook_payoff_5s");
    assert.deepEqual(two, FOUR.slice(0, 2));
    assert.equal(
      two.some((phrase) => phrase.includes(". ") && phrase.split(". ").length > 1),
      false,
      "takt nie może być zlepkiem dwóch zdań",
    );

    const one = clipToBeats(FOUR, "viral_loop_6s");
    assert.deepEqual(one, [FOUR[0]]);
  });

  it("krótsza odpowiedź niż format nie zostaje uzupełniona cudzym tekstem", () => {
    assert.deepEqual(clipToBeats(["Only one line here."], "five_beats_20s"), [
      "Only one line here.",
    ]);
  });
});
