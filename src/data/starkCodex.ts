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
  /**
   * Slajdy banku: `headline` + `bodyText`, bez `highlightWords`. Bank je
   * dostarczał, a trasa paczki dnia i tak je wyrzucała przy mapowaniu na
   * karuzelę — pole, które istnieje tylko po to, żeby je zgubić, jest kłamstwem
   * w danych. Wyróżnienia wracają tam, gdzie je ktoś czyta: w recyklerze
   * (`trends.server.ts`) i w studiu karuzeli.
   *
   * Bank daje 5 slajdów, czyli poniżej kontraktu (`CAROUSEL_TARGET_SLIDES` = 12).
   * Nie dorabiamy ich na siłę — studio mówi wprost, że materiał jest krótszy.
   */
  carouselSlides: Array<{ headline: string; bodyText: string }>;
}

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
      },
      {
        headline: "FIRST CONTACT",
        bodyText: "The first battle of every day happens before your eyes even open completely.",
      },
      {
        headline: "THE COST OF DELAY",
        bodyText: "Hitting snooze tells your subconscious that your commitments are optional.",
      },
      {
        headline: "THE IRON FORMULA",
        bodyText: "No thinking. No rationalizing. Five seconds of cold execution.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Win the first 10 minutes, control the entire day.",
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
      },
      {
        headline: "CHEAP DOPAMINE",
        bodyText: "Your brain confuses public declaration with actual biological accomplishment.",
      },
      {
        headline: "THE MONK PARADOX",
        bodyText: "The most dangerous man in any room is the one who owes nobody an explanation.",
      },
      {
        headline: "DARK WORK",
        bodyText: "Twelve months of uninterrupted focus in private will shock everyone in public.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Starve your need for applause. Execute in silence.",
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
      },
      {
        headline: "THE TWO DOMAINS",
        bodyText: "Divide every single problem into what is yours to decide, and what is noise.",
      },
      {
        headline: "STRIP THE DRAMA",
        bodyText: "Remove the word 'terrible'. A situation is merely what occurred, nothing more.",
      },
      {
        headline: "UNSHAKABLE COMPOUND",
        bodyText: "When they expect you to panic, return to your work without changing expression.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Master yourself first before attempting to master reality.",
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
      },
      {
        headline: "THE AMCC MATRIX",
        bodyText: "Every time you do what you hate doing, your brain physically grows denser.",
      },
      {
        headline: "NEVER NEGOTIATE",
        bodyText: "The moment you hesitate for 3 seconds, your limbic system takes over.",
      },
      {
        headline: "PAIN IS DATA",
        bodyText: "Reframe mental exhaustion as proof that the adaptation has begun.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Make discomfort your permanent address.",
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
      },
      {
        headline: "DECISION FATIGUE",
        bodyText: "Debating whether to go to the gym uses more energy than the workout itself.",
      },
      {
        headline: "UNBREAKABLE RULES",
        bodyText: "Replace goals with non-negotiable protocols. No mood checks. No excuses.",
      },
      {
        headline: "THE COMPOUND RESULT",
        bodyText: "When standards replace feelings, mediocrity becomes mathematically impossible.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Stop asking how you feel. Start obeying your code.",
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
      },
      {
        headline: "THE NOISE TAX",
        bodyText: "Every casual conversation drains energy that belonged to your life's work.",
      },
      {
        headline: "MONK MODE PROTOCOL",
        bodyText: "Go dark for 90 days. Reappear unrecognizable in capability and composure.",
      },
      {
        headline: "SELECTIVE DEAFNESS",
        bodyText: "Never accept criticism from someone whose life you would refuse to live.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Fall in love with the quiet grind.",
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
      },
      {
        headline: "THE ENEMY WITHIN",
        bodyText: "Motivation creates tourists. Pure, detached discipline builds monuments.",
      },
      {
        headline: "COLD EXECUTION",
        bodyText: "Learn to look your fatigue in the face and start the next set anyway.",
      },
      {
        headline: "IMPERIAL CALM",
        bodyText: "Neither praise nor insult should ever change your stride by one millimeter.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Treat emotions like passing clouds. Be the mountain.",
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
      },
      {
        headline: "THE ILLUSION OF LATER",
        bodyText: "'Tomorrow' is the graveyard where 99% of ambitions rot in silence.",
      },
      {
        headline: "COUNT THE HOURS",
        bodyText:
          "Notice how fiercely people protect their wallet, yet give away their time for free.",
      },
      {
        headline: "CLAIM TODAY",
        bodyText:
          "Do not leave this desk until the essential duty is completed without compromise.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Time is the only currency you can never earn back.",
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
      },
      {
        headline: "THE GRAVITATIONAL PULL",
        bodyText: "People are drawn to what moves with conviction and asks for nothing in return.",
      },
      {
        headline: "BECOME DANGEROUS",
        bodyText: "Focus entirely on being so exceptionally competent that you cannot be ignored.",
      },
      {
        headline: "TOTAL INDIFFERENCE",
        bodyText: "Treat both their compliments and their doubts with the exact same silence.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Self-respect is built in private, never granted in public.",
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
      },
      {
        headline: "THE SUBCONSCIOUS LEDGER",
        bodyText: "You cannot trick your mind. It knows every single time you took the easy exit.",
      },
      {
        headline: "MAKE FEWER PROMISES",
        bodyText: "Say less. Commit to fewer tasks. But make those few completely untouchable.",
      },
      {
        headline: "RUTHLESS ALIGNMENT",
        bodyText: "When your actions match your words without friction, fear evaporates.",
      },
      {
        headline: "THE UNFORGIVING STANDARD",
        bodyText: "Save this reminder. Your word to yourself is divine law.",
      },
    ],
  },
];
