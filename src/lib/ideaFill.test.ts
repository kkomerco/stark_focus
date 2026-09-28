import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFrameFill } from "./ideaFill";
import type { IdeaItem } from "../types";

/**
 * Wypełnienie karty z taniego strumienia: model dopisał wiersze pod tezą,
 * którą wybrał człowiek. Tu sprawdzamy, że doklejenie nie psuje tego wyboru —
 * teza jest święta, a para bez swojej połówki nie jest rzędem.
 */

const idea: IdeaItem = {
  id: "idea-1",
  hook: "The kettle is cold again at 4:40.",
  category: "disciplina",
  archetype: "kontrast",
  emotionalTarget: "niewygoda",
  format: "kadr",
  phrases: ["The kettle is cold again at 4:40."],
  caption: "THE KETTLE IS COLD AGAIN AT 4:40.\n\nKeep it for the next morning you do not want to.",
  hashtags: ["#stoicism"],
  theme: "obsidian_void",
  layout: "protocol_list",
  structure: { statement: "The kettle is cold again at 4:40." },
  needsFill: true,
};

describe("applyFrameFill", () => {
  it("dokleja wiersze i nie rusza tezy człowieka", () => {
    const filled = applyFrameFill(idea, {
      primary: "A sentence the model preferred.",
      steps: ["Phone in another room.", "First block goes to the hardest task."],
      closing: "You already paid.",
      figure: "72h",
    });

    assert.equal(filled.hook, idea.hook);
    assert.equal(filled.structure?.statement, idea.hook);
    assert.deepEqual(filled.structure?.steps, [
      "Phone in another room.",
      "First block goes to the hardest task.",
    ]);
    assert.equal(filled.structure?.closing, "You already paid.");
    assert.equal(filled.structure?.figure, "72h");
    assert.equal(filled.needsFill, false);
  });

  it("porzuca niedomkniętą parę zamiast rysować utratę bez ceny", () => {
    const filled = applyFrameFill(
      { ...idea, layout: "cost_vs_reward" },
      {
        cost: ["Heater off at four", "Barbell on frost"],
        forfeit: ["Frozen air with wet hair"],
      },
    );

    assert.equal(filled.structure?.cost, undefined);
    assert.equal(filled.structure?.forfeit, undefined);
  });

  it("bez odpowiedzi modelu kadr zostaje samą tezą i jedzie do studia", () => {
    const filled = applyFrameFill(idea, null);

    assert.equal(filled.needsFill, false);
    assert.equal(filled.structure?.steps, undefined);
    assert.equal(filled.caption, idea.caption);
  });

  it("opis od modelu dostaje stopkę marki, a nie idzie goły", () => {
    const filled = applyFrameFill(idea, {
      caption: "The hall never heats past ten degrees, so the boots stay stiff by the tiles.",
    });

    assert.match(filled.caption, /boots stay stiff/);
    // Teza wersalikami na początku jest umowna (decyzja właściciela konta),
    // ale pod nią ma być ZDANIE MODELU, nie powtórka kadru.
    assert.ok(
      filled.caption.indexOf("boots stay stiff") > filled.caption.indexOf("KETTLE"),
      filled.caption,
    );
    assert.notEqual(filled.caption, idea.caption, "bez opisu od modelu zostaje stary");
  });
});
