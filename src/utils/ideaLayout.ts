import { IdeaItem, UniversalLayoutSpec, UniversalTextLayer } from "../types";
import { formatStarkCaption } from "../lib/caption";

/**
 * POMYSŁ -> KADR.
 *
 * Model od tej pory zwraca także `layout` i `structure`. Bez tego mapowania
 * informacja o układzie umierałaby w locie: studio i tak renderowałoby cytat
 * na czerni, czyli dokładnie to, z czego materiał miał przestać się składać.
 */

function layer(
  partial: Partial<UniversalTextLayer> & { text: string; id: string },
): UniversalTextLayer {
  return {
    fontFamily: "cinzel",
    fontSize: 74,
    fontWeight: "bold",
    fontStyle: "normal",
    casing: "preserve",
    color: "#F3F0EA",
    align: "left",
    posY: 0.18,
    posX: 0.09,
    ...partial,
  };
}

const LAYOUT_NAMES: Record<string, string> = {
  quote: "Cytat",
  protocol_list: "Protokół",
  cost_vs_reward: "Koszt i utrata",
  monolith_ledger: "Księga",
  studio_wall_3d: "Litery na ścianie",
};

export function specFromIdea(idea: IdeaItem): UniversalLayoutSpec {
  const structure = idea.structure ?? {};
  const statement = structure.statement || structure.question || idea.hook;
  const isQuote = !idea.layout || idea.layout === "quote";
  const gridType: UniversalLayoutSpec["gridType"] = isQuote
    ? "none_solid"
    : (idea.layout as UniversalLayoutSpec["gridType"]);

  return {
    layoutName: LAYOUT_NAMES[idea.layout ?? "quote"] || "Cytat",
    gridType,
    backgroundColor: "#050505",
    dividerWidth: 0,
    dividerColor: "#000000",
    slotCount: 0,
    slotLabels: [],
    textEffect: "flat",
    fontFamilyCustom: "cinzel",
    fontColorMode: "white",
    textLayers: [
      layer({ id: "t1", text: statement }),
      // Kroki jako warstwy: studio pokazuje je w edytorze tekstu i da się je
      // poprawić ręcznie bez wracania do generatora.
      ...(structure.steps ?? []).map((step, index) =>
        layer({
          id: `step-${index + 1}`,
          text: step,
          fontFamily: "sans",
          fontSize: 40,
          posY: 0.42 + index * 0.1,
        }),
      ),
    ],
    layoutData: {
      eyebrow: structure.eyebrow,
      statement,
      steps: structure.steps,
      figure: structure.figure,
      question: structure.question || statement,
      cost: structure.cost,
      forfeit: structure.forfeit,
      closing: structure.closing,
    },
    caption:
      idea.caption?.trim() ||
      formatStarkCaption(statement, [
        "Comfort is paid for in regret, later and with interest.",
        "The standard you hold alone is the only one that counts.",
        "Silence protects the work; results announce it.",
      ]),
    detectedAudio: "bez dźwięku — dodaj w aplikacji social media",
  };
}
