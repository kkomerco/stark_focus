import React, { useState, useEffect } from "react";
import {
  Radio,
  Search,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Bookmark,
  Flame,
  RefreshCw,
  Film,
  Layers,
  Compass,
  Zap,
  Repeat,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { StarkFocusData, TrendItem, Post } from "../../types";
import type {
  AngleItem,
  ParadoxItem,
  ViralFormatItem,
  BatchPostItem,
  SubModule,
} from "./radar/shared";
import { RecyclerPanel } from "./radar/RecyclerPanel";
import { BatchPanel } from "./radar/BatchPanel";

interface AiRadarTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenQR: (title: string, payload: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSendToPost?: (text: string, caption?: string) => void;
  onSendToReel?: (hookText: string) => void;
}

export const AiRadarTab: React.FC<AiRadarTabProps> = ({
  data,
  onUpdateData,
  onNavigateToTab,
  onOpenVideoStudio,
  onSendToPost,
  onSendToReel,
}) => {
  // Status check
  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    model: string;
  } | null>(null);
  const [activeSubModule, setActiveSubModule] = useState<SubModule>("radar");

  // 1. Radar Trendów & Formatów Wirali
  const [niche, setNiche] = useState<string>("stoic discipline, solitude, mental toughness");
  const [platform, setPlatform] = useState<string>("Instagram Karuzela / TikTok");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [trends, setTrends] = useState<TrendItem[]>(() => data.saved_trends || []);
  const [scanMessage, setScanMessage] = useState<string>("");
  const [viralFormats, setViralFormats] = useState<ViralFormatItem[]>([]);
  const [, setIsLoadingFormats] = useState<boolean>(false);

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
  const [radarError, setRadarError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch((err) => console.warn("AI status check:", err));

    // Załaduj początkowe formaty wiralowe
    loadViralFormats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setScanMessage("Skanowanie radarowe sieci i analiza wzorców wirusowości...");
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
    setRadarError(null);
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
      console.warn("Błąd generowania kątów psychologicznych:", e);
      setRadarError("Nie udało się pobrać kątów psychologicznych. Sprawdź połączenie.");
    } finally {
      setIsGeneratingAngles(false);
    }
  };

  const handleGenerateFriction = async () => {
    if (!frictionTopic.trim()) return;
    setIsGeneratingFriction(true);
    setRadarError(null);
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
      console.warn("Błąd generowania paradoksów poznawczych:", e);
      setRadarError("Nie udało się wygenerować paradoksów poznawczych.");
    } finally {
      setIsGeneratingFriction(false);
    }
  };

  const handleRecycleContent = async () => {
    if (!sourceText.trim()) return;
    setIsRecycling(true);
    setRadarError(null);
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
      console.warn("Błąd recyclingu treści:", e);
      setRadarError("Nie udało się przekształcić treści na formaty Stark.");
    } finally {
      setIsRecycling(false);
    }
  };

  // Obsługa generowania masowego (Batch Generator)
  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    setRadarError(null);
    try {
      const res = await fetch("/api/ai/batch-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: batchCount, niche }),
      });
      const data = await res.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setBatchPosts(data.posts);
      }
    } catch (err) {
      console.warn("Batch gen error:", err);
      setRadarError("Wystąpił problem przy generowaniu paczki postów. Użyto wariantu awaryjnego.");
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleAddBatchToPipeline = (post: BatchPostItem) => {
    const newPost: Post = {
      id: "post-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      title: post.sayingMain,
      platform: "Instagram",
      format: "🎬 Rolka 7-Sekundowa (Short Reel)",
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
      format: "🎬 Rolka 7-Sekundowa (Short Reel)",
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
                  <ShieldCheck className="w-3 h-3" /> Silnik AI Aktywny
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-xs bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Tryb Autonomiczny
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

      {/* Komunikat o błędzie lub statusie zapasowym */}
      {radarError && (
        <div className="flex items-center justify-between p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-amber-200 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{radarError}</span>
          </div>
          <button
            onClick={() => setRadarError(null)}
            className="text-amber-400/80 hover:text-amber-200 cursor-pointer text-[11px] px-2 py-0.5 border border-amber-700/50 rounded"
          >
            Zamknij
          </button>
        </div>
      )}

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
                <Flame className="w-4 h-4 text-amber-400" />
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
                      <span className="text-amber-400">⚡</span> {fmt.formatName}
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
                    💡 {fmt.rationale}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        if (onSendToPost) onSendToPost(fmt.hook, fmt.rationale);
                        else onNavigateToTab(0);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>📸 Do Posta</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onSendToReel) onSendToReel(fmt.hook);
                        else onOpenVideoStudio?.(fmt.hook);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>🎬 Do Rolki</span>
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

          {/* Sekcja: Zidentyfikowane Wątki Sieciowe */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-emerald-400" />
              Przeskanowane Wątki Sieci ({trends.length})
            </h3>

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
                      Wirusowość: {trend.estimated_virality || "95%"}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-neutral-300">{trend.core_message}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const text = trend.viral_hooks?.[0] || trend.title;
                        const cap = `${trend.title}\n\n${trend.core_message}\n\n#stoicism #discipline #mindset`;
                        if (onSendToPost) onSendToPost(text, cap);
                        else onNavigateToTab(0);
                      }}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>📸 Wyrzuć do Posta</span>
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
                      <span>🎬 Wyrzuć do Rolki</span>
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

                <p className="text-[11px] font-mono text-neutral-400 italic">🧠 {ang.rationale}</p>

                <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
                  <button
                    onClick={() => {
                      if (onSendToPost) onSendToPost(ang.hook, ang.caption);
                      else onNavigateToTab(0);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>📸 Do Posta</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onSendToReel) onSendToReel(ang.hook);
                      else onOpenVideoStudio?.(ang.hook);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎬 Do Rolki</span>
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
                    ⚡ {pdx.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
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
                      if (onSendToPost) onSendToPost(pdx.hook, pdx.explanation);
                      else onNavigateToTab(0);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>📸 Do Posta</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onSendToReel) onSendToReel(pdx.hook);
                      else onOpenVideoStudio?.(pdx.hook);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎬 Do Rolki</span>
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
        <RecyclerPanel
          sourceText={sourceText}
          onSourceTextChange={setSourceText}
          isRecycling={isRecycling}
          recycledData={recycledData}
          onRecycle={handleRecycleContent}
          onCopy={handleCopy}
          onNavigateToTab={onNavigateToTab}
          onOpenVideoStudio={onOpenVideoStudio}
          onSendToPost={onSendToPost}
          onSendToReel={onSendToReel}
        />
      )}

      {/* SUB-MODUŁ 5: GENEROWANIE MASOWE (BATCH GENERATOR) */}
      {activeSubModule === "batch" && (
        <BatchPanel
          niche={niche}
          onNicheChange={setNiche}
          batchCount={batchCount}
          onBatchCountChange={setBatchCount}
          isGeneratingBatch={isGeneratingBatch}
          batchPosts={batchPosts}
          addedBatchIds={addedBatchIds}
          onGenerateBatch={handleGenerateBatch}
          onAddToPipeline={handleAddBatchToPipeline}
          onAddAllToPipeline={handleAddAllBatchToPipeline}
          copiedId={copiedId}
          onCopy={handleCopy}
          onOpenVideoStudio={onOpenVideoStudio}
          onSendToReel={onSendToReel}
        />
      )}
    </div>
  );
};
