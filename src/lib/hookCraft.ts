/**
 * Rzemiosło hooka dla @stark_focus — jedno źródło prawdy dla wszystkich
 * silników treści (rolki, posty, paczka dnia, seria, studio cytatu).
 *
 * Dotąd każda trasa miała własną miarę („max 8 słów”, „max 10”, „3-7 words”),
 * żadna tego nie pilnowała w kodzie, a opis klisz istniał tylko w jednym
 * prompcie. Efekt: model pisał to, co najprościej — czyli zdanie z
 * „discipline” w roli podmiotu i motywacyjnym ogonem.
 */

/** Podmiot musi dać się sfotografować. Abstrakt w roli podmiotu = slop. */
const ABSTRACT_SUBJECTS = [
  "discipline",
  "motivation",
  "mindset",
  "potential",
  "greatness",
  "success",
  "weakness",
  "victory",
  "power",
  "pain",
  "silence",
  "consistency",
  "focus",
  "effort",
  "patience",
];

/** Klisze gatunku i wskazówki modeli — jeśli któreś padnie, tekst jest do wyrzucenia. */
const CLICHE_PHRASES = [
  "unlock your",
  "unleash your",
  "in a world where",
  "comfort zone",
  "the 1%",
  "level up",
  "grind mode",
  "sigma",
  "best version of yourself",
  "best version of you",
  "day one or one day",
  "journey of",
  "embrace the",
  "dance with",
  "symphony of",
  "tapestry",
  "realm of",
  "game changer",
  "superpower",
  "elevate your",
  "rewrite the rules",
  "dare to dream",
  "believe in yourself",
  "you got this",
  "it is what it is",
];

/** Pompa archaiczna — markowa estetyka dyscypliny, nie „aplikacja motywacyjna”. */
const POMPOUS_WORDS = [
  "citadel",
  "bastion",
  "monolith",
  "throne",
  "decree",
  "gladiators",
  "sovereign",
  "henceforth",
  "thus",
  "verily",
];

/** Mówienie o ludziach w trzeciej osobie brzmi jak rada, nie jak diagnoza. */
const MORALIZING = /\b(people who|most men|everyone knows|society|they all|nobody these days)\b/i;

/** Ogon engagementowy — demowany algorytmicznie i w materiale, i w opisie. */
const ENGAGEMENT_BAIT =
  /\b(tag a friend|comment (yes|below)|like if|follow for|share this with your)\b/i;

/** Zastrzeżenie na końcu odbiera zdaniu ostrze. */
const HEDGED_TAIL =
  /\b(but it'?s worth it|and that'?s the (real )?victory|in the end|at the end of the day|that'?s the truth|and that'?s okay)\b/i;

export interface HookAudit {
  issues: string[];
  ok: boolean;
}

/**
 * Rym zamienia aforyzm w przyklejankę. Wykrywamy go po wspólnej końcówce
 * dwóch dłuższych wyrazów, stąd lista tych, które rymują się ze wszystkim:
 * „what/that", „with/kit" — powtarzanie ich to nie rym, to angielszczyzna.
 */
const RHYME_STOP = new Set([
  "what",
  "that",
  "this",
  "with",
  "from",
  "have",
  "will",
  "your",
  "they",
  "there",
  "here",
  "them",
  "then",
  "when",
  "were",
  "been",
  "said",
  "does",
  "done",
]);

function hasRhyme(text: string): boolean {
  const seen = new Map<string, string>();
  for (const word of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (RHYME_STOP.has(word)) continue;
    const tail = word.slice(-3);
    const prior = seen.get(tail);
    if (prior && prior !== word) return true;
    if (!prior) seen.set(tail, word);
  }
  return false;
}

/**
 * Kontrola jakości zdania. Zwraca powody, nie wyrok — trasa decyduje, czy
 * odrzucić kandydata, czy tylko go nie chwalić.
 */
