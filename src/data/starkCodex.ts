// src/data/starkCodex.ts
// THE STARK CODEX - Bank Niewyczerpanych Zasad, Stoickich Aksjomatów i Praw Psychologii

export interface CodexRule {
  id: string;
  ruleNumber: string;
  category:
    | "discipline"
    | "silence_power"
    | "roman_stoic"
    | "neurobiology"
    | "unforgiving_standard"
    | "paradoxes";
  title: string;
  hook0to3s: string;
  corePrinciple: string;
  actionDirective: string;
  rationale: string;
  suggestedTheme:
    "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist";
  suggestedBroll: string;
  carouselSlides: Array<{ headline: string; bodyText: string; highlightWords: string }>;
}

export const CODEX_CATEGORIES = [
  { id: "all", name: "Wszystkie Zasady", icon: "" },
  { id: "discipline", name: "Dyscyplina & Asceza", icon: "" },
  { id: "silence_power", name: "Milczenie & Władza", icon: "" },
  { id: "roman_stoic", name: "Cesarski Stoicyzm", icon: "" },
  { id: "neurobiology", name: "Neurobiologia & Dopamina", icon: "" },
  { id: "unforgiving_standard", name: "Żelazne Standardy", icon: "" },
  { id: "paradoxes", name: "Paradoksy Sukcesu", icon: "" },
] as const;

