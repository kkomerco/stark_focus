import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditHook, isAiSlop, HOOK_ARCHETYPES } from "./hookCraft";
import { buildHookPrompt, rankHookCandidates } from "./ai/routes/hooks.server";

describe("auditHook", () => {
  it("odrzuca klisze, abstrakt w roli podmiotu i ugaszony koniec", () => {
    assert.equal(isAiSlop("Unlock your potential and embrace the discipline."), true);
    assert.equal(isAiSlop("Discipline is the key to everything, but it's worth it."), true);
    assert.equal(isAiSlop("Most men quit when it gets hard, and that's the real victory."), true);
    assert.equal(isAiSlop("Tag a friend who needs this."), true);
  });

  it("puszcza zdanie z konkretem, gestem albo liczba", () => {
    assert.equal(auditHook("You rehearse the excuses, not the work.").ok, true);
    assert.equal(auditHook("Maybe forty more summers. That is the whole budget.").ok, true);
    assert.equal(auditHook("Rust works while you sleep.").ok, true);
  });

  it("pilnuje dlugosci kadru", () => {
    assert.equal(isAiSlop("Go."), true);
    assert.equal(
      isAiSlop(
        "You constantly allow external distractions to sabotage the promises you made in private last winter.",
      ),
      true,
    );
  });

  it("wyłapuje rym i pompa", () => {
    assert.equal(isAiSlop("Stand tall and never fall."), true);
    assert.equal(isAiSlop("You are the citadel of your own fate."), true);
  });
});

describe("rankHookCandidates", () => {
  const raw = [
    { line: "Unlock your potential.", archetype: "ledger", generic_risk: 1 },
    { line: "Rust works while you sleep.", archetype: "object", generic_risk: 2 },
    { line: "The door closes quietly.", archetype: "quiet-close", generic_risk: 9 },
    { line: "Rust works while you sleep.", archetype: "object", generic_risk: 3 },
    {
      line: "You already paid. You just have not received it.",
      archetype: "ledger",
      generic_risk: 4,
    },
  ];

  it("wyrzuca klisze i duplikaty, liczac odrzuconych", () => {
    const { candidates, rejected } = rankHookCandidates(raw, [], 10);
    assert.equal(
      candidates.some((c) => c.line.includes("Unlock")),
      false,
    );
    assert.equal(candidates.filter((c) => c.line.startsWith("Rust")).length, 1);
    assert.ok(rejected >= 2);
  });

  it("sortuje po ryzyku bycia ogolnikiem, nie po kolejnosci z modelu", () => {
    const { candidates } = rankHookCandidates(raw, [], 10);
    assert.deepEqual(
      candidates.map((c) => c.genericRisk),
      [...candidates.map((c) => c.genericRisk)].sort((a, b) => a - b),
    );
  });

  it("nie daje dwóch kandydatów z tej samej figury nad miare", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      line: `Rust works while you sleep ${i}.`,
      archetype: "object",
      generic_risk: 1,
    }));
    const { candidates } = rankHookCandidates(many, [], 6);
    assert.equal(candidates.length, 2);
  });

  it("nie odda linii, ktora juz poszla w feedzie", () => {
    const { candidates } = rankHookCandidates(raw, ["Rust works while you sleep."], 10);
    assert.equal(
      candidates.some((c) => c.line.startsWith("Rust")),
      false,
    );
  });
});

describe("buildHookPrompt", () => {
  it("wkleja wszystkie figury i liste zakazow", () => {
    const prompt = buildHookPrompt({ topic: "zima", shape: "1 zdanie", exclude: [], count: 5 });
    for (const archetype of HOOK_ARCHETYPES) assert.ok(prompt.includes(archetype.id));
    assert.ok(prompt.includes("Zakazane frazy"));
  });

  it("przekazuje opublikowane hooki jako zakaz powtorki", () => {
    const prompt = buildHookPrompt({
      topic: "zima",
      shape: "",
      exclude: ["Silence cannot be misquoted."],
      count: 5,
    });
    assert.ok(prompt.includes("Silence cannot be misquoted."));
    assert.ok(prompt.includes("nie powtarzaj"));
  });
});
