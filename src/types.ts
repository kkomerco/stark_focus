export type Platform = "Instagram" | "TikTok" | "YouTube Shorts";

export type VisualTheme =
  "obsidian_monolith" | "titanium_slate" | "pantheon_mist" | "crimson_eclipse";

export type LogoSourceType = "seal";

export type LogoPlacement = "background_watermark" | "bottom_under" | "top_left" | "none";

export type LogoGlowChoice = "white" | "none";

export type CarouselFontFamily = "plus_jakarta" | "cinzel" | "cormorant" | "inter";

export type TopHeaderMode =
  | "protocol_standard"
  | "daily_discipline"
  | "cold_truth"
  | "memento_mori"
  | "clean_void"
  | "none"
  | "custom";

export interface SlideData {
  headline: string;
  bodyText: string;
  textOffsetY?: number; // Przesunięcie w pionie (+/- px)
  highlightWords?: string; // Słowa kluczowe do wyróżnienia (oddzielone przecinkami)
  slideType?: "hook" | "principle" | "outro"; // Typ slajdu w karuzeli
}

export type ContentFormat =
  | "🎬 Rolka 7-Sekundowa (Short Reel)"
  | "🎠 Karuzela 5-Slajdowa (IG / TikTok Slides)"
  | "🏛️ Monolith Ledger (Split 50/50)"
  | "🖼️ Kolaż 4 Kadrów (Siatka 2x2)"
  | "📜 Minimalistyczny Cytat (One-Liner)";

export interface Post {
  id: string;
  title: string;
  platform: Platform;
  format: string;
  asset: string;
  caption: string;
  created_date: string;
  scheduled_date?: string | null;
  scheduled_time?: string;
  published_date: string | null;
  notes?: string;
}

export interface VaultAsset {
  id: string;
  filename: string;
  url: string;
  type: "bg" | "video" | "inspiration";
  created_date: string;
  notes?: string;
}

export interface CTAPreset {
  id: string;
  name: string;
  cta: string;
  tags: string;
}

export interface DynamicDb {
  formats: string[];
  cta_presets: CTAPreset[];
}

export interface TrendItem {
  id: string;
  title: string;
  source_context: string;
  audience_pain: string;
  suggested_format: string;
  viral_hooks: string[];
  core_message: string;
  estimated_virality: string;
  bingPrompt?: string;
}

export interface AIGeneratedPost {
  title: string;
  hook: string;
  concept: string;
  slides: {
    slideNumber: number;
    headline: string;
    bodyText: string;
  }[];
  caption: string;
  hashtags: string[];
  bingPrompt: string;
}

export interface SocialHandles {
  instagram: string;
  tiktok: string;
  youtube: string;
  capcut?: string;
  elevenlabs?: string;
  metaBusiness?: string;
}

// Zadanie w pipeline'ie publikacji. `payload` przenosi treść do studia, żeby
// "Otwórz w studio" odtworzyło dokładnie to, co zaplanowano w paczce dnia.
export interface PlannerTaskPayload {
  reel?: ReelHandoff;
  carousel?: { title: string; slides: Array<{ headline: string; bodyText: string }> };
  post?: { text: string; caption?: string };
}

export interface PlannerTask {
  id: string;
  time: string;
  title: string;
  category: "rutyna" | "post" | "montaz" | "analiza" | "inne";
  targetTab?: number;
  completed: boolean;
  date: string;
  actionLabel?: string;
  format?: string;
  payload?: PlannerTaskPayload;
}

// =========================================================================
// UNIWERSALNA SPECYFIKACJA DOWOLNEGO UKŁADU WIZUALNEGO 1:1
// =========================================================================
export interface UniversalTextLayer {
  id: string;
  text: string;
  fontFamily: "serif" | "sans" | "mono" | string;
  fontSize: number;
  fontWeight: "normal" | "bold" | "black";
  fontStyle: "normal" | "italic";
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  align: "left" | "center" | "right";
  posY: number;
  posX?: number;
  casing?: "preserve" | "lowercase" | "uppercase" | string;
}

