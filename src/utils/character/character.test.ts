import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { figureBounds } from "./rig";
import { POSES, SCENES, sceneSeconds, type PoseId } from "./poses";

const U = 1000;

describe("rig", () => {
  it("rys mieści się w skali, jaką rezerwuje dla niego kadr", () => {
    // Pudełko to głowa→podeszwa, ale ręce w górze (upadek, wspinanie) wychodzą
    // nad nie i to jest poprawne. Miara jest więc zasięg rysu: musi być na
    // tyle mały, że skalowanie przez `height` nadal mieści postać w kadrze.
    for (const name of Object.keys(POSES) as PoseId[]) {
      const { top, bottom } = figureBounds(U, POSES[name].pose);
      const extent = bottom - top;
      assert.ok(extent <= U * 1.35, `${name}: rys ma ${Math.round(extent)} px przy ${U}`);
      assert.ok(bottom <= U * 1.02, `${name}: coś spada pod kadr (${bottom})`);
    }
  });

  it("siedzący opiera się o dno, a nie wisi nad podłogą", () => {
    const sitting = figureBounds(U, POSES.slump.pose);
    const standing = figureBounds(U, POSES.stand.pose);
    // Miednica siedzącego musi być wyrażej niż u stojącego — to ten błąd,
    // przez który „siada" metr nad ziemią.
    assert.ok(sitting.bottom <= standing.bottom + U * 0.02);
  });
});

describe("scenki", () => {
  it("każda ma cztery takty i mieści się w roli 8-14 s", () => {
    for (const scene of SCENES) {
      assert.equal(scene.beats.length, 4, scene.id);
      const seconds = sceneSeconds(scene);
      assert.ok(seconds >= 8 && seconds <= 14, `${scene.id}: ${seconds}s`);
    }
  });

  it("każda kończy się wyprostowaniem, nie upadkiem", () => {
    for (const scene of SCENES) {
      const last = scene.beats[scene.beats.length - 1].pose;
      assert.ok(
        ["rise", "climb"].includes(last),
        `${scene.id}: pointa to ${last}, a ma być ruch do góry`,
      );
    }
  });

  it("treść wybiera scenkę, a nie los", () => {
    assert.equal(
      SCENES.find((s) => s.id === "scroll")?.match.test("You scroll for three hours."),
      true,
    );
    assert.equal(
      SCENES.find((s) => s.id === "weight")?.match.test("You carry it in silence."),
      true,
    );
  });
});
