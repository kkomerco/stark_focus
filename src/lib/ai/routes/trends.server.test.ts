import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createApp } from "../../mini-express.server";
import {
  createCraft,
  craftLine,
  excludeBlock,
  normalizeCard,
  registerTrendsRoutes,
} from "./trends.server";
import { STARK_CTAS } from "../../caption";
import { hookFingerprint } from "../../similarity";

/**
 * Trasy radaru bez wywołania modelu: sprawdzamy wyrok na zdaniu (rzemiosło i
 * anty-powtórka), blok wykluczeń idący do promptu oraz to, co wychodzi z trasy,
 * gdy klucza API nie ma — bank treści też musi słuchać `excludeHooks`.
 * `GEMINI_API_KEY` usuwamy celowo: test nie ma prawa uderzyć w API.
 */
delete process.env["GEMINI_API_KEY"];

const app = createApp();
registerTrendsRoutes(app);

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
    payload: (await response.json()) as Record<string, unknown>,
  };
}

/** Wszystkie angielskie zdania z kart — do odkarmienia banku w drugim kroku. */
function englishLines(items: unknown): string[] {
  const lines: string[] = [];
  for (const item of Array.isArray(items) ? items : []) {
    const card = (item ?? {}) as Record<string, unknown>;
    for (const key of ["hook", "phrases", "viral_hooks"]) {
      const value = card[key];
      if (typeof value === "string") lines.push(value);
      if (Array.isArray(value)) lines.push(...value.map(String));
    }
  }
  return lines;
}

const GOOD = "Rust works while you sleep.";
const CLICHE = "Unlock your potential and embrace the grind.";
const PUBLISHED = "The axe complains about the wood.";

describe("craftLine — rzemiosło zdania", () => {
  it("wyrzuca kliszę, zanim dojdzie do UI", () => {
    const craft = createCraft([]);
    assert.equal(craftLine(CLICHE, craft, "hook"), "", "klisza nie może przejść miary hooka");
    assert.ok(
      craft.reasons.some((reason) => reason === "klisza"),
      `powód ma być nazwany, było: ${craft.reasons.join(", ")}`,
    );
    assert.equal(craftLine(GOOD, craft, "hook"), GOOD);
  });

  it("nie odda linii, która już poszła w feedzie — ani jej mutacji", () => {
    const craft = createCraft([hookFingerprint(PUBLISHED)]);
    assert.equal(craftLine(PUBLISHED, craft, "hook"), "");
    // Mutacja: inne słowa, ten sam szkielet zdania.
    const near = createCraft([hookFingerprint("You rehearse the excuses, not the work.")]);
    assert.equal(craftLine("You rehearse the excuses, never the work.", near, "hook"), "");
    assert.deepEqual(craft.reasons, ["powtórka tego, co już poszło w feedzie"]);
  });

  it("polski w materiale odpada, a notatka po polsku zostaje w swoim polu", () => {
    const craft = createCraft([]);
    assert.equal(craftLine("Wstawaj wcześniej i po prostu rób swoje.", craft, "hook"), "");
    assert.equal(craftLine(GOOD, craft, "plain"), GOOD);
  });
});

describe("normalizeCard — karta radaru", () => {
  it("gubi zdanie, nie całą kartę", () => {
    const craft = createCraft([]);
    const card = normalizeCard(
      {
        hook: CLICHE,
        phrases: [CLICHE, "You rehearse the excuses, not the work.", GOOD],
      },
      craft,
    );
    assert.equal(card.hook.includes("Unlock"), false, "klisza nie wróci jako teza");
    assert.deepEqual(card.phrases, ["You rehearse the excuses, not the work.", GOOD]);
  });

  it("hashtagi i CTA karty zawsze pochodzą z caption.ts", () => {
    const craft = createCraft([]);
    const card = normalizeCard({ hook: GOOD, phrases: [GOOD], caption: "Follow for more." }, craft);
    assert.ok(
      STARK_CTAS.some((cta) => card.caption.includes(cta)),
      `ogon musi być z puli marki: ${card.caption}`,
    );
    assert.equal(/follow for/i.test(card.caption), false, "żebranie o engagement odpada");
    assert.ok(card.hashtags.includes("#starkfocus"));
  });
});

