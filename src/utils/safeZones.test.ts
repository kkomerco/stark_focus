import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MIN_TEXT_PX, bandCenter, floorFor, safeBand } from "./safeZones";

describe("safeZones", () => {
  it("rolka ustępuje miejsca interfejsowi platformy", () => {
    const band = safeBand(1920, 1080, true);

    assert.equal(band.top, 250);
    assert.equal(band.bottom, 1920 - 480);
    assert.equal(band.side, 120);
    assert.ok(bandCenter(band) < 1920 / 2, "środek pasa musi leżeć nad paskiem opisu");
  });

  it("kadr feedowy zostaje wyśrodkowany, bo nic na nim nie leży", () => {
    const band = safeBand(1080, 1080, false);

    assert.ok(Math.abs(bandCenter(band) - 1080 / 2) <= 1);
  });

  it("ten sam pas w skali 2x daje podwojone marginesy", () => {
    const small = safeBand(1920, 1080, true);
    const large = safeBand(3840, 2160, true);

    assert.equal(large.top, small.top * 2);
    assert.equal(large.side, small.side * 2);
  });

  it("podłoga pisma nie podnosi tego, kto świadomie jest mały", () => {
    assert.equal(floorFor(64), MIN_TEXT_PX);
    assert.equal(floorFor(24), 24);
  });
});
