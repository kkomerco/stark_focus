// SF VOID BRAND KIT - minimalistycznie elegancko, dopasowane do logo
// Logo: SF + klepsydra, czas ucieka, stal, mrok, niebieski akcent

export const SF_VOID_BRAND = {
  name: "SF VOID",
  logo: "/logo.png", // Twoje logo
  colors: {
    background: "#000000",
    backgroundSoft: "#09090B",
    surface: "#111113",
    surfaceBorder: "#1E1E20",
    textPrimary: "#F5F5F3", // złamana biel jak w logo
    textSecondary: "#8A8A8E", // stalowy szary z logo
    accent: "#00D9FF", // ten niebieski punkt z klepsydry w logo
    accentRed: "#FF1A1A", // tylko na 1 słowo w hooku
    metallic: "#C0C0C4", // metaliczny SF
  },
  typography: {
    heading: "Anton, Bebas Neue, sans-serif", // krzyk
    quote: "Cormorant Garamond, serif", // elegancki cytat jak SF
    mono: "JetBrains Mono, monospace", // UI
  },
  templates: {
    carousel: {
      slides: "3-7",
      slide1: "HOOK na czystej czerni, biały serif 72px, czerwona linia 1px",
      slides2_6: "Tekst + tło dopasowane: ziarno, pustka, mgła, beton, szkło",
      slideLast: "CTA: ZAPISZ TO // SF + klepsydra w rogu",
      grain: "12% film grain, vignette 25%",
    },
    reel: {
      structure: "4-fazowa jak w Twoich inspiracjach: 01 EMPTY BED 02 EMPTY WALLET 03 MIRROR 04 FUTURE SELF",
      timing: "0.8s / 1.1s / 0.8s / 2.2s - tempo cięć dopasowane do beatu",
      text: "Biały serif centered, all caps, tracking -2%",
      background: "Desaturacja -30%, kontrast +20%, czarny",
    }
  }
}

// MATRIX NIESKOŃCZONYCH POMYSŁÓW - anty-powtarzanie
export const VOID_IDEA_MATRIX = {
  pains: ["lenistwo", "wymówki", "komfort", "prokrastynacja", "porównywanie się", "tania dopamina", "brak planu", "strach przed oceną"],
  truths: ["nikt nie przyjdzie", "czas ucieka - klepsydra", "jesteś sam", "nikt nie patrzy", "komfort cię zabija", "jutro to kłamstwo", "dyscyplina to kara za wczoraj"],
  formats: [
    { id: "4_photos", name: "4 zdjęcia (jak @alphascript06)", structure: ["łóżko 11AM", "pusty portfel", "lustro", "przyszłe ja"] },
    { id: "black_quote", name: "Cytat na czarnym (jak @saint.men)", structure: ["czarne tło", "biały cytat", "czerwony akcent"] },
    { id: "changing_bg", name: "Zmieniające się tło co 0.8s (jak @alfinaro22)", structure: ["3 tła", "ten sam tekst"] },
    { id: "carousel_dark", name: "Karuzele 3-7 mroczne (jak @daily.mindset16)", structure: ["hook", "3-5 prawd", "CTA"] },
  ],
  hooks: [
    "To cię zniszczy jeśli nie przestaniesz",
    "Przestań kłamać sam sobie",
    "Masz 24h. Reszta to wymówki",
    "Nikt ci tego nie powie wprost",
    "Twoja przyszłość patrzy na ciebie teraz",
    "Klepsydra nie czeka",
    "SF RULE #",
  ],
  actions: ["wstań", "odtnij ich", "zamknij mordę i rób", "zasada 1%", "protokół 04:30"],
}

export function generateInfiniteIdeas(count: number, seenHashes: string[] = []) {
  const ideas = []
  const used = new Set(seenHashes)
  
  for (let i = 0; i < count * 3; i++) {
    if (ideas.length >= count) break
    
    const pain = VOID_IDEA_MATRIX.pains[Math.floor(Math.random() * VOID_IDEA_MATRIX.pains.length)]
    const truth = VOID_IDEA_MATRIX.truths[Math.floor(Math.random() * VOID_IDEA_MATRIX.truths.length)]
    const format = VOID_IDEA_MATRIX.formats[Math.floor(Math.random() * VOID_IDEA_MATRIX.formats.length)]
    const hook = VOID_IDEA_MATRIX.hooks[Math.floor(Math.random() * VOID_IDEA_MATRIX.hooks.length)]
    const action = VOID_IDEA_MATRIX.actions[Math.floor(Math.random() * VOID_IDEA_MATRIX.actions.length)]
    
    const hash = `${pain}-${truth}-${format.id}-${hook}`.toLowerCase()
    if (used.has(hash)) continue
    used.add(hash)
    
    ideas.push({
      id: `void-${Date.now()}-${i}`,
      title: `${hook}: ${pain} → ${truth}`,
      hook: `${hook.toUpperCase()}`,
      format: format.name,
      structure: format.structure,
      core_message: `${truth}. Rozwiązanie: ${action}. SF Protocol.`,
      pain, truth, action,
      viral_hooks: [hook, `${truth.toUpperCase()}`, `ZASADA: ${action.toUpperCase()}`],
      bingPrompt: `Minimalist dark void, ${pain} concept, pure black background #000000, film grain 12%, single beam of cold light, SF VOID brand, 9:16, no text`,
      hash,
    })
  }
  
  return { ideas, newSeenHashes: Array.from(used) }
}
