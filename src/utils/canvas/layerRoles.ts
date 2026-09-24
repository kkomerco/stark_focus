import { UniversalLayoutSpec, UniversalTextLayer } from "../../types";

/**
 * ROLE WARSTW TEKSTU.
 *
 * Materiał o strukturze (protokół, koszt vs utrata, księga) ma wiele linii, z
 * których każda znaczy co innego. Dopóki ich treść leżała w osobnym
 * `layoutData`, edytor w studio poprawiał `textLayers`, a kadr i tak rysował
 * wersję sprzed poprawki. Teraz jedynym źródłem treści są warstwy, a ich rola
 * wynika z id:
 *
 *   `t1`        — teza / pytanie / nagłówek kadru
 *   `step1..N`  — kroki protokołu
 *   `cost1..N`  — lewy słupek „co płacisz dziś"
 *   `forfeit1..N` — prawy słupek „co to zabiera potem"
 *   `closing`   — zdanie domykające kadr
 *   `figure`    — duża blada cyfra w tle kadru
 *
 * Id, a nie pozycja w tablicy, bo edytor potrafi warstwę usunąć albo dopisać.
 * Wszystko, co jest słowem, jest tu — dlatego każdą linijkę kadru da się
 * poprawić w edytorze. `layoutData` zostaje tylko na tryb sceny napisu.
 */

export const PRIMARY_LAYER_ID = "t1";

export function layerById(spec: UniversalLayoutSpec, id: string): string {
  return spec.textLayers.find((layer) => layer.id === id)?.text?.trim() ?? "";
}

/** Numerowane warstwy danej roli, w kolejności z tablicy, bez pustaków. */
export function groupText(spec: UniversalLayoutSpec, prefix: string): string[] {
  return spec.textLayers
    .filter((layer) => isGroupMember(layer.id, prefix))
    .map((layer) => layer.text.trim())
    .filter(Boolean);
}

function isGroupMember(id: string, prefix: string): boolean {
  return id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length));
}

/**
 * Następne wolne id w grupie. Liczone z najwyższego użytego numeru, nie z
 * długości listy — po usunięciu środka lista jest krótsza niż numeracja.
 */
export function nextLayerId(spec: UniversalLayoutSpec, prefix: string): string {
  const highest = spec.textLayers.reduce((max, layer) => {
    if (!isGroupMember(layer.id, prefix)) return max;
    return Math.max(max, Number(layer.id.slice(prefix.length)) || 0);
  }, 0);
  return `${prefix}${highest + 1}`;
}

/** Grupa warstw tego samego rodzaju (kroki, pozycje, słupki) pod jedną rolą. */
export function layerGroup(
  prefix: string,
  items: string[],
  geometry: {
    fontSize: number;
    firstY: number;
    stepY: number;
    posX?: number;
    fontFamily?: string;
  },
): UniversalTextLayer[] {
  return items.map((item, index) =>
    textLayer(`${prefix}${index + 1}`, item, {
      fontFamily: geometry.fontFamily ?? "sans",
      fontSize: geometry.fontSize,
      posX: geometry.posX ?? 0.09,
      posY: geometry.firstY + index * geometry.stepY,
    }),
  );
}

/**
 * Warstwa z domyślną typografią marki — po obu stronach (kadr z pomysłu i
 * presety studio), żeby oba miejsca nie rozjechały się krojem i kolorem.
 */
export function textLayer(
  id: string,
  text: string,
  partial: Partial<UniversalTextLayer> = {},
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
    id,
    text,
  };
}
