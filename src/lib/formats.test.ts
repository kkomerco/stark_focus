import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FRAME_FORMATS, formatById } from "./formats";

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
