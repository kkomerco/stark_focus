// Engine for generating high-impact, thematic English prompts for Bing Image Creator (DALL-E 3)
// specifically adapted to the STARK_FOCUS brutalist dark aesthetic.
// Strictly respects Bing's 480 characters hard prompt limit.

export interface ThematicBingPrompt {
  id: string;
  title: string;
  archetype: 'Brutalist Megastructure' | 'Stoic Obsidian Artifact' | 'Atmospheric Void' | 'Minimalist Geometric Monolith';
  promptText: string;
  charCount: number;
  metaphorExplanation: string;
  recommendedHook?: string;
}

export const BING_PROMPT_MAX_LENGTH = 480;

// High-efficiency negative & quality suffix tuned for Bing DALL-E 3
// Keeps character count compact (~160 chars) so base description has ample breathing room under 480
export const BING_QUALITY_SUFFIX =
  'cinematic chiaroscuro, dark brutalism, 9:16 vertical, clean empty center for text, pure dark background, no text no letters no watermark';

// Guarantees any prompt never exceeds Bing's 480 characters limit
export function clampBingPrompt(text: string, maxLimit = BING_PROMPT_MAX_LENGTH): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLimit) return trimmed;

  // Cut cleanly at last comma, period, or space before maxLimit
  const slice = trimmed.slice(0, maxLimit);
  const lastComma = slice.lastIndexOf(',');
  const lastSpace = slice.lastIndexOf(' ');
  const cutPoint = lastComma > maxLimit - 30 ? lastComma : lastSpace > 0 ? lastSpace : maxLimit;

  return slice.slice(0, cutPoint).trim();
}

function buildPrompt(baseDesc: string): string {
  const full = `${baseDesc.trim()}, ${BING_QUALITY_SUFFIX}`;
  return clampBingPrompt(full, BING_PROMPT_MAX_LENGTH);
}

