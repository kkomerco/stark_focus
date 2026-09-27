import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { HOOK_CRAFT_PROMPT, auditHook, auditLine, isAiSlop } from "./hookCraft";

describe("HOOK_CRAFT_PROMPT", () => {
  it("niesie zasadę zrozumiałości bez kontekstu, bo reszta bloku wymusza konkret", () => {
    // Bez tej reguły model pisze scenki („You delete the chat draft.") — zdanie
    // namacalne, ale puste, więc czytelnik przewija.
    assert.match(HOOK_CRAFT_PROMPT, /zrozumiałości bez kontekstu/);
    assert.match(HOOK_CRAFT_PROMPT, /gest bez konsekwencji/);
  });
});

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

  it("dwa -ing to angielski, nie rym", () => {
    // Fałsz tego testu wywracał cały kadr kosztów: sześć wariantów, zero
    // przyjętych, bo „losing / breathing" brało się za rym.
    assert.equal(auditLine("Losing the chapters you meant to read while breathing").ok, true);
  });
});
