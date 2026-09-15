import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { StarkFocusData, TrendItem, Post } from "../../types";

interface AiRadarTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenQR: (title: string, payload: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onOpenCarouselStudio?: (title?: string, slides?: any[]) => void;
}

type SubModule = "radar" | "angles" | "friction" | "recycler";

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

export const AiRadarTab: React.FC<AiRadarTabProps> = ({
  data,
  onUpdateData,
  onOpenQR,
  onNavigateToTab,
  onOpenVideoStudio,
  onOpenCarouselStudio,
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

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch((err) => console.warn("AI status check:", err));

    // Załaduj początkowe formaty wiralowe
    loadViralFormats();
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
      format: trend.suggested_format || "🎬 Rolka 7-Sekundowa (Short Reel)",
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

    onNavigateToTab(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              4 potężne silniki pomysłów STARK: Radar Trendów, Matryca Kątów, Generator Paradoksów i
              Remikser Treści.
            </p>
          </div>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="flex items-center bg-[#090C14] p-1 border border-[#1E2638] rounded-lg">
          <button
            onClick={() => setActiveSubModule("radar")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "radar"
                ? "bg-white text-black shadow"
                : "text-slate-400 hover:text-white"
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
                : "text-slate-400 hover:text-white"
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
                : "text-slate-400 hover:text-white"
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
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Klonuj & Remiksuj</span>
          </button>
        </div>
      </div>

      {/* SUB-MODUŁ 1: RADAR TRENDÓW & FORMATÓW WIRALOWYCH */}
      {activeSubModule === "radar" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Panel Wyszukiwania */}
          <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1">
                  Nisza & Psychologia Odbiorcy:
                </label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="np. dark stoicism, digital dopamine detox, discipline"
                  className="w-full px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-white"
                />
              </div>
              <div className="w-full sm:w-64">
                <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1">
                  Format Publikacji:
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white focus:outline-none focus:border-white"
                >
                  <option value="Instagram Karuzela / TikTok">Instagram Karuzela / TikTok</option>
                  <option value="Rolka 7s B-Roll z Basem">Rolka 7s B-Roll z Basem</option>
                  <option value="Litery 3D na Ścianie (Wall)">Litery 3D na Ścianie (Wall)</option>
                </select>
              </div>
              <div className="flex items-end">
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
              </div>
            </div>
          </div>

          {scanMessage && (
            <div className="p-3 bg-[#161D2C] border border-[#1E2638] rounded text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>{scanMessage}</span>
              <span className="text-[10px] text-slate-500 font-mono">Baza: STARK_OS_RADAR</span>
            </div>
          )}

          {/* Sekcja: Psychologiczne Formaty Wiralowe (Wysoka Konwersja) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                Matryca Sprawdzonych Formatów Wirali (Reels / TikTok Hooks)
              </h3>
              <span className="text-[10px] font-mono text-slate-500">
                Szablony o udowodnionej retencji 0-3s
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {viralFormats.map((fmt, fIdx) => (
                <div
                  key={fmt.formatKey || fIdx}
                  className="p-4 bg-[#111622] border border-[#1E2638] hover:border-white/30 rounded-lg space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-[#1E2638] pb-2">
                    <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                      <span className="text-amber-400">⚡</span> {fmt.formatName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                      Format STARK
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#090C14] rounded border border-[#1E2638] space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">
                      Hook 0-3s:
                    </span>
                    <p className="text-xs font-mono text-white font-bold">"{fmt.hook}"</p>
                  </div>

                  <div className="space-y-1 text-xs font-mono text-slate-400">
                    <span className="text-[10px] text-slate-500 uppercase block">
                      Struktura 3 Faz:
                    </span>
                    <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-300">
                      {fmt.phrases.map((phrase, pIdx) => (
                        <li key={pIdx}>{phrase}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 italic">
                    💡 {fmt.rationale}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onOpenVideoStudio?.(fmt.hook)}
                      className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>🎬 Wyślij do Rolki</span>
                    </button>
                    <button
                      onClick={() => handleCopy(`vf-${fIdx}`, fmt.hook)}
                      className="p-1.5 rounded bg-[#161D2C] hover:bg-white hover:text-black text-slate-300 border border-[#1E2638] text-xs font-mono transition-all cursor-pointer"
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
                  className="p-4 bg-[#111622] border border-[#1E2638] hover:border-white/20 rounded-lg space-y-2.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      #{idx + 1} {trend.title}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Wirusowość: {trend.estimated_virality || "95%"}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-slate-300">{trend.core_message}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleAddTrendToPipeline(trend)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-[#161D2C] hover:bg-white hover:text-black border border-[#1E2638] text-xs font-mono font-bold text-white transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Dodaj do Postów</span>
                    </button>

                    <button
                      onClick={() => onOpenVideoStudio?.(trend.viral_hooks?.[0] || trend.title)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>🎬 Zmontuj Rolkę</span>
                    </button>

                    <button
                      onClick={() => onNavigateToTab(0)}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-[#090C14] hover:bg-[#161D2C] border border-[#1E2638] text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>✨ Otwórz w Studio 1:1</span>
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
          <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
            <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
              Wpisz Surowy Temat lub Problem:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={angleTopic}
                onChange={(e) => setAngleTopic(e.target.value)}
                placeholder="np. Strach przed samotnością, prokrastynacja, budowanie firmy w ciszy"
                className="flex-1 px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-white"
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
                className="p-4 bg-[#111622] border border-[#1E2638] hover:border-white/30 rounded-lg space-y-3 transition-all"
              >
                <div className="flex items-center justify-between border-b border-[#1E2638] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    {ang.angleName}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                    Kąt #{idx + 1}
                  </span>
                </div>

                <div className="p-2.5 bg-[#090C14] rounded border border-[#1E2638]">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">
                    Magnetyczny Hook:
                  </span>
                  <p className="text-xs font-mono font-bold text-white">"{ang.hook}"</p>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Struktura Wideo (3 Fazy):
                  </span>
                  <div className="space-y-1">
                    {ang.phrases.map((ph, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-1.5 bg-[#090C14] rounded border border-[#1E2638] text-[11px] text-slate-300"
                      >
                        {pIdx + 1}. {ph}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] font-mono text-slate-400 italic">🧠 {ang.rationale}</p>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1E2638]">
                  <button
                    onClick={() => onOpenVideoStudio?.(ang.hook)}
                    className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎬 Otwórz w Rolce</span>
                  </button>
                  <button
                    onClick={() =>
                      handleCopy(`ang-${idx}`, `${ang.hook}\n\n${ang.phrases.join("\n")}`)
                    }
                    className="p-1.5 rounded bg-[#161D2C] hover:bg-white hover:text-black text-slate-300 border border-[#1E2638] text-xs font-mono transition-all cursor-pointer"
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
          <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
            <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
              Obszar tematyczny do poszukiwania sprzeczności:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={frictionTopic}
                onChange={(e) => setFrictionTopic(e.target.value)}
                placeholder="np. praca, odpoczynek, relacje, pieniądze, ambicja"
                className="flex-1 px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-white"
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
                className="p-4 bg-[#111622] border border-[#1E2638] hover:border-white/30 rounded-lg space-y-3 transition-all"
              >
                <div className="flex items-center justify-between border-b border-[#1E2638] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    ⚡ {pdx.title}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Pattern Interrupt
                  </span>
                </div>

                <div className="p-3 bg-[#090C14] rounded border border-[#1E2638]">
                  <p className="text-xs font-mono font-black text-white leading-relaxed">
                    "{pdx.hook}"
                  </p>
                </div>

                <p className="text-xs font-mono text-slate-300">
                  <strong className="text-slate-500 uppercase text-[10px] block">
                    Psychologia:
                  </strong>
                  {pdx.explanation}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-[#1E2638]">
                  <button
                    onClick={() => onOpenVideoStudio?.(pdx.hook)}
                    className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>🎬 Zmontuj Rolkę</span>
                  </button>
                  <button
                    onClick={() => handleCopy(`pdx-${idx}`, pdx.hook)}
                    className="p-1.5 rounded bg-[#161D2C] hover:bg-white hover:text-black text-slate-300 border border-[#1E2638] text-xs font-mono transition-all cursor-pointer"
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

      {/* SUB-MODUŁ 4: EVERGREEN RECYCLER (Klonowanie i Remiks) */}
      {activeSubModule === "recycler" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
            <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block">
              Wklej Swój Dowolny Post, Notatkę lub Myśl:
            </label>
            <textarea
              rows={3}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Wklej tutaj tekst swojego najlepszego posta, cytat lub surowy przelot myśli..."
              className="w-full px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-white resize-none"
            />
            <button
              onClick={handleRecycleContent}
              disabled={isRecycling}
              className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {isRecycling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Remiksowanie...</span>
                </>
              ) : (
                <>
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Zremiksuj na 4 Formaty STARK</span>
                </>
              )}
            </button>
          </div>

          {recycledData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Format 1: Rolka Wideo */}
              <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E2638] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-amber-400" />
                    1. Rolka 7-Sekundowa (Wideo)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {recycledData.reel?.duration || 8}s • Climax Hold
                  </span>
                </div>

                <div className="p-2.5 bg-[#090C14] rounded border border-[#1E2638]">
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">
                    Hook 0-3s:
                  </span>
                  <p className="text-xs font-mono font-bold text-white">
                    "{recycledData.reel?.hook}"
                  </p>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-xs font-mono text-slate-300">
                  {recycledData.reel?.phrases?.map((ph: string, idx: number) => (
                    <li key={idx}>{ph}</li>
                  ))}
                </ol>

                <button
                  onClick={() => onOpenVideoStudio?.(recycledData.reel?.hook)}
                  className="w-full py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>🎬 Otwórz w Automontażyście Rolek</span>
                </button>
              </div>

              {/* Format 2: 5-Slajdowa Karuzela */}
              <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-[#1E2638] pb-2">
                  <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    2. Karuzela 5 Slajdów
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    5 Slajdów • Format 4:5
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recycledData.carousel?.slides?.map((sl: any, sIdx: number) => (
                    <div
                      key={sIdx}
                      className="p-2 bg-[#090C14] rounded border border-[#1E2638] text-[11px] font-mono space-y-0.5"
                    >
                      <div className="text-white font-bold">
                        #{sIdx + 1} {sl.headline}
                      </div>
                      <div className="text-slate-400 truncate">{sl.bodyText}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    onOpenCarouselStudio?.(
                      recycledData.carousel?.title || "RECYCLED_CAROUSEL",
                      recycledData.carousel?.slides,
                    )
                  }
                  className="w-full py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>📑 Otwórz w Studio Karuzeli</span>
                </button>
              </div>

              {/* Format 3: Stoicki Manifest */}
              <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-[#1E2638] pb-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  3. Stoicki Manifest (1 Zdanie)
                </span>
                <p className="text-xs font-mono font-bold text-white p-3 bg-[#090C14] rounded border border-[#1E2638]">
                  "{recycledData.manifesto}"
                </p>
                <button
                  onClick={() => handleCopy("rec-man", recycledData.manifesto)}
                  className="w-full py-1.5 px-3 rounded bg-[#161D2C] hover:bg-white hover:text-black border border-[#1E2638] text-xs font-mono text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiuj Manifest</span>
                </button>
              </div>

              {/* Format 4: Opis Instagram (Caption) */}
              <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-[#1E2638] pb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  4. Gotowy Opis Posta (Instagram)
                </span>
                <p className="text-[11px] font-mono text-slate-300 p-2.5 bg-[#090C14] rounded border border-[#1E2638] max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {recycledData.caption}
                </p>
                <button
                  onClick={() => handleCopy("rec-cap", recycledData.caption)}
                  className="w-full py-1.5 px-3 rounded bg-[#161D2C] hover:bg-white hover:text-black border border-[#1E2638] text-xs font-mono text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiuj Opis i Hashtagi</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