export function generateThematicBingPrompts(themeOrHook: string): ThematicBingPrompt[] {
  const query = (themeOrHook || '').toLowerCase().trim();

  // Detect thematic domain
  const isMorning =
    query.includes('morning') ||
    query.includes('rano') ||
    query.includes('poran') ||
    query.includes('dawn') ||
    query.includes('świt') ||
    query.includes('06:00') ||
    query.includes('07:00') ||
    query.includes('wake') ||
    query.includes('alarm');

  const isEveningOrNight =
    query.includes('night') ||
    query.includes('wieczór') ||
    query.includes('noc') ||
    query.includes('evening') ||
    query.includes('21:00') ||
    query.includes('20:00') ||
    query.includes('22:00') ||
    query.includes('midnight') ||
    query.includes('sleep') ||
    query.includes('sen') ||
    query.includes('moon');

  const isTimeOrLunch =
    query.includes('13:00') ||
    query.includes('time') ||
    query.includes('czas') ||
    query.includes('lunch') ||
    query.includes('hour') ||
    query.includes('half the day') ||
    query.includes('wasted') ||
    query.includes('przemijanie') ||
    query.includes('godzin');

  const isSilenceOrSolitude =
    query.includes('silence') ||
    query.includes('cisz') ||
    query.includes('solitude') ||
    query.includes('samotn') ||
    query.includes('disappear') ||
    query.includes('zniknij') ||
    query.includes('noise') ||
    query.includes('hałas') ||
    query.includes('opinions');

  const isExcusesOrComfort =
    query.includes('excuse') ||
    query.includes('wymów') ||
    query.includes('comfort') ||
    query.includes('wygod') ||
    query.includes('mediocre') ||
    query.includes('przecięt') ||
    query.includes('poison') ||
    query.includes('trucizn') ||
    query.includes('burnout');

  const isArmorOrHardship =
    query.includes('armor') ||
    query.includes('pancerz') ||
    query.includes('pain') ||
    query.includes('ból') ||
    query.includes('forge') ||
    query.includes('ogien') ||
    query.includes('iron') ||
    query.includes('żelaz') ||
    query.includes('demon') ||
    query.includes('war');

  let rawList: Array<Omit<ThematicBingPrompt, 'charCount' | 'promptText'> & { basePrompt: string }> = [];

  if (isMorning) {
    rawList = [
      {
        id: 'morning-1',
        title: 'Świt Monolitu • Zimna Krawędź Światła (06:00)',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Pierwsza ostra smuga zimnego światła rozcinająca mrok – dyscyplina przed przebudzeniem reszty świata.',
        recommendedHook: 'WHILE THEY SLEEP, YOU BUILD. DO NOT NEGOTIATE WITH THE ALARM.',
        basePrompt: 'Monumental black concrete monolith rising from dark morning mist, single razor-sharp sliver of platinum dawn sunlight slicing across the razor edge, dramatic chiaroscuro'
      },
      {
        id: 'morning-2',
        title: 'Zimne Kowadło o Poranku (Pierwsze Zwycięstwo)',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Ciężka, żelazna podstawa dnia – niszczenie najtrudniejszego zadania przed świtem.',
        recommendedHook: 'DESTROY THE HARDEST TASK BEFORE THE WORLD WAKES UP.',
        basePrompt: 'Heavy ancient blacksmith anvil made of hammered dark iron on basalt pedestal in dark mist, subtle pale morning rim light, floating fine graphite dust'
      },
      {
        id: 'morning-3',
        title: 'Próżnia Przed Świtem i Linia Horyzontu',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Czysty kadr z laserowym horyzontem oddzielającym noc od nowego dnia walki.',
        recommendedHook: 'MIND CLARITY AT DAWN. ZERO DISTRACTIONS BEFORE SUNRISE.',
        basePrompt: 'Vast desolate midnight horizon with cold blue gradient at the lower crest, solitary glowing cyan horizon line, silent dark misty atmosphere'
      },
      {
        id: 'morning-4',
        title: 'Spartański Puchar z Ciemnego Tytanu',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Surowy rytuał poranny – woda, zimno, skupienie bez telefonu.',
        recommendedHook: 'NO PHONE. NO DOPAMINE. EXECUTE YOUR MORNING PROTOCOL.',
        basePrompt: 'Minimalist chalice carved from matte black titanium standing on cracked obsidian stone, sharp dramatic side spotlight, deep black shadows'
      }
    ];
  } else if (isEveningOrNight) {
    rawList = [
      {
        id: 'night-1',
        title: 'Nocna Wieża Skupienia (Gdy Inni Śpią)',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Samotna czarna twierdza w nocy – symbol przewagi budowanej po cichu, gdy konkurencja odpoczywa.',
        recommendedHook: 'THE WORLD GOES TO SLEEP. THE DISCIPLINED GO TO WORK.',
        basePrompt: 'Towering brutalist dark concrete obelisk under a midnight eclipse sky, single thin vertical amber-gold slit ray cutting down the center, moody shadows'
      },
      {
        id: 'night-2',
        title: 'Zimne Lustro Rachunku Sumienia (21:00)',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Czarna tafla obsydianu bezlitośnie odbijająca prawdę o minionym dniu bez wymówek.',
        recommendedHook: 'LOOK IN THE MIRROR TONIGHT. DID YOU WIN OR SURRENDER?',
        basePrompt: 'Polished black obsidian mirror standing upright on wet basalt stone surrounded by dark drifting smoke, cold rim lighting on the sharp bevel'
      },
      {
        id: 'night-3',
        title: 'Nocny Horyzont Płynnego Złota w Otchłani',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Maksymalny kontrast nocny z dużą ilością negatywnej przestrzeni pod kinezję tekstu.',
        recommendedHook: 'SOLITUDE AFTER MIDNIGHT. WHERE REAL MASTERY IS BORN.',
        basePrompt: 'Endless black calm water surface at midnight with a single horizontal glowing amber laser line, atmospheric dark fog, dramatic chiaroscuro'
      },
      {
        id: 'night-4',
        title: 'Czarna Kapsuła Czasu (Zniknij na 6 Miesięcy)',
        archetype: 'Minimalist Geometric Monolith',
        metaphorExplanation: 'Zamknięcie się na świat zewnętrzny w celu transformacji.',
        recommendedHook: 'DISAPPEAR FOR SIX MONTHS. RETURN WITH UNDENIABLE RESULTS.',
        basePrompt: 'Faceted geometric monolith sculpted from matte carbon composite floating in dark void chamber, razor-sharp edges illuminated by platinum rim light'
      }
    ];
  } else if (isTimeOrLunch) {
    rawList = [
      {
        id: 'time-1',
        title: 'Mroczna Klepsydra z Ferrofluidu (Czas Ucieka)',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Klepsydra z czarnym płynem uderza w podświadomość o nieodwracalności czasu w połowie dnia.',
        recommendedHook: 'HALF THE DAY IS GONE. WHAT HAVE YOU ACTUALLY ACCOMPLISHED?',
        basePrompt: 'Monumental hourglass sculpted from matte black tungsten and obsidian, jet-black magnetic ferrofluid dripping slowly into a dark abyss, dramatic rim light'
      },
      {
        id: 'time-2',
        title: 'Monolityczny Zegar Słoneczny w Cieniu Próżni',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Brutalna pionowa iglica rzucająca ostry cień w próżni – bezlitosny licznik sekund bez wymówek.',
        recommendedHook: 'TIME DOES NOT NEGOTIATE. STOP SCROLLING ON YOUR BREAK.',
        basePrompt: 'Towering brutalist black concrete obelisk in vast dark mist void, razor-sharp slit of cold platinum sunlight casting long shadow on cracked ground'
      },
      {
        id: 'time-3',
        title: 'Pęknięty Monolit z Płynnym Złotem (Kintsugi Czasu)',
        archetype: 'Minimalist Geometric Monolith',
        metaphorExplanation: 'Złote pęknięcie wewnątrz czarnej skały symbolizuje wartość każdej niezmarnowanej minuty.',
        recommendedHook: 'THE CLOCK NEVER STOPS. EXECUTE BEFORE NIGHTFALL.',
        basePrompt: 'Massive vertical monolithic block of deep obsidian black stone with single glowing hairline seam of molten amber-gold running down center, dark haze'
      },
      {
        id: 'time-4',
        title: 'Horyzont Ciemnej Mgły i Laserowa Linia Telemetrii',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Czysty horyzont z cienką linią lasera skupia wzrok odbiorcy w 100% na tekście rolki.',
        recommendedHook: 'SILENCE THE NOISE. FINISH THE MISSION TODAY.',
        basePrompt: 'Vast desolate midnight horizon shrouded in rolling dark charcoal fog, single glowing cyan laser line horizontally across lower third, atmospheric stillness'
      }
    ];
  } else if (isSilenceOrSolitude) {
    rawList = [
      {
        id: 'silence-1',
        title: 'Czarny Monolit w Nieskończonym Oceanie Mgły',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Absolutna samotność i nieporuszony fundament – metaforyczna siła człowieka, który przestał mówić o swoich planach.',
        recommendedHook: 'SILENCE CANNOT BE MISQUOTED. LET RESULTS MAKE THE NOISE.',
        basePrompt: 'Colossal solitary dark brutalist fortress rising from endless ocean of midnight fog, clean monolithic silhouette, cold electric cyan rim light tracing upper edge'
      },
      {
        id: 'silence-2',
        title: 'Spartańska Tarcza z Matowego Tytanu w Mroku',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Tarcza odporności na cudze opinie i hałas otoczenia.',
        recommendedHook: 'DISAPPEAR UNTIL YOUR RESULTS ARE UNTOUCHABLE.',
        basePrompt: 'Ancient Spartan shield forged from weathered matte black titanium upright on cracked basalt ground in dark foggy hall, dramatic side studio lighting'
      },
      {
        id: 'silence-3',
        title: 'Próżnia i Pojedyncza Szczelina Światła (Slit Ray)',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Wąska wiązka światła rozcinająca ciemność pokoju bezlitosnej pracy.',
        recommendedHook: 'THE SILENCE IS NOT EMPTY. IT IS FULL OF ANSWERS.',
        basePrompt: 'Interior of immense dark brutalist concrete chamber, single ultra-narrow slit in towering roof casting intense beam of cold white volumetric light through dust'
      },
      {
        id: 'silence-4',
        title: 'Czarny Diamentowy Monolit w Próżni',
        archetype: 'Minimalist Geometric Monolith',
        metaphorExplanation: 'Czysty krystaliczny monolit symbolizujący niezłomną dyscyplinę w samotności.',
        recommendedHook: 'SOLITUDE IS NOT AN ABSENCE. IT IS CONCENTRATED POWER.',
        basePrompt: 'Faceted geometric monolith made of polished black obsidian floating in dark atmospheric mist chamber, subtle reflections on razor-sharp edges'
      }
    ];
  } else if (isExcusesOrComfort) {
    rawList = [
      {
        id: 'excuses-1',
        title: 'Pękający Blok Betonu i Rdzeń ze Stopionego Złota',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Kruszenie skorupy przeciętności i wygody, by odsłonić twardy charakter.',
        recommendedHook: 'COMFORT IS A SLOW POISON. DISCIPLINE IS THE ONLY CURE.',
        basePrompt: 'Massive heavy block of cracked charcoal concrete splitting apart down center, intensely glowing molten gold core within fracture, pitch black background'
      },
      {
        id: 'excuses-2',
        title: 'Żelazne Kowadło w Nocnym Warsztacie Wulkanicznym',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Kowadło, które przyjmuje każde uderzenie bez skargi – stoicka obojętność na dyskomfort.',
        recommendedHook: 'YOUR LACK OF DISCIPLINE IS NOT BURNOUT. YOU ARE TOO COMFORTABLE.',
        basePrompt: 'Heavy ancient blacksmith anvil forged from dark hammered iron on monolithic basalt pedestal surrounded by midnight smoke, low dramatic rim lighting'
      },
      {
        id: 'excuses-3',
        title: 'Brama Brutalistyczna do Nieskończoności',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Wąska brama prowadząca w surowy mrok wysokich standardów.',
        recommendedHook: 'DO NOT NEGOTIATE WITH WEAKNESS. EXECUTE NOW.',
        basePrompt: 'Monumental brutalist archway carved from black volcanic basalt in empty desert of dark sand, cold glowing cyan line illuminating portal frame, atmospheric depth'
      },
      {
        id: 'excuses-4',
        title: 'Monolityczna Ściana Oporowa w Próżni',
        archetype: 'Minimalist Geometric Monolith',
        metaphorExplanation: 'Nie do ruszenia: ściana reprezentująca żelazne zasady odcinające rozproszenia.',
        recommendedHook: 'YOU DO NOT NEED MOTIVATION. YOU NEED NON-NEGOTIABLE STANDARDS.',
        basePrompt: 'Massive black monolith wall stretching into vertical darkness with subtle brutalist shuttering marks, solitary razor-sharp cyan laser edge along crest'
      }
    ];
  } else if (isArmorOrHardship) {
    rawList = [
      {
        id: 'armor-1',
        title: 'Spartańska Korona Wojownika z Ciemnego Tytanu',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Czysta twardość psychiczna wykuta w trudnych warunkach bez szukania współczucia.',
        recommendedHook: 'THE WORLD DOES NOT OWE YOU MEANING. YOU FORGE IT IN THE DARK.',
        basePrompt: 'Dark Spartan warrior helmet crafted from matte black titanium with sharp geometric angles on rough volcanic basalt pedestal, cold cyan electric rim lighting'
      },
      {
        id: 'armor-2',
        title: 'Monolityczna Cytadela w Burzy Wulkanicznej',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Cytadela niewzruszona przez wstrząsy zewnętrzne – stoicki rygor Marka Aureliusza.',
        recommendedHook: 'STAND UNSHAKEN WHILE THE CHAOS RAGES AROUND YOU.',
        basePrompt: 'Enormous brutalist monolithic fortress standing firm amidst dark rolling storm of volcanic ash and midnight mist, subtle glowing red-gold fracture lines at foundation'
      },
      {
        id: 'armor-3',
        title: 'Czarna Geometryczna Płyta Pancerza',
        archetype: 'Minimalist Geometric Monolith',
        metaphorExplanation: 'Optyczna dyscyplina i precyzja działania.',
        recommendedHook: 'RAISE YOUR PAIN TOLERANCE. BECOME UNSTOPPABLE.',
        basePrompt: 'Heavy angular ballistic armor plate sculpted from dark matte carbon composite in deep shadow, precision laser telemetry line projected on surface in cyan'
      },
      {
        id: 'armor-4',
        title: 'Horyzont Ciemnej Stali w Próżni',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Czysta przestrzeń pod mocne hasło motywacyjne.',
        recommendedHook: 'KILL THE NOISE. EXECUTE WHAT IS REQUIRED.',
        basePrompt: 'Minimalist vertical vista of infinite black steel pillars disappearing into dense dark fog, solitary vertical ray of silver light cutting through atmosphere'
      }
    ];
  } else {
    // Default Stoic Brutalist Prompts
    rawList = [
      {
        id: 'gen-1',
        title: 'Monumentalny Monolit z Wąską Szczeliną Światła (Slit Ray)',
        archetype: 'Brutalist Megastructure',
        metaphorExplanation: 'Uniwersalna kompozycja o najwyższym kontraście: szczelina światła przecinająca aksamitny mrok.',
        recommendedHook: themeOrHook || 'THE WORLD DOES NOT OWE YOU MEANING. YOU FORGE IT IN THE DARK.',
        basePrompt: 'Monumental monolithic brutalist tower in infinite black void surrounded by dark rolling mist, razor-sharp slit of cold cyan and white light slicing down center'
      },
      {
        id: 'gen-2',
        title: 'Mroczny Obsydianowy Artefakt ze Stopionym Złotem',
        archetype: 'Stoic Obsidian Artifact',
        metaphorExplanation: 'Stoicka czerń obsydianu z subtelnym akcentem złotej energii.',
        recommendedHook: themeOrHook || 'YOUR LACK OF DISCIPLINE IS NOT BURNOUT. YOU ARE TOO COMFORTABLE.',
        basePrompt: 'Sculptural geometric artifact crafted from polished black volcanic obsidian stone, ultra-thin hairline fracture glowing with warm molten amber gold, fine embers'
      },
      {
        id: 'gen-3',
        title: 'Horyzont Próżni i Zimna Mgła Telemetryczna',
        archetype: 'Atmospheric Void',
        metaphorExplanation: 'Idealne tło z dużą ilością negatywnej przestrzeni pod tekst.',
        recommendedHook: themeOrHook || 'SILENCE CANNOT BE MISQUOTED. LET EXECUTION SPEAK.',
        basePrompt: 'Vast minimalist midnight seascape of silent dark water shrouded in thick rolling fog, glowing electric cyan laser horizon line dividing dark void'
      },
      {
        id: 'gen-4',
        title: 'Matowy Blok Węglowy z Geometrycznym Rantem',
        archetype: 'Minimalist Geometric Monolith',
        metaphorExplanation: 'Surowy, matowy monolit z twardą krawędzią świetlną – zero zbędnych elementów.',
        recommendedHook: themeOrHook || 'DISAPPEAR FOR 6 MONTHS. OUTGROW EVERY DOUBT.',
        basePrompt: 'Close-up architectural shot of massive matte carbon-black geometric monolith corner, razor-sharp edge illuminated by cold platinum rim light'
      }
    ];
  }

  // Map to fully constructed prompts and strictly guarantee length <= 480 chars
  return rawList.map((item) => {
    const promptText = buildPrompt(item.basePrompt);
    return {
      id: item.id,
      title: item.title,
      archetype: item.archetype,
      metaphorExplanation: item.metaphorExplanation,
      recommendedHook: item.recommendedHook,
      promptText,
      charCount: promptText.length
    };
  });
}

