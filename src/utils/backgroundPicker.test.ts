import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXPANDED_BACKGROUND_LIBRARY } from "../data/expandedBackgrounds";
import { pickBackground } from "./backgroundPicker";

const TEXTS = [
  "You negotiate with the alarm every single morning.",
  "Silence is the only reply that cannot be misquoted.",
  "Forty summers left. That is the whole budget.",
  "The body argues first. The mind loses last.",
  "You built the empire nobody asked you to defend.",
  "Cold water, dark street, no applause.",
];

describe("pickBackground", () => {
  it("jest powtarzalny dla tej samej treści", () => {
    for (const text of TEXTS) {
      assert.equal(pickBackground(text).scene.id, pickBackground(text).scene.id);
    }
  });

  it("nie wskazuje wciąż tej samej sceny — dawniej cała baza spadała do pierwszej", () => {
    const ids = new Set(TEXTS.map((text) => pickBackground(text).scene.id));
    assert.ok(ids.size >= 3, `za mało różnych ujęć: ${[...ids].join(", ")}`);
  });

  it("wybiera ujęcie z bazy, więc prompt tła jest prawdziwy", () => {
    for (const text of TEXTS) {
      const { scene } = pickBackground(text);
      assert.ok(
        EXPANDED_BACKGROUND_LIBRARY.some((b) => b.id === scene.id),
        "scena spoza bazy",
      );
      assert.ok(scene.bingPrompt.length > 20);
    }
  });

  it("słucha motywu z treści: o ciszy nie trafia w miejski tłum", () => {
    const silent = pickBackground("Monolith silence in complete isolation.");
    assert.equal(silent.motif.id, "brutalizm_monolit");
    assert.ok(["Geometria & Void", "Architektura & Rzeźba"].includes(silent.scene.category));
  });

  it("rotuje ujęcia w paczce dzięki wykluczeniom", () => {
    const first = pickBackground("Iron, pain and morning training.");
    const second = pickBackground("Iron, pain and morning training.", undefined, [first.scene.id]);
    assert.notEqual(first.scene.id, second.scene.id);
  });

  it("nie łamie się na pustym tekście", () => {
    assert.ok(pickBackground("").scene.name.length > 0);
  });
});