export interface UniversalLayoutSpec {
  layoutName: string;
  // "studio_wall_3d" to układ zwracany przez analizę linku — bez niego
  // odtworzony kadr ze ścianą 3D nie dawał się przedstawić w typie i zapadał
  // się do płaskiego cytatu na czerni.
  // "protocol_list" i "cost_vs_reward" dołożone, żeby materiał przestał być
  // w 80% cytatem na czerni — te dwa niosą STRUCTURĘ, nie samo zdanie.
  gridType:
    | "none_solid"
    | "single"
    | "split_horizontal"
    | "grid_2x2"
    | "studio_wall_3d"
    | "monolith_ledger"
    | "protocol_list"
    | "cost_vs_reward";
  /** Dane układu: kroki protokołu, słupki koszt/utrata. Nie każdy układ ich potrzebuje. */
  layoutData?: {
    eyebrow?: string;
    statement?: string;
    steps?: string[];
    figure?: string;
    question?: string;
    cost?: string[];
    forfeit?: string[];
    closing?: string;
  };
  backgroundColor: string;
  dividerWidth: number;
  dividerColor: string;
  slotCount: number;
  slotLabels: string[];
  textLayers: UniversalTextLayer[];
  textEffect?: "flat" | "outline";
  caption: string;
  detectedAudio: string;
  fontFamilyCustom?: string;
  fontColorMode?: "white" | "black";
}

// ===== A/B Eksperymenty (pętla uczenia) =====
export interface AbVariant {
  label: "A" | "B";
  hook: string;
  angle: string;
  phrases: string[];
  theme: string;
  cta: string;
  publishedAt?: string | null;
  metrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

export interface AbExperiment {
  id: string;
  topic: string;
  createdAt: string;
  variants: AbVariant[];
  winner?: "A" | "B" | null;
  lesson?: string;
  concludedAt?: string | null;
}

// ===== Biblioteka promptów tła (spójny feed) =====
export interface PromptLibraryItem {
  id: string;
  prompt: string;
  style: string;
  source: string;
  createdAt: string;
  uses: number;
}

export interface StarkFocusData {
  posts: Post[];
  xp: number;
  streak: number;
  created_at: string | null;
  vault_assets: VaultAsset[];
  dynamic_db: DynamicDb;
  notificationsEnabled?: boolean;
  saved_trends?: TrendItem[];
  social_handles?: SocialHandles;
  planner_tasks?: PlannerTask[];
  used_idea_fingerprints?: string[];
  ab_experiments?: AbExperiment[];
  prompt_library?: PromptLibraryItem[];
}

// ===== Idea Stream (nieskończony generator z anty-powtórką) =====
export interface IdeaItem {
  id: string;
  hook: string;
  category: string;
  archetype: string;
  emotionalTarget: string;
  format: string;
  phrases: string[];
  caption: string;
  hashtags: string[];
  theme: string;
  viralityScore: number;
}

export interface IdeaStreamResponse {
  generatedAt: string;
  source: "ai" | "offline";
  ideas: IdeaItem[];
  /** True, gdy przyszło mniej pomysłów niż o nie proszono (bank wyczerpany lub filtr powtórek). */
  exhausted?: boolean;
  notice?: string;
}

// ===== Deconstruct Viral (analiza rynku z linków) =====
export interface ViralDeconstruction {
  hookType: string;
  hookText: string;
  structure: string[];
  psychologicalTriggers: string[];
  whyItWorks: string;
  visualStyle: string;
  audioStrategy: string;
}

export interface StarkVariant {
  id: string;
  hook: string;
  angle: string;
  phrases: string[];
  viralityScore: number;
}

export interface DeconstructViralResponse {
  // "error" oddzielnie od "offline": inaczej awaria modelu udawała analizę
  // z banku treści, a UI pokazywał „Błąd analizy" z odznaką OFFLINE.
  source: "ai" | "offline" | "error";
  platform: string;
  original: {
    url: string;
    title: string;
    author: string;
    audioTrack: string;
  };
  deconstruction: ViralDeconstruction;
  starkVariants: StarkVariant[];
}

// ===== Przekazanie treści do studia rolek =====
/**
 * Jeden pakiet zamiast gołego hooka: dotąd każdy generator oddawał studiu tylko
 * tekst hooka, więc reszta odpowiedzi modelu (frazy, motyw, czas, opis, hashtagi)
 * przepadała. Pola są opcjonalne, bo generatorzy różnią się kształtem — A/B i
 * dekonstrukcja nie zwracają `duration` — a Studio Rolek wypełnia tylko to, co przyszło.
 */
export interface ReelHandoff {
  hook: string;
  phrases?: string[];
  theme?: string;
  duration?: number;
  caption?: string;
  hashtags?: string[];
}

// ===== Paczka dnia (One-Click Factory) =====
export interface DailyPackReel {
  hook: string;
  phrases: string[];
  theme: string;
  duration: number;
  captionShort: string;
  hashtags: string[];
}

export interface DailyPackCarousel {
  title: string;
  slides: Array<{ headline: string; bodyText: string }>;
}

export interface DailyPackPost {
  headline: string;
  body: string;
  bingPrompt: string;
}

export interface DailyPack {
  generatedAt: string;
  source: "ai" | "offline";
  topic: string;
  category?: string;
  reels: DailyPackReel[];
  carousel: DailyPackCarousel;
  post: DailyPackPost;
}
