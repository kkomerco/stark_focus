import { IdeaItem, UniversalLayoutSpec, UniversalTextLayer } from "../types";
import { formatStarkCaption } from "../lib/caption";
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
  cost?: string[];
  forfeit?: string[];
  closing?: string;
  /** Nadtytuł układu — warstwa jak każda inna, więc edytowalna w studio. */
  /** Duża blada cyfra w tle. Pusta = bez cyfry. */
  figure?: string;
}

const LAYOUT_NAMES: Record<string, string> = {
  quote: "Cytat",
  protocol_list: "Protokół",
  cost_vs_reward: "Koszt i utrata",
  studio_wall_3d: "Napis w scenie",
  grid_2x2: "Kolaż",
};

const BODY_FONT_SIZE = 38;

export function structuredSpec(
  layoutName: string,
  gridType: UniversalLayoutSpec["gridType"],
  content: StructuredContent,
  meta: UniversalLayoutSpec["layoutData"] = {},
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
    slotCount: 0,
    slotLabels: [],
    textEffect: "flat",
    fontFamilyCustom: "cinzel",
    fontColorMode: "white",
    textLayers: layers,
    layoutData: meta,
    caption: formatStarkCaption(content.primary),
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
  });

  return { ...spec, caption: idea.caption?.trim() || spec.caption };
}
