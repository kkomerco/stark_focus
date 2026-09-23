/**
 * ŚCIŚLE STAŁY SCHEMAT OPISÓW DLA MARKI @STARK_FOCUS (100% ENGLISH)
 *
 * Jedno źródło prawdy dla CTA i hashtagów: treści zapasowe w trasach AI
 * budowały każdy własny ogon (`#darkmotivation #hardwork…`, `#darkaesthetic…`),
 * przez to feed wyglądał na prowadzony przez kilka osób.
 */
export const STARK_CTA = "Save this reminder. Execute in silence. Follow @stark_focus.";

export const STARK_HASHTAGS = [
  "#stoicism",
  "#darkdiscipline",
  "#discipline",
  "#mindset",
  "#focus",
  "#starkfocus",
] as const;

export function formatStarkCaption(
  hook: string,
  principles: [string, string, string],
  directive: string = "Never negotiate with your standards. Execute in silence.",
): string {
  const cleanHook = hook.replace(/["#*]/g, "").trim().toUpperCase();
  return (
    `${cleanHook}\n\n` +
    `1. ${principles[0].trim()}\n` +
    `2. ${principles[1].trim()}\n` +
    `3. ${principles[2].trim()}\n\n` +
    `${directive.trim()}\n\n` +
    `${STARK_CTA}\n\n` +
    STARK_HASHTAGS.join(" ")
  );
}