describe("excludeBlock", () => {
  it("wkleja historię pod tą samą etykietą co frames.server", () => {
    const block = excludeBlock([GOOD]);
    assert.ok(block.startsWith("JUŻ OPUBLIKOWANE — nie powtarzaj tych linii ani ich mutacji:"));
    assert.ok(block.includes(`- ${GOOD}`));
    assert.equal(excludeBlock([]), "", "bez historii nie ma czego zakazywać");
  });
});

describe("POST /api/ai/viral-format-radar", () => {
  it("bank treści nie odda linii z excludeHooks i oznaczy się jako degraded", async () => {
    const first = await post("/api/ai/viral-format-radar", { niche: "monk mode" });
    assert.equal(first.degraded, "1", "bank treści nie może udawać wyniku modelu");
    const lines = englishLines(first.payload.formats);
    assert.ok(lines.length > 0, "bez klucza jest z czego budować bank");

    const excluded = lines.slice(0, 3).map((line) => hookFingerprint(line));
    const second = await post("/api/ai/viral-format-radar", {
      niche: "monk mode",
      excludeHooks: excluded,
    });
    const kept = englishLines(second.payload.formats);
    for (const line of excluded) {
      assert.equal(
        kept.some((candidate) => hookFingerprint(candidate) === line),
        false,
        `wykluczona linia wróciła: ${line}`,
      );
    }
  });

  it("rosnąca historia odkarmia cały bank i zostawia nazwany powód", async () => {
    const excluded: string[] = [];
    let last = 0;
    // Każda runda wyklucza to, co oddała poprzednia: bank jest skończony i musi
    // się wyczerpać zamiast milcząco powtarzać ten sam zestaw.
    for (let round = 0; round < 6; round++) {
      const { payload } = await post("/api/ai/viral-format-radar", { excludeHooks: excluded });
      const formats = Array.isArray(payload.formats) ? payload.formats : [];
      last = formats.length;
      if (last === 0) {
        assert.equal(typeof payload.notice, "string");
        assert.notEqual(payload.notice, "");
        return;
      }
      excluded.push(...englishLines(formats).map(hookFingerprint));
    }
    assert.fail(`bank treści nie wyczerpał się po sześciu rundach (ostatnio: ${last} kart)`);
  });
});

describe("POST /api/ai/scan-trends", () => {
  it("wątek z banku traci hook z historii, ale nie znika cały", async () => {
    const all = englishLines((await post("/api/ai/scan-trends", {})).payload.trends);
    const victim = all[0];
    assert.ok(victim);
    const { payload } = await post("/api/ai/scan-trends", {
      niche: "stoic discipline",
      excludeHooks: [hookFingerprint(victim)],
    });
    const kept = englishLines(payload.trends);
    assert.ok(kept.length > 0, "jedna wykluczona linia nie kasuje skanu");
    assert.equal(
      kept.some((line) => hookFingerprint(line) === hookFingerprint(victim)),
      false,
      "to, co już poszło, nie wraca z banku",
    );
  });
});

describe("POST /api/ai/angle-matrix", () => {
  it("opis kąta ma markowy ogon zamiast własnego wezwania", async () => {
    const { payload } = await post("/api/ai/angle-matrix", { topic: "poranne wstawanie" });
    const angles = Array.isArray(payload.angles) ? payload.angles : [];
    assert.ok(angles.length > 0);
    for (const angle of angles) {
      const caption = String((angle as Record<string, unknown>).caption);
      assert.ok(
        STARK_CTAS.some((cta) => caption.includes(cta)),
        `ogon musi być z puli marki: ${caption}`,
      );
      assert.equal(/follow for|comment below|like if/i.test(caption), false);
    }
  });
});

describe("POST /api/ai/evergreen-recycle", () => {
  it("remiks z banku też słucha excludeHooks", async () => {
    const source = { sourceText: "Discipline is identity, not mood." };
    const first = await post("/api/ai/evergreen-recycle", source);
    const lines = englishLines([first.payload.reel]);
    assert.ok(lines.length > 0, "bez klucza bank ma z czego zbudować rolkę");

    const second = await post("/api/ai/evergreen-recycle", {
      ...source,
      excludeHooks: lines.map((line) => hookFingerprint(line)),
    });
    const kept = englishLines([second.payload.reel]);
    assert.ok(kept.length > 0, "rolka zostaje, choć straciła wykluczone zdania");
    for (const line of lines) {
      assert.equal(
        kept.some((candidate) => hookFingerprint(candidate) === hookFingerprint(line)),
        false,
        `wykluczona linia wróciła w rolce: ${line}`,
      );
    }
  });
});
