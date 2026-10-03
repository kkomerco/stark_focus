import assert from "node:assert/strict";
import { it, mock } from "node:test";
import {
  normalizePackCarousel,
  normalizePackReel,
  registerDailyPackRoutes,
} from "./daily-pack.server";
import { createApp } from "../../mini-express.server";
import { getGeminiClient } from "../gemini.server";
import { hookFingerprint } from "../../similarity";

const phrases = [
  "Your phone gets your first hour.",
  "The notebook stays shut.",
  "Write one page before scrolling.",
];
const carousel = {
  title: "First hour",
  slides: [
    {
      headline: phrases[0],
      bodyText: "Leave the notebook open beside the kettle before you go to bed.",
    },
    { headline: "Prepare the desk tonight.", bodyText: "Put a pen beside the open page." },
  ],
};

it("paczka odrzuca całą wadliwą sekwencję, powtórkę i opis kopiujący frazę rolki", () => {
  assert.ok(normalizePackReel({ hook: phrases[0], phrases }));
  assert.equal(
    normalizePackReel({ phrases: [phrases[0], "Unlock your potential.", phrases[2]] }),
    null,
  );
  assert.equal(normalizePackReel({ phrases }, 0, undefined, [hookFingerprint(phrases[0])]), null);
  assert.equal(normalizePackReel({ hook: "A different sentence on the screen.", phrases }), null);
  assert.ok(
    !normalizePackReel({ phrases, captionShort: phrases[1] })?.captionShort.includes(phrases[1]),
  );
});

it("zły środkowy slajd odrzuca karuzelę bez sklejenia pozostałych w nowy wywód", () => {
  assert.deepEqual(normalizePackCarousel(carousel), carousel);
  const bad = {
    ...carousel,
    slides: [...carousel.slides, { headline: "Odłóż telefon przed snem.", bodyText: "" }],
  };
  assert.deepEqual(normalizePackCarousel(bad).slides, []);
  assert.deepEqual(normalizePackCarousel(carousel, [hookFingerprint(phrases[0])]).slides, []);
});

it("endpoint zachowuje dobre części, respektuje temat i jedną rolkę, bez zastępczego banku", async () => {
  const saved = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-only-no-network";
  const app = createApp();
  registerDailyPackRoutes(app);
  const client = getGeminiClient()!;
  let contents = "";
  const generate = mock.method(
    client.models,
    "generateContent",
    async (args: { contents: string }) => {
      contents = args.contents;
      return {
        text: JSON.stringify({
          reels: [{ phrases }, { phrases }],
          carousel,
          post: { headline: "Unlock your potential." },
        }),
      };
    },
  );
  const post = () =>
    app.handle(
      new Request("http://localhost/api/ai/daily-pack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: "Odkładanie telefonu przed snem" }),
      }),
    );
  try {
    const response = await post();
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.reels.length, 1);
    assert.equal(result.post.headline, "");
    assert.equal(result.carousel.slides.length, 2);
    assert.ok(result.notice);
    assert.ok(contents.includes("Odkładanie telefonu przed snem"));
    assert.equal(generate.mock.callCount(), 1);
    delete process.env.GEMINI_API_KEY;
    const offline = await post();
    assert.equal(offline.status, 503);
    const empty = await offline.json();
    assert.deepEqual(empty.reels, []);
    assert.deepEqual(empty.carousel.slides, []);
    assert.equal(empty.post.headline, "");
  } finally {
    generate.mock.restore();
    if (saved === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = saved;
  }
});
