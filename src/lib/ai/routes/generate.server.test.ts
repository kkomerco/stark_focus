import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { createApp } from "../../mini-express.server";
import { GEMINI_MODEL, getGeminiClient } from "../gemini.server";
import { hookFingerprint } from "../../similarity";
import { repeatsFrame } from "../../caption";
import { exemplarBlock } from "../../hookCraft";
import {
  buildGhostwritePrompt,
  reelCaptionBody,
  registerGenerateRoutes,
  validateReelPhrases,
} from "./generate.server";

const PHRASES = [
  "Your phone gets your first hour.",
  "The notebook stays shut.",
  "Write one page before scrolling.",
];

describe("rolka — kontrola treści bez zapytań do API", () => {
  it("przyjmuje sekwencję z krótkim krokiem i nie traktuje kroku jak hooka", () => {
    const phrases = ["Your phone gets your first hour.", "Phone down."];
    assert.deepEqual(validateReelPhrases(phrases, 2, []), phrases);
  });

  it("odrzuca kliszę, polszczyznę, zły kształt i powtórkę wewnątrz rolki", () => {
    for (const phrases of [
      ["Unlock your potential.", "Write one page."],
      [PHRASES[0], "Odłóż telefon."],
      [PHRASES[0], PHRASES[0].toUpperCase()],
      [PHRASES[0], 42],
      [PHRASES[0]],
    ])
      assert.equal(validateReelPhrases(phrases, 2, []), null);
  });

  it("odrzuca opublikowaną linię i jej bliską parafrazę", () => {
    assert.equal(validateReelPhrases(PHRASES, 3, [hookFingerprint(PHRASES[1])]), null);
    assert.equal(
      validateReelPhrases(["Your phone gets the first hour."], 1, [hookFingerprint(PHRASES[0])]),
      null,
    );
  });

  it("odrzuca zużyte otwarcie nawet przy innym zakończeniu", () => {
    const history = ["You are not tired after five hours.", "You are not ready for the gym."];
    assert.equal(validateReelPhrases(["You are not answering the door."], 1, history), null);
  });

  it("opis dodaje kontekst; kopia dowolnego kadru odpada", () => {
    assert.equal(reelCaptionBody(`A detail: ${PHRASES[1]} Start earlier.`, PHRASES), "");
    assert.equal(reelCaptionBody("Zrób to przed śniadaniem.", PHRASES), "");
    assert.equal(
      reelCaptionBody("Leave the notebook open beside the kettle.", PHRASES),
      "Leave the notebook open beside the kettle.",
    );
    assert.equal(repeatsFrame("You count mornings carefully.", ["You count morning"]), false);
  });

  it("prompt korzysta ze wzorców i nie udaje, że wybór właściciela to dowód wyników", () => {
    const exemplar = "The kettle is cold again at 4:40.";
    const prompt = buildGhostwritePrompt({
      topic: "poranek",
      category: "focus",
      count: 3,
      excludeHooks: [],
      exemplarHooks: [exemplar],
    });
    assert.ok(prompt.includes(exemplar));
    assert.match(prompt, /ACT AS A STRICT EDITOR/);
    assert.match(prompt, /Exactly 3 phrases/);
    assert.doesNotMatch(prompt, /Discipline ignores your feelings|3 to 7 words|elite brand/);
    assert.doesNotMatch(exemplarBlock([exemplar]), /najwiecej zarobily/);
  });
});

describe("ghostwrite — odpowiedź endpointu", () => {
  const app = createApp();
  registerGenerateRoutes(app);
  const post = (body: unknown) =>
    app.handle(
      new Request("http://localhost/api/ghostwrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

  it("bez klucza oddaje komunikat, bez banku treści", async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const response = await post({});
      assert.equal(response.status, 503);
      const payload = await response.json();
      assert.match(payload.notice, /GEMINI_API_KEY/);
      assert.equal(payload.phrases, undefined);
    } finally {
      if (saved === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = saved;
    }
  });

  it("normalizuje payload i odrzuca słabą generację bez drugiego wywołania", async () => {
    const saved = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-only-no-network";
    const client = getGeminiClient()!;
    let modelPayload: unknown = {
      title: "First hour",
      phrases: PHRASES,
      captionShort: PHRASES[1],
      suggestedTheme: "neon",
      suggestedDuration: 1e9,
    };
    const calledModels: string[] = [];
    const generate = mock.method(
      client.models,
      "generateContent",
      async (args: { model: string }) => {
        calledModels.push(args.model);
        return { text: JSON.stringify(modelPayload) };
      },
    );
    try {
      const response = await post({ format: "three_phases", exemplarHooks: [PHRASES[0]] });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.suggestedTheme, "obsidian_void");
      assert.equal(payload.suggestedDuration, 90);
      assert.ok(!payload.captionShort.includes(PHRASES[1]));
      const { content, ...normalized } = payload;
      assert.deepEqual(JSON.parse(content), normalized);
      assert.equal(generate.mock.callCount(), 1);
      assert.equal(calledModels[0], GEMINI_MODEL);
      modelPayload = { phrases: ["Unlock your potential.", ...PHRASES.slice(1)] };
      const rejected = await post({ format: "three_phases" });
      assert.equal(rejected.status, 422);
      assert.equal((await rejected.json()).phrases, undefined);
      assert.equal(generate.mock.callCount(), 2);
    } finally {
      generate.mock.restore();
      if (saved === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = saved;
    }
  });
});