export const STARK_CODEX_RULES: CodexRule[] = [
  {
    id: "codex_01",
    ruleNumber: "RULE #01",
    category: "discipline",
    title: "The Alarm Clock Axiom",
    hook0to3s: "The moment you snooze, you negotiate with weakness.",
    corePrinciple: "How you wake up is the silent contract you sign with your day.",
    actionDirective: "Feet on the floor within three seconds. No debates.",
    rationale:
      "Podświadomość rejestruje pierwsze zawahanie jako dowód, że Twoje słowo jest negocjowalne.",
    suggestedTheme: "obsidian_void",
    suggestedBroll: "deszcz_asfalt_430am",
    carouselSlides: [
      {
        headline: "THE SILENT CONTRACT",
        bodyText: "You don't lack discipline. You allow negotiations with morning comfort.",
        highlightWords: "discipline, negotiations, comfort",
      },
      {
        headline: "FIRST CONTACT",
        bodyText: "The first battle of every day happens before your eyes even open completely.",
        highlightWords: "battle, open, completely",
      },
      {
        headline: "THE COST OF DELAY",
        bodyText: "Hitting snooze tells your subconscious that your commitments are optional.",
        highlightWords: "snooze, subconscious, optional",
      },
      {
        headline: "THE IRON FORMULA",
        bodyText: "No thinking. No rationalizing. Five seconds of cold execution.",
        highlightWords: "thinking, execution",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Win the first 10 minutes, control the entire day.",
        highlightWords: "reminder, win, control",
      },
    ],
  },
  {
    id: "codex_02",
    ruleNumber: "RULE #02",
    category: "silence_power",
    title: "The Law of Absolute Secrecy",
    hook0to3s: "Never announce your next move to an audience that feeds on noise.",
    corePrinciple: "Validation received before execution kills the hunger required to finish.",
    actionDirective: "Build in total darkness. Let the end result create the shockwave.",
    rationale:
      "Mówienie o celach uwalnia przedwczesną dopaminę, osłabiając determinację do ich realizacji.",
    suggestedTheme: "carbon_aura",
    suggestedBroll: "brutalizm_monolit",
    carouselSlides: [
      {
        headline: "SHUT YOUR MOUTH",
        bodyText: "The urge to tell people your plans is weakness masquerading as excitement.",
        highlightWords: "mouth, urge, weakness",
      },
      {
        headline: "CHEAP DOPAMINE",
        bodyText: "Your brain confuses public declaration with actual biological accomplishment.",
        highlightWords: "brain, declaration, accomplishment",
      },
      {
        headline: "THE MONK PARADOX",
        bodyText: "The most dangerous man in any room is the one who owes nobody an explanation.",
        highlightWords: "dangerous, owes, explanation",
      },
      {
        headline: "DARK WORK",
        bodyText: "Twelve months of uninterrupted focus in private will shock everyone in public.",
        highlightWords: "uninterrupted, private, shock",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Starve your need for applause. Execute in silence.",
        highlightWords: "reminder, applause, silence",
      },
    ],
  },
  {
    id: "codex_03",
    ruleNumber: "RULE #03",
    category: "roman_stoic",
    title: "Marcus Aurelius' Citadel",
    hook0to3s: "You have power over your mind, not outside events.",
    corePrinciple: "External chaos only penetrates if you grant it permission.",
    actionDirective: "Strip away your opinion about the catastrophe. What remains is just facts.",
    rationale: "Emocjonalna reakcja to zawsze dobrowolny wybór, nigdy przymus.",
    suggestedTheme: "silver_mist",
    suggestedBroll: "antyczny_marmur_posag",
    carouselSlides: [
      {
        headline: "THE INNER CITADEL",
        bodyText: "No human being or circumstance can break you without your consent.",
        highlightWords: "citadel, break, consent",
      },
      {
        headline: "THE TWO DOMAINS",
        bodyText: "Divide every single problem into what is yours to decide, and what is noise.",
        highlightWords: "domains, decide, noise",
      },
      {
        headline: "STRIP THE DRAMA",
        bodyText: "Remove the word 'terrible'. A situation is merely what occurred, nothing more.",
        highlightWords: "drama, terrible, occurred",
      },
      {
        headline: "UNSHAKABLE COMPOUND",
        bodyText: "When they expect you to panic, return to your work without changing expression.",
        highlightWords: "unshakable, panic, expression",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Master yourself first before attempting to master reality.",
        highlightWords: "reminder, master, reality",
      },
    ],
  },
  {
    id: "codex_04",
    ruleNumber: "RULE #04",
    category: "neurobiology",
    title: "The Friction Barrier",
    hook0to3s: "Resistance is not a signal to stop. It is dopamine being generated.",
    corePrinciple:
      "The prefrontal cortex expands only through deliberate confrontation with discomfort.",
    actionDirective: "Lean into the exact task your instinct wants to delay.",
    rationale:
      "Przełamanie oporu aktywuje przednią korę zakrętu obręczy (aMCC), fizyczne źródło siły woli.",
    suggestedTheme: "emerald_abyss",
    suggestedBroll: "ciemna_sala_asceza",
    carouselSlides: [
      {
        headline: "THE WILLPOWER MUSCLE",
        bodyText:
          "Willpower is not a character trait. It is a biological circuit waiting for tension.",
        highlightWords: "willpower, trait, tension",
      },
      {
        headline: "THE AMCC MATRIX",
        bodyText: "Every time you do what you hate doing, your brain physically grows denser.",
        highlightWords: "hate, brain, denser",
      },
      {
        headline: "NEVER NEGOTIATE",
        bodyText: "The moment you hesitate for 3 seconds, your limbic system takes over.",
        highlightWords: "hesitate, limbic, takes",
      },
      {
        headline: "PAIN IS DATA",
        bodyText: "Reframe mental exhaustion as proof that the adaptation has begun.",
        highlightWords: "pain, adaptation, begun",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Make discomfort your permanent address.",
        highlightWords: "reminder, discomfort, permanent",
      },
    ],
  },
  {
    id: "codex_05",
    ruleNumber: "RULE #05",
    category: "unforgiving_standard",
    title: "The Zero-Option Framework",
    hook0to3s: "Decisions exhaust the mind. Standards automate the outcome.",
    corePrinciple: "Eliminate choices so discipline requires zero mental bandwidth.",
    actionDirective: "Transform loose intentions into unbendable rules of engagement.",
    rationale:
      "Zmęczenie decyzyjne prowadzi do kompromisów; żelazna reguła wyklucza potrzebę motywacji.",
    suggestedTheme: "crimson_eclipse",
    suggestedBroll: "nocna_metropolia_stal",
    carouselSlides: [
      {
        headline: "KILL THE CHOICES",
        bodyText: "The disciplined man doesn't choose to work. He eliminated every other option.",
        highlightWords: "disciplined, choose, option",
      },
      {
        headline: "DECISION FATIGUE",
        bodyText: "Debating whether to go to the gym uses more energy than the workout itself.",
        highlightWords: "debating, energy, workout",
      },
      {
        headline: "UNBREAKABLE RULES",
        bodyText: "Replace goals with non-negotiable protocols. No mood checks. No excuses.",
        highlightWords: "unbreakable, protocols, excuses",
      },
      {
        headline: "THE COMPOUND RESULT",
        bodyText: "When standards replace feelings, mediocrity becomes mathematically impossible.",
        highlightWords: "standards, feelings, impossible",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Stop asking how you feel. Start obeying your code.",
        highlightWords: "reminder, feel, code",
      },
    ],
  },
  {
    id: "codex_06",
    ruleNumber: "RULE #06",
    category: "paradoxes",
    title: "The Solitude Acceleration",
    hook0to3s: "You don't need a bigger network. You need longer periods of isolation.",
    corePrinciple: "Every distraction accepted is a confession that your mission is secondary.",
    actionDirective: "Cut contact with people who normalize comfortable mediocrity.",
    rationale:
      "Głębia myślenia i unikalna przewaga rynkowa rodzą się wyłącznie w przedłużonej ascezie społecznej.",
    suggestedTheme: "obsidian_void",
    suggestedBroll: "mgla_horyzont_pustka",
    carouselSlides: [
      {
        headline: "THE ISOLATION EDGE",
        bodyText: "Most people are terrified of being alone with their thoughts for one hour.",
        highlightWords: "isolation, terrified, alone",
      },
      {
        headline: "THE NOISE TAX",
        bodyText: "Every casual conversation drains energy that belonged to your life's work.",
        highlightWords: "noise, drains, belonged",
      },
      {
        headline: "MONK MODE PROTOCOL",
        bodyText: "Go dark for 90 days. Reappear unrecognizable in capability and composure.",
        highlightWords: "dark, unrecognizable, composure",
      },
      {
        headline: "SELECTIVE DEAFNESS",
        bodyText: "Never accept criticism from someone whose life you would refuse to live.",
        highlightWords: "criticism, refuse, live",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Fall in love with the quiet grind.",
        highlightWords: "reminder, quiet, grind",
      },
    ],
  },
  {
    id: "codex_07",
    ruleNumber: "RULE #07",
    category: "discipline",
    title: "The Emotional Severance",
    hook0to3s: "Never make a commitment when you're euphoric or quit when you're down.",
    corePrinciple: "Emotions are volatile weather; execution is subterranean bedrock.",
    actionDirective: "Operate at constant temperature regardless of mood spikes.",
    rationale: "Uzależnienie działania od stanu emocjonalnego gwarantuje sinusoidalną niespójność.",
    suggestedTheme: "carbon_aura",
    suggestedBroll: "brutalizm_monolit",
    carouselSlides: [
      {
        headline: "SEVER THE TIES",
        bodyText: "Your feelings are the worst advisor you could ever hire for your future.",
        highlightWords: "sever, feelings, advisor",
      },
      {
        headline: "THE ENEMY WITHIN",
        bodyText: "Motivation creates tourists. Pure, detached discipline builds monuments.",
        highlightWords: "motivation, discipline, monuments",
      },
      {
        headline: "COLD EXECUTION",
        bodyText: "Learn to look your fatigue in the face and start the next set anyway.",
        highlightWords: "cold, fatigue, anyway",
      },
      {
        headline: "IMPERIAL CALM",
        bodyText: "Neither praise nor insult should ever change your stride by one millimeter.",
        highlightWords: "imperial, praise, millimeter",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Treat emotions like passing clouds. Be the mountain.",
        highlightWords: "reminder, clouds, mountain",
      },
    ],
  },
  {
    id: "codex_08",
    ruleNumber: "RULE #08",
    category: "roman_stoic",
    title: "Seneca's Urgency Rule",
    hook0to3s: "You are not given a short life. You waste most of it.",
    corePrinciple: "Procrastination is arrogance—presuming you will be granted tomorrow.",
    actionDirective: "Treat today as if it were a self-contained miniature lifetime.",
    rationale:
      "Świadomość natychmiastowej śmiertelności (Memento Mori) jest najczystszym filtrem priorytetów.",
    suggestedTheme: "crimson_eclipse",
    suggestedBroll: "antyczny_marmur_posag",
    carouselSlides: [
      {
        headline: "STOP WASTING IT",
        bodyText: "You live as if you were destined to live forever. Death is already walking.",
        highlightWords: "wasting, forever, death",
      },
      {
        headline: "THE ILLUSION OF LATER",
        bodyText: "'Tomorrow' is the graveyard where 99% of ambitions rot in silence.",
        highlightWords: "tomorrow, graveyard, ambitions",
      },
      {
        headline: "COUNT THE HOURS",
        bodyText:
          "Notice how fiercely people protect their wallet, yet give away their time for free.",
        highlightWords: "fiercely, wallet, time",
      },
      {
        headline: "CLAIM TODAY",
        bodyText:
          "Do not leave this desk until the essential duty is completed without compromise.",
        highlightWords: "claim, essential, completed",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Time is the only currency you can never earn back.",
        highlightWords: "reminder, currency, earn",
      },
    ],
  },
  {
    id: "codex_09",
    ruleNumber: "RULE #09",
    category: "paradoxes",
    title: "The Reverse Effort Paradox",
    hook0to3s: "Chasing respect guarantees you will look desperate.",
    corePrinciple: "Respect is a byproduct of competence delivered without seeking approval.",
    actionDirective: "Stop asking what they think. Double down on raw utility.",
    rationale: "Im bardziej zabiegasz o aprobatę, tym mniej Twoja obecność budzi autorytet.",
    suggestedTheme: "silver_mist",
    suggestedBroll: "nocna_metropolia_stal",
    carouselSlides: [
      {
        headline: "STOP CHASING",
        bodyText: "The moment you seek validation, you surrender authority to the audience.",
        highlightWords: "chasing, validation, surrender",
      },
      {
        headline: "THE GRAVITATIONAL PULL",
        bodyText: "People are drawn to what moves with conviction and asks for nothing in return.",
        highlightWords: "conviction, asks, nothing",
      },
      {
        headline: "BECOME DANGEROUS",
        bodyText: "Focus entirely on being so exceptionally competent that you cannot be ignored.",
        highlightWords: "dangerous, exceptionally, ignored",
      },
      {
        headline: "TOTAL INDIFFERENCE",
        bodyText: "Treat both their compliments and their doubts with the exact same silence.",
        highlightWords: "indifference, compliments, silence",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Self-respect is built in private, never granted in public.",
        highlightWords: "reminder, self-respect, private",
      },
    ],
  },
  {
    id: "codex_10",
    ruleNumber: "RULE #10",
    category: "unforgiving_standard",
    title: "The Iron Integrity Code",
    hook0to3s: "If you break a promise to yourself, you break your soul.",
    corePrinciple: "Self-worth is the subconscious ledger of your fulfilled commitments.",
    actionDirective: "Never say 'I will do this' unless you are prepared to die doing it.",
    rationale:
      "Każda niedotrzymana obietnica złożona samemu sobie obniża wewnętrzne poczucie sprawczości.",
    suggestedTheme: "obsidian_void",
    suggestedBroll: "deszcz_asfalt_430am",
    carouselSlides: [
      {
        headline: "THE INNER BETRAYAL",
        bodyText: "Every broken promise to yourself destroys your confidence at a cellular level.",
        highlightWords: "betrayal, promise, destroys",
      },
      {
        headline: "THE SUBCONSCIOUS LEDGER",
        bodyText: "You cannot trick your mind. It knows every single time you took the easy exit.",
        highlightWords: "trick, mind, exit",
      },
      {
        headline: "MAKE FEWER PROMISES",
        bodyText: "Say less. Commit to fewer tasks. But make those few completely untouchable.",
        highlightWords: "fewer, commit, untouchable",
      },
      {
        headline: "RUTHLESS ALIGNMENT",
        bodyText: "When your actions match your words without friction, fear evaporates.",
        highlightWords: "ruthless, actions, evaporates",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Your word to yourself is divine law.",
        highlightWords: "reminder, word, divine",
      },
    ],
  },
];

export function getRandomCodexRule(category: string = "all"): CodexRule {
  const pool =
    category === "all"
      ? STARK_CODEX_RULES
      : STARK_CODEX_RULES.filter((r) => r.category === category);
  return pool[Math.floor(Math.random() * pool.length)] || STARK_CODEX_RULES[0];
}

export function searchCodex(query: string): CodexRule[] {
  const q = query.trim().toLowerCase();
  if (!q) return STARK_CODEX_RULES;
  return STARK_CODEX_RULES.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.hook0to3s.toLowerCase().includes(q) ||
      r.corePrinciple.toLowerCase().includes(q) ||
      r.actionDirective.toLowerCase().includes(q) ||
      r.ruleNumber.toLowerCase().includes(q),
  );
}
