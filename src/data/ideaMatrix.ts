import { NarrativeFormat, ReelTemplate, ReelVisualTheme } from "./reelTemplates";
import { getRandomBackgroundScene, EXPANDED_BACKGROUND_LIBRARY } from "./expandedBackgrounds";

// Matryca Tematyczna do generowania niepowtarzalnych, powiązanych logicznie narracji stoickich
export interface StoicTopicCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const STOIC_CATEGORIES: StoicTopicCategory[] = [
  {
    id: "all",
    name: "Wszystkie / Losowe",
    icon: "🎲",
    description: "Nieskończona mieszanka stoickich paradoksów i dyscypliny",
  },
  {
    id: "discipline_vs_motivation",
    name: "Złudzenie Motywacji",
    icon: "⚔️",
    description: "Dyscyplina, wczesne wstawanie, koniec negocjacji z samym sobą",
  },
  {
    id: "solitude_monk_mode",
    name: "Samotność & Mnisi Tryb",
    icon: "🌑",
    description: "Głęboka praca w ciszy, brak poklasku, budowanie bez rozgłosu",
  },
  {
    id: "dopamine_trap",
    name: "Pułapka Taniej Dopaminy",
    icon: "📱",
    description: "Odzyskiwanie uwagi, scrollowanie, nowoczesne zniewolenie umysłu",
  },
  {
    id: "memento_mori_urgency",
    name: "Czas & Memento Mori",
    icon: "⏳",
    description: "Kruchość życia, koniec prokrastynacji, pilność każdego dnia",
  },
  {
    id: "emotional_sovereignty",
    name: "Umysł & Niewzruszoność",
    icon: "🧠",
    description: "Dichotomia kontroli, panowanie nad gniewem i opiniami innych",
  },
  {
    id: "iron_standards",
    name: "Żelazne Standardy",
    icon: "👑",
    description: "Zero wymówek, wysokie wymagania od siebie, szacunek do własnego słowa",
  },
];

// Receptury 4-frazowe: Ściśle powiązane logicznie [Hook -> Bolesny Kontrast -> Zasada Stoicka -> Puenta Climax]
export interface FourPhraseFormula {
  category: string;
  title: string;
  phrases: [string, string, string, string];
  captionShort: string;
  captionDeep: string;
  theme: ReelVisualTheme;
  suggestedDuration: 7 | 9 | 10 | 12;
}

