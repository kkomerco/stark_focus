/**
 * STAŁY SCHEMAT OPISÓW DLA MARKI @STARK_FOCUS (100% ENGLISH)
 *
 * Jedno źródło prawdy dla CTA i hashtagów: treści zapasowe w trasach AI
 * budowały każdy własny ogon (`#darkmotivation #hardwork…`, `#darkaesthetic…`),
 * przez to feed wyglądał na prowadzony przez kilka osób.
 */
/**
 * Kilka wersji wezwania do działania, wszystkie nasze.
 *
 * Jedno zdanie pod każdym postem wygląda jak stopka generatora, a nie jak
 * głos autora; platformy od lat tną też żebranie o lajki i komentarze, więc
 * warianty mówią o konkretnym człowieku po drugiej stronie, nie o metrykach.
 */
export const STARK_CTAS: readonly string[] = [
  "Save this reminder. Execute in silence. Follow @stark_focus.",
  "Send this to the one person who still asks why you disappeared.",
  "Keep it for the next morning you do not want to.",
  "Send it to whoever is starting this over again on Monday.",
  "Do the first rep before you decide how you feel.",
];

/** Domyślna, gdy nic nie trafimy: wciąż nasza, wciąż bez żebrania o engagement. */
export const STARK_CTA = STARK_CTAS[0];

const BRAND_HASHTAG = "#starkfocus";

/**
 * Meta twardo obcina listę hashtagów do pięciu (wyłączane stopniowo od
 * grudnia 2025), a dotychczasowa stopka miała ich sześć — czyli szósty był
 * cicho odrzucany przy każdym poście. Ciężkie zestawy idą też w parze z
 * mniejszym zasięgiem, więc bierzemy trzy: dwa tematyczne i markowy.
 */
export const HASHTAG_LIMIT = 5;

/** Słowa w temacie -> dwa tagi. Trafia całe pnie, nie pojedyncze wyrazy. */
const HASHTAG_TOPICS: { match: RegExp; tags: readonly [string, string] }[] = [
  {
    match: /\b(silence|silent|quiet|speak|speaking|announce|words|explain|utter)\b/gi,
    tags: ["#silence", "#quietconfidence"],
  },
  {
    match: /\b(discipline|disciplined|habit|habits|routine|consistency|daily|reps|work)\b/gi,
    tags: ["#discipline", "#consistency"],
  },
  {
    match: /\b(stoic|stoicism|aurelius|seneca|epictetus|virtue|philosophy)\b/gi,
    tags: ["#stoicism", "#stoic"],
  },
  {
    match: /\b(mind|mindset|thoughts|thought|emotions|feelings|control|master|sovereign|self)\b/gi,
    tags: ["#selfmastery", "#mindset"],
  },
  {
    match: /\b(alone|lonely|solitude|nobody|no one|circle|friends|people|them)\b/gi,
    tags: ["#solitude", "#selfreflection"],
  },
  {
    match:
      /\b(time|times|year|years|day|days|hour|hours|minute|minutes|clock|calendar|summer|summers|winter|end|death|die|died|dead|gone|mori|finite|budget|count)\b/gi,
    tags: ["#mementomori", "#perspective"],
  },
  {
    match: /\b(pain|hard|hurt|loss|lost|failure|fall|suffer|friction|sacrifice)\b/gi,
    tags: ["#resilience", "#mentalstrength"],
  },
  {
    match: /\b(standards|principle|principles|respect|dignity|honor|worth|value)\b/gi,
    tags: ["#principles", "#selfrespect"],
  },
  {
    match: /\b(focus|attention|distraction|phone|noise|deep|quietly)\b/gi,
    tags: ["#focus", "#deepwork"],
  },
  {
    match: /\b(motivation|motivated|mood|inspiration|feel|feeling|waiting)\b/gi,
    tags: ["#disciplineovermotivation", "#action"],
  },
];

const HASHTAG_FALLBACK: readonly [string, string] = ["#stoicism", "#discipline"];

/** Ten sam tekst musi dawać ten sam zestaw, żeby opis nie zmieniał się przy każdym odświeżeniu. */
function hashKey(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function starkHashtags(text: string): string[] {
  const haystack = text.slice(0, 2000);
  const scored = HASHTAG_TOPICS.map((topic) => ({
    tags: topic.tags,
    hits: (haystack.match(topic.match) ?? []).length,
  }))
    .filter((topic) => topic.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 2);

  // Zawsze dwa tagi tematyczne + markowy: jeden temat to za mało, żeby opis
  // nie wyglądał jak wygenerowany dla innego konta, a pięć to sufit, nie cel.
  const pools = scored.map((topic) => topic.tags);
  while (pools.length < 2) pools.push(HASHTAG_FALLBACK);

  const key = hashKey(haystack);
  const tags: string[] = [];
  pools.forEach((pool, i) => {
    const tag = pool[(key + i * 7) % pool.length];
    if (!tags.includes(tag)) tags.push(tag);
  });
  tags.push(BRAND_HASHTAG);

  return tags.slice(0, HASHTAG_LIMIT);
}

/**
 * Domyślny trójwers. Kiedy trasa nie zna treść na tyle dobrze, by napisać
 * własne punkty, nie układamy ich na kolanie w komponencie — bierzemy te.
 */
export const STARK_PRINCIPLES: [string, string, string] = [
  "Comfort is paid for in regret, later and with interest.",
  "The standard you hold alone is the only one that counts.",
  "Silence protects the work; results announce it.",
];

/** Ten sam post zawsze dostaje to samo wezwanie — opis nie moze sie zmieniac przy odswiezeniu. */
export function starkCta(text: string): string {
  const key = hashKey(text.slice(0, 2000));
  return STARK_CTAS[key % STARK_CTAS.length];
}

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
    `${starkCta(hook)}\n\n` +
    starkHashtags(hook).join(" ")
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
    `${starkCta(hook + body)}\n\n` +
    starkHashtags(`${hook} ${body}`).join(" ")
  );
}
