import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mixBatchPosts } from "./batch.server";

const QUOTE = {
  format: "quote",
  primary: "You rehearse the excuses, not the work.",
  caption:
    "Rehearsing feels like preparation because it costs nothing today. The bill arrives on the day you finally start.",
};

const PROTOCOL = {
  format: "protocol",
  primary: "Your morning is decided before you stand up.",
  steps: [
    "Put the phone face down before the alarm.",
    "Write the one task you are avoiding.",
    "Start it before the coffee is ready.",
  ],
  caption:
    "A morning built on decisions taken the night before needs no motivation at all, only a sequence.",
};

const COST = {
  format: "cost",
  primary: "What does today actually cost you?",
  rows: [
    "Two hours of scrolling -> Nothing finished by noon",
    "Coffee at the desk -> An hour lost to errands",
    "Answering mail at dawn -> The deep work never starts",
  ],
  closing: "The day keeps its own ledger.",
  caption:
    "Nobody writes down what a scattered day takes. The price is real, it is just never itemised.",
};

const COLLAGE = {
  format: "collage",
  primary: "Four rooms remember what you skipped.",
  steps: [
    "Desk with one open tab",
    "Phone face down all morning",
    "Kitchen table with no plates",
    "Front door still locked",
  ],
  caption:
    "An avoided week leaves traces in the exact order you left them. The rooms keep score longer than you do.",
};

const GRID_BY_FORMAT: Record<string, string> = {
  quote: "none_solid",
  protocol: "protocol_list",
  cost: "cost_vs_reward",
  collage: "grid_2x2",
};

describe("mixBatchPosts — seria nie może być jednym układem", () => {
  it("oddaje każdy układ z odpowiedzi i miesza je naprzemiennie", () => {
    const posts = mixBatchPosts({ posts: [QUOTE, PROTOCOL, COST, COLLAGE] }, [], 4, 1);

    assert.deepEqual(
      posts.map((post) => post.format),
      ["quote", "protocol", "cost", "collage"],
    );
    assert.deepEqual(
      posts.map((post) => post.gridType),
      ["none_solid", "protocol_list", "cost_vs_reward", "grid_2x2"],
    );
  });

  it("niesie pełną strukturę, nie tylko dwa wiersze podglądu", () => {
    const posts = mixBatchPosts({ posts: [PROTOCOL, COST] }, [], 2, 1);
    const [protocol, cost] = posts;

    assert.deepEqual(protocol.steps, PROTOCOL.steps);
    assert.equal(protocol.sayingMain, PROTOCOL.primary);
    assert.equal(protocol.sayingSub, PROTOCOL.steps[0], "podgląd pokazuje pierwszy krok");

    assert.deepEqual(cost.cost, [
      "Two hours of scrolling",
      "Coffee at the desk",
      "Answering mail at dawn",
    ]);
    assert.deepEqual(cost.forfeit, [
      "Nothing finished by noon",
      "An hour lost to errands",
      "The deep work never starts",
    ]);
    assert.equal(cost.closing, COST.closing);
  });

  it("gdy model oddał same cytaty, seria jest cytatami — bez udawanej mieszanki", () => {
    const other = {
      format: "quote",
      primary: "Maybe forty more summers. That is the whole budget.",
      caption:
        "A summer counted in weekends is the only honest budget anyone has, and most of us spend it badly.",
    };
    const posts = mixBatchPosts({ posts: [QUOTE, other] }, [], 2, 1);

    assert.equal(posts.length, 2);
    for (const post of posts) {
      assert.equal(post.format, "quote");
      assert.equal(post.gridType, GRID_BY_FORMAT.quote);
      assert.deepEqual(post.steps, []);
      assert.deepEqual(post.cost, []);
    }
  });

  it("układ bez wymaganej liczby wierszy odpada, zamiast wejść do UI uszkodzony", () => {
    const broken = { ...PROTOCOL, steps: PROTOCOL.steps.slice(0, 2) };
    const posts = mixBatchPosts({ posts: [broken] }, [], 4, 1);

    assert.equal(posts.length, 0, "protokół bez trzech kroków nie jest protokołem");
  });

  it("pozycja bez zdania nie dochodzi do studia jako pusty kadr", () => {
    const empty = { format: "quote", primary: "  " };
    const halfCost = {
      format: "cost",
      primary: "What does today actually cost you?",
      rows: ["Two hours of scrolling"],
    };
    const posts = mixBatchPosts({ posts: [empty, halfCost] }, [], 4, 1);

    assert.equal(posts.length, 0, "kostka bez par «cena → strata» nie jest kostką");
  });

  it("to, co już poszło na konto, wypada z serii", () => {
    const exclude = ["You rehearse the excuses, not the work."];
    const posts = mixBatchPosts({ posts: [QUOTE, PROTOCOL] }, exclude, 4, 1);

    assert.deepEqual(
      posts.map((post) => post.format),
      ["protocol"],
    );
  });
});
