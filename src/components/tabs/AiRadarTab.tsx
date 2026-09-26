import React, { useState, useEffect, useCallback } from "react";
import {
  Radio,
  Search,
  Copy,
  Check,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  Bookmark,
  Flame,
  RefreshCw,
  ExternalLink,
  Film,
  Layers,
  Compass,
  Zap,
  Repeat,
  Sparkles,
  ArrowRight,
  BookOpen,
  Link,
  CheckCircle2,
} from "lucide-react";
import { Post, ReelHandoff, StarkFocusData, TrendItem } from "../../types";
import { usedHookFingerprints } from "../../lib/usedContent";
import { topPublishedHooks } from "../../lib/published";
import { formatStarkCaption } from "../../lib/caption";
import { nextEdition } from "../../lib/series";
import { CarouselStudioModal } from "../CarouselStudioModal";

interface IncomingCarousel {
  title: string;
  slides: Array<{ headline: string; bodyText: string }>;
}

interface AiRadarTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenQR: (title: string, payload: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  /**
   * `lines` to fazy, które model już napisał pod ten pomysł. Bez nich studio
   * posta dostawało gołe zdanie i zawsze stawało jako cytat na czerni —
   * z listą może ułożyć protokół, koszt albo kolaż.
   */
  onSendToPost?: (text: string, caption?: string, lines?: string[]) => void;
  onSendToReel?: (reel: ReelHandoff | string) => void;
  incomingCarousel?: IncomingCarousel | null;
  onIncomingCarouselUsed?: () => void;
}

type SubModule = "radar" | "angles" | "friction" | "recycler" | "batch";

interface AngleItem {
  angleId: string;
  angleName: string;
  hook: string;
  phrases: string[];
  caption: string;
  rationale: string;
}

interface ParadoxItem {
  title: string;
  hook: string;
  explanation: string;
  phrases: string[];
}

interface ViralFormatItem {
  formatKey: string;
  formatName: string;
  hook: string;
  phrases: string[];
  suggestedTheme: string;
  rationale: string;
}

interface BatchPostItem {
  id: string;
  pillar: string;
  sayingMain: string;
  sayingSub?: string;
  caption: string;
  template?: string;
}

