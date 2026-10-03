import { IdeaItem, UniversalLayoutSpec, UniversalTextLayer } from "../types";
import { starkCaption } from "../lib/caption";
import { layerGroup, PRIMARY_LAYER_ID, textLayer } from "./canvas/layerRoles";

/**
 * POMYSŁ -> KADR.
 *
 * Model od tej pory zwraca także `layout` i `structure`. Bez tego mapowania
 * informacja o układzie umierałaby w locie: studio i tak renderowałoby cytat na
 * czerni, czyli dokładnie to, z czego materiał miał przestać się składać.
 *
 * Cała treść kadru mieszka w `textLayers` z id-grupami (canvas/layerRoles.ts).
 * Dopóki leżała w osobnym `layoutData`, edytor poprawiał warstwy, a kadr dalej
 * rysował stare zdania. To samo buduje presety w studio — dzięki temu wybrany
 * format i wygenerowany pomysł wyglądają identycznie.
 */

export interface StructuredContent {
  /** Teza, pytanie albo nagłówek — zawsze pierwsza warstwa (`t1`). */
  primary: string;
  steps?: string[];
  belief?: string;
  reality?: string;
  cost?: string[];
  forfeit?: string[];
  closing?: string;
  /** Duża blada cyfra w tle. Pusta = bez cyfry. */
  figure?: string;
}

const LAYOUT_NAMES: Record<string, string> = {
  quote: "Cytat",
  protocol_list: "Protokół",
  cost_vs_reward: "Koszt i utrata",
  studio_wall_3d: "Napis w scenie",
  grid_2x2: "Kolaż",
  split_horizontal: "Wymówka kontra fakt",
};

const BODY_FONT_SIZE = 38;

export function structuredSpec(
  layoutName: string,
  gridType: UniversalLayoutSpec["gridType"],
  content: StructuredContent,
  meta: UniversalLayoutSpec["layoutData"] = {},
  /** Opis napisany przez model. Bez niego kadr idzie bez body — nie powtórka. */
  caption = "",
): UniversalLayoutSpec {
  const layers: UniversalTextLayer[] = [textLayer(PRIMARY_LAYER_ID, content.primary)];

  if (content.steps?.length) {
    layers.push(
      ...layerGroup("step", content.steps, {
        fontSize: BODY_FONT_SIZE,
        firstY: 0.42,
        stepY: 0.1,
      }),
    );
  }
  if (content.belief || gridType === "split_horizontal") {
    layers.push(
      textLayer("belief", content.belief ?? "", {
        fontFamily: "sans",
        fontSize: 48,
        fontWeight: "bold",
        posY: 0.49,
      }),
    );
  }
  if (content.reality || gridType === "split_horizontal") {
    layers.push(
      textLayer("reality", content.reality ?? "", {
        fontFamily: "sans",
        fontSize: 48,
        fontWeight: "bold",
        posY: 0.71,
      }),
    );
  }
  if (content.cost?.length) {
    layers.push(
      ...layerGroup("cost", content.cost, { fontSize: BODY_FONT_SIZE, firstY: 0.4, stepY: 0.12 }),
    );
  }
  if (content.forfeit?.length) {
    layers.push(
      ...layerGroup("forfeit", content.forfeit, {
        fontSize: BODY_FONT_SIZE,
        firstY: 0.4,
        stepY: 0.12,
        posX: 0.54,
      }),
    );
  }
  if (content.closing) {
    layers.push(textLayer("closing", content.closing, { fontSize: 46, posY: 0.84 }));
  }
  if (content.figure) {
    layers.push(textLayer("figure", content.figure, { fontSize: 140, posY: 0.86 }));
  }

  return {
    layoutName,
    gridType,
    backgroundColor: "#050505",
    dividerWidth: 0,
    dividerColor: "#000000",
    // Kolaż żyje ze zdjęć: bez slotsów w specie studio nie pokazuje panelu
    // „Wgraj zdjęcia", więc wygenerowany kolaż dało się tylko podziwiać.
    slotCount: gridType === "grid_2x2" ? 4 : 0,
    slotLabels: gridType === "grid_2x2" ? ["Kadr 1", "Kadr 2", "Kadr 3", "Kadr 4"] : [],
    textEffect: "flat",
    fontFamilyCustom: "cinzel",
    fontColorMode: "white",
    textLayers: layers,
    layoutData: { ...meta },
    // Opis ma ROZWIJAĆ temat, nie powtarzać tego, co już widać na kadrze.
    // Bez zdania od modelu idzie sama teza + nasz CTA i hashtagi.
    caption: starkCaption(content.primary, caption),
    detectedAudio: "Bed w pliku albo własny dźwięk",
  };
}

export function specFromIdea(idea: IdeaItem): UniversalLayoutSpec {
  const structure = idea.structure ?? {};
  const isQuote = !idea.layout || idea.layout === "quote";
  const gridType: UniversalLayoutSpec["gridType"] = isQuote
    ? "none_solid"
    : (idea.layout as UniversalLayoutSpec["gridType"]);

  const spec = structuredSpec(LAYOUT_NAMES[idea.layout ?? "quote"] || "Cytat", gridType, {
    primary: structure.statement || structure.question || idea.hook,
    steps: structure.steps,
    cost: structure.cost,
    forfeit: structure.forfeit,
    closing: structure.closing,
    figure: structure.figure,
    belief: structure.belief,
    reality: structure.reality,
  });

  return { ...spec, caption: idea.caption?.trim() || spec.caption };
}
