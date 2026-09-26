import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FRAME_FORMATS, REEL_BEAT_LIMIT, frameToBeats, formatById } from "./formats";

describe("FRAME_FORMATS", () => {
  it("studio ma cztery formaty i ani jednego więcej", () => {
    assert.deepEqual(
      FRAME_FORMATS.map((format) => format.id),
      ["quote", "protocol", "cost", "collage"],
    );
  });

  it("koszt pyta o pary, nie o dwa osobne słupki", () => {
    const rows = formatById("cost")?.fields.find((field) => field.key === "rows");
    assert.ok(rows?.pair, "rzędy kosztu muszą wychodzić parami z ust");
    assert.ok(!formatById("cost")?.fields.some((field) => field.key === "cost"));
  });

  it("każdy format ma tezę jako pierwsze pole", () => {
    for (const format of FRAME_FORMATS) {
      assert.equal(format.fields[0].key, "primary", format.id);
    }
  });
});

const FULL = {
  primary: "You don't lack discipline. You lack a sequence.",
  steps: [
    "Phone in another room.",
    "First block goes to the hardest task.",
    "No negotiations before noon.",
  ],
  cost: ["One hour you never get back", "The promise you broke in private"],
  forfeit: ["The body you had two years ago", "The work only you could have made"],
  closing: "You already paid. Decide what it bought.",
};

describe("frameToBeats", () => {
  it("cytat to jeden takt", () => {
    assert.deepEqual(frameToBeats("quote", FULL), [FULL.primary]);
  });

  it("protokół wchodzi takt po taktu: teza, potem kroki", () => {
    assert.deepEqual(frameToBeats("protocol", FULL), [FULL.primary, ...FULL.steps]);
  });

  it("koszt i utrata dzielą jeden kadr, żeby było widać różnicę", () => {
    const beats = frameToBeats("cost", FULL);
    assert.equal(beats[0], FULL.primary);
    assert.equal(beats[1], `${FULL.cost[0]} / ${FULL.forfeit[0]}`);
    assert.equal(beats[beats.length - 1], FULL.closing);
  });

  it("rolka nigdy nie rozciąga się ponad limit taktów", () => {
    for (const shape of ["protocol", "cost", "collage", "quote"] as const) {
      assert.ok(frameToBeats(shape, FULL).length <= REEL_BEAT_LIMIT, shape);
    }
  });

  it("puste pola nie robią pustych kadrów", () => {
    const beats = frameToBeats("cost", {
      primary: "What does it cost to stay who you are?",
      steps: [],
      cost: [],
      forfeit: ["The respect you stopped earning"],
      closing: "",
    });
    assert.deepEqual(beats, [
      "What does it cost to stay who you are?",
      "The respect you stopped earning",
    ]);
  });
});
