import type { ReelHandoff, TrendItem } from "../types";
import { formatStarkCaption, isPolishCopy } from "./caption";
import { hookFingerprint } from "./similarity";

/** Alternatywne hooki radaru nie są kolejnymi fazami tej samej rolki. */
export function radarMaterial(trend: TrendItem): ReelHandoff | null {
  const hook = (trend.copy_draft?.hook || trend.viral_hooks?.[0] || "").trim();
  if (!hook || isPolishCopy(hook)) return null;
  const supporting = trend.copy_draft?.supportingText?.trim() || "";
  const phrases = [hook, supporting].filter(
    (line, index, list) =>
      line &&
      !isPolishCopy(line) &&
      list.findIndex((other) => hookFingerprint(other) === hookFingerprint(line)) === index,
  );
  return {
    hook,
    phrases,
    caption: trend.copy_draft?.caption || formatStarkCaption(hook, []),
    duration: phrases.length > 1 ? 7 : 6,
  };
}
