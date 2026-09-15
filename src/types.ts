export type Platform = "Instagram" | "TikTok" | "YouTube Shorts";

export type VisualTheme =
  "obsidian_monolith" | "titanium_slate" | "pantheon_mist" | "crimson_eclipse";

export type LogoSourceType = "seal";

export type LogoPlacement = "background_watermark" | "bottom_under" | "top_left" | "none";

export type LogoGlowChoice = "white" | "none";

export type CarouselFontFamily = "plus_jakarta" | "cinzel" | "cormorant" | "outfit" | "syne";

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
  | "🧱 Litery 3D na Ścianie z Lampą"
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

export interface DailyLog {
  ig: boolean;
  tt: boolean;
  yt: boolean;
  mission_done: boolean;
  mission_text: string;
  claimed: boolean;
}

export interface AccountStat {
  id: string;
  platform: Platform;
  followers: number;
  views: number;
  date: string;
  notes?: string;
}

export interface CarouselPackage {
  id: string;
  name: string;
  slides: string[];
  created_date: string;
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

export interface MonetizationGoal {
  monthlyTargetRevenue: number;
  productName: string;
  productPrice: number;
  estimatedConversionRate: number;
}

export interface HookBattleItem {
  id: string;
  angle: string;
  hook: string;
  estimatedRetention: number;
  psychologicalTrigger: string;
  reason: string;
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
}

// =========================================================================
// UNIWERSALNA SPECYFIKACJA DOWOLNEGO UKŁADU WIZUALNEGO 1:1
// =========================================================================
export interface UniversalTextLayer {
  id: string;
  text: string;
  fontFamily: "serif" | "sans" | "mono";
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
  gridType: "none_solid" | "single" | "split_horizontal" | "grid_2x2" | "studio_wall_3d";
  backgroundColor: string;
  dividerWidth: number;
  dividerColor: string;
  slotCount: number;
  slotLabels: string[];
  textLayers: UniversalTextLayer[];
  textEffect?: "3d_wall" | "flat" | "outline";
  caption: string;
  detectedAudio: string;
}

export interface StarkFocusData {
  posts: Post[];
  account_stats: AccountStat[];
  daily_logs: Record<string, DailyLog>;
  xp: number;
  streak: number;
  best_streak: number;
  used_assets: string[];
  created_at: string | null;
  carousel_packages: CarouselPackage[];
  vault_assets: VaultAsset[];
  dynamic_db: DynamicDb;
  securityPin?: string;
  notificationsEnabled?: boolean;
  saved_trends?: TrendItem[];
  social_handles?: SocialHandles;
  monetization_goal?: MonetizationGoal;
  saved_hook_battles?: HookBattleItem[];
  planner_tasks?: PlannerTask[];
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
  reels: DailyPackReel[];
  carousel: DailyPackCarousel;
  post: DailyPackPost;
}
