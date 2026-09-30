import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STARK_CTAS,
  formatStarkCaption,
  isPolishCopy,
  starkCaption,
  starkCta,
  starkHashtags,
  starkShortCaption,
  stripHashtagTail,
} from "./caption";

describe("caption.ts - Stark Focus Caption Formatter", () => {
  it("formats hook in uppercase and removes quotes and markdown", () => {
    const hook = '"Your comfort zone is a coffin with Wi-Fi"';
    const principles: [string, string, string] = [
      "Cut the digital noise.",
      "Work in deep isolation.",
      "Do not negotiate with fatigue.",
    ];
    const caption = formatStarkCaption(hook, principles);

    assert.ok(
      caption.startsWith("YOUR COMFORT ZONE IS A COFFIN WITH WI-FI\n\n"),
      "Should start with cleaned uppercase hook",
    );
  });

  it("includes all 3 numbered principles sequentially", () => {
    const principles: [string, string, string] = [
      "Rule One: Never negotiate.",
      "Rule Two: Silence is loud.",
      "Rule Three: Results only.",
    ];
    const caption = formatStarkCaption("Discipline test", principles);

    assert.ok(caption.includes("1. Rule One: Never negotiate."));
    assert.ok(caption.includes("2. Rule Two: Silence is loud."));
    assert.ok(caption.includes("3. Rule Three: Results only."));
  });

  it("uses the custom directive when provided", () => {
    const customDirective = "Stop making promises to people who do not care.";
    const caption = formatStarkCaption(
      "Direct action",
      ["Step A", "Step B", "Step C"],
      customDirective,
    );

    assert.ok(caption.includes(customDirective));
  });

  it("bez własnych linii nie wkleja banku zasad pod kazdy post", () => {
    const caption = formatStarkCaption("The stairwell does not ask how you feel.");

    assert.equal(caption.includes("Comfort is paid for in regret"), false);
    assert.equal(caption.includes("The standard you hold alone"), false);
    assert.equal(caption.includes("1."), false);
    // Zostaje to, co naprawde jest w materiale: teza, wezwanie, hashtagi.
    assert.ok(caption.startsWith("THE STAIRWELL DOES NOT ASK HOW YOU FEEL."));
    assert.ok(caption.includes("#starkfocus"));
  });

  it("opis bierze punkty z kadrow materialu, w ich kolejnosci", () => {
    const caption = formatStarkCaption("You lack a sequence.", [
      "Phone in another room.",
      "Hardest task first.",
    ]);

    assert.ok(caption.includes("1. Phone in another room."));
    assert.ok(caption.includes("2. Hardest task first."));
  });

  it("always appends the signature call to action and a short hashtag tail", () => {
    const caption = formatStarkCaption("Execution", ["A", "B", "C"]);

    assert.ok(STARK_CTAS.some((cta) => caption.includes(cta)));
    const tags = caption.trim().split("\n").pop()!.split(" ");
    assert.ok(tags.length <= 5, `Meta ucina powyzszej piatki: ${tags.join(" ")}`);
    assert.ok(tags.includes("#starkfocus"));
  });
});

describe("starkHashtags", () => {
  it("zbiera tagi z tematu posta, a nie ze stalej listy", () => {
    const silence = starkHashtags("Silence cannot be misquoted.");
    const time = starkHashtags("Maybe forty more summers. That is the whole budget.");
    const death = starkHashtags("Remember you will die, then set the alarm.");

    assert.ok(silence.includes("#silence") || silence.includes("#quietconfidence"));
    assert.ok(time.includes("#timemanagement") || time.includes("#perspective"));
    // Śmiertelna pula nie może już łapać każdego „day/hour" w niszy — dawniej
    // #mementomori schodził pod post o budziku.
    assert.ok(death.includes("#mementomori"));
    assert.ok(!time.includes("#mementomori"));
    assert.notDeepEqual(silence, time);
  });

  it("trzymany w ryzach: piec to sufit, markowy jest zawsze", () => {
    const tags = starkHashtags(
      "discipline silence stoic alone time pain focus motivation standards",
    );
    assert.ok(tags.length <= 5);
    assert.ok(tags.includes("#starkfocus"));
  });

  it("ten sam tekst daje ten sam zestaw, wiec opis nie zmienia sie przy odswiezeniu", () => {
    const text = "You rehearse the excuses, not the work.";
    assert.deepEqual(starkHashtags(text), starkHashtags(text));
  });

  it("bez trafienia w temat idzie w pewniakow marki", () => {
    assert.deepEqual(starkHashtags("xyz abc"), ["#stoicism", "#discipline", "#starkfocus"]);
  });

  it("smiertelna pula nie lyka kazdego dnia w niszy", () => {
    const alarm = starkHashtags("You set the alarm at four. Forty hours a week say otherwise.");
    assert.ok(!alarm.includes("#mementomori"), alarm.join(" "));
  });
});

