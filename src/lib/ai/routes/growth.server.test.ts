import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../../mini-express.server";
import { craftVariants, craftWeek, createCraft, registerGrowthRoutes } from "./growth.server";
import { STARK_CTAS } from "../../caption";
import { hookFingerprint } from "../../similarity";
import { MIN_AB_VIEWS } from "../../published";

/**
 * Silnik wzrostu bez wywołania modelu: pętla A/B musi oddawać parę ramion z
 * rzemiosła (klisza gubi ramię, nie eksperyment), CTA wyłącznie z puli marki i
 * tydzień, który słucha `excludeHooks`. `GEMINI_API_KEY` usuwamy celowo — test
 * nie ma prawa uderzyć w API.
 */
delete process.env["GEMINI_API_KEY"];

const app = createApp();
registerGrowthRoutes(app);

async function post(path: string, body: unknown) {
  const response = await app.handle(
    new Request(`http://127.0.0.1:3000${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return {
    status: response.status,
    degraded: response.headers.get("x-stark-degraded"),
    payload: (await response.json()) as Record<string, any>,
  };
}

const variantsOf = (payload: Record<string, any>): Record<string, any>[] =>
  Array.isArray(payload.variants) ? payload.variants : [];

const CLICHE = "Unlock your potential and embrace the grind.";
const GOOD = "Rust works while you sleep.";

describe("craftVariants — eksperyment A/B", () => {
  it("klisza gubi ramię, a nie całą parę", () => {
    const craft = createCraft([]);
    const variants = craftVariants(
      [
        {
          hook: CLICHE,
          angle: "konfrontacja",
          phrases: [CLICHE, "You stay because it hurts less."],
        },
        { hook: GOOD, angle: "konkret", phrases: [GOOD, "The door closes quietly."] },
      ],
      craft,
    );
    assert.equal(variants.length, 1);
    assert.equal(variants[0].hook, GOOD);
    assert.ok(
      craft.reasons.some((reason) => reason === "klisza"),
      `powód ma być nazwany, było: ${craft.reasons.join(", ")}`,
    );
  });

  it("hook z historii nie wraca jako ramię eksperymentu", () => {
    const craft = createCraft([hookFingerprint(GOOD)]);
    const variants = craftVariants(
      [{ hook: GOOD, angle: "konkret", phrases: [GOOD, "The door closes quietly."] }],
      craft,
    );
    assert.deepEqual(variants, []);
    assert.ok(
      craft.reasons.every((reason) => reason === "powtórka tego, co już poszło w feedzie"),
      `same reasons expected, got: ${craft.reasons.join(", ")}`,
    );
    assert.ok(craft.reasons.length > 0);
  });
});

describe("POST /api/ai/ab-variants", () => {
  it("żaden CTA nie żebrze o engagement i każdy jest z puli marki", async () => {
    const { payload, degraded } = await post("/api/ai/ab-variants", { topic: "poranny rygor" });
    assert.equal(degraded, "1", "bank treści nie może udawać wyniku modelu");
    const variants = variantsOf(payload);
    assert.equal(variants.length, 2);
    assert.deepEqual(
      variants.map((variant) => variant.label),
      ["A", "B"],
    );
    for (const variant of variants) {
      assert.ok(
        STARK_CTAS.includes(variant.cta),
        `CTA spozza puli: ${JSON.stringify(variant.cta)}`,
      );
      assert.equal(/follow for|3 AM protocol|daily 5 AM/i.test(variant.cta), false);
      assert.equal(/follow for|comment below|like if/i.test(variant.caption), false);
    }
  });

  it("excludeHooks przesuwa parę na następne świeże ramiona banku", async () => {
    const first = await post("/api/ai/ab-variants", {});
    const used = variantsOf(first.payload).map((variant) => String(variant.hook));
    const second = await post("/api/ai/ab-variants", {
      excludeHooks: used.map((hook) => hookFingerprint(hook)),
    });
    const kept = variantsOf(second.payload).map((variant) => String(variant.hook));
    assert.equal(kept.length, 2, "bank ma cztery hooki, więc para się znajdzie");
    for (const hook of used) {
      assert.equal(kept.includes(hook), false, `opublikowany hook wrócił: ${hook}`);
    }
  });

  it("gdy cała para jest w historii, oddaje pustkę z nazwanym powodem", async () => {
    const first = variantsOf((await post("/api/ai/ab-variants", {})).payload).map((variant) =>
      String(variant.hook),
    );
    const second = variantsOf(
      (await post("/api/ai/ab-variants", { excludeHooks: first.map(hookFingerprint) })).payload,
    ).map((variant) => String(variant.hook));
    assert.equal(second.length, 2, "bank ma cztery hooki, więc druga para się znajdzie");

    const exhausted = await post("/api/ai/ab-variants", {
      excludeHooks: [...first, ...second].map(hookFingerprint),
    });
    assert.deepEqual(variantsOf(exhausted.payload), []);
    assert.equal(typeof exhausted.payload.notice, "string");
    assert.notEqual(exhausted.payload.notice, "");
  });
});

describe("POST /api/ai/ab-conclusion", () => {
  const row = (label: "A" | "B", views: number, likes: number) => ({
    label,
    views,
    likes,
    comments: 0,
    shares: 0,
    saves: 0,
    hook: label === "A" ? "Rust works while you sleep." : "Comfort is a cage with the door open.",
    publishedAt: "2026-09-20",
  });

  it("odmowa nie ma zwycięzcy i nazywa, ile wyświetleń brakuje", async () => {
    const { payload } = await post("/api/ai/ab-conclusion", {
      experimentId: "ab-1",
      results: [row("A", 1, 10), row("B", 400, 40)],
    });

    assert.equal(payload.status, "insufficient_data");
    assert.equal(payload.winner, null, "brak próby nie może wyjechać jako rozstrzygnięcie");
    assert.equal(payload.missing.length, 1);
    assert.equal(payload.missing[0].label, "A");
    assert.equal(payload.missing[0].needs, MIN_AB_VIEWS - 1);
    assert.match(payload.lesson, /Bez rozstrzygnięcia/);
    assert.doesNotMatch(payload.lesson, /miał engagement/, "lekcja bez danych nie liczy różnicy");
  });

  it("próg próby liczy ten sam `MIN_AB_VIEWS` co w interfejsie", async () => {
    const justUnder = await post("/api/ai/ab-conclusion", {
      results: [row("A", MIN_AB_VIEWS - 1, 9), row("B", MIN_AB_VIEWS, 1)],
    });
    assert.equal(justUnder.payload.winner, null);

    const decided = await post("/api/ai/ab-conclusion", {
      results: [row("A", MIN_AB_VIEWS, 9), row("B", MIN_AB_VIEWS, 1)],
    });
    assert.equal(decided.payload.status, "decided");
    assert.equal(decided.payload.winner, "A");
    assert.match(decided.payload.lesson, /Wariant A/);
  });

  it("liczby od klienta nie wchodzą nieklampowane", async () => {
    const { payload } = await post("/api/ai/ab-conclusion", {
      results: [
        row("A", "-5" as never, "1e9" as never),
        row("B", "bzdura" as never, 3),
        ...Array.from({ length: 12 }, () => row("A", 500, 5)),
      ],
    });

    assert.equal(payload.scored.length, 8, "lista wyników jest ucięta");
    assert.equal(payload.scored[0].views, 0, "ujemne wyświetlenia nie ujemnym mianownikiem");
    assert.equal(Number.isFinite(payload.scored[1].views), true);
    assert.equal(payload.winner, null, "zero na jednym wariancie to odmowa, nie wniosek");
  });

  it("gdy warianty różniły się też muzyką, lekcja nie przypisuje wyniku hookowi", async () => {
    const { payload } = await post("/api/ai/ab-conclusion", {
      results: [
        { ...row("A", 400, 40), music: "Obsidian Drone" },
        { ...row("B", 400, 4), music: "Carbon Pulse" },
      ],
    });

    assert.equal(payload.winner, "A");
    assert.match(payload.lesson, /nie da się tego przypisać samemu hookowi/i);
  });

  it("brak obu wariantów to błąd, nie pusty wniosek", async () => {
    const { status } = await post("/api/ai/ab-conclusion", { results: [row("A", 500, 5)] });
    assert.equal(status, 400);
  });
});

describe("craftWeek — hooki dnia", () => {
  const day = (index: number, hook: string, topic: string) => ({
    day: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index],
    topic,
    hookOfDay: hook,
    plan: `Dzień ${index + 1}: jedna rolka w ciszy.`,
  });

  it("dzień zostaje, choć jego hook odpada w kontroli", () => {
    const craft = createCraft([]);
    const week = craftWeek(
      Array.from({ length: 7 }, (_, idx) =>
        day(idx, idx === 0 ? CLICHE : GOOD, `focus and silence day ${idx}`),
      ),
      craft,
    );
    assert.ok(week);
    assert.equal(week.length, 7, "autopilot bez siedmiu dni nie jest planem tygodnia");
    assert.equal(week[0].hookOfDay, "", "klisza nie wejdzie do planu");
    assert.equal(week[0].topic.includes("focus"), true, "dzień nie traci tematu razem z hookiem");
    assert.equal(week[1].hookOfDay, GOOD);
    assert.equal(week[2].hookOfDay, "", "drugi raz w tej samej odpowiedzi to powtórka");
    assert.ok(craft.reasons.includes("klisza"));
    assert.ok(craft.reasons.includes("powtórka w tej samej odpowiedzi"));
  });

  it("hook z historii nie wejdzie do żadnego dnia tygodnia", () => {
    const craft = createCraft([hookFingerprint(GOOD)]);
    const week = craftWeek(
      Array.from({ length: 7 }, (_, idx) => day(idx, GOOD, `solitude ${idx}`)),
      craft,
    );
    assert.ok(week);
    assert.deepEqual(
      week.map((entry) => entry.hookOfDay),
      ["", "", "", "", "", "", ""],
    );
    assert.equal(
      craft.reasons.every((reason) => reason === "powtórka tego, co już poszło w feedzie"),
      true,
      `każdy dzień musi zgłosić powtórkę: ${craft.reasons.join(", ")}`,
    );
    assert.equal(craft.reasons.length, 7);
  });

  it("inna liczba dni niż siedem to brak planu, nie plan ucięty", () => {
    assert.equal(craftWeek([day(0, GOOD, "focus")], createCraft([])), null);
  });
});

describe("POST /api/ai/weekly-autopilot", () => {
  it("przyjmuje excludeHooks i zawsze oddaje siedem dni", async () => {
    const { payload, degraded } = await post("/api/ai/weekly-autopilot", {
      excludeHooks: [hookFingerprint(GOOD)],
    });
    assert.equal(degraded, "1", "tydzień z banku nie jest wynikiem modelu");
    assert.equal(Array.isArray(payload.week), true);
    assert.equal(payload.week.length, 7);
    for (const entry of payload.week) {
      assert.equal(typeof entry.topic, "string");
      assert.equal(typeof entry.hookOfDay, "string");
      assert.equal(typeof entry.plan, "string");
    }
  });
});

describe("POST /api/ai/reroll-prompt", () => {
  it("oznacza bank odpowiedzi i nie przepuszcza długiego referencyjnego promptu", async () => {
    const { payload, degraded } = await post("/api/ai/reroll-prompt", {
      referencePrompt: "x".repeat(5000),
      format: "1:1",
    });
    assert.equal(degraded, "1");
    assert.equal(typeof payload.prompt, "string");
    assert.ok(payload.prompt.length < 5000, "prompt tła nie może urosnąć do rozmiaru żądania");
  });
});
