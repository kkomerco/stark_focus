import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

/**
 * Bank treści omija wyjście modelu: `reelTemplates` i `ideaMatrix` wchodzą do
 * studia rolek bez jednego wywołania, więc filtr z `gemini.server.ts` ich nie
 * widzi. Dopóki pilnowaliśmy tylko odpowiedzi modelu, w samej aplikacji leżały
 * zdania typu „you will die waiting" i „Comfort kills ambition" — i to one
 * lądowały na kadrze. Ten test zamyka całą klasę, nie jedno zdanie.
 */
describe("bank treści jest tak samo bezpieczny jak odpowiedź modelu", () => {
  const RISKY = /\b(die|dies|died|dead|death|kill|kills|killed|killer|corpse|blood|bloody)\b/i;
  // `brollLibrary` to słownik DOBORU ujęcia (szuka po słowach z tekstu), nie
  // napis na kadrze — tam „death" ma prawo być, bo niczego nie wyświetlamy.
  const SKIP = new Set(["brollLibrary.ts"]);

  const dir = new URL("../data/", import.meta.url);
  const files = readdirSync(dir).filter(
    (name) => name.endsWith(".ts") && !SKIP.has(name) && !name.endsWith(".test.ts"),
  );

  it("żaden plik z bankiem nie trzyma ryzykownej frazy", () => {
    const offenders: string[] = [];
    for (const name of files) {
      const text = readFileSync(new URL(name, dir), "utf8");
      text.split(/\r?\n/).forEach((line, index) => {
        if (RISKY.test(line)) offenders.push(`${name}:${index + 1}`);
      });
    }
    assert.deepEqual(offenders, []);
  });
});