describe("starkShortCaption", () => {
  it("pod cytatem stoi jedno zdanie, nie wyklad", () => {
    const caption = starkShortCaption(
      "You get one hour back a day.",
      "The hour is not lost. It is spent before your feet touch the floor. Then the whole day goes with it.",
    );
    assert.equal(
      caption
        .split("\n\n")[0]
        .split(/[.!?]\s/)
        .filter(Boolean).length,
      1,
    );
    assert.ok(caption.includes("#starkfocus"));
  });

  it("nie powtarza tezy kadru i nie bierze zdania po polsku", () => {
    const echo = starkShortCaption("Silence cannot be misquoted.", "Silence cannot be misquoted.");
    assert.ok(!echo.toLowerCase().includes("silence cannot be misquoted"), echo);
    const polish = starkShortCaption("Do the work.", "To jest rozwinięcie tematu.");
    assert.ok(!/[ąćęłńóśźż]/i.test(polish), polish);
  });
});

describe("stripHashtagTail", () => {
  it("sciaga liste tagow z opisu, kiedy hashtagi ida osobnym polem", () => {
    const caption = starkCaption("Do the work in the dark.", "The room is quiet by six.");
    assert.ok(caption.includes("#starkfocus"), caption);
    const bare = stripHashtagTail(caption);
    assert.ok(!bare.includes("#"), bare);
    assert.ok(bare.includes("The room is quiet by six."), bare);
  });

  it("nie tnie opisu, ktory konczy sie zdaniem, nie lista", () => {
    const text = "Do the work.\n\nNobody is coming to save you.";
    assert.equal(stripHashtagTail(text), text);
  });
});

describe("isPolishCopy", () => {
  it("wyłapuje polską diakrytykę i rodzime słowa", () => {
    assert.equal(isPolishCopy("To jest opis dla ciebie."), true);
    assert.equal(isPolishCopy("Nie negocjuj ze swoim standardem."), true);
    assert.equal(isPolishCopy("Zawsze wykonuj w ciszy."), true);
  });

  it("nie bierze angielskiego za polski", () => {
    assert.equal(isPolishCopy("Silence cannot be misquoted."), false);
    assert.equal(isPolishCopy("You are not tired. You are uninspired."), false);
  });
});

describe("starkCaption", () => {
  it("bierze treść od modelu, ale ogon dokleja markowy", () => {
    const caption = starkCaption(
      "Comfort is expensive.",
      "Most people pay for comfort every day and never look at the bill.",
    );

    assert.ok(caption.startsWith("COMFORT IS EXPENSIVE.\n\n"));
    assert.ok(caption.includes("pay for comfort every day"));
    const tail = caption.trim().split("\n").pop()!.split(" ");
    assert.ok(tail.length <= 5 && tail.includes("#starkfocus"));
  });

  it("wyrzuca hashtagi i wezwanie do działania modelu, żeby feed miał jeden ogon", () => {
    const caption = starkCaption(
      "Walk alone.",
      "Spectators cheer the attempt, never the work.\n#darkmotivation #hardwork\nFollow me for more.",
    );

    assert.equal(caption.includes("darkmotivation"), false);
    assert.equal(caption.includes("Follow me"), false);
    assert.ok(caption.includes("Spectators cheer the attempt"));
  });

  it("przy polskiej lub pustej treści modelu wraca do stałego schematu marki", () => {
    assert.equal(
      starkCaption("Silence speaks.", "Nie tłumacz się. Rób swoje i milcz."),
      formatStarkCaption("Silence speaks."),
    );
    assert.equal(starkCaption("Silence speaks.", ""), formatStarkCaption("Silence speaks."));
  });

  it("nie wypisuje tezy dwa razy, gdy model otwiera opis tym samym zdaniem", () => {
    const hook = "You stare at your phone screen.";
    const caption = starkCaption(
      hook,
      "You stare at your phone screen. Most men trade their hours for digital noise while pretending they are building something.",
    );
    const lines = caption.split("\n\n")[0];

    assert.equal(lines, "YOU STARE AT YOUR PHONE SCREEN.");
    assert.equal(
      caption.split(/you stare at your phone screen/i).length - 1,
      1,
      "teza ma paść w opisie dokładnie raz",
    );
    assert.match(caption, /digital noise/, "reszta zdania zostaje");
  });

  it("gdy model oddał TYLKO echo tezy, opis nie zostaje goły", () => {
    const caption = starkCaption("Rust works while you sleep.", "Rust works while you sleep.");
    assert.match(caption, /Rust works while you sleep\./);
    assert.ok(caption.length > "RUST WORKS WHILE YOU SLEEP.".length);
  });
});

