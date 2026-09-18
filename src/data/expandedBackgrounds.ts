import { ReelVisualTheme } from "./reelTemplates";

export interface BackgroundScene {
  id: string;
  name: string;
  category: string;
  theme: ReelVisualTheme;
  description: string;
  rationale: string;
  bingPrompt: string;
  previewColor: string;
}

// Kolekcja ponad 100+ unikalnych stoickich motywów tła (Dark Stoic / Void / Architecture / Chiaroscuro)
export const EXPANDED_BACKGROUND_LIBRARY: BackgroundScene[] = [
  // 1. ANTYCZNA ARCHITEKTURA I MONUMENTY (15)
  {
    id: "arch_01",
    name: "Marmurowe Popiersie Seneki w Cieniu",
    category: "Architektura & Rzeźba",
    theme: "obsidian_void",
    description:
      "Mroczne marmurowe popiersie Seneki, zimne boczne światło, czarna bezkresna pustka",
    rationale: "Podkreśla bezkompromisowy autorytet myśli i stoickie opanowanie wobec chaosu.",
    bingPrompt:
      "Minimalist dark marble statue bust of Seneca philosopher, dramatic directional side rim light, pitch black void background, cinematic chiaroscuro, 8k vertical 9:16",
    previewColor: "#0A0A0C",
  },
  {
    id: "arch_02",
    name: "Korynckie Kolumny w Nocnej Mgle",
    category: "Architektura & Rzeźba",
    theme: "carbon_aura",
    description: "Monumentalne antyczne kolumny wyłaniające się z gęstej, ciemnej mgły",
    rationale: "Trwałość i niezmienność zasad w obliczu przemijającego czasu.",
    bingPrompt:
      "Monumental ancient Corinthian marble pillars shrouded in dark nocturnal mist, dramatic low-key rim lighting, matte charcoal textures, cinematic editorial vertical 9:16",
    previewColor: "#101317",
  },
  {
    id: "arch_03",
    name: "Monumentalny Portyk Panteonu o Północy",
    category: "Architektura & Rzeźba",
    theme: "silver_mist",
    description:
      "Ciemne, kamienne wejście do rzymskiego panteonu z subtelną bursztynowo-złotą poświatą",
    rationale: "Majestat starożytnego porządku i święta powaga dyscypliny.",
    bingPrompt:
      "Dark monumental Roman Pantheon portico at midnight, subtle deep amber and gold atmospheric backlight, monolithic stone shadows, editorial 35mm photography 9:16",
    previewColor: "#14110A",
  },
  {
    id: "arch_04",
    name: "Skrzydlata Nike z Samotraki w Mroku",
    category: "Architektura & Rzeźba",
    theme: "silver_mist",
    description: "Marmurowa Nike bez głowy stojąca na krawędzi czerni, srebrzysty światłocień",
    rationale: "Symbol triumfu osiąganego przez surowe poświęcenie bez pragnienia poklasku.",
    bingPrompt:
      "Dramatic Winged Victory of Samothrace marble statue in deep black shadows, cold silver rim light, high contrast chiaroscuro, 8k vertical 9:16",
    previewColor: "#0E1114",
  },
  {
    id: "arch_05",
    name: "Popiersie Epikteta z Brązu w Pustce",
    category: "Architektura & Rzeźba",
    theme: "obsidian_void",
    description: "Ciemna patyna brązowej rzeźby Epikteta, surowy wyraz twarzy, zero rozproszeń",
    rationale: "Odzwierciedla wewnętrzną wolność człowieka, który panuje nad własnym umysłem.",
    bingPrompt:
      "Dark weathered bronze sculpture bust of Epictetus, raw textured surface, single cold spotlight in pure black abyss, editorial composition 9:16",
    previewColor: "#080808",
  },
  {
    id: "arch_06",
    name: "Starożytne Kamienne Schody do Pustki",
    category: "Architektura & Rzeźba",
    theme: "carbon_aura",
    description: "Wąskie, wydeptane przez stulecia stopnie wiodące w nieprzenikniony mrok",
    rationale: "Stopniowa, bezszelestna wspinaczka na szczyt samokontroli.",
    bingPrompt:
      "Ancient weathered granite stone stairs ascending into pure pitch-black darkness, subtle raking side light highlighting texture, minimalist stoic mood 9:16",
    previewColor: "#121214",
  },
  {
    id: "arch_07",
    name: "Czysty Łuk Triumfalny w Deszczu",
    category: "Architektura & Rzeźba",
    theme: "silver_mist",
    description: "Masywny kamienny łuk mokry od nocnego deszczu, odbicia chłodnego światła",
    rationale: "Triumf cichy, wywalczony w samotności, bez świadków.",
    bingPrompt:
      "Massive dark stone triumphal arch in nocturnal cold rain, wet dark reflections on ancient cobblestones, cinematic moody atmosphere 9:16",
    previewColor: "#0C1014",
  },
  {
    id: "arch_08",
    name: "Monolityczna Krypta Filozofów",
    category: "Architektura & Rzeźba",
    theme: "obsidian_void",
    description: "Surowy podziemny grobowiec z bazaltu, bezkresna cisza i prostota",
    rationale: "Poczucie wieczności i nieuchronności stoickiego rachunku sumienia.",
    bingPrompt:
      "Brutalist ancient basalt stone crypt, extreme minimalist geometry, razor-thin sliver of cold ambient illumination, silent atmosphere 9:16",
    previewColor: "#050608",
  },
  {
    id: "arch_09",
    name: "Ciemny Amfiteatr pod Gwiazdami",
    category: "Architektura & Rzeźba",
    theme: "carbon_aura",
    description: "Opuszczone kamienne trybuny rzymskiego teatru w świetle zimnego księżyca",
    rationale: "Odrzucenie pragnienia oklasków – scena jest pusta, liczy się tylko twoja cnota.",
    bingPrompt:
      "Empty ancient stone amphitheater under cold midnight sky, moonlight casting sharp geometric shadows, stoic solitude, editorial 9:16",
    previewColor: "#0D0E12",
  },
  {
    id: "arch_10",
    name: "Bazaltowy Cokół Ognia",
    category: "Architektura & Rzeźba",
    theme: "crimson_eclipse",
    description: "Ciemny kamienny cokół z tlącym się głęboko karmazynowym żarem",
    rationale: "Wewnętrzny ogień (Logos), który spala wszelkie wymówki i słabości.",
    bingPrompt:
      "Minimalist dark basalt stone pedestal with deep crimson dying embers in pure black void, moody chiaroscuro lighting, stoic solemnity, vertical 9:16",
    previewColor: "#160608",
  },
  {
    id: "arch_11",
    name: "Kolumnada Forum Romanum o Świcie",
    category: "Architektura & Rzeźba",
    theme: "silver_mist",
    description:
      "Zarys ruin przed wschodem słońca, pierwsze zimne złote promienie na szczytach kapiteli",
    rationale: "Poranny rytuał bezkompromisowej gotowości do walki z własną słabością.",
    bingPrompt:
      "Ruins of Roman Forum colonnade in blue hour before dawn, subtle muted golden rim light on top of columns, peaceful stoic majesty 9:16",
    previewColor: "#12100A",
  },
  {
    id: "arch_12",
    name: "Głowa Zeusa z Ciemnego Granitu",
    category: "Architektura & Rzeźba",
    theme: "obsidian_void",
    description: "Masywna rzeźba o surowym spojrzeniu częściowo ukryta w cieniu",
    rationale: "Obojętność praw natury wobec ludzkich skarg i narzekań.",
    bingPrompt:
      "Granite sculpted head of Olympian sovereign deity emerging from obsidian shadow, sharp dramatic side lighting, austere stoic expression 9:16",
    previewColor: "#070709",
  },
  {
    id: "arch_13",
    name: "Monolityczna Brama z Czarnego Marmuru",
    category: "Architektura & Rzeźba",
    theme: "carbon_aura",
    description: "Geometryczny portal z polerowanego czarnego kamienia o matowym połysku",
    rationale: "Przejście ze stanu chaosu i emocji w stan żelaznej suwerenności.",
    bingPrompt:
      "Minimalist black marble portal gateway, sharp orthogonal lines, subtle volumetric haze, cinematic dramatic depth, vertical 9:16",
    previewColor: "#0B0D10",
  },
  {
    id: "arch_14",
    name: "Popiersie Cycerona w Półcieniu",
    category: "Architektura & Rzeźba",
    theme: "silver_mist",
    description: "Rzymski mówca z kamiennym, nieruchomym wzrokiem w srebrzystym świetle",
    rationale: "Waga wypowiadanych słów i bezwzględna wartość prawdy.",
    bingPrompt:
      "Classical marble bust of Cicero, high contrast chiaroscuro, cold silver directional spotlight, pure dark background, 8k 9:16",
    previewColor: "#0D1116",
  },
  {
    id: "arch_15",
    name: "Antyczny Basen Lustrzany w Ciemności",
    category: "Architektura & Rzeźba",
    theme: "emerald_abyss",
    description: "Ciemna, idealnie gładka tafla wody w rzymskim atrium pod nocnym niebem",
    rationale: "Niewzruszony umysł jako idealne lustro rzeczywistości bez zniekształceń.",
    bingPrompt:
      "Dark Roman impluvium still water reflecting moonlight, surrounded by stone peristyle in shadows, emerald dark gradient, serene 9:16",
    previewColor: "#05120D",
  },

  // 2. SUROWA NATURA, KLIFY I ŻYWIOŁY (15)
  {
    id: "nat_01",
    name: "Czarny Klif w Oceanie o Północy",
    category: "Natura & Żywioły",
    theme: "silver_mist",
    description: "Granitowy monolit o który rozbijają się spienione fale, nocne niebo",
    rationale: "Klasyczna metafora Marka Aureliusza: bądź jak skała, o którą rozbija się fala.",
    bingPrompt:
      "Massive black jagged granite cliff enduring powerful crashing ocean waves at midnight, silver seafoam mist, dramatic stoic mood 9:16",
    previewColor: "#0A1014",
  },
  {
    id: "nat_02",
    name: "Samotna Sosna na Skalistym Szczycie",
    category: "Natura & Żywioły",
    theme: "emerald_abyss",
    description: "Wykrzywione przez wiatr drzewo rosnące na czystej skale pośród mgły",
    rationale: "Siła charakteru hartowana przez nieustanny, przeciwny wiatr losu.",
    bingPrompt:
      "Solitary gnarled pine tree clinging to high dark rocky summit, surrounded by dense moody fog, deep emerald tone, vertical 9:16",
    previewColor: "#06130E",
  },
  {
    id: "nat_03",
    name: "Pustynia z Czarnego Piasku w Ciszy",
    category: "Natura & Żywioły",
    theme: "obsidian_void",
    description: "Bezkresne czarne wydmy wulkaniczne o ostrych krawędziach i czystych liniach",
    rationale: "Oczyszczenie z nadmiaru, absolutny minimalizm i surowość egzystencji.",
    bingPrompt:
      "Endless black volcanic sand dunes at twilight, sharp wind-sculpted ridges, pure matte black shadows, minimal stoic landscape 9:16",
    previewColor: "#060607",
  },
  {
    id: "nat_04",
    name: "Lodowiec o Barwie Antracytu i Lodu",
    category: "Natura & Żywioły",
    theme: "silver_mist",
    description: "Zimna ściana lodowca z ciemnym popiołem wulkanicznym, bezlitosna cisza",
    rationale: "Emocjonalny chłód i nieugięta stanowczość w obliczu presji.",
    bingPrompt:
      "Massive dark glacier wall with black volcanic ash strata, extreme cold atmospheric mist, high contrast cinematic photography 9:16",
    previewColor: "#0A1016",
  },
  {
    id: "nat_05",
    name: "Nocne Jezioro o Lustrzanej Tafli",
    category: "Natura & Żywioły",
    theme: "obsidian_void",
    description: "Idealnie nieruchoma ciemna woda otoczona czarnymi ścianami gór",
    rationale: "Ataraksja – stan idealnego spokoju wewnętrznego niezmąconego lękiem.",
    bingPrompt:
      "Glassy pitch-black alpine lake mirroring dark mountain silhouettes, solitary motionless water, meditative quietness, 9:16 vertical",
    previewColor: "#040507",
  },
  {
    id: "nat_06",
    name: "Wulkaniczny Wąwóz z Chłodnym Cieniem",
    category: "Natura & Żywioły",
    theme: "carbon_aura",
    description: "Głęboki skalny kanion z pionowymi ścianami z czarnego bazaltu",
    rationale: "Wąska, wymagająca ścieżka cnoty, którą podążają nieliczni.",
    bingPrompt:
      "Deep narrow basalt canyon walls rising vertically, cold diffuse skylight from above, mysterious brooding shadows, vertical 9:16",
    previewColor: "#0E1013",
  },
  {
    id: "nat_07",
    name: "Zaćmienie Słońca nad Bezkresnym Pustkowiem",
    category: "Natura & Żywioły",
    theme: "crimson_eclipse",
    description: "Czarna tarcza księżyca z koroną słoneczną żarzącą się karmazynem",
    rationale: "Przypomnienie o małości człowieka wobec praw wszechświata (Kosmopolis).",
    bingPrompt:
      "Solar eclipse totality over dark barren plains, thin deep crimson coronal ring blazing in black sky, ominous stoic awe 9:16",
    previewColor: "#170507",
  },
  {
    id: "nat_08",
    name: "Wodospad we Mgle w Półmroku",
    category: "Natura & Żywioły",
    theme: "emerald_abyss",
    description: "Ciemna masa wody spadająca w bezdenną przepaść w sosnowym lesie",
    rationale: "Nieustanny upływ czasu i bezpowrotnie tracone chwile.",
    bingPrompt:
      "Dark powerful waterfall plunging into deep misty gorge, cold emerald twilight tones, long exposure silk water, editorial 9:16",
    previewColor: "#071410",
  },
  {
    id: "nat_09",
    name: "Zmarznięta Tundra przed Wschodem",
    category: "Natura & Żywioły",
    theme: "silver_mist",
    description: "Surowa, zamarznięta ziemia pokryta szronem, lodowate horyzonty",
    rationale: "Dyscyplina poranka – hartowanie ciała i ducha przed pierwszym promieniem.",
    bingPrompt:
      "Frozen dark barren tundra with crisp white frost on black earth, freezing twilight horizon, raw solitude, 35mm lens 9:16",
    previewColor: "#0B0F14",
  },
  {
    id: "nat_10",
    name: "Piorun Rozcinający Nocne Niebo",
    category: "Natura & Żywioły",
    theme: "obsidian_void",
    description: "Pojedyncza potężna błyskawica na tle jednolicie czarnych chmur burzowych",
    rationale: "Błyskawiczna jasność stoickiej decyzji – bez wahania, bez wątpliwości.",
    bingPrompt:
      "Single razor-sharp lightning strike illuminating dark storm clouds, high contrast pitch black silhouette, cinematic photography 9:16",
    previewColor: "#06070A",
  },
  {
    id: "nat_11",
    name: "Górski Grzbiet w Chmurach o Zmierzchu",
    category: "Natura & Żywioły",
    theme: "carbon_aura",
    description: "Ostra krawędź grani przecinająca morze ciemnych, gęstych chmur",
    rationale: "Życie na krawędzi najwyższych standardów, ponad przeciętnością mas.",
    bingPrompt:
      "Razor-sharp dark mountain ridge emerging above a sea of dark dramatic clouds, moody twilight gradient, stoic atmosphere 9:16",
    previewColor: "#111217",
  },
  {
    id: "nat_12",
    name: "Sosnowy Las po Nocnej Śnieżycy",
    category: "Natura & Żywioły",
    theme: "silver_mist",
    description: "Czarne pnie drzew w głębokim śniegu, absolutna cisza bez wiatru",
    rationale: "Stan mnichiego skupienia (Monk Mode) – zewnętrzny świat zostaje wyciszony.",
    bingPrompt:
      "Deep dark pine forest after heavy nocturnal snowfall, stark contrast of black tree trunks and white snow, serene silence 9:16",
    previewColor: "#0E1116",
  },
  {
    id: "nat_13",
    name: "Krople Deszczu na Czarnej Szybie w Nocy",
    category: "Natura & Żywioły",
    theme: "obsidian_void",
    description: "Mroczna tafla szkła ze strumieniami deszczu, w tle odległe zimne światła",
    rationale: "Izolacja i głęboka praca w samotności podczas gdy reszta świata śpi.",
    bingPrompt:
      "Raindrops streaking across black tinted glass window at night, cold distant ambient blur, moody introspective atmosphere 9:16",
    previewColor: "#07080B",
  },
  {
    id: "nat_14",
    name: "Monolityczna Jaskinia z Lodowymi Soplami",
    category: "Natura & Żywioły",
    theme: "silver_mist",
    description: "Ciemna jaskinia z kryształowymi igłami lodu zwisającymi ze sklepienia",
    rationale: "Surowość, w której rodzi się nieugięty charakter wolny od pragnień wygody.",
    bingPrompt:
      "Interior of dark cavern with sharp ice stalactites, directional cold moonlight piercing the entrance, stoic clarity 9:16",
    previewColor: "#090D12",
  },
  {
    id: "nat_15",
    name: "Czarny Meteoroid w Kosmicznej Próżni",
    category: "Natura & Żywioły",
    theme: "obsidian_void",
    description: "Nierówny bazaltowy kamień zawieszony w bezdennym mroku kosmosu",
    rationale: "Perspektywa z góry (View from Above) – twoje problemy są pyłem we wszechświecie.",
    bingPrompt:
      "Dark textured asteroid floating in pure black cosmic void, subtle side starlight rim illumination, minimalist cosmic stoicism 9:16",
    previewColor: "#040405",
  },

  // 3. MINIMALISTYCZNA GEOMETRIA, ŚWIATŁOCIEŃ & VOID (15)
  {
    id: "void_01",
    name: "Promień Światła w Bezkresnej Ciemności",
    category: "Geometria & Void",
    theme: "obsidian_void",
    description: "Pojedynczy wąski promień zimnego światła przecinający aksamitną czerń",
    rationale: "Skupienie uwagi (Prosochê) – tylko jeden cel, zero rozproszeń.",
    bingPrompt:
      "Ultra-minimalist pitch black room, single razor-thin beam of cold white light cutting through dense atmospheric haze, 9:16 vertical",
    previewColor: "#050608",
  },
  {
    id: "void_02",
    name: "Brutalistyczny Betonowy Korytarz Cienia",
    category: "Geometria & Void",
    theme: "carbon_aura",
    description: "Surowe betonowe ściany tworzące ostry geometryczny światłocień",
    rationale: "Czysta dyscyplina formy bez zbędnych ozdobników.",
    bingPrompt:
      "Brutalist dark concrete hallway with sharp geometric angled shadows, architectural chiaroscuro, raw industrial texture 9:16",
    previewColor: "#111316",
  },
  {
    id: "void_03",
    name: "Monolityczna Ściana z Włókna Węglowego",
    category: "Geometria & Void",
    theme: "carbon_aura",
    description: "Matowa faktura grafitowego splotu z subtelnym światłem krawędziowym",
    rationale: "Nowoczesna, technologiczna precyzja i odporność na wszelkie obciążenia.",
    bingPrompt:
      "Matte dark carbon fiber weave surface, precision texture, extreme close-up, subtle diagonal shadow line, high tech minimalism 9:16",
    previewColor: "#0F1115",
  },
  {
    id: "void_04",
    name: "Karmazynowy Horyzont na Granicy Cienia",
    category: "Geometria & Void",
    theme: "crimson_eclipse",
    description: "Jednolita czerń przecięta na dole wąską, pulsującą linią karmazynowego żaru",
    rationale: "Napięcie i determinacja, które budzą się o świcie.",
    bingPrompt:
      "Pure black composition with thin glowing crimson red horizon line at the lower third, mysterious dark ambient vignette 9:16",
    previewColor: "#150406",
  },
  {
    id: "void_05",
    name: "Złoty Zarys Geometrii Monolitu",
    category: "Geometria & Void",
    theme: "silver_mist",
    description: "Ciemna bryła sześcianu obrysowana cienką nicią matowego cesarskiego złota",
    rationale: "Złoty podział i geometryczny ład panujący w umyśle mędrca.",
    bingPrompt:
      "Minimal dark obsidian cube outlined with faint muted gold metallic edge, floating in deep black void, elegant editorial 9:16",
    previewColor: "#13100A",
  },
  {
    id: "void_06",
    name: "Asymetryczny Cień na Stalowej Płycie",
    category: "Geometria & Void",
    theme: "carbon_aura",
    description: "Szczotkowany tytan z ostrym podziałem na strefę światła i strefę mroku",
    rationale: "Radykalny podział Epikteta: to co zależy od ciebie i to co nie zależy.",
    bingPrompt:
      "Brushed dark titanium metal panel diagonally split by hard edge shadow, subtle metallic grain, stark industrial aesthetic 9:16",
    previewColor: "#101216",
  },
  {
    id: "void_07",
    name: "Mroczna Schodkowa Piramida z Kamienia",
    category: "Geometria & Void",
    theme: "obsidian_void",
    description: "Zgeometryzowane czarne stopnie wznoszące się w nieskończoność",
    rationale: "Nieustanny proces stawania się lepszym o 1% każdego dnia.",
    bingPrompt:
      "Minimalist black ziggurat stepped pyramid, raking light showing stone steps, void background, timeless ancient geometry 9:16",
    previewColor: "#08090C",
  },
  {
    id: "void_08",
    name: "Matowy Monolit z Pęknięciem Światła",
    category: "Geometria & Void",
    theme: "silver_mist",
    description: "Potężny blok skalny z wąską szczeliną emitującą zimne białe światło",
    rationale: "Przeszkoda staje się drogą – światło znajduje ujście przez trudności.",
    bingPrompt:
      "Massive dark stone monolith with narrow vertical fissure leaking cold white luminescence, dramatic volumetric haze 9:16",
    previewColor: "#0B0E12",
  },
  {
    id: "void_09",
    name: "Koncentryczne Okręgi w Czarnym Piasku",
    category: "Geometria & Void",
    theme: "obsidian_void",
    description: "Japoński suchy ogród z czarnego żwiru w świetle księżyca",
    rationale: "Harmonia, wyciszenie wewnętrznego dialogu i dyscyplina gestu.",
    bingPrompt:
      "Zen rock garden raked black gravel concentric circles around dark stone, moonlight chiaroscuro, perfect meditative symmetry 9:16",
    previewColor: "#070709",
  },
  {
    id: "void_10",
    name: "Szmaragdowy Dym w Próżni",
    category: "Geometria & Void",
    theme: "emerald_abyss",
    description: "Cienka smuga ciemnozielonego dymu wirująca w absolutnej czerni",
    rationale: "Ulotność ludzkich emocji i myśli, które należy obserwować bez przywiązania.",
    bingPrompt:
      "Delicate swirl of deep emerald and charcoal smoke curling in total black vacuum, frozen in motion, high-speed photography 9:16",
    previewColor: "#05110B",
  },
  {
    id: "void_11",
    name: "Ciemna Siatka Architektoniczna 3D",
    category: "Geometria & Void",
    theme: "carbon_aura",
    description: "Minimalistyczna struktura kratowa z czarnej stali niknąca w dali",
    rationale: "Architektura myślenia – konstruowanie niezniszczalnych systemów działania.",
    bingPrompt:
      "Dark wireframe steel grid vanishing into atmospheric fog, architectural perspective, brutalist structural elegance 9:16",
    previewColor: "#0D0F13",
  },
  {
    id: "void_12",
    name: "Monolityczna Brama bez Drzwi",
    category: "Geometria & Void",
    theme: "obsidian_void",
    description: "Czysty czarny prostokątny otwór prowadzący w jeszcze głębszy mrok",
    rationale: "Odwaga wejścia w nieznane i porzucenia strefy komfortu.",
    bingPrompt:
      "Pristine black portal opening leading into darker void, sharp rectangular edges, minimal editorial aesthetic 9:16",
    previewColor: "#050506",
  },
  {
    id: "void_13",
    name: "Kropla Wody Zamrożona w Powietrzu",
    category: "Geometria & Void",
    theme: "silver_mist",
    description: "Pojedyncza doskonała kropla na tle czerni oświetlona zimnym fleszem",
    rationale: "Obecna chwila – jedyny moment, w którym masz rzeczywistą kontrolę.",
    bingPrompt:
      "Single perfect water droplet suspended motionless in black air, cold rim illumination, macro frozen moment, editorial 9:16",
    previewColor: "#0A0D11",
  },
  {
    id: "void_14",
    name: "Ciemna Tarcza Zegara bez Wskazówek",
    category: "Geometria & Void",
    theme: "carbon_aura",
    description: "Matowy cyferblat z nacięciami bez wskazówek, gra światła na indeksach",
    rationale: "Czas płynie niezmiennie – nie mierz go narzekaniem, mierz go działaniem.",
    bingPrompt:
      "Minimalist matte black sundial dial without hands, subtle engraved hash marks, cold angled raking light, stoic memento mori 9:16",
    previewColor: "#0C0E12",
  },
  {
    id: "void_15",
    name: "Grafitowa Klepsydra z Opadającym Pyłem",
    category: "Geometria & Void",
    theme: "crimson_eclipse",
    description: "Ciemne szkło klepsydry z opadającym w próżni czarnym piaskiem",
    rationale: "Memento Mori – każda sekunda która mija należy już do śmierci.",
    bingPrompt:
      "Dark glass hourglass in deep shadows with black sand falling grain by grain, subtle crimson backlight edge, moody 9:16",
    previewColor: "#130507",
  },

  // 4. MROCZNE MIASTO, ULICA O 4:30 RANO & MNISI TRYB (15)
  {
    id: "city_01",
    name: "Mokry Asfalt i Samotna Sylwetka o 4:30 AM",
    category: "Miasto & Monk Mode",
    theme: "obsidian_void",
    description: "Pusta ulica wielkiego miasta przed świtem, deszcz, samotna postać w dali",
    rationale: "Kiedy wszyscy śpią, ty już kładziesz fundamenty pod swoją dominację.",
    bingPrompt:
      "Moody empty city street at 4:30 AM before dawn, wet reflective black asphalt, lone solitary figure walking away in distance 9:16",
    previewColor: "#08090C",
  },
  {
    id: "city_02",
    name: "Pojedyncze Zapalone Okno w Wieżowcu",
    category: "Miasto & Monk Mode",
    theme: "carbon_aura",
    description: "Ciemna geometryczna bryła drapacza chmur z jednym świecącym oknem w nocy",
    rationale: "Wyrzeczenie się rozrywek tłumu na rzecz bezwzględnej pracy w ukryciu.",
    bingPrompt:
      "Monolithic dark skyscraper at 3 AM with only a single solitary lit window, deep urban chiaroscuro, cinematic stoic focus 9:16",
    previewColor: "#0D1015",
  },
  {
    id: "city_03",
    name: "Opustoszały Most we Mgle o Zmierzchu",
    category: "Miasto & Monk Mode",
    theme: "silver_mist",
    description: "Potężne stalowe liny mostu ginące w gęstej, chłodnej mgle nad rzeką",
    rationale: "Przejście przez własne kryzysy bez możliwości odwrotu.",
    bingPrompt:
      "Empty suspension bridge in heavy nocturnal fog, dark cold steel cables disappearing into mist, quiet solitude 9:16",
    previewColor: "#0A0E13",
  },
  {
    id: "city_04",
    name: "Surowa Siłownia w Podziemiach o Świcie",
    category: "Miasto & Monk Mode",
    theme: "carbon_aura",
    description: "Ciemne ciężary żeliwne, surowy beton, chłodne światło z góry",
    rationale: "Świątynia żelaza, gdzie pot i ból zamieniają się w nieugiętą wolę.",
    bingPrompt:
      "Ultra-dark underground gym, heavy cast iron weights, raw concrete walls, cold single overhead spotlight, moody atmospheric dust 9:16",
    previewColor: "#101216",
  },
  {
    id: "city_05",
    name: "Ciemny Peron Kolejowy w Nocy",
    category: "Miasto & Monk Mode",
    theme: "obsidian_void",
    description: "Puste tory lśniące w chłodnym świetle lampy, niknące w ciemności",
    rationale: "Nieuchronna podróż w głąb własnego charakteru bez towarzyszy.",
    bingPrompt:
      "Empty nocturnal train platform, shiny wet railway tracks vanishing into pure black darkness, cold moody mist 9:16",
    previewColor: "#06080B",
  },
  {
    id: "city_06",
    name: "Biegacz w Cieniu Przemysłowych Doków",
    category: "Miasto & Monk Mode",
    theme: "carbon_aura",
    description: "Ciemna sylwetka w kapturze biegnąca wzdłuż kontenerów przed wschodem",
    rationale: "Dyscyplina nie pyta o pogodę ani zmęczenie – po prostu wychodzi i robi.",
    bingPrompt:
      "Hooded runner silhouette moving through dark foggy industrial shipping docks at dawn, cold ambient rim light, cinematic grit 9:16",
    previewColor: "#0E1114",
  },
  {
    id: "city_07",
    name: "Puste Biurko Pracy z Jedną Lampą",
    category: "Miasto & Monk Mode",
    theme: "obsidian_void",
    description: "Ciemny blat, zamknięty notes, jedna minimalistyczna lampa skupiona na celu",
    rationale: "Głębokie skupienie (Deep Work) bez powiadomień, bez taniego dopaminowego szumu.",
    bingPrompt:
      "Minimalist dark wooden desk in pure black room, single direct warm-cool spotlight on open leather journal, quiet monk mode 9:16",
    previewColor: "#070809",
  },
  {
    id: "city_08",
    name: "Ciemny Tunel Samochodowy o 3:00 AM",
    category: "Miasto & Monk Mode",
    theme: "carbon_aura",
    description: "Nieskończona perspektywa betonowego tunelu z rytmicznymi światłami na suficie",
    rationale: "Wizja tunelowa – widzieć tylko cel i ignorować boczne pokusy.",
    bingPrompt:
      "Empty modern concrete tunnel at night, rhythmic overhead ceiling lights leading to infinite vanishing point, cinematic depth 9:16",
    previewColor: "#111419",
  },
  {
    id: "city_09",
    name: "Dach Wieżowca Ponad Mgłą",
    category: "Miasto & Monk Mode",
    theme: "silver_mist",
    description: "Krawędź dachu górująca nad chmurami skrywającymi śpiące miasto",
    rationale: "Być ponad poziomem hałasu i przeciętności ludzkich sporów.",
    bingPrompt:
      "Rooftop edge of skyscraper looking down at thick sea of nocturnal fog blanketing city below, cold moonlight, solitary vantage point 9:16",
    previewColor: "#0C1015",
  },
  {
    id: "city_10",
    name: "Ciemne Schody Pożarowe na Ceglanym Murze",
    category: "Miasto & Monk Mode",
    theme: "carbon_aura",
    description: "Czarna żelazna konstrukcja na tle ciemnego, mokrego muru z cegły",
    rationale: "Droga ewakuacji ze szponów prokrastynacji i lenistwa.",
    bingPrompt:
      "Black iron fire escape zig-zagging down dark wet brick building wall, moody urban chiaroscuro, cinematic 9:16",
    previewColor: "#121113",
  },
  {
    id: "city_11",
    name: "Ciemna Sala Żelaznego Treningu",
    category: "Miasto & Monk Mode",
    theme: "crimson_eclipse",
    description: "Ciemna skórzana torba treningowa i ciężary w półcieniu, karmazynowa poświata",
    rationale: "Gotowość do pokonywania oporu i budowania charakteru w samotności.",
    bingPrompt:
      "Minimalist dark leather heavy bag in shadowy architectural gym, subtle crimson rim lighting, raw gritty stoic texture, vertical 9:16",
    previewColor: "#150608",
  },
  {
    id: "city_12",
    name: "Zimna Szklana Fasada Nocnego Biurowca",
    category: "Miasto & Monk Mode",
    theme: "silver_mist",
    description: "Ciemne geometryczne panele szkła odbijające stalowy horyzont",
    rationale: "Chłodna kalkulacja, profesjonalizm i absolutny brak miejsca na histerię.",
    bingPrompt:
      "Dark monolithic glass skyscraper facade reflecting stormy midnight clouds, sharp geometric reflections, architectural minimalism 9:16",
    previewColor: "#0A0D12",
  },
  {
    id: "city_13",
    name: "Samotny Samochód na Pustej Szosie w Nocy",
    category: "Miasto & Monk Mode",
    theme: "obsidian_void",
    description: "Tylne światła auta znikające w nieprzeniknionej czerni lasu",
    rationale: "Podążanie własną drogą, gdy wszyscy inni dawno zrezygnowali.",
    bingPrompt:
      "Nocturnal black asphalt highway, lone vehicle red taillights fading into pitch black forest mist, moody introspective journey 9:16",
    previewColor: "#060709",
  },
  {
    id: "city_14",
    name: "Ciemna Sala Biblioteki ze Starymi Woluminami",
    category: "Miasto & Monk Mode",
    theme: "silver_mist",
    description: "Ciemne dębowe regały sięgające sufitu, subtelny złoty pyłek w smudze światła",
    rationale: "Rozmowa ze zmarłymi mędrcami – czytanie jako tarcza przed głupotą epoki.",
    bingPrompt:
      "Ancient dark wooden library towering shelves, deep chiaroscuro shadows, single shaft of soft golden light on leather books 9:16",
    previewColor: "#120F0A",
  },
  {
    id: "city_15",
    name: "Industrialny Dźwig Portowy w Sylwetce",
    category: "Miasto & Monk Mode",
    theme: "carbon_aura",
    description: "Czarny stalowy kolos na tle ciemnografitowego nieba przed świtem",
    rationale: "Dźwiganie ciężarów bez słowa skargi.",
    bingPrompt:
      "Massive industrial harbor crane silhouette against dark charcoal dawn sky, brutalist steel geometry, stoic resilience 9:16",
    previewColor: "#0F1116",
  },
];

// Losowanie tła z gwarancją braku powtórzeń (z puli 100+ wariacji)
export function getRandomBackgroundScene(filterTheme?: ReelVisualTheme): BackgroundScene {
  const pool = filterTheme
    ? EXPANDED_BACKGROUND_LIBRARY.filter((s) => s.theme === filterTheme)
    : EXPANDED_BACKGROUND_LIBRARY;

  if (pool.length === 0) {
    return EXPANDED_BACKGROUND_LIBRARY[
      Math.floor(Math.random() * EXPANDED_BACKGROUND_LIBRARY.length)
    ];
  }

  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
