/**
 * ŚCIŚLE STAŁY SCHEMAT OPISÓW DLA MARKI @STARK_FOCUS (100% ENGLISH)
 */
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
    `Save this reminder. Execute in silence. Follow @stark_focus.\n\n` +
    `#stoicism #darkdiscipline #discipline #mindset #focus #starkfocus`
  );
}