export const FOUR_PHRASE_EXPANDED_BANK: FourPhraseFormula[] = [
  // 1. Złudzenie Motywacji
  {
    category: "discipline_vs_motivation",
    title: "The Alarm Trap",
    phrases: [
      "You keep negotiating with your alarm.",
      "As if you can bargain your way to greatness.",
      "Discipline does not care how tired you feel.",
      "Rise now or accept your mediocrity.",
    ],
    captionShort:
      "The morning negotiation is where men lose their sovereignty before the sun even rises. Kill the compromise.",
    captionDeep:
      "When you hit snooze, you tell your subconscious that comfort matters more than your potential.\n\n3 morning non-negotiables:\n1. Feet on the floor at the first chime.\n2. No digital screens for the first 60 minutes.\n3. Attack the heaviest boulder before noon.\n\nSave this for tomorrow morning. Follow for relentless discipline.",
    theme: "obsidian_void",
    suggestedDuration: 9,
  },
  {
    category: "discipline_vs_motivation",
    title: "When Motivation Dies",
    phrases: [
      "You only execute when the mood feels right.",
      "That is not discipline. That is emotional dependency.",
      "True power begins the second motivation expires.",
      "Hold the standard especially when you hate it.",
    ],
    captionShort:
      "Amateurs wait to feel inspired. The sovereign mind operates on an unbending schedule. Master your moods.",
    captionDeep:
      "Relying on motivation is like relying on the weather to steer a warship. You will drift aimlessly.\n\nStoic routine rules:\n- Systems outlive emotional highs.\n- The hardest sessions build the unbreakable mind.\n- Keep your promise to yourself regardless of emotion.\n\nSave this reminder. Follow @stark_focus.",
    theme: "carbon_aura",
    suggestedDuration: 9,
  },
  {
    category: "discipline_vs_motivation",
    title: "The Silent Bargain",
    phrases: [
      "Every skipped repetition is a silent surrender.",
      "You think nobody saw your shortcut.",
      "Your conscience registered every micro-betrayal.",
      "Reclaim your self-respect in the dark.",
    ],
    captionShort:
      "You cannot lie to the man in the mirror. Micro-failures compound into a broken spirit. Hold the line.",
    captionDeep:
      "Small compromises seem harmless in isolation. But they silently erode the foundation of your confidence.\n\nRebuilding self-respect:\n1. Never cut a single rep short.\n2. Keep commitments made in solitude.\n3. Integrity is what you do when you are completely alone.\n\nSave this post. Follow for stoic mastery.",
    theme: "crimson_eclipse",
    suggestedDuration: 9,
  },
  {
    category: "discipline_vs_motivation",
    title: "The Cost of Quitting",
    phrases: [
      "You quit because the burn became uncomfortable.",
      "Yet you endure the permanent agony of regret.",
      "Suffering is guaranteed in this life.",
      "At least choose the suffering that forges you.",
    ],
    captionShort:
      "Discipline weighs ounces. Regret weighs tons. Choose your burden with ruthless stoic clarity.",
    captionDeep:
      "Every man suffers. The only choice you have is between the pain of discipline today or the bitter sting of regret tomorrow.\n\nStoic axiom:\n- Discomfort is temporary; mediocrity is permanent.\n- When your mind screams to stop, you have only reached 40%.\n- Push past the barrier.\n\nSave this reel. Follow for daily grit.",
    theme: "carbon_aura",
    suggestedDuration: 10,
  },

  // 2. Samotność & Mnisi Tryb
  {
    category: "solitude_monk_mode",
    title: "The Silence of the Forge",
    phrases: [
      "You crave applause before you lay the first stone.",
      "Broadcasting your moves drains your vital fire.",
      "The grandest empires were planned in isolation.",
      "Disappear until the work cannot be ignored.",
    ],
    captionShort:
      "Talking about your goals gives your brain cheap, unearned dopamine. Shut your mouth and build in the dark.",
    captionDeep:
      "When you announce your ambitions, your brain mistakes speaking for doing. Seal your lips.\n\nMonk mode protocol:\n1. No social announcements for 90 days.\n2. Work in uninterrupted blocks of deep focus.\n3. Let the finished structure shock the spectators.\n\nSave this reminder. Follow for stealth building.",
    theme: "obsidian_void",
    suggestedDuration: 9,
  },
  {
    category: "solitude_monk_mode",
    title: "Terrified of Solitude",
    phrases: [
      "You fill every quiet moment with cheap noise.",
      "Because sitting alone forces you to face yourself.",
      "Solitude is not an enemy to be escaped.",
      "It is the sanctuary where iron is tempered.",
    ],
    captionShort:
      "If you cannot sit alone in an empty room for an hour, you are not sovereign—you are a prisoner of distraction.",
    captionDeep:
      "Modern society fears silence because in silence, your suppressed potential demands an account.\n\nPracticing solitude:\n- Take 30 minutes of screenless silence daily.\n- Journal your unfiltered truths.\n- Reconnect with your core mission without external noise.\n\nSave this reel. Follow for stoic clarity.",
    theme: "silver_mist",
    suggestedDuration: 9,
  },
  {
    category: "solitude_monk_mode",
    title: "The Invisible Labor",
    phrases: [
      "They only respect the day of coronation.",
      "They ignore the thousand nights in the cold.",
      "Do not look for their approval in the trench.",
      "Your victory was decided when nobody looked.",
    ],
    captionShort:
      "Real triumph is not won on stage. It is won in the unglamorous hours when everyone else is asleep.",
    captionDeep:
      "Spectators only see the peak of the mountain. They never see the frostbite and bleeding knuckles of the climb.\n\nKeep climbing:\n- Do not ask for cheers while laying the foundation.\n- Love the brutal monotony of daily practice.\n- The summit will take care of itself.\n\nSave this post. Follow @stark_focus.",
    theme: "emerald_abyss",
    suggestedDuration: 10,
  },

  // 3. Pułapka Taniej Dopaminy & Uwagi
  {
    category: "dopamine_trap",
    title: "The Digital Leash",
    phrases: [
      "You wake up and instantly check other people's lives.",
      "Surrendering your attention before your feet touch earth.",
      "A hijacked mind can never command an empire.",
      "Break the digital leash and reclaim your throne.",
    ],
    captionShort:
      "Your attention is the most valuable currency on earth. Stop giving it away for free to mindless feeds.",
    captionDeep:
      "Every notification you answer is a micro-submission of your sovereign will. Reclaim your focus.\n\nDigital sovereignty checklist:\n1. Phone out of the bedroom overnight.\n2. First 90 minutes of your day are zero-screen.\n3. Guard your mental state like a fortress.\n\nSave this reel. Follow for radical focus.",
    theme: "obsidian_void",
    suggestedDuration: 9,
  },
  {
    category: "dopamine_trap",
    title: "Gladiators of Nothing",
    phrases: [
      "You exhaust your nervous system on trivial debates.",
      "Fighting battles that will not matter tomorrow.",
      "Preserve your mental steel for your true destiny.",
      "Starve the distraction. Feed the craft.",
    ],
    captionShort:
      "Seneca wrote: We are not given a short life, but we waste much of it. Stop fighting meaningless battles.",
    captionDeep:
      "The world wants you outraged, exhausted, and reactive. Refuse to take the bait.\n\nStoic attention filter:\n- Will this matter in 5 years? If no, ignore it.\n- Is this within my direct sphere of control? If no, release it.\n- Direct 100% of your energy toward your own craft.\n\nSave this post. Follow for daily mastery.",
    theme: "carbon_aura",
    suggestedDuration: 9,
  },

  // 4. Czas & Memento Mori
  {
    category: "memento_mori_urgency",
    title: "The Illusion of Tomorrow",
    phrases: [
      "You act as if you have centuries to spare.",
      "Postponing greatness to a mythical next week.",
      "Death does not wait for you to finish your excuses.",
      "Act today with the ferocity of a dying man.",
    ],
    captionShort:
      "You could leave life right now. Let that determine what you do and say and think. — Marcus Aurelius",
    captionDeep:
      "Procrastination is the arrogant belief that the universe owes you another sunrise.\n\nMemento Mori principles:\n1. Treat today as a complete, sovereign lifetime.\n2. Do not leave the most vital work uninitiated.\n3. Make your peace with the clock by executing right now.\n\nSave this reel. Follow for stoic urgency.",
    theme: "crimson_eclipse",
    suggestedDuration: 9,
  },
  {
    category: "memento_mori_urgency",
    title: "The Grain in the Glass",
    phrases: [
      "Every passing second is lost to eternity.",
      "Yet you trade your hours for fleeting pleasure.",
      "Time is the only asset you cannot buy back.",
      "Spend it only on what survives the grave.",
    ],
    captionShort:
      "Men are frugal in guarding their personal property; but as soon as it comes to squandering time, they are most prodigal. — Seneca",
    captionDeep:
      "You would never let a thief steal your wallet. Why do you let useless trivia rob you of your irreplaceable hours?\n\nReclaim your time:\n- Audit where your daylight vanishes.\n- Cut the vampires draining your hours.\n- Invest every drop into your monument.\n\nSave this quote. Follow for stoic discipline.",
    theme: "silver_mist",
    suggestedDuration: 9,
  },

  // 5. Umysł & Niewzruszoność
  {
    category: "emotional_sovereignty",
    title: "The Fortress Within",
    phrases: [
      "You let the insult of a fool ruin your entire day.",
      "Allowing an untrained stranger to command your emotions.",
      "Nothing touches you unless your judgment permits it.",
      "Build your citadel and become untouchable.",
    ],
    captionShort:
      "If you are pained by any external thing, it is not the thing that disturbs you, but your own estimate of it.",
    captionDeep:
      "When someone offends you, you handed them the remote control to your soul. Take it back.\n\nInner Citadel rules:\n- Insults reflect the speaker, never the target.\n- Pause between the trigger and your response.\n- Unshakeable calm is the ultimate display of dominance.\n\nSave this for chaotic days. Follow for inner strength.",
    theme: "emerald_abyss",
    suggestedDuration: 9,
  },
  {
    category: "emotional_sovereignty",
    title: "Chaos Is Outside",
    phrases: [
      "The storm will rage whether you weep or stand tall.",
      "Cursing the rain will never dry your coat.",
      "Direct your energy only where you have dominion.",
      "Master yourself. Let the world spin.",
    ],
    captionShort:
      "Epictetus commanded: Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are.",
    captionDeep:
      "Suffering is born when you demand that outside events obey your wishes. Accept what is, dominate what you can.\n\nFramework of control:\n1. Out of your control: other people, weather, market.\n2. In your control: your effort, your response, your dignity.\n3. Pour all strength into #2.\n\nSave this video. Follow @stark_focus.",
    theme: "obsidian_void",
    suggestedDuration: 9,
  },

  // 6. Żelazne Standardy
  {
    category: "iron_standards",
    title: "The Standard Remains",
    phrases: [
      "You lowered the bar when nobody was watching.",
      "Rationalizing that just this once does not count.",
      "How you do anything is how you do everything.",
      "Raise the standard and never look down.",
    ],
    captionShort:
      "The second you tolerate a crack in your discipline, the entire structure begins to crumble. Guard your code.",
    captionDeep:
      "Greatness is not a single heroic act. It is the uncompromising repetition of high standards when nobody is checking on you.\n\nCode of iron standards:\n- Deliver more than promised.\n- Fix the small defects before they become rot.\n- Never lower your standard to make others comfortable.\n\nSave this post. Follow for daily mastery.",
    theme: "carbon_aura",
    suggestedDuration: 9,
  },
  {
    category: "iron_standards",
    title: "The Debt to Yourself",
    phrases: [
      "You owe the younger you a profound apology.",
      "For settling for less than what you promised him.",
      "The debt cannot be erased with comforting words.",
      "Repay it with relentless, brutal execution.",
    ],
    captionShort:
      "The boy who dreamed of becoming a warrior is watching the man you are today. Do not disappoint him.",
    captionDeep:
      "You made promises to yourself before you learned to make excuses. It is time to honor the contract.\n\nHonor the contract:\n1. Stop accepting mediocre compromises.\n2. Push your physical and mental limits daily.\n3. Become the hero your younger self expected.\n\nSave this reel. Follow for stoic focus.",
    theme: "crimson_eclipse",
    suggestedDuration: 10,
  },
];

