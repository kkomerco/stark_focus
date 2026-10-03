import { clampInt, clampTextList } from "./limits";
import { starkCaption, starkHashtags, stripHashtagTail } from "./caption";
import { BRAND_VISUAL_PROMPT, ROOK_IDENTITY_PROMPT, ROOK_MOTION_RULES } from "./brandIdentity";

export type MaterialTreatment = "rook" | "live";
export interface MaterialBrief {
  lines: string[];
  medium: "post" | "reel";
  ratio: "9:16" | "4:5" | "16:9";
  treatment: MaterialTreatment;
  duration: number;
}
export interface MaterialScene {
  lineIndexes: number[];
  seconds: number;
  setting: string;
  action: string;
  framing: string;
  reason: string;
  stockQuery: string;
}
export interface MaterialPlan {
  version: 1;
  sourceKey: string;
  brief: MaterialBrief;
  captionBody: string;
  question: string;
  scenes: MaterialScene[];
}

export interface MaterialDirectorState {
  treatment: MaterialTreatment;
  plan: MaterialPlan | null;
  captionKey: string;
  keepCaption: boolean;
}

export function directorStateFor(input: Partial<MaterialBrief>): MaterialDirectorState {
  const brief = materialBrief(input);
  return {
    treatment: brief.treatment,
    plan: null,
    captionKey: materialSourceKey(brief),
    keepCaption: false,
  };
}

/** Zapisany plan musi zachować podpis i komplet przypisań; nie naprawiamy go w ciemno. */
export function readMaterialPlan(value: unknown): MaterialPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as MaterialPlan;
  if (
    plan.version !== 1 ||
    !plan.brief ||
    !Array.isArray(plan.brief.lines) ||
    typeof plan.sourceKey !== "string" ||
    plan.sourceKey !== materialSourceKey(plan.brief) ||
    typeof plan.captionBody !== "string" ||
    typeof plan.question !== "string" ||
    !Array.isArray(plan.scenes) ||
    !plan.scenes.length ||
    plan.scenes.length > 6
  )
    return null;
  const indexes: number[] = [];
  for (const scene of plan.scenes) {
    if (
      !scene ||
      !Array.isArray(scene.lineIndexes) ||
      !scene.lineIndexes.length ||
      !Number.isFinite(scene.seconds) ||
      scene.seconds <= 0 ||
      [scene.setting, scene.action, scene.framing, scene.reason, scene.stockQuery].some(
        (text) => typeof text !== "string",
      )
    )
      return null;
    indexes.push(...scene.lineIndexes);
  }
  if (
    indexes.length !== plan.brief.lines.length ||
    indexes.some((index, position) => index !== position)
  )
    return null;
  if (
    Math.abs(
      plan.scenes.reduce((sum, scene) => sum + scene.seconds, 0) -
        materialBrief(plan.brief).duration,
    ) > 0.05
  )
    return null;
  if (
    plan.captionBody.length > 1200 ||
    plan.question.length > 240 ||
    plan.scenes.some(
      (scene) =>
        [scene.setting, scene.action, scene.framing].some((text) => text.length > 500) ||
        scene.reason.length > 300 ||
        scene.stockQuery.length > 80,
    )
  )
    return null;
  return {
    version: 1,
    sourceKey: plan.sourceKey,
    brief: materialBrief(plan.brief),
    captionBody: plan.captionBody,
    question: plan.question,
    scenes: plan.scenes.map((scene) => ({
      lineIndexes: [...scene.lineIndexes],
      seconds: scene.seconds,
      setting: scene.setting,
      action: scene.action,
      framing: scene.framing,
      reason: scene.reason,
      stockQuery: scene.stockQuery,
    })),
  };
}

export function readDirectorState(value: unknown): MaterialDirectorState | null {
  if (!value || typeof value !== "object") return null;
  const saved = value as MaterialDirectorState;
  return {
    treatment: saved.treatment === "live" ? "live" : "rook",
    plan: readMaterialPlan(saved.plan),
    captionKey: typeof saved.captionKey === "string" ? saved.captionKey : "",
    keepCaption: saved.keepCaption === true,
  };
}

/** Klient i serwer podpisują dokładnie ten sam brief, także po edycji tempa. */
export function materialBrief(input: Partial<MaterialBrief>): MaterialBrief {
  return {
    lines: clampTextList(input.lines, 24, 300),
    medium: input.medium === "post" ? "post" : "reel",
    ratio: input.ratio === "4:5" || input.ratio === "16:9" ? input.ratio : "9:16",
    treatment: input.treatment === "live" ? "live" : "rook",
    duration: clampInt(input.duration, 5, 90, 12),
  };
}

/** Pełny podpis zamiast krótkiego odcisku hooka: zmiana ostatniego wersu też unieważnia plan. */
export const materialSourceKey = (brief: MaterialBrief): string =>
  JSON.stringify(materialBrief(brief));

export const materialPlanIsCurrent = (plan: MaterialPlan, brief: MaterialBrief): boolean =>
  plan.sourceKey === materialSourceKey(brief);

export function materialCaption(plan: MaterialPlan): string {
  return `${stripHashtagTail(starkCaption(plan.brief.lines[0] ?? "", plan.captionBody))}\n\n${starkHashtags(plan.brief.lines.join(" ")).join(" ")}`;
}

export function sceneImagePrompt(plan: MaterialPlan, scene: MaterialScene): string {
  return [
    BRAND_VISUAL_PROMPT,
    plan.brief.treatment === "rook"
      ? ROOK_IDENTITY_PROMPT
      : "Natural live-action photography, grounded everyday setting, no animated characters.",
    `Aspect ratio ${plan.brief.ratio}. Setting: ${scene.setting}. Action: ${scene.action}. Framing: ${scene.framing}.`,
    `The image supports this exact text, without drawing its letters: ${scene.lineIndexes.map((index) => plan.brief.lines[index]).join(" / ")}`,
  ].join("\n\n");
}

export function sceneMotionPrompt(plan: MaterialPlan, scene: MaterialScene): string {
  return `${plan.brief.treatment === "rook" ? ROOK_MOTION_RULES : "Preserve the exact starting frame, people, props and grounded movement. No cuts, morphing or added text."}\nAction: ${scene.action}. Framing: ${scene.framing}. Target length: ${scene.seconds.toFixed(1)} seconds.`;
}

/** Paczka zawiera brief i sceny; nie udaje wyprodukowanego filmu. */
export function materialPackage(plan: MaterialPlan): string {
  return JSON.stringify(
    {
      ...plan,
      caption: materialCaption(plan),
      hashtags: starkHashtags(plan.brief.lines.join(" ")),
      scenes: plan.scenes.map((scene) => ({
        ...scene,
        imagePrompt: sceneImagePrompt(plan, scene),
        motionPrompt: sceneMotionPrompt(plan, scene),
      })),
    },
    null,
    2,
  );
}
