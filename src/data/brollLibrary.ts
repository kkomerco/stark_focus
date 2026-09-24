// src/data/brollLibrary.ts
// Inteligentna biblioteka kinowych teł B-Roll dopasowanych do filozofii STARK FOCUS

export interface BrollScene {
  id: string;
  name: string;
  category:
    | "stoic_marble"
    | "nocturnal_city"
    | "brutalist_void"
    | "dawn_rain"
    | "dark_training"
    | "infinite_horizon";
  description: string;
  ambientVibe: string;
  suggestedTheme:
    "obsidian_void" | "crimson_eclipse" | "emerald_abyss" | "carbon_aura" | "silver_mist";
  matchKeywords: string[];
  /** Semantyczne tagi wykorzystywane w AI-doborze b-roll. */
  tags: string[];
}

export const CINEMATIC_BROLL_LIBRARY: BrollScene[] = [
  {
    id: "antyczny_marmur_posag",
    name: "Antyczny Rzymski Marmur & Cienie",
    category: "stoic_marble",
    description:
      "Ciemne, surowe ujęcie marmurowego popiersia cesarza w głębokim chiaroscuro z zimnym oświetleniem krawędziowym.",
    ambientVibe: "Cesarski spokój, nieśmiertelna godność, asceza myśli.",
    suggestedTheme: "silver_mist",
    matchKeywords: [
      "stoic",
      "stoicyzm",
      "marcus",
      "aurelius",
      "seneca",
      "epictetus",
      "mind",
      "control",
      "emotions",
      "inner citadel",
      "cesarz",
      "rzym",
      "mądrość",
      "filozofia",
      "calm",
      "unshakable",
    ],
    tags: [
      "stoic",
      "philosophy",
      "marble",
      "wisdom",
      "antiquity",
      "seneca",
      "aurelius",
      "serenity",
      "meditation",
      "legacy",
    ],
  },
  {
    id: "nocna_metropolia_stal",
    name: "Nocna Metropolia & Stalowy Zmierzch",
    category: "nocturnal_city",
    description:
      "Ciemna panorama wieżowców o 3:00 w nocy, pojedyncze zimne światła w oknach, deszcz odbijający się w asfalcie.",
    ambientVibe: "Władza, samotny kapitał, bezwzględna praca gdy świat śpi.",
    suggestedTheme: "carbon_aura",
    matchKeywords: [
      "empire",
      "money",
      "power",
      "capital",
      "city",
      "night",
      "ambition",
      "pieniądze",
      "władza",
      "sukces",
      "lider",
      "biznes",
      "market",
      "high leverage",
      "dark work",
    ],
    tags: [
      "city",
      "night",
      "ambition",
      "empire",
      "capital",
      "business",
      "corporate",
      "urban",
      "grind",
      "lonely",
    ],
  },
  {
    id: "brutalizm_monolit",
    name: "Brutalistyczny Monolit & Pustka",
    category: "brutalist_void",
    description:
      "Ogromna geometryczna bryła z czarnego granitu przecinająca gęstą mgłę. Czysty minimalizm i surowy ciężar.",
    ambientVibe: "Niewzruszoność, milczenie, brak potrzeby aprobaty tłumu.",
    suggestedTheme: "obsidian_void",
    matchKeywords: [
      "silence",
      "secrecy",
      "monolith",
      "standard",
      "standards",
      "noise",
      "applause",
      "alone",
      "milczenie",
      "cisza",
      "kamień",
      "niezłomny",
      "unbreakable",
      "isolation",
      "secret",
    ],
    tags: [
      "silence",
      "monolith",
      "void",
      "isolation",
      "secrecy",
      "strength",
      "minimal",
      "standards",
      "alone",
      "cold",
    ],
  },
  {
    id: "deszcz_asfalt_430am",
    name: "Deszcz & Asfalt o 4:30 AM",
    category: "dawn_rain",
    description:
      "Mokry asfalt przed świtem, zimny deszcz, puste ulice, surowy chłód porannej dyscypliny.",
    ambientVibe: "Asceza poranka, pokonanie wymówek, samotność zwycięzcy.",
    suggestedTheme: "obsidian_void",
    matchKeywords: [
      "4:00",
      "4:30",
      "5:00",
      "morning",
      "alarm",
      "snooze",
      "rain",
      "cold",
      "wake",
      "poranek",
      "świt",
      "deszcz",
      "budzik",
      "łóżko",
      "wstawanie",
      "first battle",
      "early",
    ],
    tags: [
      "morning",
      "early",
      "rain",
      "cold",
      "discipline",
      "ritual",
      "focus",
      "grit",
      "solitude",
      "wake",
    ],
  },
  {
    id: "ciemna_sala_asceza",
    name: "Ciemna Sala & Żelazna Asceza",
    category: "dark_training",
    description:
      "Cień sylwetki pośród surowego żelastwa, kreda na dłoniach, krople potu, absolutne skupienie w mroku.",
    ambientVibe: "Brak litości dla ciała, rozbudowa kory przedczołowej, twardy opór.",
    suggestedTheme: "crimson_eclipse",
    matchKeywords: [
      "pain",
      "training",
      "iron",
      "gym",
      "body",
      "amcc",
      "prefrontal",
      "friction",
      "weakness",
      "trening",
      "ból",
      "pot",
      "żelazo",
      "mięśnie",
      "wysiłek",
      "resistance",
      "push",
    ],
    tags: [
      "training",
      "gym",
      "iron",
      "pain",
      "discipline",
      "strength",
      "suffering",
      "grit",
      "grind",
      "focus",
    ],
  },
  {
    id: "mgla_horyzont_pustka",
    name: "Horyzont w Mglistej Otchłani",
    category: "infinite_horizon",
    description:
      "Nieskończona linia horyzontu we mgle, pojedyncza cienka smuga światła rozcinająca mroczną próżnię.",
    ambientVibe: "Dystans do spraw doczesnych, memento mori, spokój ponad chaosem.",
    suggestedTheme: "emerald_abyss",
    matchKeywords: [
      "horizon",
      "void",
      "death",
      "memento mori",
      "time",
      "passing",
      "gravity",
      "abyss",
      "horyzont",
      "czas",
      "śmierć",
      "przemijanie",
      "otchłań",
      "pustka",
      "infinity",
    ],
    tags: [
      "horizon",
      "void",
      "death",
      "memento",
      "time",
      "infinity",
      "abyss",
      "mortality",
      "transcend",
      "silence",
    ],
  },
];

export function autoMatchBroll(text: string): { scene: BrollScene; confidenceReason: string } {
  const normalized = text.toLowerCase();
  let bestMatch: BrollScene = CINEMATIC_BROLL_LIBRARY[0];
  let maxScore = 0;
  let matchedKeyword = "";

  for (const scene of CINEMATIC_BROLL_LIBRARY) {
    let score = 0;
    for (const kw of scene.matchKeywords) {
      if (normalized.includes(kw)) {
        score += kw.length > 5 ? 3 : 2;
        if (!matchedKeyword) matchedKeyword = kw;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = scene;
    }
  }

  const confidenceReason =
    maxScore > 0
      ? `Dopasowano na podstawie motywu "${matchedKeyword}" -> ${bestMatch.name}`
      : `Domyślne monumentalne tło stoickie (${bestMatch.name})`;

  return { scene: bestMatch, confidenceReason };
}