describe("starkCta", () => {
  it("rotuje wezwanie po tresci posta, ale deterministycznie", () => {
    const a = "Rust works while you sleep.";
    const b = "Maybe forty more summers. That is the whole budget.";
    assert.equal(starkCta(a), starkCta(a));
    assert.ok(STARK_CTAS.includes(starkCta(a)));
    assert.ok(STARK_CTAS.includes(starkCta(b)));
    assert.notEqual(starkCta(a), starkCta(b), "dwa rozne posty nie moga miec identycznej stopki");
  });

  it("wezwanie wynika z ksztaltu tresci, nie z rzutu po hashu", () => {
    assert.equal(
      starkCta("The alarm goes at 4:40. You get up in the dark anyway."),
      "Keep it for the next morning you do not want to.",
    );
    assert.equal(
      starkCta("You slipped on Sunday. Monday is the restart, not the punishment."),
      "Send it to whoever is starting this over again on Monday.",
    );
    assert.equal(
      starkCta("1. Phone in another room. 2. Hardest task first. 3. No negotiations."),
      "Save this reminder. Execute in silence. Follow @stark_focus.",
    );
  });

  it("poniedzialek nie wchodzi pod protokol", () => {
    const protocol = "1. Cold room. 2. No phone. 3. First hour belongs to the work.";
    assert.notEqual(
      starkCta(protocol),
      "Send it to whoever is starting this over again on Monday.",
    );
  });
});

/**
 * Seria z radaru kończyła się tą samą linią pod każdym postem: kształt treści
 * w tej marce („poranek", „nikt nie sprawdza") pasuje do jednego wezwania, a
 * filtr brał tylko pasujące. Test trzyma obie własności naraz — wezwanie ma
 * pasować do treści i ma się różnić w obrębie partii.
 */
describe("wezwanie w partii", () => {
  const SIMILAR = [
    "You get one hour back a day. Nobody spends it.",
    "The alarm is not the discipline.",
    "Nobody is coming to check on you.",
    "The kettle is cold again at 4:40.",
    "Your standards dropped and nobody said anything.",
    "Consistency is boring on purpose.",
    "Motivation is a rented room.",
    "The first set is the whole workout.",
  ];

  it("osiem podobnych zdani nie konczy sie jednym podpisem", () => {
    const ctas = SIMILAR.map((hook, index) => starkCta(hook, index));
    for (const cta of ctas) assert.ok(STARK_CTAS.includes(cta), cta);
    assert.ok(
      new Set(ctas).size >= 3,
      `tylko ${new Set(ctas).size} roznych wezwan:\n${ctas.join("\n")}`,
    );
  });

  it("ten sam material o tej samej pozycji dostaje to samo wezwanie", () => {
    assert.equal(starkCta(SIMILAR[0], 2), starkCta(SIMILAR[0], 2));
  });

  it("opis z partii roznim ogonem niesie rózne wezwanie", () => {
    const tails = SIMILAR.map(
      (hook, index) => formatStarkCaption(hook, [], "", index).split("\n\n").slice(-2)[0],
    );
    assert.ok(new Set(tails).size >= 3, tails.join("\n"));
  });
});
