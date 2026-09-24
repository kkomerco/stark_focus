import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { softenForPlatform } from "./platformSafe";

describe("softenForPlatform", () => {
  it("zdejmuje z drugiej osoby groźbę śmierci, nie treść zdania", () => {
    assert.equal(
      softenForPlatform("You could die right now and nobody would notice."),
      "You could be gone right now and nobody would notice.",
    );
  });

  it("zamienia zwroty o samookaleczeniu na twardą, ale bezpieczną metaforę", () => {
    assert.equal(
      softenForPlatform("Stop killing yourself for their approval."),
      "Stop working against yourself for their approval.",
    );
    assert.equal(
      softenForPlatform("Never cut yourself off from the work."),
      "Never walk away from the work.",
    );
    assert.equal(
      softenForPlatform("Never cut yourself to prove a point."),
      "Never cut them off to prove a point.",
    );
  });

  it("nie rusza treści, która niczego nie ryzykuje", () => {
    const safe = "Silence cannot be misquoted. Execute in silence.";
    assert.equal(softenForPlatform(safe), safe);
  });

  it("nie rozjeżdża JSON-a, w którym siedzi", () => {
    const raw = '{"hook":"You could die tonight.","sub":""}';
    const softened = softenForPlatform(raw);
    assert.doesNotThrow(() => JSON.parse(softened));
    assert.equal(JSON.parse(softened).hook, "You could be gone tonight.");
  });
});
