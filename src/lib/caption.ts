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

/**
 * Domyślny trójwers. Kiedy trasa nie zna treść na tyle dobrze, by napisać
 * własne punkty, nie układamy ich na kolanie w komponencie — bierzemy te.
 */
export const STARK_PRINCIPLES: [string, string, string] = [
  "Comfort is paid for in regret, later and with interest.",
  "The standard you hold alone is the only one that counts.",
  "Silence protects the work; results announce it.",
];

export function formatStarkCaption(
  hook: string,
  principles: [string, string, string] = STARK_PRINCIPLES,
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

/** Polska nie myli się z angielskim: te znaki i słowa nie występują w nim nigdy. */
const POLISH_DIACRITICS = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const POLISH_WORDS =
  /\b(?:się|nie|jest|że|aby|gdy|mam|twój|swój|już|bardzo|tylko|zawsze|dla|bez|może|dziś|tego|tej|jak)\b/i;

export function isPolishCopy(text: string): boolean {
  return POLISH_DIACRITICS.test(text) || POLISH_WORDS.test(text);
}

/**
 * Opis materiału z treścią od modelu. Treść bierzemy od niego, ogon zawsze
 * jest nasz: instrukcje promptów są po polsku, więc model potrafi odpowiedzieć
 * po polsku, a każdy własny CTA i zestaw hashtagów rozjeżdża estetykę feedu.
 * Gdy treść nie nadaje się do użycia — wracamy do stałego schematu marki.
 */
export function starkCaption(hook: string, modelCaption = ""): string {
  const body = modelCaption
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        // Model dopisuje własny ogon (hashtagi, „follow me", @nick) — został
        // tylko wers, który wygląda na treść. Nasz CTA i tak idzie na koniec.
        !line.startsWith("#") &&
        !/@/.test(line) &&
        !/^(?:follow|save|comment|share|tag|dm|like)\b/i.test(line),
    )
    .join(" ")
    .replace(/[*#]/g, "")
    .trim();

  if (!body || isPolishCopy(body)) return formatStarkCaption(hook);

  const cleanHook = hook.replace(/["#*]/g, "").trim().toUpperCase();
  return (
    `${cleanHook ? `${cleanHook}\n\n` : ""}` +
    `${body}\n\n` +
    `${STARK_CTA}\n\n` +
    STARK_HASHTAGS.join(" ")
  );
}
