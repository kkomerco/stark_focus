// src/utils/canvasRenderer.test.ts
// Siatka bezpieczeństwa pod rendererami kadru.
//
// Cały błąd klasy, którą wyprowadzaliśmy z aplikacji ręcznie: układ brał tylko
// pierwszą warstwę tekstu i malował ją stałym pismem przez cały kadr, więc
// cztery zdania od modelu znikały, a longa wychodziła za krawędzie. Nikt tego
// nie widział w testach, bo renderery nie miały żadnego — patrzyłem na PNG-i.
//
// Nie ma tu pikseli: podstawiamy atrapy `canvas` i `ctx`, które zapisują każde
// `fillText`. To wystarcza, żeby złapać zgubiony wiersz, wiersz szerszy niż
// kolumna i krój inny niż wybrany w studiu.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderUniversalLayout } from "./canvasRenderer";
import { BRAND_ACCENT } from "./starkBrandTheme";
import { structuredSpec } from "./ideaLayout";
import { UniversalLayoutSpec } from "../types";

const WIDTH = 1080;
const HEIGHT = 1920;

interface Drawn {
  text: string;
  font: string;
  align: string;
  x: number;
  y: number;
}

const MARGIN = Math.round(WIDTH * 0.09);

/** Lewa krawędź narysowanego pisma — zależnie od wyrównania, nie „x”. */
function inkLeft(entry: Drawn, width: number): number {
  if (entry.align === "center") return entry.x - width / 2;
  if (entry.align === "right") return entry.x - width;
  return entry.x;
}

/**
 * Atryt mierzy szerokość wprost z rozmiaru pisma, więc każde `wrapTextLines`
 * dostaje ten sam świat co w przeglądarce: zbyt długi, nielineczony tekst
 * wychodzi poza kolumnę i test to widzi.
 */
function fakeCanvas() {
  const drawn: Drawn[] = [];
  const paths: Array<{ color: string; points: Array<[number, number]> }> = [];
  let current: Array<[number, number]> = [];
  const state: Record<string, unknown> = {
    font: "10px sans-serif",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
    globalAlpha: 1,
  };

  const record = (text: string, x: number, y: number) => {
    drawn.push({
      text: String(text),
      font: String(state.font),
      align: String(state.textAlign),
      x,
      y,
    });
  };

  const target: Record<string, unknown> = {
    fillText: (text: string, x: number, y: number) => record(text, x, y),
    strokeText: (text: string, x: number, y: number) => record(text, x, y),
    measureText: (text: string) => {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(String(state.font))?.[1] ?? 16);
      const weight = /(^|\s)(700|800|900)\s/.test(String(state.font)) ? 0.6 : 0.55;
      return { width: String(text).length * size * weight };
    },
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    createPattern: () => null,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(Math.max(1, w * h) * 4),
    }),
    drawImage: () => undefined,
    beginPath: () => {
      current = [];
    },
    moveTo: (x: number, y: number) => {
      current = [[x, y]];
    },
    lineTo: (x: number, y: number) => {
      current.push([x, y]);
    },
    stroke: () => {
      paths.push({ color: String(state.strokeStyle), points: [...current] });
    },
  };

  const ctx = new Proxy(target, {
    get: (obj, key: string) => {
      if (key in obj) return obj[key];
      if (key in state) return state[key];
      return () => undefined;
    },
    set: (_obj, key: string, value: unknown) => {
      state[key] = value;
      return true;
    },
  });

  const canvas = {
    width: WIDTH,
    height: HEIGHT,
    getContext: () => ctx,
    toDataURL: () => "data:image/png;base64,",
  };

  return { canvas, drawn, paths };
}

function render(spec: UniversalLayoutSpec, fontFamily = "cinzel") {
  const { canvas, drawn } = fakeCanvas();
  renderUniversalLayout(canvas as unknown as HTMLCanvasElement, spec, [], {
    width: WIDTH,
    height: HEIGHT,
    fontFamily,
    textScale: 1,
    handle: "@stark_focus",
    fontColor: "white",
  });
  return drawn.filter((entry) => entry.text.trim().length > 0);
}

