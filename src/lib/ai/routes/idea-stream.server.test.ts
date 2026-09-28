import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { batchSeed, normalizeModelIdea } from "./idea-stream.server";

/**
 * Tani prompt strumienia pyta tylko o tezę i układ — pełny kadr dopiera
 * osobne zapytanie przy otwieraniu karty. Tu pilnujemy, żeby karta zwrócona
 * bez wierszy NIE udawała cytatu: układ musi zostać, a flaga musi powiedzieć
 * studiu, co ma dopytać.
 */

const seed = batchSeed(3);
const THESIS = "You get one hour back a day. Nobody spends it.";

describe("normalizeModelIdea (tania partia)", () => {
  it("zostawia protokół protokołem, tylko oznacza go do wypełnienia", () => {
    const idea = normalizeModelIdea({ layout: "protocol_list", primary: THESIS }, 0, seed);

    assert.ok(idea, "teza przeszła `auditHook`, więc pomysł nie mógł odpasc");
    assert.equal(idea.layout, "protocol_list");
    assert.equal(idea.needsFill, true);
    assert.equal(idea.hook, THESIS);
    assert.equal(idea.structure?.steps, undefined);
  });

  it("cytat jest pełny sam w sobie — nie ma czego wypełniać", () => {
    const idea = normalizeModelIdea({ layout: "quote", primary: THESIS }, 0, seed);

    assert.equal(idea?.needsFill, false);
    assert.equal(idea?.layout, "quote");
  });

  it("karta z pełną strukturą nie prosi o drugie zapytanie", () => {
    const idea = normalizeModelIdea(
      {
        layout: "protocol_list",
        primary: THESIS,
        structure: {
          primary: THESIS,
          steps: ["Phone in another room.", "Hardest task first.", "No negotiations before noon."],
        },
      },
      0,
      seed,
    );

    assert.equal(idea?.needsFill, false);
    assert.equal(idea?.structure?.steps?.length, 3);
  });

  it("teza po polsku albo klisza nie wchodzi do UI", () => {
    assert.equal(
      normalizeModelIdea({ layout: "quote", primary: "Bądź zdyscyplinowany." }, 0, seed),
      null,
    );
    assert.equal(normalizeModelIdea({ layout: "quote", primary: "" }, 0, seed), null);
  });
});