// ==========================================
// COMBINATORIAL GENERATOR (10,000+ COMBINATIONS)
// Gwarancja nielimitowanej świeżości i powiązania logicznego każdego zdania
// ==========================================

export interface ArchetypeComponents {
  category: string;
  hooks: string[]; // Phase 1: The Trap / Provocation (3-6 words)
  contrasts: string[]; // Phase 2: The Brutal Truth / Diagnosis (3-6 words)
  laws: string[]; // Phase 3: The Stoic Law / Principle (3-6 words)
  punchlines: string[]; // Phase 4: The Climax / Closing Directive (3-6 words)
  themes: ReelVisualTheme[];
}

export interface BackgroundRecommendation {
  theme: ReelVisualTheme;
  sceneName: string;
  description: string;
  rationale: string;
  bingPrompt: string;
  previewColor: string;
}

export const CATEGORY_BACKGROUND_RECOMMENDATIONS: Record<string, BackgroundRecommendation> = {
  discipline_vs_motivation: {
    theme: "obsidian_void",
    sceneName: "Posąg Marka Aureliusza w Cieniu",
    description:
      "Ciemne marmurowe popiersie cesarza z zimnym oświetleniem krawędziowym na tle czerni",
    rationale:
      "Głęboka czerń i chłodny marmur skupiają wzrok widza wyłącznie na surowym tekście dyscypliny bez rozpraszaczy.",
    bingPrompt:
      "Minimalist dark marble statue of Marcus Aurelius stoic emperor, dramatic side rim light, pitch black void background, cinematic moody atmosphere, photorealistic 8k, vertical 9:16",
    previewColor: "#111111",
  },
  solitude_monk_mode: {
    theme: "emerald_abyss",
    sceneName: "Mglisty Sosnowy Las o Zmierzchu",
    description:
      "Mroczny las we mgle, samotny monolit z kamienia, chłodna szmaragdowo-grafitowa poświata",
    rationale:
      "Szmaragdowy mrok i leśna mgła potęgują stan wyciszenia, mnichiego skupienia i odcięcia od zewnętrznego chaosu.",
    bingPrompt:
      "Cinematic dark misty pine forest in deep twilight fog, cold emerald and charcoal shadows, solitary wanderer silhouette, atmospheric, high contrast, 9:16 vertical",
    previewColor: "#04140e",
  },
  dopamine_trap: {
    theme: "carbon_aura",
    sceneName: "Obsydianowy Monolit & Zgaszony Ekran",
    description: "Ciemny geometryczny monolit przecinający cyfrową pustkę, aksamitny grafit",
    rationale:
      "Aura antracytu symbolizuje oczyszczenie umysłu z tanich bodźców i powrót do suwerennej, nienaruszonej uwagi.",
    bingPrompt:
      "Brutalist dark obsidian monolith rising from ash, subtle cold amber rim light, minimal dark aesthetic, cinematic shadows, 8k vertical 9:16",
    previewColor: "#14120e",
  },
  memento_mori_urgency: {
    theme: "crimson_eclipse",
    sceneName: "Zaćmienie z Krwistym Żarem & Klepsydra",
    description:
      "Starożytna klepsydra z ciemnym piaskiem lub zaćmienie z żarzącą się karmazynową koroną",
    rationale:
      "Zaćmienie karmazynu wprowadza powagę i fizjologiczną pilność nieodwracalnie uciekającego czasu (Memento Mori).",
    bingPrompt:
      "Ancient dark glass hourglass with black sand flowing, deep crimson eclipse glow behind, moody chiaroscuro lighting, dramatic stoic atmosphere, vertical 9:16",
    previewColor: "#1f0404",
  },
  emotional_sovereignty: {
    theme: "silver_mist",
    sceneName: "Niewzruszona Skała pośród Nocnego Sztormu",
    description: "Granitowy klif pośród ciemnego oceanu pod nocnym, zamglonym niebem",
    rationale:
      "Srebrzysty zmierzch i granitowa skała to klasyczna stoicka metafora umysłu niewzruszonego wobec ludzkich opinii.",
    bingPrompt:
      "Immovable dark granite cliff standing in stormy ocean at midnight, crashing waves with silver mist, moonlit stoic serenity, epic cinematic, 9:16 vertical",
    previewColor: "#11181c",
  },
  iron_standards: {
    theme: "carbon_aura",
    sceneName: "Starożytna Kuźnia & Kamienne Kolumny",
    description: "Masywne kamienne filary panteonu w cieniu lub surowa kuźnia z chłodną stalą",
    rationale:
      "Antracytowa kuźnia i surowa architektura podkreślają bezkompromisowy standard wykuwany w samotności.",
    bingPrompt:
      "Ancient monumental stone temple pillars in dark shadows, subtle golden rim light, minimalist stoic architecture, photorealistic 8k vertical 9:16",
    previewColor: "#17140f",
  },
};

