import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { structuredSpec } from "../ideaLayout";
import { groupText, layerById, nextLayerId, PRIMARY_LAYER_ID } from "./layerRoles";

/**
 * Kontrakt, na którym trzyma się edycja materiału: render czyta treść z tych
 * samych warstw, które poprawia edytor. Kiedyś treść leżała dublem w
 * `layoutData` i poprawka w edytorze nie była widoczna na kadrze.
 */
describe("canvas/layerRoles - warstwa jako jedyne źródło treści", () => {
  const cost = structuredSpec("Koszt i utrata", "cost_vs_reward", {
    primary: "What does it cost to stay who you are?",
    cost: ["One hour you will never get back", "The promise you broke in private"],
    forfeit: ["The body you had two years ago"],
    closing: "You already paid. Decide what it bought.",
  });

  it("oddaje każdą rolę kadru z powrotem po id", () => {
    assert.equal(layerById(cost, PRIMARY_LAYER_ID), "What does it cost to stay who you are?");
    assert.deepEqual(groupText(cost, "cost"), [
      "One hour you will never get back",
      "The promise you broke in private",
    ]);
    assert.deepEqual(groupText(cost, "forfeit"), ["The body you had two years ago"]);
    assert.equal(layerById(cost, "closing"), "You already paid. Decide what it bought.");
  });

  it("nie trzyma kopii treści obok warstw", () => {
    assert.deepEqual(cost.layoutData, {});
  });

  it("pomija puste pozycje, żeby edytor nie rysował dziur", () => {
    const withGap = structuredSpec("Protokół", "protocol_list", {
      primary: "Teza",
      steps: ["Krok jeden", "", "Krok trzy"],
    });
    assert.deepEqual(groupText(withGap, "step"), ["Krok jeden", "Krok trzy"]);
  });

  it("numeruje nową warstwę po najwyższym id, nie po długości listy", () => {
    const protocol = structuredSpec("Protokół", "protocol_list", {
      primary: "Teza",
      steps: ["Jeden", "Dwa", "Trzy"],
    });
    const withoutMiddle = {
      ...protocol,
      textLayers: protocol.textLayers.filter((layer) => layer.id !== "step2"),
    };
    assert.equal(nextLayerId(withoutMiddle, "step"), "step4");
    assert.equal(nextLayerId(protocol, "t"), "t2");
  });
});
