import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fitFrame, specFromFrame } from "./frameFit";

describe("fitFrame", () => {
  it("jedno zdanie to cytat, nie wymyślona lista", () => {
    const frame = fitFrame({ hook: "Silence cannot be misquoted." });
    assert.ok(["none_solid", "studio_wall_3d"].includes(frame.gridType));
    assert.equal(frame.content.steps, undefined);
  });

  it("trzy fazy z radaru układają się w protokół, a nie w cytat na czerni", () => {
    const frame = fitFrame({
      hook: "You don't lack discipline. You lack a sequence.",
      phrases: [
        "Phone in another room.",
        "First block goes to the hardest task.",
        "No deals before noon.",
      ],
    });
    assert.equal(frame.gridType, "protocol_list");
    assert.equal(frame.content.steps?.length, 3);
  });

  it("treść o koszcie staje w dwóch słupkach", () => {
    const frame = fitFrame({
      hook: "What does it cost to stay who you are?",
      phrases: [
        "One hour you never get back",
        "The promise you broke in private",
        "The work only you could have made",
      ],
    });
    assert.equal(frame.gridType, "cost_vs_reward");
    assert.ok((frame.content.cost?.length ?? 0) > 0);
    assert.ok((frame.content.forfeit?.length ?? 0) > 0);
  });

  it("numery w treści dostają cyfrę na kadr — największą, nie pierwszą", () => {
    const frame = fitFrame({
      hook: "Four hours a day, 300 days.",
      phrases: ["Show up before the first message.", "Leave before the applause."],
    });
    assert.ok(["protocol_list", "grid_2x2"].includes(frame.gridType));
    assert.equal(frame.content.figure, "300");
  });

  it("powtarzalny wybór dla tej samej treści", () => {
    const a = fitFrame({ hook: "Nobody is coming to save your potential." });
    const b = fitFrame({ hook: "Nobody is coming to save your potential." });
    assert.equal(a.gridType, b.gridType);
  });

  it("kropka w licznice nie jest osobnym kadrem", () => {
    const frame = fitFrame({ hook: "Rule 1. Rule 2. Rule 3.", phrases: [] });
    assert.ok(frame.content.primary.length > 0);
  });

  it("akapit retoryki z radaru nie wchodzi na kadr jako krok", () => {
    const frame = fitFrame({
      hook: "You aren't depressed. You're just weak.",
      phrases: [
        "You scroll for six hours a day, surround yourself with comfort, and then wonder why your soul feels dead while the modern world is engineered specifically to make you soft and you keep cooperating with it.",
        "Discipline is not a mood.",
      ],
    });
    const steps = frame.content.steps ?? [];
    assert.ok(
      steps.every((step) => step.split(/\s+/).length <= 14),
      steps.join(" | "),
    );
    assert.ok(steps.includes("Discipline is not a mood."));
  });

  it("z samego akapitu robi cytat, nie pusty protokół", () => {
    const frame = fitFrame({
      hook: "Comfort is a cage.",
      phrases: [
        "Every single morning you choose the warm blanket over the cold street and that one choice, repeated, is the whole story of your life.",
      ],
    });
    assert.ok(["none_solid", "studio_wall_3d"].includes(frame.gridType));
  });

  it("hint z analizy wygrywa z heurystyką", () => {
    const frame = fitFrame({ hook: "Silence cannot be misquoted." }, "3D Wall Letters");
    assert.equal(frame.gridType, "studio_wall_3d");
  });

  it("pusty pakiet nie wyrzuca wyjątku", () => {
    assert.ok(fitFrame({}).content.primary.length > 0);
  });
});

describe("specFromFrame", () => {
  it("cała treść kadru mieszka w warstwach, nie w layoutData", () => {
    const spec = specFromFrame(
      fitFrame({
        hook: "You don't lack discipline. You lack a sequence.",
        phrases: ["Phone in another room.", "Hardest task first.", "No deals before noon."],
      }),
    );
    assert.equal(spec.textLayers[0].id, "t1");
    assert.ok(spec.textLayers.some((layer) => layer.id.startsWith("step")));
    assert.ok(!JSON.stringify(spec.layoutData ?? {}).includes("Phone"));
  });

  it("opis nie powtarza wierszy, które już są na kadrze", () => {
    const spec = specFromFrame(
      fitFrame({
        hook: "You don't lack discipline. You lack a sequence.",
        phrases: ["Phone in another room.", "Hardest task first.", "No deals before noon."],
      }),
    );
    for (const layer of spec.textLayers.slice(1)) {
      assert.ok(
        !spec.caption.toLowerCase().includes((layer.text ?? "").toLowerCase()),
        `„${layer.text}" siedzi dwa razy: na kadrze i w opisie`,
      );
    }
  });
});
