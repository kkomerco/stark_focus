import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildFrameNotice, rankFrameCandidates } from "./frames.server";
import { formatById } from "../../formats";

/**
 * Tu nie ma wywołania modelu: sprawdzamy wyrok, który zapada PO odpowiedzi
 * Gemini. Dawniej każdy wariant, w którym jeden wiersz potknął się o rym,
 * odpadał cały — przy kadrze kosztu (osiem wierszy) pusta lista była kwestią
 * prawdopodobieństwa, a nie jakości, a rada brzmiała „zmień temat".
 */

const protocol = formatById("protocol")!;
const cost = formatById("cost")!;
const quote = formatById("quote")!;

const PRIMARY = "You don't lack discipline. You lack a sequence.";
const CLOSING = "You already paid. Decide what it bought.";
const STEPS = [
  "Phone in another room.",
  "First block goes to the hardest task.",
  "No negotiations before noon.",
];
/** Dwadzieścia słów — lista kroków wybacza szesnaście, i to jest cała wina wiersza. */
const TOO_LONG_STEP =
  "Open the laptop and write the first ugly paragraph before you answer a single message from anyone in the chat.";
const POLISH_STEP = "Wstawaj wcześniej i po prostu rób swoje.";
const RISKY_STEP = "You will die with the work still unfinished.";
/** Wszystkie trzy ceny mają rym w sobie — każda para odpada osobno. */
const RHYME_ROWS = [
  "Stand tall and never fall -> The desk you meant to own",
  "Do the deed and plant the seed -> The hour you gave the crowd",
  "Shut the gate and accept the fate -> The room you did not book",
];

const asList = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

function protocolVariant(steps: string[] = STEPS, primary = PRIMARY) {
  return { primary, steps, archetype: "inversion", generic_risk: 2 };
}

describe("rankFrameCandidates — miękkie odmowy", () => {
  it("przeżywa wariant, w którym za długi jest jeden krok, i oddaje dwa pozostałe", () => {
    const { frames, rejected, rejectedDetails, trimmedDetails } = rankFrameCandidates(
      [protocolVariant([TOO_LONG_STEP, ...STEPS.slice(0, 2)])],
      protocol,
      [],
      3,
    );

    assert.equal(rejected, 0, "za długi wiersz to sprawa wiersza, nie wariantu");
    assert.deepEqual(rejectedDetails, []);
    assert.equal(frames.length, 1);
    assert.deepEqual(asList(frames[0].steps), STEPS.slice(0, 2));
    assert.equal(
      asList(frames[0].steps).includes(TOO_LONG_STEP),
      false,
      "wiersz po limicie nie może zostać na kadrze",
    );
    // Kadr z ubytkiem musi sam o tym mówić, inaczej UI kłamie, że kadr jest pełny.
    assert.deepEqual(asList(frames[0].droppedFields), ["Kroki"]);
    assert.deepEqual(asList(frames[0].droppedReasons), ["za długi na ten układ"]);
    assert.deepEqual(trimmedDetails, ["za długi na ten układ (1)"]);
  });

  it("para odpada w całości, nigdy jeden jej słupek", () => {
    const { frames, trimmedDetails } = rankFrameCandidates(
      [
        {
          primary: "What does it cost to stay who you are?",
          rows: [
            "One hour of scrolling every night -> The morning you meant to train",
            "The gym you skip on the way home -> The body you had two years ago",
            "The hour you spend rewriting the same paragraph for the fourth time instead of sending it -> The work nobody will ever see",
          ],
          closing: CLOSING,
          archetype: "ledger",
          generic_risk: 3,
        },
      ],
      cost,
      [],
      3,
    );

    const frame = frames[0];
    assert.ok(frame, "dwie pary dobre to kadr, którego nie wolno wyrzucić");
    const kept = asList(frame.cost);
    const forfeits = asList(frame.forfeit);
    assert.equal(kept.length, 2);
    assert.equal(forfeits.length, 2, "słupek utraty nie może być dłuższy niż słupek ceny");
    assert.deepEqual(kept, [
      "One hour of scrolling every night",
      "The gym you skip on the way home",
    ]);
    assert.equal(
      forfeits.includes("The work nobody will ever see"),
      false,
      "utrata bez swojej ceny to inny rząd",
    );
    assert.deepEqual(asList(frame.droppedFields), ["Cena i utrata"]);
    assert.deepEqual(trimmedDetails, ["za długi na ten układ (1)"]);
  });

  it("drugi raz w tym samym kadrze zgubi wiersz, a nie wariant", () => {
    const { frames, rejected } = rankFrameCandidates(
      [protocolVariant([STEPS[0], STEPS[0], STEPS[1]])],
      protocol,
      [],
      3,
    );
    assert.equal(rejected, 0);
    assert.deepEqual(asList(frames[0].steps), [STEPS[0], STEPS[1]]);
    assert.deepEqual(asList(frames[0].droppedReasons), ["powtórka wiersza w tym samym kadrze"]);
  });
});