/**
 * Ten sam render, ale dla znaku marki: klamry nie są tekstem, więc test musi
 * patrzeć na ścieżki. Zostawiamy tylko łamane złożone z trzech punktów —
 * dokładnie tyle ma róg klamry, a siatka kolażu rysuje swoje linie z dwóch.
 */
function renderBrackets(spec: UniversalLayoutSpec) {
  const { canvas, paths } = fakeCanvas();
  renderUniversalLayout(canvas as unknown as HTMLCanvasElement, spec, [], {
    width: WIDTH,
    height: HEIGHT,
    fontFamily: "cinzel",
    textScale: 1,
    handle: "@stark_focus",
    fontColor: "white",
  });
  return paths.filter((path) => path.points.length === 3);
}

const PROTOCOL = structuredSpec("Protokół", "protocol_list", {
  primary: "You don't lack discipline. You lack a sequence you repeat on the worst day.",
  steps: [
    "Phone in another room before the first block.",
    "Hardest task gets the first hour, not the last.",
    "No negotiations with yourself before noon.",
  ],
  figure: "72h",
});

const COST = structuredSpec("Koszt i utrata", "cost_vs_reward", {
  primary: "What does the first hour of your day actually cost?",
  cost: ["Leaving the heater off at four", "Setting the barbell on frost"],
  forfeit: ["Stepping into frozen air with wet hair", "Splitting the skin across your knuckle"],
  closing: "Pay the floor in sweat.",
});

const COLLAGE = structuredSpec("Kolaż", "grid_2x2", {
  primary: "Work unseen",
});
// Studio pokazuje panel „Wgraj zdjęcia" tylko wtedy, gdy kadr mówi ile ma
// slotów — bez tego kolaż z generatora nie miał gdzie przyjąć czterech kadrów.
assert.equal(COLLAGE.slotCount, 4);
assert.deepEqual(COLLAGE.slotLabels, ["Kadr 1", "Kadr 2", "Kadr 3", "Kadr 4"]);

const QUOTE = structuredSpec("Cytat", "none_solid", {
  primary: "You get one hour back a day. Nobody spends it.",
});