export const ARCHETYPE_COMPONENTS: Record<string, ArchetypeComponents> = {
  discipline_vs_motivation: {
    category: "discipline_vs_motivation",
    hooks: [
      "You negotiate with your alarm.",
      "You wait for inspiration.",
      "You promise to start Monday.",
      "You let feelings dictate action.",
      "You look for easy shortcuts.",
      "You break promises made privately.",
      "You surrender to comfortable excuses.",
      "You delay your true duty.",
    ],
    contrasts: [
      "Greatness never bargains with weakness.",
      "Inspiration is for amateurs.",
      "Monday never arrives for excuse-makers.",
      "Feelings lie. Results do not.",
      "Shortcuts forge fragile men.",
      "Broken vows destroy self-respect.",
      "Comfort slowly strangles ambition.",
      "Excuses build empty lives.",
    ],
    laws: [
      "Discipline ignores your feelings.",
      "Sovereigns act on schedule.",
      "Private habits decide public crowns.",
      "Ruthless routine kills all doubt.",
      "Pain today buys future peace.",
      "Hold standards in the dark.",
      "Iron character demands friction.",
      "Honor your sovereign vows.",
    ],
    punchlines: [
      "Rise now or stay mediocre.",
      "Hold the line today.",
      "Execute in total silence.",
      "Stop debating. Pick it up.",
      "Never negotiate with your weakness.",
      "Reclaim your standard now.",
      "Conquer yourself first.",
      "Shock them with results.",
    ],
    themes: ["obsidian_void", "carbon_aura", "crimson_eclipse"],
  },

  solitude_monk_mode: {
    category: "solitude_monk_mode",
    hooks: [
      "You crave applause before building.",
      "You broadcast moves to strangers.",
      "You fill quiet with noise.",
      "You fear being forgotten.",
      "You seek validation from spectators.",
      "You talk more than you build.",
      "You let everyone into your mind.",
      "You confuse attention with power.",
    ],
    contrasts: [
      "Talking drains your vital fire.",
      "Loud mouths have empty foundations.",
      "Silence exposes your true deficit.",
      "The crowd forgets you instantly.",
      "Spectators never understand the blood.",
      "Cheap words kill real work.",
      "Needing applause makes you fragile.",
      "Open gates let thieves enter.",
    ],
    laws: [
      "Empires are built in isolation.",
      "True power needs no witnesses.",
      "Solitude is the giant's sanctuary.",
      "Disappear until the work speaks.",
      "Deep labor conquers casual socializing.",
      "Guard your attention like steel.",
      "Silence preserves vital power.",
      "Build monuments in the dark.",
    ],
    punchlines: [
      "Seal lips and return to work.",
      "Disappear until it is finished.",
      "Let finished results speak.",
      "Embrace the cold solitude.",
      "Move silently. Strike with permanence.",
      "Remain untouchable in your craft.",
      "Starve the external noise.",
      "Build an unshakable kingdom.",
    ],
    themes: ["obsidian_void", "emerald_abyss", "silver_mist"],
  },

  dopamine_trap: {
    category: "dopamine_trap",
    hooks: [
      "You check screens before sunrise.",
      "You surrender focus to glowing glass.",
      "You consume hours of trivia.",
      "You trade genius for quick hits.",
      "You panic when screens turn off.",
      "Algorithms dictate what you crave.",
      "You complain yet remain addicted.",
      "You spectate while others create.",
    ],
    contrasts: [
      "Surrendering mind before waking up.",
      "A hijacked mind builds nothing.",
      "Hours lost are months stolen.",
      "You are harvested like cattle.",
      "Endless stimulation makes souls fragile.",
      "A manipulated will controls nothing.",
      "Noise cannot produce mental clarity.",
      "Their highlights crush your monument.",
    ],
    laws: [
      "Attention is your sacred currency.",
      "Dopamine fasting restores sharp genius.",
      "Sovereignty starts by disconnecting.",
      "Master screens or be mastered.",
      "Depth requires boredom.",
      "Refuse audience to your decline.",
      "Cleanse your inner temple.",
      "Govern your own attention.",
    ],
    punchlines: [
      "Sever the digital leash today.",
      "Put down the screen. Build.",
      "Reclaim your attention now.",
      "Starve distraction. Feed craft.",
      "Step out of the matrix.",
      "Own your morning completely.",
      "Silence feeds your real destiny.",
      "Kill addiction before it kills you.",
    ],
    themes: ["emerald_abyss", "carbon_aura", "obsidian_void"],
  },

  memento_mori_urgency: {
    category: "memento_mori_urgency",
    hooks: [
      "You act like centuries remain.",
      "You delay your masterwork tomorrow.",
      "You squander hours without regret.",
      "You complain life is short.",
      "You live like death is optional.",
      "You wait for ideal conditions.",
      "You hoard comfort while time drains.",
      "You apologize instead of executing.",
    ],
    contrasts: [
      "Death ignores your excuses.",
      "Tomorrow is a graveyard.",
      "Every breath belongs to time.",
      "The universe owes no sunrise.",
      "Late regret is agonizing torture.",
      "Conditions are never perfect.",
      "Comfort strangles future greatness.",
      "Time never flows backward.",
    ],
    laws: [
      "You could die right now.",
      "Treat today as your lifetime.",
      "Memento Mori fuels ruthless action.",
      "Greet every dawn with reverence.",
      "Urgent action is highest self-respect.",
      "Spend your hours like gold.",
      "Leave nothing essential unbuilt.",
      "Death gives life fierce urgency.",
    ],
    punchlines: [
      "Execute today without hesitation.",
      "Make peace by attacking duty.",
      "Do not die unfulfilled.",
      "Seize this sovereign hour.",
      "Memento Mori: Execute now.",
      "Leave an unshakeable monument.",
      "Be a good man now.",
      "The final curtain approaches.",
    ],
    themes: ["crimson_eclipse", "obsidian_void", "carbon_aura"],
  },

  emotional_sovereignty: {
    category: "emotional_sovereignty",
    hooks: [
      "A stranger's insult ruins your day.",
      "You surrender calm to minor delays.",
      "You demand the world conform.",
      "Another man's ego triggers rage.",
      "You seek revenge on critics.",
      "You let others hold your happiness.",
      "Chaos outside invades your mind.",
      "You react like a puppet.",
    ],
    contrasts: [
      "Handing strangers keys to peace.",
      "Minor delays destroy your character.",
      "Demanding calm seas is foolish.",
      "Mirroring petty men makes you lesser.",
      "Hate poisons only yourself.",
      "Needing validation makes you captive.",
      "External storms cannot breach citadel.",
      "Reactivity is slavery to circumstance.",
    ],
    laws: [
      "Nothing harms you without consent.",
      "Events are indifferent. Judgment matters.",
      "The inner citadel is impregnable.",
      "Control only what is yours.",
      "Unshakable calm is supreme dominance.",
      "Choose not to be harmed.",
      "Rule mind or be ruled.",
      "Turn insults into sharpening stones.",
    ],
    punchlines: [
      "Build your untouchable citadel.",
      "Master yourself. Ignore the storm.",
      "Cut the puppet strings now.",
      "Refuse the bait in silence.",
      "Guard the gate of mind.",
      "Serenity is internal dominance.",
      "Be the immovable rock.",
      "Own your judgment completely.",
    ],
    themes: ["emerald_abyss", "silver_mist", "obsidian_void"],
  },

  iron_standards: {
    category: "iron_standards",
    hooks: [
      "You cut corners in private.",
      "You lower bars for others.",
      "You tolerate sloppy, lazy work.",
      "You excuse your own failures.",
      "Your standards fluctuate with company.",
      "You accept second-best from yourself.",
      "You break promises to yourself.",
      "You tolerate rot in foundations.",
    ],
    contrasts: [
      "The mirror watched your surrender.",
      "Lowering standards is slow suicide.",
      "Sloppiness is a spreading cancer.",
      "Excuses build monuments to nothing.",
      "Fluctuating bars reveal moral weakness.",
      "Compromise leaves the soul hollow.",
      "Private betrayals rot inner confidence.",
      "Rotten foundations collapse roofs.",
    ],
    laws: [
      "How you do anything matters.",
      "Excellence is relentless habit.",
      "Strict with self, tolerant outside.",
      "Never explain standards to mud.",
      "Integrity is holding the line.",
      "Honor private vows religiously.",
      "Raise the standard above excuses.",
      "Self-respect is your only crown.",
    ],
    punchlines: [
      "Raise standards and never yield.",
      "Hold the line. Zero excuses.",
      "Demand excellence from yourself.",
      "Live so enemies respect standards.",
      "Deliver greatness in silence.",
      "Keep private vows unbroken.",
      "Refuse mediocrity like poison.",
      "Wear integrity like armor.",
    ],
    themes: ["carbon_aura", "obsidian_void", "crimson_eclipse"],
  },
};

