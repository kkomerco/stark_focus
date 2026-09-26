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

/**
 * Pytania pogrupowane po kształcie materiału. Jedna uniwersalna lista dawała
 * „which number hits closest?" pod cytatem bez ani jednej liczby — pytający
 * wyglądał jak generator, a widz nie miał czego odpowiadać.
 */
const STARK_QUESTIONS: Record<"list" | "single", readonly string[]> = {
  list: [
    "Which of these did you do this week?",
    "What changes if you do the first one tomorrow at the same hour?",
    "Which line is the one you keep avoiding?",
    "Which step breaks first when you are tired?",
  ],
  single: [
    "What is the version of this you keep postponing?",
    "Which sentence did you read twice?",
    "Who is this about — and will you say it to them tomorrow?",
    "What did you trade for staying comfortable?",
  ],
};

/**
 * Treść przypięta pod postem: pierwsze zdanie materiału (kontekst, nie
 * powtórka opisu) plus jedno pytanie. Pytanie pisze model, kiedy je ma —
 * bez niego rotujemy po puli dobranej do kształtu kadru.
 */
export function starkPinned(
  hook: string,
  lines: readonly string[] = [],
  question = "",
  shape: "list" | "single" = "single",
): string {
  const clean = (value: string) => value.replace(/[*#"]/g, "").trim();
  const first = lines.map(clean).find(Boolean) ?? clean(hook);
  const pool = STARK_QUESTIONS[shape];
  const ask = clean(question) || pool[hashKey(`${hook}|${first}`) % pool.length];
  return [clean(first), ask].filter(Boolean).join("\n\n");
}

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

/** Ten sam post zawsze dostaje to samo wezwanie — opis nie moze sie zmieniac przy odswiezeniu. */
export function starkCta(text: string): string {
  const key = hashKey(text.slice(0, 2000));
  return STARK_CTAS[key % STARK_CTAS.length];
}

/**
 * Stopka marki. `lines` to zdania, które REALNIE są w materiale (kadry roli,
 * kroki protokołu) — bez nich opis to tylko teza + wezwanie.
 *
 * Dawniej domyślnym body był stały trójwers z `STARK_PRINCIPLES`, więc każdy
 * post bez opisu od modelu wychodził z identycznymi „zasadami" pod spodem —
 * bank treści w miejscu, z którego konto jest rozpoznawalne.
 */
export function formatStarkCaption(
  hook: string,
  lines: readonly string[] = [],
  directive = "",
): string {
  const cleanHook = hook.replace(/["#*]/g, "").trim().toUpperCase();
  const body = lines.map((line) => line.replace(/["#*]/g, "").trim()).filter(Boolean);
  const numbered = body.length >= 2 ? body.map((line, i) => `${i + 1}. ${line}`).join("\n") : "";
  const prose = body.length === 1 ? body[0] : "";
  const middle = [numbered || prose, directive.trim()].filter(Boolean).join("\n\n");

  return (
    `${cleanHook}\n\n` +
    `${middle ? `${middle}\n\n` : ""}` +
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
 * Pod jednym zdaniem na czerni nie ma czego rozpisywać na pięć akapitów.
 * `line` to jedno zdanie od modelu (albo pierwsze zdanie tego, co dał), a
 * teza zostaje na kadrze — dlatego tu jej nie powtarzamy.
 */
export function starkShortCaption(hook: string, line = ""): string {
  const sentence = line
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replace(/[*#"]/g, "").trim())
    .find((part) => part && !isPolishCopy(part) && !/^#|@/.test(part));
  const body = sentence && sentence.toLowerCase() !== hook.toLowerCase().trim() ? sentence : "";
  return [body, starkCta(`${hook} ${body}`), starkHashtags(`${hook} ${body}`).join(" ")]
    .filter(Boolean)
    .join("\n\n");
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