export const AiRadarTab: React.FC<AiRadarTabProps> = ({
  data,
  onUpdateData,
  onOpenQR,
  onNavigateToTab,
  onOpenVideoStudio,
  onSendToPost,
  onSendToReel,
  incomingCarousel,
  onIncomingCarouselUsed,
}) => {
  // Status check
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [activeSubModule, setActiveSubModule] = useState<SubModule>("radar");

  // 1. Radar Trendów & Formatów Wirali
  const [niche, setNiche] = useState<string>("stoic discipline, solitude, mental toughness");
  const [platform, setPlatform] = useState<string>("Instagram Karuzela / TikTok");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [trends, setTrends] = useState<TrendItem[]>(() => data.saved_trends || []);
  const [scanMessage, setScanMessage] = useState<string>("");
  const [viralFormats, setViralFormats] = useState<ViralFormatItem[]>([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState<boolean>(false);

  // 2. Matryca Kątów Psychologicznych
  const [angleTopic, setAngleTopic] = useState<string>(
    "Wczesne wstawanie i brak negocjacji z budzikiem",
  );
  const [isGeneratingAngles, setIsGeneratingAngles] = useState<boolean>(false);
  const [angles, setAngles] = useState<AngleItem[]>([]);

  // 3. Generator Sprzeczności i Paradoksów
  const [frictionTopic, setFrictionTopic] = useState<string>("Dyscyplina, samotność i milczenie");
  const [isGeneratingFriction, setIsGeneratingFriction] = useState<boolean>(false);
  const [paradoxes, setParadoxes] = useState<ParadoxItem[]>([]);

  // 4. Evergreen Recycler (Klonowanie i Remiks)
  const [sourceText, setSourceText] = useState<string>(
    "Nie brakuje ci motywacji. Brakuje ci żelaznych standardów, których przestrzegasz w ciszy gdy nikt nie patrzy.",
  );
  const [isRecycling, setIsRecycling] = useState<boolean>(false);
  const [recycledData, setRecycledData] = useState<any | null>(null);

  // 5. Generator Masowy (Batch Generation w Radarze)
  const [batchCount, setBatchCount] = useState<number>(6);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [batchPosts, setBatchPosts] = useState<BatchPostItem[]>([]);
  const [addedBatchIds, setAddedBatchIds] = useState<Set<string>>(new Set());

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Studio karuzeli 4:5 — dostaje karuzelę surowo (kształt od modelu normalizuje sam modal)
  const [carouselStudio, setCarouselStudio] = useState<{
    id: number;
    title: string;
    slides: unknown;
    caption: string;
  } | null>(null);

  const openCarouselStudio = useCallback((carousel: unknown, carouselCaption?: unknown) => {
    const source = (carousel || {}) as { title?: unknown; slides?: unknown };
    setCarouselStudio({
      id: Date.now(),
      title: typeof source.title === "string" ? source.title : "",
      slides: source.slides,
      caption: typeof carouselCaption === "string" ? carouselCaption : "",
    });
  }, []);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch((err) => console.warn("AI status check:", err));

    // Załaduj początkowe formaty wiralowe
    loadViralFormats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Karuzela z Paczki Dnia wchodzi do studia raz i kasuje się u rodzica
  useEffect(() => {
    if (!incomingCarousel) return;
    setActiveSubModule("recycler");
    setSourceText(incomingCarousel.title);
    setRecycledData({ carousel: incomingCarousel });
    openCarouselStudio(incomingCarousel);
    onIncomingCarouselUsed?.();
  }, [incomingCarousel, onIncomingCarouselUsed, openCarouselStudio]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadViralFormats = async () => {
    setIsLoadingFormats(true);
    try {
      const res = await fetch("/api/ai/viral-format-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche }),
      });
      const json = await res.json();
      if (Array.isArray(json.formats)) {
        setViralFormats(json.formats);
      }
    } catch (e) {
      console.warn("Viral format load error:", e);
    } finally {
      setIsLoadingFormats(false);
    }
  };

  const handleScanTrends = async () => {
    setIsScanning(true);
    setScanMessage("Model układa wątki powtarzające się w tej niszy...");
    try {
      const res = await fetch("/api/ai/scan-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          platform,
          inspirations: [],
        }),
      });
      const json = await res.json();
      if (json.trends && Array.isArray(json.trends)) {
        setTrends(json.trends);
        onUpdateData((prev) => ({
          ...prev,
          saved_trends: json.trends,
        }));
        setScanMessage(json.message || "✓ Zaktualizowano trendy sieciowe i hooki 0-3s.");
      }
      // Odśwież także formaty psychologiczne
      loadViralFormats();
    } catch (err: any) {
      console.error(err);
      setScanMessage("Wystąpił problem podczas pobierania trendów sieci.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateAngles = async () => {
    if (!angleTopic.trim()) return;
    setIsGeneratingAngles(true);
    try {
      const res = await fetch("/api/ai/angle-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: angleTopic }),
      });
      const json = await res.json();
      if (Array.isArray(json.angles)) {
        setAngles(json.angles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAngles(false);
    }
  };

  const handleGenerateFriction = async () => {
    if (!frictionTopic.trim()) return;
    setIsGeneratingFriction(true);
    try {
      const res = await fetch("/api/ai/cognitive-friction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: frictionTopic }),
      });
      const json = await res.json();
      if (Array.isArray(json.paradoxes)) {
        setParadoxes(json.paradoxes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFriction(false);
    }
  };

  const handleRecycleContent = async () => {
    if (!sourceText.trim()) return;
    setIsRecycling(true);
    try {
      const res = await fetch("/api/ai/evergreen-recycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
      });
      const json = await res.json();
      if (json.reel && json.carousel) {
        setRecycledData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecycling(false);
    }
  };

  // Obsługa generowania masowego (Batch Generator)
  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      const res = await fetch("/api/ai/batch-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: batchCount,
          niche,
          excludeHooks: usedHookFingerprints(data),
          exemplars: topPublishedHooks(data.published ?? []),
        }),
      });
      const result = await res.json();
      if (Array.isArray(result.posts) && result.posts.length > 0) {
        setBatchPosts(result.posts);
      }
    } catch (err) {
      console.error("Batch gen error:", err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleAddBatchToPipeline = (post: BatchPostItem) => {
    const newPost: Post = {
      id: "post-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      title: post.sayingMain,
      platform: "Instagram",
      format: "Rolka 7-Sekundowa (Short Reel)",
      asset: "AI_BATCH_" + post.id,
      caption: post.caption,
      created_date: new Date().toISOString().split("T")[0],
      published_date: null,
      notes: `Filary: ${post.pillar}. Wygenerowano masowo z Radaru AI.`,
    };

    onUpdateData((prev) => ({
      ...prev,
      posts: [newPost, ...prev.posts],
    }));

    setAddedBatchIds((prev) => new Set(prev).add(post.id));
  };

  const handleAddAllBatchToPipeline = () => {
    const unadded = batchPosts.filter((p) => !addedBatchIds.has(p.id));
    if (unadded.length === 0) return;

    const newPosts: Post[] = unadded.map((post, idx) => ({
      id: "post-" + (Date.now() + idx),
      title: post.sayingMain,
      platform: "Instagram",
      format: "Rolka 7-Sekundowa (Short Reel)",
      asset: "AI_BATCH_" + post.id,
      caption: post.caption,
      created_date: new Date().toISOString().split("T")[0],
      published_date: null,
      notes: `Filary: ${post.pillar}. Wygenerowano masowo z Radaru AI.`,
      tags: ["stoicism", "discipline", "radar_batch"],
      status: "draft",
    }));

    onUpdateData((prev) => ({
      ...prev,
      posts: [...newPosts, ...prev.posts],
    }));

    setAddedBatchIds(new Set(batchPosts.map((p) => p.id)));
  };

  const handleAddTrendToPipeline = (trend: TrendItem) => {
    const hooks =
      Array.isArray(trend.viral_hooks) && trend.viral_hooks.length > 0
        ? trend.viral_hooks
        : ["Stay ruthless with your standards."];
    const primaryHook = hooks[0];

    const newPost: Post = {
      id: "post-" + Date.now(),
      title: trend.title,
      platform: "Instagram",
      format: trend.suggested_format || "Rolka 7-Sekundowa (Short Reel)",
      asset: "AI_RADAR_" + trend.id,
      caption: `${primaryHook}\n\n${trend.core_message || ""}\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #mindset #starkfocus`,
      created_date: new Date().toISOString().split("T")[0],
      published_date: null,
      notes: `Wywiad Trendu: ${trend.source_context || "Sieć"}. Ból widza: ${trend.audience_pain || "N/A"}`,
    };

    onUpdateData((prev) => ({
      ...prev,
      posts: [newPost, ...prev.posts],
      xp: prev.xp + 25,
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-white/10 border border-white/20 text-white">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                INFINITE IDEA ENGINE // NIEOGRANICZONE ŹRÓDŁO WIRALOWYCH TREŚCI
              </h2>
              {aiStatus?.configured ? (
                <span className="px-2 py-0.5 rounded-xs bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Silnik AI Aktywny
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-xs bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Tryb Autonomiczny
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              4 potężne silniki pomysłów STARK: Radar Trendów, Matryca Kątów, Generator Paradoksów i
              Remikser Treści.
            </p>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center bg-[#050505] p-1 border border-[rgba(255,255,255,0.1)] rounded-lg">
          <button
            onClick={() => setActiveSubModule("radar")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "radar"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Radar Formatów</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("angles");
              if (angles.length === 0) handleGenerateAngles();
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "angles"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Matryca Kątów</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("friction");
              if (paradoxes.length === 0) handleGenerateFriction();
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "friction"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paradoksy (Friction)</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("recycler");
              if (!recycledData) handleRecycleContent();
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "recycler"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Klonuj & Remiksuj</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("batch");
              if (batchPosts.length === 0) handleGenerateBatch();
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "batch"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Masowe Rolki</span>
          </button>
        </div>
      </div>

      {/* SUB-MODUŁ 1: RADAR TRENDÓW & FORMATÓW WIRALOWYCH */}
      {activeSubModule === "radar" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Panel Wyszukiwania */}
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
                  Nisza & Psychologia Odbiorcy:
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="np. dark stoicism, digital dopamine detox, discipline"
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>
              <div className="w-full sm:w-64">
                <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
                  Format Publikacji:
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white focus:outline-none focus:border-white"
                >
                  <option value="Instagram Karuzela / TikTok">Instagram Karuzela / TikTok</option>
                  <option value="Rolka 7s B-Roll z Basem">Rolka 7s B-Roll z Basem</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleScanTrends}
                  disabled={isScanning}
                  className="w-full sm:w-auto px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Skanowanie...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Skanuj Sieć</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveSubModule("batch");
                    if (batchPosts.length === 0) handleGenerateBatch();
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-200 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title="Przejdź do generatora masowego"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Masowe Rolki</span>
                </button>
              </div>
            </div>
          </div>

          {scanMessage && (
            <div className="p-3 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-neutral-300 flex items-center justify-between">
              <span>{scanMessage}</span>
              <span className="text-[10px] text-neutral-500 font-mono">Baza: STARK_OS_RADAR</span>
            </div>
          )}

          {/* Sekcja: Psychologiczne Formaty Wiralowe (Wysoka Konwersja) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                Matryca Sprawdzonych Formatów Wirali (Reels / TikTok Hooks)
              </h3>
              <span className="text-[10px] font-mono text-neutral-500">
                Szablony o udowodnionej retencji 0-3s
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viralFormats.map((fmt, fIdx) => (
                <div
                  key={fmt.formatKey || fIdx}
                  className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/40 rounded-lg space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                    <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                      <span className="text-amber-400"></span>
                      {fmt.formatName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                      Format STARK
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-mono block">
                      Hook 0-3s:
                    </span>
                    <p className="text-xs font-mono text-white font-bold">"{fmt.hook}"</p>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-neutral-400">
                    <span className="text-[10px] text-neutral-500 uppercase block">
                      Struktura 3 Faz:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-neutral-300">
                      {fmt.phrases.map((phrase, pIdx) => (
                        <li key={pIdx}>{phrase}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="text-[11px] font-mono text-neutral-400 italic">
                    {fmt.rationale}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (onSendToPost)
                          // `rationale` to notatka „dlaczego to działa" po polsku — nigdy opis posta.
                          onSendToPost(fmt.hook, formatStarkCaption(fmt.hook), fmt.phrases);
                        else onNavigateToTab(0);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Do Posta</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onSendToReel) onSendToReel({ hook: fmt.hook, phrases: fmt.phrases });
                        else onOpenVideoStudio?.(fmt.hook);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Do Rolki</span>
                    </button>
                    <button
                      onClick={() => handleCopy(`vf-${fIdx}`, fmt.hook)}
                      className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black text-neutral-300 border border-[rgba(255,255,255,0.1)] text-xs font-mono transition-all cursor-pointer"
                      title="Kopiuj hook"
                    >
                      {copiedId === `vf-${fIdx}` ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sekcja: Wątki z niszy */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              Wątki, które powtarzają się w niszy ({trends.length})
            </h3>
            <p className="text-[10px] font-mono text-neutral-500 leading-relaxed -mt-1">
              Model układa tu wzorce, które widuje u dużych nadawców w tej niszy: motyw, ból
              odbiorcy i hooki 0-3 s. To propozycja do napisania, nie pomiar z sieci — procent to
              szacunek modelu, nie zasięg.
            </p>

            <div className="space-y-3">
              {trends.map((trend, idx) => (
                <div
                  key={trend.id || idx}
                  className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/20 rounded-lg space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      #{idx + 1} {trend.title}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Szacunek modelu: {trend.estimated_virality || "—"}
                    </span>
                  </div>

                  <div className="grid gap-1.5 text-[10px] font-mono">
                    {trend.source_context && (
                      <p className="text-neutral-500">
                        <span className="uppercase text-neutral-600">Skąd:</span>{" "}
                        <span className="text-neutral-300">{trend.source_context}</span>
                      </p>
                    )}
                    {trend.audience_pain && (
                      <p className="text-neutral-500">
                        <span className="uppercase text-neutral-600">Ból odbiorcy:</span>{" "}
                        <span className="text-neutral-300">{trend.audience_pain}</span>
                      </p>
                    )}
                  </div>

                  <p className="text-xs font-mono text-neutral-300">{trend.core_message}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const text = trend.viral_hooks?.[0] || trend.title;
                        // `title` i `core_message` są po polsku — to notatka dla
                        // autora, nie opis pod post. Lista hooków z wątku to
                        // gotowe kroki, więc idzie razem z tekstem.
                        const cap = trend.copy_draft?.caption || formatStarkCaption(text);
                        if (onSendToPost)
                          onSendToPost(text, cap, (trend.viral_hooks ?? []).slice(1));
                        else onNavigateToTab(0);
                      }}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Wyrzuć do Posta</span>
                    </button>

                    <button
                      onClick={() => {
                        const hook = trend.viral_hooks?.[0] || trend.title;
                        if (onSendToReel) onSendToReel(hook);
                        else onOpenVideoStudio?.(hook);
                      }}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Wyrzuć do Rolki</span>
                    </button>

                    <button
                      onClick={() =>
                        handleCopy(`tr-${idx}`, `${trend.title}\n${trend.core_message}`)
                      }
                      className="p-1.5 rounded bg-[#050505] hover:bg-[#161616] border border-[rgba(255,255,255,0.1)] text-xs font-mono font-bold text-neutral-300 transition-all cursor-pointer"
                      title="Kopiuj treść"
                    >
                      {copiedId === `tr-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODUŁ 2: MATRYCA KĄTÓW PSYCHOLOGICZNYCH */}
      {activeSubModule === "angles" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block">
              Wpisz Surowy Temat lub Problem:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={angleTopic}
                onChange={(e) => setAngleTopic(e.target.value)}
                placeholder="np. Strach przed samotnością, prokrastynacja, budowanie firmy w ciszy"
                className="flex-1 px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
              <button
                onClick={handleGenerateAngles}
                disabled={isGeneratingAngles}
                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isGeneratingAngles ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rozbijanie...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Rozbij na 4 Kąty</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {angles.map((ang, idx) => (
              <div
                key={ang.angleId || idx}
                className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/40 rounded-lg space-y-3 transition-all"
              >
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    {ang.angleName}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                    Kąt #{idx + 1}
                  </span>
                </div>

                <div className="p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">
                    Magnetyczny Hook:
                  </span>
                  <p className="text-xs font-mono font-bold text-white">"{ang.hook}"</p>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-neutral-500 uppercase block">
                    Struktura Wideo (3 Fazy):
                  </span>
                  <div className="space-y-1">
                    {ang.phrases.map((ph, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-1.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] text-[11px] text-neutral-300"
                      >
                        {pIdx + 1}. {ph}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] font-mono text-neutral-400 italic">{ang.rationale}</p>

                <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
                  <button
                    onClick={() => {
                      if (onSendToPost) onSendToPost(ang.hook, ang.caption, ang.phrases);
                      else onNavigateToTab(0);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Do Posta</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onSendToReel) onSendToReel({ hook: ang.hook, phrases: ang.phrases });
                      else onOpenVideoStudio?.(ang.hook);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Do Rolki</span>
                  </button>
                  <button
                    onClick={() =>
                      handleCopy(`ang-${idx}`, `${ang.hook}\n\n${ang.phrases.join("\n")}`)
                    }
                    className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black text-neutral-300 border border-[rgba(255,255,255,0.1)] text-xs font-mono transition-all cursor-pointer"
                    title="Kopiuj tekst"
                  >
                    {copiedId === `ang-${idx}` ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-MODUŁ 3: GENERATOR SPRZECZNOŚCI I PARADOKSÓW (Cognitive Friction) */}
      {activeSubModule === "friction" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block">
              Obszar tematyczny do poszukiwania sprzeczności:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={frictionTopic}
                onChange={(e) => setFrictionTopic(e.target.value)}
                placeholder="np. praca, odpoczynek, relacje, pieniądze, ambicja"
                className="flex-1 px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              />
              <button
                onClick={handleGenerateFriction}
                disabled={isGeneratingFriction}
                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isGeneratingFriction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generowanie...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generuj Paradoksy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paradoxes.map((pdx, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/40 rounded-lg space-y-3 transition-all"
              >
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    {pdx.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    Pattern Interrupt
                  </span>
                </div>

                <div className="p-3 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
                  <p className="text-xs font-mono font-black text-white leading-relaxed">
                    "{pdx.hook}"
                  </p>
                </div>

                <p className="text-xs font-mono text-neutral-300">
                  <strong className="text-neutral-500 uppercase text-[10px] block">
                    Psychologia:
                  </strong>
                  {pdx.explanation}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
                  <button
                    onClick={() => {
                      if (onSendToPost)
                        // `explanation` to psychologia po polsku, nie opis posta.
                        onSendToPost(pdx.hook, formatStarkCaption(pdx.hook));
                      else onNavigateToTab(0);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Do Posta</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onSendToReel) onSendToReel(pdx.hook);
                      else onOpenVideoStudio?.(pdx.hook);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Do Rolki</span>
                  </button>
                  <button
                    onClick={() => handleCopy(`pdx-${idx}`, pdx.hook)}
                    className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black text-neutral-300 border border-[rgba(255,255,255,0.1)] text-xs font-mono transition-all cursor-pointer"
                    title="Kopiuj"
                  >
                    {copiedId === `pdx-${idx}` ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-MODUŁ 4: EVERGREEN RECYCLER (Klonowanie i Remiks z Linku lub Tekstu) */}
      {activeSubModule === "recycler" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-white" />
                Wklej Bezpośredni Link (Reels, TikTok, Shorts) LUB Wpisz Tekst:
              </label>
              {/^(https?:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/)/i.test(sourceText.trim()) && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Wykryto Bezpośredni Link Social Media
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Wklej bezpośredni link do posta/rolki (np. https://www.instagram.com/reel/... lub TikTok / YouTube Shorts) ALBO wpisz własną myśl, stary post lub notatkę..."
              className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] font-mono text-neutral-400">
                AI zdekonstruuje mechanizm psychologiczny z podanego linku/tekstu i wygeneruje 4
                kompletne formaty STARK w 100% po angielsku.
              </p>
              <button
                onClick={handleRecycleContent}
                disabled={isRecycling}
                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
              >
                {isRecycling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dekonstrukcja & Remiks...</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Zremiksuj na 4 Formaty STARK</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {recycledData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Format 1: Rolka Wideo */}
              <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-rose-400" />
                    1. Rolka 7-Sekundowa (Wideo)
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {recycledData.reel?.duration || 8}s • Climax Hold
                  </span>
                </div>

                <div className="p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono block">
                    Hook 0-3s:
                  </span>
                  <p className="text-xs font-mono font-bold text-white">
                    "{recycledData.reel?.hook}"
                  </p>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-xs font-mono text-neutral-300">
                  {recycledData.reel?.phrases?.map((ph: string, idx: number) => (
                    <li key={idx}>{ph}</li>
                  ))}
                </ol>

                <button
                  onClick={() => {
                    const reel = recycledData.reel;
                    if (onSendToReel)
                      onSendToReel({
                        hook: reel?.hook || "",
                        phrases: Array.isArray(reel?.phrases) ? reel.phrases : undefined,
                      });
                    else onOpenVideoStudio?.(recycledData.reel?.hook);
                  }}
                  className="w-full py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Wyrzuć do Rolki</span>
                </button>
              </div>

              {/* Format 2: 5-Slajdowa Karuzela */}
              <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    2. Karuzela 5 Slajdów
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {Array.isArray(recycledData.carousel?.slides)
                      ? recycledData.carousel.slides.length
                      : 0}{" "}
                    Slajdów • Format 4:5
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recycledData.carousel?.title && (
                    <div className="p-2 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] text-[11px] font-mono text-emerald-300 font-bold">
                      {recycledData.carousel.title}
                    </div>
                  )}
                  {recycledData.carousel?.slides?.map((sl: any, sIdx: number) => {
                    // Slajd od modelu to nie gwarancja obiektu — ani null, ani string nie mogą wywalić appki
                    const headline = typeof sl === "string" ? sl : sl?.headline || "";
                    const bodyText = typeof sl === "string" ? "" : sl?.bodyText || "";
                    return (
                      <div
                        key={sIdx}
                        className="p-2 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] text-[11px] font-mono space-y-0.5"
                      >
                        <div className="text-white font-bold">
                          #{sIdx + 1} {headline}
                        </div>
                        <div className="text-neutral-400 truncate">{bodyText}</div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => openCarouselStudio(recycledData.carousel, recycledData.caption)}
                  className="w-full py-1.5 px-3 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Studio Karuzeli — podgląd i eksport 4:5</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const firstSlide = recycledData.carousel?.slides?.[0];
                      const text =
                        firstSlide && typeof firstSlide === "object"
                          ? `${firstSlide.headline || ""}\n${firstSlide.bodyText || ""}`
                          : typeof firstSlide === "string"
                            ? firstSlide
                            : "";
                      const cap = recycledData.caption || "";
                      if (onSendToPost) onSendToPost(text, cap);
                      else onNavigateToTab(0);
                    }}
                    className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Wyrzuć do Posta</span>
                  </button>
                  <button
                    onClick={() => {
                      const text = recycledData.carousel?.slides
                        ?.map((s: any, i: number) => {
                          if (typeof s === "string") return `Slajd ${i + 1}: ${s}`;
                          return `Slajd ${i + 1}: ${s?.headline || ""}\n${s?.bodyText || ""}`;
                        })
                        .join("\n\n");
                      if (text) {
                        navigator.clipboard.writeText(text);
                        handleCopy("rec-car", text);
                      }
                    }}
                    className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-all cursor-pointer"
                    title="Kopiuj treść slajdów"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Format 3: Stoicki Manifest */}
              <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.1)] pb-2">
                  <BookOpen className="w-4 h-4 text-neutral-300" />
                  3. Stoicki Manifest (1 Zdanie)
                </span>
                <p className="text-xs font-mono font-bold text-white p-3 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
                  "{recycledData.manifesto}"
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onSendToPost) onSendToPost(recycledData.manifesto, recycledData.caption);
                      else onNavigateToTab(0);
                    }}
                    className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Wyrzuć do Posta</span>
                  </button>
                  <button
                    onClick={() => handleCopy("rec-man", recycledData.manifesto)}
                    className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-all cursor-pointer"
                    title="Kopiuj Manifest"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Format 4: Opis Instagram (Caption) */}
              <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.1)] pb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  4. Gotowy Opis Posta (Instagram)
                </span>
                <p className="text-[11px] font-mono text-neutral-300 p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {recycledData.caption}
                </p>
                <button
                  onClick={() => handleCopy("rec-cap", recycledData.caption)}
                  className="w-full py-1.5 px-3 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiuj Opis i Hashtagi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-MODUŁ 5: GENEROWANIE MASOWE (BATCH GENERATOR) */}
      {activeSubModule === "batch" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Panel Sterowania Masowego */}
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
                  Nisza Psychologiczna & Tematyka:
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="np. dark psychology, ruthless discipline, monk mode"
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="w-full sm:w-48">
                <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
                  Liczba Rolek w Serii:
                </label>
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white focus:outline-none focus:border-white"
                >
                  <option value={3}>3 Rolki (Szybki pakiet)</option>
                  <option value={6}>6 Rolek (Standardowy tydzień)</option>
                  <option value={10}>10 Rolek (Mocna kampania)</option>
                </select>
              </div>

              <button
                onClick={handleGenerateBatch}
                disabled={isGeneratingBatch}
                className="w-full sm:w-auto px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGeneratingBatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generuję Serię...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Generuj Masowo AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lista Wygenerowanych Rolek Masowych */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Wygenerowane Rolki Masowe ({batchPosts.length})</span>
              </h3>

              {batchPosts.length > 0 && (
                <button
                  onClick={handleAddAllBatchToPipeline}
                  disabled={batchPosts.every((p) => addedBatchIds.has(p.id))}
                  className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {batchPosts.every((p) => addedBatchIds.has(p.id))
                      ? "Wszystkie Dodane"
                      : "Dodaj Wszystkie do Harmonogramu"}
                  </span>
                </button>
              )}
            </div>

            {batchPosts.length === 0 ? (
              <div className="p-8 text-center bg-[#0E0E0E] border border-[rgba(255,255,255,0.05)] rounded-lg">
                <Layers className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-xs font-mono text-neutral-400">
                  Brak wygenerowanych rolek. Kliknij "Generuj Masowo AI", aby stworzyć spójną serię
                  publikacji z życiowym uderzeniem.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchPosts.map((post, idx) => {
                  const isAdded = addedBatchIds.has(post.id);
                  return (
                    <div
                      key={post.id || idx}
                      className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg flex flex-col justify-between space-y-3 hover:border-white/20 transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 uppercase font-bold">
                            {post.pillar}
                          </span>
                          <span className="text-neutral-500">#{idx + 1}</span>
                        </div>

                        {/* Główny Hook */}
                        <div className="p-3 bg-[#050505] border border-white/5 rounded">
                          <p className="text-xs font-serif font-bold text-white leading-relaxed">
                            "{post.sayingMain}"
                          </p>
                          {post.sayingSub && (
                            <p className="text-[11px] font-mono text-neutral-400 mt-1.5 border-t border-white/5 pt-1.5">
                              {post.sayingSub}
                            </p>
                          )}
                        </div>

                        {/* Skrót Opisu */}
                        <div className="text-[10px] font-mono text-neutral-400 line-clamp-3 bg-[#080808] p-2 rounded border border-white/5 whitespace-pre-wrap">
                          {post.caption}
                        </div>
                      </div>

                      {/* Akcje dla Rolki */}
                      <div className="space-y-1.5 pt-2 border-t border-white/10">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              const fullText = post.sayingSub
                                ? `${post.sayingMain}\n${post.sayingSub}`
                                : post.sayingMain;
                              if (onOpenVideoStudio) {
                                onOpenVideoStudio(fullText);
                              } else if (onSendToReel) {
                                onSendToReel(fullText);
                              }
                            }}
                            className="flex-1 py-1.5 px-2 rounded bg-white hover:bg-neutral-200 text-black text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Film className="w-3 h-3" />
                            <span>Otwórz w Studio</span>
                          </button>

                          <button
                            onClick={() => handleCopy(`batch-${post.id}`, post.caption)}
                            className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-white/10 text-neutral-400 hover:text-black transition-all cursor-pointer"
                            title="Kopiuj opis"
                          >
                            {copiedId === `batch-${post.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        <button
                          onClick={() => handleAddBatchToPipeline(post)}
                          disabled={isAdded}
                          className={`w-full py-1.5 px-2 rounded text-[10px] font-mono uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isAdded
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                              : "bg-[#161616] hover:bg-white/10 text-neutral-300 border border-white/10"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>W harmonogramie</span>
                            </>
                          ) : (
                            <>
                              <PlusCircle className="w-3 h-3" />
                              <span>Dodaj do postów</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {carouselStudio && (
        <CarouselStudioModal
          key={carouselStudio.id}
          title={carouselStudio.title}
          slides={carouselStudio.slides}
          caption={carouselStudio.caption}
          handle={data.social_handles?.instagram || "stark_focus"}
          edition={nextEdition(data)}
          onClose={() => setCarouselStudio(null)}
        />
      )}
    </div>
  );
};