// Helper do porównywania identyfikatorów bez względu na formatowanie
const normalizeId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const CATEGORY_TITLES: Record<string, string[]> = {
  discipline: [
    "The Unbroken Standard",
    "Silence and Steel",
    "The Alarm Trap",
    "Kill the Compromise",
    "The Iron Vow",
    "Zero Negotiations",
    "Forged in Habit",
    "The Clock Commands",
    "No Retreat Protocol",
    "The 5 AM Citadel",
    "Strict With Yourself",
    "The Sovereign Morning",
  ],
  solitude: [
    "Untouchable Citadel",
    "Monk Mode Protocol",
    "The Sacred Isolation",
    "Silent Ascendance",
    "The Private War",
    "Crowds Are Blind",
    "Strength in Shadows",
    "The Solitude Armor",
    "Beyond the Noise",
    "The Quiet Fortress",
    "Solitary Dominion",
    "Invisible Execution",
  ],
  action: [
    "Overthinking Kills",
    "Execute Before Noon",
    "Motion Cures Doubt",
    "The Ruthless Bias",
    "Action Over Analysis",
    "Strike the Anvil",
    "Zero Hesitation Rule",
    "Conquer the Starting Line",
    "The Daily Siege",
    "Speed in Silence",
    "Momentum Is King",
    "The First Move",
  ],
  adversity: [
    "The Forge Within",
    "Pressure Is a Privilege",
    "Love the Resistance",
    "The Fire Consumes All",
    "Unbreakable Will",
    "Born in the Storm",
    "The Granite Mind",
    "Cold Harbor Rule",
    "Armor Against Fate",
    "The Obstacle Is the Forge",
    "Defiance of Comfort",
    "Standing in the Gale",
  ],
  standards: [
    "The Sacred Standard",
    "Tolerate No Rot",
    "Raise the Ceiling",
    "How You Do Anything",
    "The Private Standard",
    "Excellence in the Dark",
    "The High Ground",
    "No Compromise Today",
    "The Unseen Bar",
    "Honor the Vow",
    "Unforgiving Quality",
    "Standard of the Sovereign",
  ],
  solitude_focus: [
    "The Deep Citadel",
    "Starve the Distractions",
    "Monk Mode Reality",
    "High Leverage Solitude",
    "The Tunnel Vision Vow",
    "Silence the Feed",
    "The Digital Fast",
    "Single Point Focus",
    "The Iron Monolith",
    "Sovereignty Over Noise",
    "Deep Water Execution",
    "The Monastic Standard",
  ],
  emotional_control: [
    "The Unshakeable Fortress",
    "Master the Impulse",
    "Calm Is Dominance",
    "Hostage to Nothing",
    "The Cold Eye",
    "Silence the Ego",
    "Ruler of the Response",
    "The Iron Pulse",
    "Untouchable Composure",
    "Stillness in the Tempest",
    "The Inner Citadel",
    "Tame the Beast Within",
  ],
};

