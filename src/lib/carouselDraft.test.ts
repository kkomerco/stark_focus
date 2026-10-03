import assert from "node:assert/strict";
import { it } from "node:test";
import { carouselCaptionText, carouselContentKey } from "./carouselDraft";
import { starkHashtags } from "./caption";

it("zmiana wywodu unieważnia dopasowanie opisu, zmiana wyróżnień go nie unieważnia", () => {
  const slides = [
    {
      headline: "Leave your phone outside the bedroom.",
      bodyText: "Set the alarm before ten.",
      highlightWords: "phone",
    },
  ];
  assert.equal(
    carouselContentKey(slides),
    carouselContentKey([{ ...slides[0], highlightWords: "alarm" }]),
  );
  assert.notEqual(
    carouselContentKey(slides),
    carouselContentKey([{ ...slides[0], bodyText: "Write one page before breakfast." }]),
  );
});

it("opis ZIP-a zachowuje własny tekst i wymienia stare tagi na tagi aktualnej karuzeli", () => {
  const slides = [
    {
      headline: "Put your running shoes beside the door.",
      bodyText: "Run for ten minutes before work.",
    },
  ];
  const result = carouselCaptionText(
    slides,
    "Prepare tonight to remove one morning decision.\n\n#old #wrong",
  );
  assert.ok(result.startsWith("Prepare tonight to remove one morning decision."));
  assert.ok(!result.includes("#old"));
  assert.ok(
    result.endsWith(starkHashtags(`${slides[0].headline} ${slides[0].bodyText}`).join(" ")),
  );
  assert.ok(!carouselCaptionText(slides, "").includes("Prepare tonight"));
});
