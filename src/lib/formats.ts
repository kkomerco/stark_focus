// src/lib/formats.ts
// Jedna tabela formatów kadru: co wypełnia model, co rysuje studio.
//
// "Generuj z AI" w studio posta prosiło model o jedno zdanie i wstawiało dwa
// pola (`main`, `sub`), więc każdy format inny niż cytat zapadał się z powrotem
// w cytat na czerni. Żeby generator pisał pod układ, układ musi mieć opis w
// jednym miejscu — stąd `FRAME_FORMATS`: ten sam plik czyta prompt serwera i
// studio budujące `textLayers`.
import { UniversalLayoutSpec } from "../types";

export type FrameFormatId = "quote" | "protocol" | "cost" | "diagram" | "sign" | "collage";

export interface FrameFormat {
  id: FrameFormatId;
  /** Etykieta po polsku — to UI, nie materiał. */
  label: string;
  gridType: UniversalLayoutSpec["gridType"];
  layoutName: string;
  /** Co model ma zwrócić dla tego formatu, w jednym zdaniu po polsku. */
  shape: string;
  /** Pola struktury wraz z limitem wierszy — po to, żeby dało to zweryfikować. */
  fields: Array<{
    key: "primary" | "steps" | "cost" | "forfeit" | "closing";
    label: string;
    /** 0 = pole pojedyncze (zdanie), >0 = lista o dokładnie tylu wierszach. */
    list?: number;
    words: string;
  }>;
}

export const FRAME_FORMATS: readonly FrameFormat[] = [
  {
    id: "quote",
    label: "Cytat",
    gridType: "none_solid",
    layoutName: "Cytat",
    shape: "Jedno zdanie, które obroni się bez kontekstu.",
    fields: [{ key: "primary", label: "Zdanie", words: "4-10" }],
  },
  {
    id: "protocol",
    label: "Protokół",
    gridType: "protocol_list",
    layoutName: "Protokół",
    shape:
      "Teza plus trzy kroki w kolejnosci wykonania. Krok to czynnosc czytelnika z jego dnia " +
      "(telefon, biurko, pierwszy blok pracy, sen), nie rekwizyt z martwej natury.",
    fields: [
      { key: "primary", label: "Teza", words: "5-12" },
      { key: "steps", label: "Kroki", list: 3, words: "5-12" },
    ],
  },
  {
    id: "cost",
    label: "Koszt i utrata",
    gridType: "cost_vs_reward",
    layoutName: "Koszt i utrata",
    shape: "Pytanie o cenę, dwa słupki: co płacisz teraz, co tracisz, i puenta.",
    fields: [
      { key: "primary", label: "Pytanie", words: "5-12" },
      { key: "cost", label: "Cena", list: 3, words: "3-8" },
      { key: "forfeit", label: "Utrata", list: 3, words: "3-8" },
      { key: "closing", label: "Puenta", words: "4-10" },
    ],
  },
  {
    id: "diagram",
    label: "Diagram",
    gridType: "concept_diagram",
    layoutName: "Diagram",
    shape: "Jedno zdanie pod szkic i jedna puenta pod spodem. Mało tekstu — rysunek niesie resztę.",
    fields: [
      { key: "primary", label: "Zdanie", words: "4-9" },
      { key: "closing", label: "Puenta", words: "4-9" },
    ],
  },
  {
    id: "sign",
    label: "Napis w scenie",
    gridType: "studio_wall_3d",
    layoutName: "Napis w scenie",
    shape: "Napis na ścianie: tyle słów, ile zmieści się w kadrze bez łamania.",
    fields: [{ key: "primary", label: "Napis", words: "3-7" }],
  },
  {
    id: "collage",
    label: "Kolaż",
    gridType: "grid_2x2",
    layoutName: "Kolaż",
    shape: "Teza + cztery kadry z tego samego tematu, każdy osobno czytelny.",
    fields: [
      { key: "primary", label: "Teza", words: "4-10" },
      { key: "steps", label: "Kadry", list: 4, words: "3-8" },
    ],
  },
];

export function formatById(id: string): FrameFormat | undefined {
  return FRAME_FORMATS.find((format) => format.id === id);
}

export function formatByGrid(gridType: string): FrameFormat | undefined {
  return FRAME_FORMATS.find((format) => format.gridType === gridType);
}

/** Sam prompt dla modelu: lista pól z limitami, bez zgadywania kształtu. */
export function formatFieldSpec(format: FrameFormat): string {
  return format.fields
    .map((field) =>
      field.list
        ? `- "${field.key}": dokładnie ${field.list} wierszy po angielsku (${field.words} słów każdy)`
        : `- "${field.key}": jedno zdanie po angielsku (${field.words} słów)`,
    )
    .join("\n");
}