// Generuje matematycznie niepowtarzalny, ściśle powiązany zestaw fraz
export function generateCombinatorialFormula(
  format: NarrativeFormat,
  category: string = "all",
  excludeTitles: string[] = [],
): ReelTemplate {
  const catKeys = Object.keys(ARCHETYPE_COMPONENTS);
  const chosenCategoryKey =
    category !== "all" && ARCHETYPE_COMPONENTS[category]
      ? category
      : catKeys[Math.floor(Math.random() * catKeys.length)];

  const arch = ARCHETYPE_COMPONENTS[chosenCategoryKey];

  // Losuj po 1 elemencie z każdego z 4 poziomów narracji
  const hook = arch.hooks[Math.floor(Math.random() * arch.hooks.length)];
  const contrast = arch.contrasts[Math.floor(Math.random() * arch.contrasts.length)];
  const law = arch.laws[Math.floor(Math.random() * arch.laws.length)];
  const punchline = arch.punchlines[Math.floor(Math.random() * arch.punchlines.length)];
  const theme = arch.themes[Math.floor(Math.random() * arch.themes.length)];

  // Dopasowana baza tytułów dla kategorii
  const poolTitles = CATEGORY_TITLES[chosenCategoryKey] || CATEGORY_TITLES.discipline;
  const excludedNorms = new Set(excludeTitles.map(normalizeId));
  const freshTitles = poolTitles.filter((t) => !excludedNorms.has(normalizeId(t)));

  let title: string;
  if (freshTitles.length > 0) {
    title = freshTitles[Math.floor(Math.random() * freshTitles.length)];
  } else {
    // Generowanie nowego złożonego tytułu gdy pula została wyczerpana
    const prefixes = ["Protocol", "Rule", "Doctrine", "Codex", "Decree", "Law", "Standard"];
    const cores = [
      "The Citadel",
      "The Forge",
      "The Standard",
      "The Silence",
      "The Sovereign",
      "The Abyss",
      "The Monolith",
      "The Iron Vow",
    ];
    const candidate = `${prefixes[Math.floor(Math.random() * prefixes.length)]}: ${cores[Math.floor(Math.random() * cores.length)]} #${Math.floor(Math.random() * 90 + 10)}`;
    title = candidate;
  }

  let phrases: string[] = [];
  let suggestedDuration: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 15 = 9;

  if (format === "four_phrases") {
    // 4 Fazy: Hook -> Kontrast -> Zasada -> Puenta (3-6 słów każda)
    phrases = [hook, contrast, law, punchline];
    suggestedDuration = 11;
  } else if (format === "three_phases") {
    // 3 Fazy: Prowokacja -> Zasada Stoicka -> Dyrektywa (Czyste pojedyncze frazy!)
    phrases = [hook, law, punchline];
    suggestedDuration = 9;
  } else if (format === "two_phases") {
    // 2 Fazy: Złudzenie / Obserwacja vs Standard / Rozwiązanie (Czyste pojedyncze frazy!)
    phrases = [hook, punchline];
    suggestedDuration = 8;
  } else {
    // 1 stały cytat: Żelazna zasada stoicka
    phrases = [law];
    suggestedDuration = 7;
  }

  // Dynamiczne losowanie tła z bogatej biblioteki (ponad 100+ unikalnych motywów) dopasowanej do motywu wizualnego
  const randomScene = getRandomBackgroundScene(theme);
  const bgRec = {
    sceneName: randomScene.name,
    rationale: randomScene.rationale,
    bingPrompt: randomScene.bingPrompt,
    previewColor: randomScene.previewColor,
  };

  // Unikalne, głębokie otwarcia kontekstowe dla opisu (niebędące kopią tekstu z wideo!)
  const categoryContextOpeners: Record<string, string[]> = {
    discipline_vs_motivation: [
      "Most men lose their self-respect not in public defeats, but in private negotiations made alone in their room.",
      "The illusion of motivation is a trap designed to keep amateurs comfortable. Sovereignty requires strict routine.",
      "Every time you negotiate with weakness, you cast an irreversible vote against your sovereign future.",
    ],
    solitude_monk_mode: [
      "Modern society fears silence because in silence, your unfulfilled potential demands an immediate account.",
      "Talking about your goals gives your brain cheap, unearned dopamine. Shut your mouth and build in the dark.",
      "The crowd only applauds on the day of coronation. They will never respect the thousand nights in the cold.",
    ],
    dopamine_trap: [
      "Your attention is the most valuable currency on earth. Stop giving it away for free to mindless digital feeds.",
      "Every notification you react to is a micro-surrender of your sovereign will. Reclaim your focus.",
      "A hijacked mind can never build an empire. Disconnect from cheap stimulation to restore your mental fire.",
    ],
    memento_mori_urgency: [
      "Procrastination is the arrogant delusion that the universe owes you another sunrise.",
      "You could leave life right now. Let that determine what you do, what you think, and what you tolerate.",
      "Men are frugal with money, but reckless with the only irreplaceable asset they own: their hours.",
    ],
    emotional_sovereignty: [
      "Handing a stranger the power to disturb your peace is the most pathetic form of self-enslavement.",
      "Events are completely neutral; it is only your interpretation that gives them the power to harm you.",
      "Unshakable calm in the middle of chaos is the ultimate display of psychological dominance.",
    ],
    iron_standards: [
      "How you do anything in private is how you do everything when the pressure peaks.",
      "Lowering your standard to keep mediocre companions comfortable is slow-motion spiritual suicide.",
      "Your self-respect is the only crown worth wearing. Protect it with uncompromising integrity.",
    ],
  };

  const openers =
    categoryContextOpeners[chosenCategoryKey] || categoryContextOpeners.discipline_vs_motivation;
  const contextOpener = openers[Math.floor(Math.random() * openers.length)];

  const captionShort = `${contextOpener} Execute without apology. Save this standard and follow @stark_focus.`;

  const captionDeep = `${contextOpener}

When you step into the arena, the world will test whether your standard is real or performative.

3 non-negotiable protocols to apply today:
1. Silence the inner debate — when it is time to act, move without hesitation.
2. Guard your attention — reject trivial drama and cheap stimulation.
3. Hold the standard in secret — execute especially when nobody is watching.

Save this reminder for tomorrow morning.
Drop a ⚔️ if you commit to this standard today.
Follow @stark_focus for daily stoic clarity.`;

  return {
    id: `matrix_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    format,
    title,
    phrases,
    captionShort,
    captionDeep,
    hashtags: ["#stoicism", "#discipline", "#darkstoicism", "#focus", "#starkfocus"],
    suggestedTheme: theme,
    suggestedDuration,
    suggestedBackground: bgRec.sceneName,
    backgroundRationale: bgRec.rationale,
  };
}

// Helper: Główna funkcja pobierania szablonu (używa zarówno banku 30+ gotowych arc, jak i generatora kombinatorycznego)
export function getRandomUniqueFormula(
  format: NarrativeFormat,
  category: string = "all",
  excludeIds: string[] = [],
): ReelTemplate {
  const excludedNorms = new Set(excludeIds.map(normalizeId));

  // Filtruj po kategorii z banku ręcznego
  let pool = FOUR_PHRASE_EXPANDED_BANK;
  if (category !== "all") {
    pool = pool.filter((item) => item.category === category);
    if (pool.length === 0) pool = FOUR_PHRASE_EXPANDED_BANK;
  }

  // Wyklucz ostatnio widziane
  const available = pool.filter((item) => !excludedNorms.has(normalizeId(item.title)));

  // Jeśli w banku nie ma już unikalnych lub 60% losowości -> generator kombinatoryczny 28 000+ kombinacji
  if (available.length === 0 || Math.random() > 0.35) {
    return generateCombinatorialFormula(format, category, excludeIds);
  }

  const item = available[Math.floor(Math.random() * available.length)];
  const id = `matrix_${item.title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;

  let phrases: string[] = [];
  let suggestedDuration: 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 14 | 15 = 9;

  if (format === "four_phrases") {
    phrases = [...item.phrases];
    suggestedDuration = 11;
  } else if (format === "three_phases") {
    // Wybierz Hook, Zasadę i Puentę z 4-frazowego szablonu (bez łączenia zdań!)
    phrases = [item.phrases[0], item.phrases[2], item.phrases[3]];
    suggestedDuration = 9;
  } else if (format === "two_phases") {
    // Wybierz Hook i Puentę (bez łączenia zdań!)
    phrases = [item.phrases[0], item.phrases[3]];
    suggestedDuration = 8;
  } else {
    phrases = [item.phrases[2]];
    suggestedDuration = 7;
  }

  const randomScene = getRandomBackgroundScene(item.theme);
  const bgRec = {
    sceneName: randomScene.name,
    rationale: randomScene.rationale,
    bingPrompt: randomScene.bingPrompt,
    previewColor: randomScene.previewColor,
  };

  return {
    id,
    format,
    title: item.title,
    phrases,
    captionShort: item.captionShort,
    captionDeep: item.captionDeep,
    hashtags: ["#stoicism", "#discipline", "#darkstoic", "#focus", "#starkfocus"],
    suggestedTheme: item.theme,
    suggestedDuration,
    suggestedBackground: bgRec.sceneName,
    backgroundRationale: bgRec.rationale,
  };
}