describe("renderUniversalLayout", () => {
  for (const [name, spec] of [
    ["protokół", PROTOCOL],
    ["koszt", COST],
    ["kolaż", COLLAGE],
    ["cytat", QUOTE],
  ] as Array<[string, UniversalLayoutSpec]>) {
    it(`${name}: kazdy napis z textLayers trafia na kadr`, () => {
      const all = render(spec)
        .map((entry) => entry.text)
        .join(" ")
        .toLowerCase();
      for (const layer of spec.textLayers) {
        const text = (layer.text ?? "").trim();
        if (!text) continue;
        const words = text.split(/\s+/);
        // Pierwsze i ostatnie slowo wiersza: zgubiony lub uciety ogon widac
        // od razu, a lamania linii nie daja falszywego przejścia.
        const first = words[0].toLowerCase();
        const last = words[words.length - 1].toLowerCase();
        assert.ok(
          all.includes(first) && all.includes(last),
          `brak na kadrze: „${text}" (szukam „${first}" i „${last}")`,
        );
      }
    });

    it(`${name}: kazdy napis miesci sie w polu tekstu, od marginesu do marginesu`, () => {
      for (const entry of render(spec)) {
        const size = Number(/(\d+(?:\.\d+)?)px/.exec(entry.font)?.[1] ?? 0);
        const weight = /(^|\s)(700|800|900)\s/.test(entry.font) ? 0.6 : 0.55;
        const width = entry.text.length * size * weight;
        // Polowa znaku tolerancji: nasza miara jest syntetyczna, a krawedzny
        // znak potrafi wystac o piksel-dwa nawet przy poprawnym lamaniu.
        const slack = size * 0.6;
        const left = inkLeft(entry, width);
        assert.ok(
          left >= MARGIN - slack && left + width <= WIDTH - MARGIN + slack,
          `„${entry.text}" zajmuje ${Math.round(left)}-${Math.round(left + width)} px, pole ma ${MARGIN}-${WIDTH - MARGIN}`,
        );
      }
    });
  }

  it("kolaż niesie napis i cztery kadry — nie cztery podpisy w ćwiartkach", () => {
    const drawn = render(COLLAGE);
    assert.ok(drawn.length >= 1, "napis zniknął z kadru");
    for (const entry of drawn) {
      if (entry.text.startsWith("@")) continue;
      // Każda narysowana linia to fragment napisu (może się łamać na dwie),
      // nic więcej: dawniej dochodziły cztery wiersze ćwiartek.
      for (const word of entry.text.toLowerCase().split(/\s+/)) {
        assert.ok(/work|unseen/.test(word), `obcy tekst na kolażu: „${entry.text}”`);
      }
    }
    // Podpis ma uderzać rozmiarem, nie pełnić roli stopki pod siatką.
    const labelSize = Number((drawn[0].font.match(/(\d+)px/) ?? [])[1]);
    assert.ok(labelSize >= 100, `rozmiar napisu ${labelSize}px — za mały na środek kadru`);
    assert.equal(QUOTE.slotCount, 0, "sloty należą się tylko układowi ze zdjęciami");
  });

  it("krój ze speca schodzi na tezę kadru, nie domyślny literał układu", () => {
    const chosen = { ...PROTOCOL, fontFamilyCustom: "cormorant" };
    const thesis = render(chosen)[0];
    assert.ok(thesis.font.includes("Cormorant Garamond"), thesis.font);
  });

  it("pusty wers to pusty kadr, nie zdanie z biblioteki", () => {
    const empty = structuredSpec("Cytat", "none_solid", { primary: "" });
    const drawn = render(empty);
    assert.ok(
      !drawn.some((entry) => entry.text.toLowerCase().includes("silence cannot be misquoted")),
      drawn.map((entry) => entry.text).join(" | "),
    );
  });

  // Sygnet marki: klamry narożne pola treści. Jeden akcent karmazynu (górny
  // lewy róg), reszta kością — inaczej kadr ma dwa krzyki na raz.
  it("sygnet: cztery klamry na kadrze, karmazyn tylko w górnym lewym rogu", () => {
    for (const [name, spec] of [
      ["cytat", QUOTE],
      ["protokół", PROTOCOL],
      ["koszt", COST],
      ["kolaż", COLLAGE],
    ] as Array<[string, UniversalLayoutSpec]>) {
      const corners = renderBrackets(spec);
      assert.equal(corners.length, 4, `${name}: klamer jest ${corners.length}`);
      const crimson = corners.filter((corner) => corner.color === BRAND_ACCENT);
      assert.equal(crimson.length, 1, `${name}: karmazynowych rogów jest ${crimson.length}`);
      const all = corners.map((corner) => corner.points[1]);
      const accent = crimson[0].points[1];
      assert.equal(
        accent[0],
        Math.min(...all.map(([x]) => x)),
        `${name}: karmazyn nie jest lewym rogiem`,
      );
      assert.equal(
        accent[1],
        Math.min(...all.map(([, y]) => y)),
        `${name}: karmazyn nie jest górnym rogiem`,
      );
    }
  });

  it("sygnet: klamry zostają przy naszej kompozycji, nie na kopii cudzej", () => {
    const replica: UniversalLayoutSpec = { ...QUOTE, gridType: "studio_wall_3d" };
    assert.equal(renderBrackets(replica).length, 0);
  });

  it("cytat: zdanie markowe nie siada poniżej pisma plakatu", () => {
    const thesis = render(QUOTE)[0];
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(thesis.font)?.[1] ?? 0);
    assert.ok(
      size >= 90,
      `teza ma ${size}px na kadrze ${WIDTH}x${HEIGHT} — dawniej drabinka zatrzymywała ją na 64px`,
    );
  });
});