export function auditHook(text: string): HookAudit {
  const clean = text.replace(/[*#]/g, "").trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const issues: string[] = [];

  if (words.length < 3) issues.push("za krótkie, nie ma czego trzymać");
  if (words.length > 12) issues.push(`za długie na kadr (${words.length} słów)`);

  const first = (words[0] || "").replace(/[^a-z]/gi, "").toLowerCase();
  if (ABSTRACT_SUBJECTS.includes(first)) issues.push(`abstrakt w roli podmiotu („${first}”)`);

  const cliche = CLICHE_PHRASES.find((phrase) => lower.includes(phrase));
  if (cliche) issues.push(`klisza („${cliche}”)`);

  const pompous = POMPOUS_WORDS.find((word) => new RegExp(`\\b${word}\\b`, "i").test(clean));
  if (pompous) issues.push(`pompa („${pompous}”)`);

  if (MORALIZING.test(clean)) issues.push("moralizowanie w trzeciej osobie");
  if (ENGAGEMENT_BAIT.test(clean)) issues.push("żebranie o engagement");
  if (HEDGED_TAIL.test(clean)) issues.push("ugaśony koniec zdania");

  const dashes = (clean.match(/—|--/g) || []).length;
  if (dashes > 1) issues.push("piętrzenie myślników");

  if (/\bnot \w+,? but \w+\b/i.test(clean)) issues.push("szablon „nie X, ale Y”");

  if (hasRhyme(clean)) issues.push("rym");

  return { issues, ok: issues.length === 0 };
}

/**
 * Kontrola wiersza w strukturze (krok protokołu, słupek kosztu, podpis kadru).
 * Te same zakazy co w hooku, ale bez limitu „4-10 słów" i bez wymogu
 * namacalnego podmiotu — krok ma być czynnością, nie aforyzmem.
 */
export function auditLine(text: string, maxWords = 16): HookAudit {
  const clean = text.replace(/[*#]/g, "").trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const issues: string[] = [];

  if (words.length < 2) issues.push("za krótki, nie mówi nic");
  if (words.length > maxWords) issues.push(`za długi na ten układ (${words.length} słów)`);
  const cliche = CLICHE_PHRASES.find((phrase) => lower.includes(phrase));
  if (cliche) issues.push(`klisza („${cliche}”)`);
  const pompous = POMPOUS_WORDS.find((word) => new RegExp(`\\b${word}\\b`, "i").test(clean));
  if (pompous) issues.push(`pompa („${pompous}”)`);
  if (ENGAGEMENT_BAIT.test(clean)) issues.push("żebranie o engagement");
  if (hasRhyme(clean)) issues.push("rym");

  return { issues, ok: issues.length === 0 };
}

/** True, jeśli zdanie nie powinno trafić na kadr ani do podglądu. */
export function isAiSlop(text: string): boolean {
  return !auditHook(text).ok;
}

export interface HookArchetype {
  id: string;
  /** Polecenie dla modelu: operacja na zdaniu, nie temat. */
  instruction: string;
  examples: [string, string];
}

/**
 * Katalog figur, które w tej niszy niosą przekaz. Model dostaje konkretną
 * operację retoryczną zamiast „napisz mocne zdanie” — to różnica między
 * aforyzmem a hasłem z kubka.
 */
export const HOOK_ARCHETYPES: HookArchetype[] = [
  {
    id: "accusation",
    instruction: "nazwij JEDEN prywatny gest, który czytelnik naprawdę robi i którego nie pokazuje",
    examples: [
      "You rehearse the excuses, not the work.",
      "You negotiate with the alarm before you have lost anything.",
    ],
  },
  {
    id: "two-selves",
    instruction: "postaw naprzeciw siebie dwie wersje czytelnika w czasie",
    examples: [
      "The nineteen-year-old you is not impressed.",
      "The you they will remember is the one who almost did it.",
    ],
  },
  {
    id: "ledger",
    instruction: "policz koszt i podaj walutę; nie mów o ofierze wprost",
    examples: [
      "Discipline weighs ounces. Regret weighs tons.",
      "You already paid. You just have not received it.",
    ],
  },
  {
    id: "inversion",
    instruction: "weź powszechne przekonanie i obróć je o jeden krok",
    examples: [
      "Motivation is not unreliable. You are.",
      "It is not hard. It is lonely, and you noticed.",
    ],
  },
  {
    id: "object",
    instruction: "jedno zdanie, jeden przedmiot, zero pojęć abstrakcyjnych",
    examples: ["Rust works while you sleep.", "The axe complains about the wood."],
  },
  {
    id: "subverted-proverb",
    instruction: "pożycz znane porzekadło i złam jego wniosek",
    examples: [
      "No man crosses the same river twice, and he gets no refund on the crossing.",
      "Time heals nothing. It only bills.",
    ],
  },
  {
    id: "quiet-close",
    instruction: "opisz zamknięcie drzwi bez podnoszenia głosu",
    examples: [
      "The door closes quietly. Nobody announces these things.",
      "They stop asking twice.",
    ],
  },
  {
    id: "counted-finitude",
    instruction: "zmierz skończoność konkretną liczbą, nie łaciną",
    examples: [
      "Maybe forty more summers. That is the whole budget.",
      "You have about nine thousand Mondays left.",
    ],
  },
  {
    id: "withdrawn-audience",
    instruction: "zabierz widzom oklask i pokaż wersję, której nigdy nie było",
    examples: [
      "They will applaud the version of you that never showed.",
      "Nobody boos a man who never tried.",
    ],
  },
  {
    id: "earned-command",
    instruction: "rozkaz dopiero po postawionej diagnozie, maks. pięć słów",
    examples: ["Rise now or stay mediocre.", "Say it to their faces once."],
  },
];

/**
 * Wzorce z dziennika publikacji wklejane w prompt. Few-shot na własnych
 * zdaniach, które najwięcej zarobiły, bije few-shot na cytatach Marka
 * Aureliusza: model nie uczy się wtedy rytmu marki, tylko łaciny i pompy.
 */
export function exemplarBlock(hooks: string[]): string {
  if (hooks.length === 0) return "";
  const lines = hooks
    .slice(0, 8)
    .map((hook) => `- ${hook}`)
    .join("\n");
  return (
    "WZORCE - to sa nasze zdania, ktore najwiecej zarobily. Trzymaj ich rytm i gestosc,\n" +
    "ale NIE kopiuj z nich slow:\n" +
    lines
  );
}

/** Rejestr, nie nastrój: „koronerski raport” daje lepszy tekst niż „mrocznie i mocno”. */
export const HOOK_REGISTER =
  "Register: a coroner's report, a debt notice, a field manual. Flat, exact, unsentimental. No preaching, no cheering.";

/** Wspólna lista zakazów do wklejenia w każdy prompt treści. */
export const SLOP_BAN_LIST = [
  "Zakazane frazy: " + CLICHE_PHRASES.join(", ") + ".",
  "Zakazane słowa pompatyczne: " + POMPOUS_WORDS.join(", ") + ".",
  "Podmiotem zdania nie może być pojęcie abstrakcyjne (" +
    ABSTRACT_SUBJECTS.slice(0, 8).join(", ") +
    ") — ma być rzecz, człowiek, gest albo liczba.",
  "Zakaz: myślniki piętrzone, szablon „not X, but Y”, rym na końcu, zastrzeżenie na końcu zdania, moralizowanie o „ludziach”, żebranie o lajki i komentarze.",
].join(" ");

/** Ile słów na kadr. Jedna miara dla wszystkich tras. */
export const HOOK_MIN_WORDS = 3;
export const HOOK_MAX_WORDS = 12;
export const HOOK_IDEAL_WORDS = "4-10";

/**
 * Blok do wklejenia w każdy prompt treści. Trasy nie wymyślają własnych
 * zakazów — dzięki temu „dobra rada" nie wygląda inaczej w rolce, inaczej
 * w karuzeli i inaczej w paczce dnia.
 */
export const HOOK_CRAFT_PROMPT = `ZASADY RZEMIOSLA (wspolne dla calej marki):
${HOOK_ARCHETYPES.map((a) => `- ${a.id}: ${a.instruction}`).join("\n")}
${HOOK_REGISTER}
${SLOP_BAN_LIST}
Kazde zdanie ma byc jedna z powyzszych figur, nie parafraza tematu.`;
