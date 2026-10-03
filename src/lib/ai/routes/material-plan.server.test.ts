import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { createApp } from "../../mini-express.server";
import { getGeminiClient } from "../gemini.server";
import {
  materialBrief,
  materialCaption,
  materialPackage,
  materialPlanIsCurrent,
  sceneImagePrompt,
  readDirectorState,
  readMaterialPlan,
} from "../../materialPlan";
import {
  buildMaterialPlanPrompt,
  normalizeMaterialPlan,
  registerMaterialPlanRoutes,
} from "./material-plan.server";

const brief = materialBrief({
  lines: ["Your phone gets your first hour.", "Write one page before scrolling."],
  duration: 9,
});
const raw = {
  captionBody: "Leave the notebook open beside the kettle before going to bed.",
  question: "Where will you leave the notebook tonight?",
  scenes: [
    {
      lineIndexes: [0],
      seconds: 4,
      setting: "Desk before dawn",
      action: "ROOK puts his phone face-down at the far edge of the desk.",
      framing: "Three-quarter view with space above the head",
      reason: "Telefon ustępuje miejsca pracy.",
      stockQuery: "barbell plates",
    },
    {
      lineIndexes: [1],
      seconds: 4,
      setting: "The same desk",
      action: "ROOK opens the notebook and writes the first line.",
      framing: "Close view of the notebook and hands",
      reason: "Pierwszy zapis zastępuje przewijanie.",
      stockQuery: "not measured",
    },
  ],
};

describe("pakiet materiału — zgodność tekstu i scen", () => {
  it("paczka przechodzi zapis/odczyt planu bez zmiany przypisań i bez obcych pól", () => {
    const plan = normalizeMaterialPlan(raw, brief)!;
    assert.deepEqual(readMaterialPlan(JSON.parse(materialPackage(plan))), plan);
    assert.deepEqual(
      readDirectorState({ plan, treatment: "rook", captionKey: plan.sourceKey, keepCaption: true })
        ?.plan,
      plan,
    );
    assert.equal(readMaterialPlan({ ...plan, sourceKey: "old" }), null);
    assert.equal(readMaterialPlan({ ...plan, scenes: [null] }), null);
    assert.equal(
      readMaterialPlan({ ...plan, scenes: [{ ...plan.scenes[0], lineIndexes: [1, 0] }] }),
      null,
    );
  });
  it("podpis zmienia się również przy korekcie ostatniego zdania, czasu i oprawy", () => {
    const plan = normalizeMaterialPlan(raw, brief)!;
    assert.ok(materialPlanIsCurrent(plan, brief));
    for (const changed of [
      { ...brief, lines: [brief.lines[0], "Close the notebook before dinner."] },
      { ...brief, duration: 12 },
      { ...brief, treatment: "live" as const },
      { ...brief, ratio: "16:9" as const },
    ])
      assert.equal(materialPlanIsCurrent(plan, changed), false);
    assert.deepEqual(plan.brief.lines, brief.lines);
  });

  it("odrzuca pominięte, powtórzone i przemieszane przypisania zdań", () => {
    for (const indexes of [[[0]], [[0], [0]], [[1], [0]], [[0], [2]], [["0"], [1]]]) {
      const scenes = indexes.map((lineIndexes, index) => ({ ...raw.scenes[index], lineIndexes }));
      assert.equal(normalizeMaterialPlan({ ...raw, scenes }, brief), null);
    }
    assert.equal(normalizeMaterialPlan({ ...raw, scenes: [null] }, brief), null);
    assert.equal(
      normalizeMaterialPlan(
        { ...raw, scenes: [{ ...raw.scenes[0], lineIndexes: [0, 1], action: {} }] },
        brief,
      ),
      null,
    );
  });

  it("opis rozwija treść; powtórka i polszczyzna nie trafiają do materiału", () => {
    for (const captionBody of [
      brief.lines[1],
      "Odłóż telefon i zrób pierwszy krok.",
      "Unlock your potential.",
      null,
    ]) {
      assert.equal(normalizeMaterialPlan({ ...raw, captionBody }, brief), null);
    }
    assert.ok(materialCaption(normalizeMaterialPlan(raw, brief)!).includes(raw.captionBody));
  });

  it("czas scen odpowiada briefowi, a katalog nie zastępuje bohatera", () => {
    const plan = normalizeMaterialPlan(raw, brief)!;
    assert.equal(
      plan.scenes.reduce((sum, scene) => sum + scene.seconds, 0),
      brief.duration,
    );
    assert.deepEqual(
      plan.scenes.map((scene) => scene.stockQuery),
      ["", ""],
    );
    const live = normalizeMaterialPlan(raw, { ...brief, treatment: "live" })!;
    assert.deepEqual(
      live.scenes.map((scene) => scene.stockQuery),
      ["barbell plates", ""],
    );
  });

  it("eksport zawiera tę samą treść i tożsamość bohatera w każdym prompcie", () => {
    const plan = normalizeMaterialPlan(raw, brief)!;
    const packet = JSON.parse(materialPackage(plan));
    assert.deepEqual(packet.brief.lines, brief.lines);
    assert.match(packet.scenes[1].imagePrompt, /LEFT wrist/);
    assert.match(packet.scenes[1].motionPrompt, /writes the first line/);
    assert.match(sceneImagePrompt(plan, plan.scenes[0]), /Your phone gets your first hour/);
    assert.match(buildMaterialPlanPrompt(brief), /NEVER rewrite/);
  });

  it("ogranicza rozmiar briefu bez danych modelu w konfiguracji klienta", () => {
    const clipped = materialBrief({
      lines: Array.from({ length: 100 }, () => "a".repeat(1000)),
      duration: Infinity,
    });
    assert.equal(clipped.lines.length, 24);
    assert.equal(clipped.lines[0].length, 300);
    assert.equal(clipped.duration, 12);
  });
});

describe("material-plan — endpoint bez rzeczywistych zapytań do AI", () => {
  const app = createApp();
  registerMaterialPlanRoutes(app);
  const post = (body: unknown) =>
    app.handle(
      new Request("http://localhost/api/ai/material-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

  it("brak treści i klucza zwraca komunikat bez scen z banku", async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      assert.equal((await post({})).status, 400);
      const reply = await post(brief);
      assert.equal(reply.status, 503);
      const payload = await reply.json();
      assert.match(payload.notice, /GEMINI_API_KEY/);
      assert.equal(payload.plan, undefined);
    } finally {
      if (saved === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = saved;
    }
  });

  it("jedna generacja oddaje tylko pełny plan; błędny wynik nie dokłada kolejnego wywołania", async () => {
    const saved = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-only-no-network";
    const client = getGeminiClient()!;
    let payload: unknown = raw;
    const generate = mock.method(client.models, "generateContent", async () => ({
      text: JSON.stringify(payload),
    }));
    try {
      const reply = await post(brief);
      assert.equal(reply.status, 200);
      assert.deepEqual((await reply.json()).plan.brief.lines, brief.lines);
      assert.equal(generate.mock.callCount(), 1);
      payload = { ...raw, scenes: [] };
      const rejected = await post(brief);
      assert.equal(rejected.status, 422);
      assert.equal((await rejected.json()).plan, undefined);
      assert.equal(generate.mock.callCount(), 2);
    } finally {
      generate.mock.restore();
      if (saved === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = saved;
    }
  });
});