describe("rankFrameCandidates — twarde odmowy", () => {
  it("odmawia wariantu, którego jedyne zdanie jest po polsku", () => {
    const { frames, rejected, rejectedDetails } = rankFrameCandidates(
      [
        {
          primary: "Wstawaj wcześniej i po prostu rób swoje.",
          archetype: "object",
          generic_risk: 1,
        },
      ],
      quote,
      [],
      3,
    );
    assert.equal(frames.length, 0);
    assert.equal(rejected, 1);
    assert.deepEqual(rejectedDetails, ["polski w materiale (1)"]);
  });

  it("polski wiersz w strukturze wywraca cały wariant, bo nie może wejść na kadr", () => {
    const { frames, rejectedDetails } = rankFrameCandidates(
      [protocolVariant([STEPS[0], POLISH_STEP, STEPS[2]])],
      protocol,
      [],
      3,
    );
    assert.equal(frames.length, 0);
    assert.deepEqual(rejectedDetails, ["polski w materiale (1)"]);
  });

  it("treść ryzykowna dla platformy nie dojdzie do UI", () => {
    const { rejectedDetails } = rankFrameCandidates(
      [protocolVariant([STEPS[0], STEPS[1], RISKY_STEP])],
      protocol,
      [],
      3,
    );
    assert.deepEqual(rejectedDetails, ["treść ryzykowna dla platformy (1)"]);
  });

  it("nie odda linii, która już poszła w feedzie", () => {
    const { rejectedDetails } = rankFrameCandidates(
      [protocolVariant(STEPS, "Rust works while you sleep.")],
      protocol,
      ["Rust works while you sleep."],
      3,
    );
    assert.deepEqual(rejectedDetails, ["powtórka tego, co już poszło w feedzie (1)"]);
  });

  it("inna liczba wierszy niż układ wymaga jest odmową kształtu, nie rzemiosła", () => {
    const { rejectedDetails } = rankFrameCandidates(
      [protocolVariant(STEPS.slice(0, 2))],
      protocol,
      [],
      3,
    );
    assert.deepEqual(rejectedDetails, ["inna liczba wierszy, niż wymaga układ (1)"]);
  });

  it("gdy wiersze oczyszczą kadr do zera, raportuje ich rzemiosło", () => {
    const { frames, rejected, rejectedDetails } = rankFrameCandidates(
      [
        {
          primary: "What does it cost to stay who you are?",
          rows: RHYME_ROWS,
          closing: CLOSING,
          archetype: "ledger",
          generic_risk: 1,
        },
      ],
      cost,
      [],
      3,
    );
    assert.equal(frames.length, 0, "kadr bez ani jednej pary to nie kadr kosztu");
    assert.equal(rejected, 1);
    assert.deepEqual(
      rejectedDetails,
      ["rym (1)"],
      "powód ma padać z wiersza, a nie z komunikatu, że układ się wyczyścił",
    );
  });

  it("dwa identyczne warianty to nadal jeden materiał", () => {
    const { frames, rejectedDetails } = rankFrameCandidates(
      [protocolVariant(), protocolVariant()],
      protocol,
      [],
      3,
    );
    assert.equal(frames.length, 1);
    assert.deepEqual(rejectedDetails, ["powtórka tego, co już poszło w feedzie (1)"]);
  });

  it("wariant bez żadnego pola nie zostaje w raporcie bez przyczyny", () => {
    const { rejected, rejectedDetails } = rankFrameCandidates([{}], protocol, [], 3);
    assert.equal(rejected, 1);
    assert.deepEqual(rejectedDetails, ["puste pole w kadrze (1)"]);
    assert.ok(buildFrameNotice(protocol, rejected, rejectedDetails).includes("puste pola"));
  });
});

describe("buildFrameNotice", () => {
  it("nazywa prawdziwą przyczynę i nie każe zmieniać tematu winy wiersza", () => {
    const { rejected, rejectedDetails } = rankFrameCandidates(
      [
        { primary: "Stand tall and never fall.", archetype: "object", generic_risk: 1 },
        { primary: "Break the spell and do it well.", archetype: "object", generic_risk: 1 },
        { primary: "Hide the cost and count it lost.", archetype: "object", generic_risk: 1 },
      ],
      quote,
      [],
      3,
    );
    assert.equal(rejected, 3);
    assert.deepEqual(rejectedDetails, ["rym (3)"]);

    const notice = buildFrameNotice(quote, rejected, rejectedDetails);
    assert.ok(notice.includes("rym (3)"), notice);
    assert.ok(notice.includes("nie temat"), notice);
    assert.ok(!notice.toLowerCase().includes("zmień temat"), notice);
    assert.ok(!notice.includes(". "), "jedno zdanie, które UI wiesza bez zmian");
    assert.ok(notice.endsWith("."));
  });

  it("zbija powody w liczone etykiety i dobiera radę do najliczniejszego", () => {
    const { rejected, rejectedDetails } = rankFrameCandidates(
      [
        { primary: "Stań wyżej i nie patrz już nigdy." },
        { primary: "Daj nam znać, masz wciąż." },
        { primary: "Ślij wyżej, niech się tkwić." },
        { primary: "To jest po polsku i już." },
      ],
      quote,
      [],
      3,
    );
    assert.equal(rejected, 4);
    assert.deepEqual(rejectedDetails, ["polski w materiale (4)"]);
    const notice = buildFrameNotice(quote, rejected, rejectedDetails);
    assert.ok(notice.includes("polski w materiale (4)"), notice);
    assert.ok(notice.includes("po angielsku"), notice);
  });

  it("nie wymyśla przyczyny, gdy model nie oddał nic", () => {
    assert.ok(buildFrameNotice(quote, 0, []).includes("żadnego wariantu"));
    assert.ok(buildFrameNotice(quote, 2, []).includes("żaden nie trafił do układu"));
  });
});
