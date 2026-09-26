import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shapeAiResult, type DeconstructContext } from "./deconstruct.server";

const GOOD_HOOK = "Rust works while you sleep.";
const OTHER_GOOD = "The door closes quietly.";

function ctx(over: Partial<DeconstructContext> = {}): DeconstructContext {
  return {
    sawImage: true,
    platform: "TikTok",
    url: "https://www.tiktok.com/@jocko.willink/video/1",
    title: "Discipline equals freedom",
    author: "Jocko Willink",
    audioTrack: "Solitude",
    seed: 7,
    ...over,
  };
}

const parsedWith = (deconstruction: unknown, extra: Record<string, unknown> = {}) => ({
  deconstruction,
  starkVariants: [],
  blueprints: [],
  ...extra,
});

describe("shapeAiResult — cudze zdanie", () => {
  it("bez kadru nie ma cytatu, nawet gdy model twierdzi inaczej", () => {
    const out = shapeAiResult(
      parsedWith({ hookText: "Discipline equals freedom.", hookType: "axiom" }),
      ctx({ sawImage: false }),
    );
    assert.equal(out.deconstruction.hookText, "");
    assert.equal(out.deconstruction.attribution, "");
  });

  it("zdanie z kadru wychodzi z podpisem, bo cytat bez źródła to kradzież", () => {
    const out = shapeAiResult(parsedWith({ hookText: "Discipline equals freedom." }), ctx());
    assert.equal(out.deconstruction.hookText, "Discipline equals freedom.");
    assert.equal(out.deconstruction.attribution, "Jocko Willink, TikTok");
  });

  it("cytat bez mówcy nie ma podpisu — UI nie może go podpisać cudzym nazwiskiem", () => {
    const out = shapeAiResult(parsedWith({ hookText: "It isn't a feeling." }), ctx({ author: "" }));
    assert.equal(out.deconstruction.hookText, "It isn't a feeling.");
    assert.equal(out.deconstruction.attribution, "");
  });
});

describe("shapeAiResult — nasza treść", () => {
  const variants = (list: unknown[]) =>
    shapeAiResult(parsedWith({ hookType: "x" }, { starkVariants: list }), ctx());

  it("wyrzuca wariant z kliszą, mimo że model go oddał", () => {
    const out = variants([
      { hook: "Unlock your potential.", phrases: [GOOD_HOOK] },
      { hook: GOOD_HOOK, phrases: [OTHER_GOOD] },
    ]);
    assert.deepEqual(
      out.starkVariants.map((v) => v.hook),
      [GOOD_HOOK],
    );
  });

  it("wyrzuca wariant z polskim hookiem — instrukcja jest po polsku, materiał nie", () => {
    const out = variants([{ hook: "To nie jest dyscyplina, tego nie wkleimy.", phrases: [] }]);
    assert.equal(out.starkVariants.length, 0);
  });

  it("phrases to same zdania z materiału, nie duplikat hooka", () => {
    const out = variants([{ hook: GOOD_HOOK, phrases: ["Zrób to teraz", 42, null, OTHER_GOOD] }]);
    assert.deepEqual(out.starkVariants[0].phrases, [OTHER_GOOD]);
  });

  it("dostajemy najwyżej trzy warianty, z id po naszej stronie", () => {
    const out = variants(
      Array.from({ length: 6 }, (_, i) => ({
        hook: `Rust works while you sleep variant ${i}.`,
        phrases: [],
      })),
    );
    assert.equal(out.starkVariants.length, 3);
    assert.equal(out.starkVariants[0].id, "variant-7-1");
  });
});

describe("shapeAiResult — receptury", () => {
  const blueprints = (list: unknown[]) =>
    shapeAiResult(parsedWith({ hookType: "x" }, { blueprints: list }), ctx());

  it("receptura bez wiersza na kadr nie istnieje", () => {
    const out = blueprints([{ gridType: "none_solid", line: "   " }]);
    assert.equal(out.blueprints.length, 0);
  });

  it("scena jest tylko w układzie, który ją rysuje", () => {
    const out = blueprints([
      { gridType: "none_solid", line: GOOD_HOOK, scene: "neon" },
      { gridType: "studio_wall_3d", line: OTHER_GOOD, scene: "kosmos" },
    ]);
    assert.equal(out.blueprints[0].scene, undefined);
    assert.equal(out.blueprints[0].needsImage, false);
    assert.equal(out.blueprints[1].scene, "wall");
    assert.equal(out.blueprints[1].needsImage, true);
  });

  it("opis obrazu idzie tylko wtedy, gdy kadr naprawdę go żąda", () => {
    const out = blueprints([
      { gridType: "protocol_list", line: GOOD_HOOK, imagePrompt: "posag w cieniu" },
      { gridType: "grid_2x2", line: OTHER_GOOD, imagePrompt: "monolit w popiele" },
    ]);
    assert.equal(out.blueprints[0].imagePrompt, "");
    assert.equal(out.blueprints[1].imagePrompt, "monolit w popiele");
  });

  it("nieznany układ nie wejdzie do UI jako cokolwiek — wraca do płaskiego cytatu", () => {
    const out = blueprints([{ gridType: "diagram_v2000", line: GOOD_HOOK }]);
    assert.equal(out.blueprints[0].gridType, "none_solid");
  });
});

describe("shapeAiResult — kształt odpowiedzi", () => {
  it("braki w odpowiedzi modelu nie rozbijają widoku: wszędzie są stringi", () => {
    const out = shapeAiResult(
      {
        deconstruction: {
          hookText: GOOD_HOOK,
          hookType: null,
          structure: [null, "kontrast", 7],
          psychologicalTriggers: "nie tablica",
        },
        starkVariants: [null],
        blueprints: [null],
      },
      ctx(),
    );
    assert.equal(out.deconstruction.hookType, "Nieznany");
    assert.deepEqual(out.deconstruction.structure, ["kontrast", "7"]);
    assert.deepEqual(out.deconstruction.psychologicalTriggers, []);
    assert.equal(out.starkVariants.length, 0);
    assert.equal(out.blueprints.length, 0);
  });
});
