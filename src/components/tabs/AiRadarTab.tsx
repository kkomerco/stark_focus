import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  BookOpen,
  Link,
} from "lucide-react";
import { Post, ReelHandoff, StarkFocusData, TrendItem } from "../../types";
import { usedHookFingerprints } from "../../lib/usedContent";
import { formatStarkCaption } from "../../lib/caption";
import { fetchJson } from "../../lib/fetchJson";
import { radarMaterial } from "../../lib/radarMaterial";
import { CarouselStudioModal } from "../CarouselStudioModal";
import { useStudioDraft } from "../useStudioDraft";

interface IncomingCarousel {
  title: string;
  slides: Array<{ headline: string; bodyText: string }>;
  /** Opis od źródła (paczka dnia, recykler) — bez niego studio same sobie go układa. */
  caption?: string;
}

interface AiRadarTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;

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

interface RadarDraft {
  niche: string;
  platform: string;
  angleTopic: string;
  frictionTopic: string;
  sourceText: string;
  angles: AngleItem[];
  paradoxes: ParadoxItem[];
  recycledData: Record<string, unknown> | null;
}

/** Trasa nazywa powód w `notice`/`message`; pusty string znaczy, że nic nie zgłosiła. */
const noticeOf = (payload: Record<string, unknown>): string => {
  for (const key of ["notice", "message", "error"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

const textOf = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Recykler ma coś do pokazania dopiero wtedy, gdy jest jedno zdanie albo slajd. */
function recycleHasContent(payload: Record<string, unknown>): boolean {
  const reel = payload.reel as { hook?: unknown } | null | undefined;
  const carousel = payload.carousel as { slides?: unknown } | null | undefined;
  return (
    textOf(payload.manifesto) !== "" ||
    textOf(reel?.hook) !== "" ||
    (Array.isArray(carousel?.slides) && carousel.slides.length > 0)
  );
}

export const AiRadarTab: React.FC<AiRadarTabProps> = ({
  data,
  onUpdateData,
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

  // 2. Różne spojrzenia Psychologicznych
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

  /** Powód, który serwer nazwał samą treścią: pusty panel nie może być martwy. */
  const [radarError, setRadarError] = useState<string>("");
  const [recycleNotice, setRecycleNotice] = useState<string>("");
  const draftValue = useMemo<RadarDraft>(
    () => ({
      niche,
      platform,
      angleTopic,
      frictionTopic,
      sourceText,
      angles,
      paradoxes,
      recycledData,
    }),
    [niche, platform, angleTopic, frictionTopic, sourceText, angles, paradoxes, recycledData],
  );
  const restoreDraft = useCallback((saved: RadarDraft) => {
    setNiche(textOf(saved.niche));
    setPlatform(textOf(saved.platform) || "Instagram Karuzela / TikTok");
    setAngleTopic(textOf(saved.angleTopic));
    setFrictionTopic(textOf(saved.frictionTopic));
    setSourceText(textOf(saved.sourceText));
    setAngles(
      Array.isArray(saved.angles)
        ? saved.angles.filter(
            (item) => item && typeof item.hook === "string" && Array.isArray(item.phrases),
          )
        : [],
    );
    setParadoxes(
      Array.isArray(saved.paradoxes)
        ? saved.paradoxes.filter(
            (item) => item && typeof item.hook === "string" && Array.isArray(item.phrases),
          )
        : [],
    );
    setRecycledData(
      saved.recycledData && typeof saved.recycledData === "object" ? saved.recycledData : null,
    );
  }, []);
  const draft = useStudioDraft("radar:v1", draftValue, restoreDraft);

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

  /**
   * Karuzela po eksporcie jest materiałem tak samo jak zapisany kadr, więc wchodzi
   * do `data.posts` — tam samo, gdzie studio 1:1 odkłada posty. Bez tego wpisu
   * `usedHookFingerprints` nie miałby jej tezy na liście wykluczeń i ta sama
   * myśl wróciłaby w kolejnej partii. Drugiego magazynu na karuzelę nie budujemy.
   */
  const handleCarouselSaved = useCallback(
    (carousel: { hook: string; title: string; caption: string; slideCount: number }) => {
      const newPost: Post = {
        id: "post-" + Date.now(),
        title: carousel.hook || carousel.title,
        platform: "Instagram",
        format: `Karuzela ${carousel.slideCount} slajdów (4:5)`,
        asset: "CAROUSEL_STUDIO",
        caption: carousel.caption,
        created_date: new Date().toISOString().split("T")[0],
        notes: carousel.title ? `Studio karuzeli: ${carousel.title}.` : "Studio karuzeli.",
      };
      onUpdateData((prev) =>
        prev.posts.some(
          (post) =>
            post.asset === newPost.asset &&
            post.title === newPost.title &&
            post.caption === newPost.caption &&
            post.notes === newPost.notes &&
            post.created_date === newPost.created_date,
        )
          ? prev
          : {
              ...prev,
              posts: [newPost, ...prev.posts],
              xp: prev.xp + 50,
            },
      );
    },
    [onUpdateData],
  );

  useEffect(() => {
    // Otwarcie radaru wywołuje wyłącznie bezpłatny status konfiguracji.
    fetch("/api/ai/status")
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch((err) => console.warn("AI status check:", err));
  }, []);

  // Karuzela z Paczki Dnia wchodzi do studia raz i kasuje się u rodzica
  useEffect(() => {
    if (!incomingCarousel) return;
    setActiveSubModule("recycler");
    setSourceText(incomingCarousel.title);
    setRecycledData({ carousel: incomingCarousel });
    openCarouselStudio(incomingCarousel, incomingCarousel.caption);
    onIncomingCarouselUsed?.();
  }, [incomingCarousel, onIncomingCarouselUsed, openCarouselStudio]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleScanTrends = async () => {
    setIsScanning(true);
    setRadarError("");
    setScanMessage("Model układa wątki powtarzające się w tej niszy...");
    try {
      const {
        data: json,
        degraded,
        status,
      } = await fetchJson("/api/ai/scan-trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche,
          platform,
          inspirations: [],
          excludeHooks: usedHookFingerprints(data),
        }),
      });
      if (degraded) {
        setRadarError(
          noticeOf(json) ||
            "Model nie przygotował materiału do Twojego tematu. Poprzedni wynik pozostaje zachowany.",
        );
        return;
      }
      if (status < 200 || status >= 300) {
        setScanMessage(
          status
            ? `Skan nie wyszedł (HTTP ${status}) — kliknięcie mogło zejść z licznika.`
            : "Skan nie wyszedł — serwer nie odpowiedział.",
        );
        return;
      }
      const found = Array.isArray(json.trends) ? (json.trends as TrendItem[]) : [];
      if (found.length > 0) setTrends(found);
      if (found.length > 0) {
        onUpdateData((prev) => ({
          ...prev,
          saved_trends: found,
        }));
      }
      setScanMessage(
        noticeOf(json) ||
          (found.length > 0
            ? "Zaktualizowano wątki z niszy i hooki 0-3s."
            : "Żaden wątek nie przeszedł kontroli rzemiosła — poniżej nie ma czego pokazać."),
      );
    } catch (err) {
      console.error(err);
      setScanMessage("Nie udało się przygotować tematów. Poprzedni wynik pozostaje zachowany.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateAngles = async () => {
    if (!angleTopic.trim()) return;
    setIsGeneratingAngles(true);
    setRadarError("");
    try {
      const {
        data: json,
        degraded,
        status,
      } = await fetchJson("/api/ai/angle-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: angleTopic, excludeHooks: usedHookFingerprints(data) }),
      });
      if (degraded) {
        setRadarError(
          noticeOf(json) ||
            "Model nie przygotował materiału do Twojego tematu. Poprzedni wynik pozostaje zachowany.",
        );
        return;
      }
      if (status < 200 || status >= 300) {
        setRadarError(
          status
            ? `Matryca kątów nie wyszła (HTTP ${status}) — kliknięcie mogło zejść z licznika.`
            : "Matryca kątów nie wyszła — serwer nie odpowiedział.",
        );
        return;
      }
      const angles = Array.isArray(json.angles) ? (json.angles as AngleItem[]) : [];
      if (angles.length > 0) setAngles(angles);
      if (angles.length === 0) {
        setRadarError(
          noticeOf(json) ||
            "Model nie oddał żadnego kąta — poniżej nie ma czego pokazać, spróbuj ponownie.",
        );
      }
    } catch (e) {
      console.error(e);
      setRadarError("Matryca kątów nie wyszła — serwer nie odpowiedział.");
    } finally {
      setIsGeneratingAngles(false);
    }
  };

  const handleGenerateFriction = async () => {
    if (!frictionTopic.trim()) return;
    setIsGeneratingFriction(true);
    setRadarError("");
    try {
      const {
        data: json,
        degraded,
        status,
      } = await fetchJson("/api/ai/cognitive-friction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: frictionTopic, excludeHooks: usedHookFingerprints(data) }),
      });
      if (degraded) {
        setRadarError(
          noticeOf(json) ||
            "Model nie przygotował materiału do Twojego tematu. Poprzedni wynik pozostaje zachowany.",
        );
        return;
      }
      if (status < 200 || status >= 300) {
        setRadarError(
          status
            ? `Paradoksy nie wyszły (HTTP ${status}) — kliknięcie mogło zejść z licznika.`
            : "Paradoksy nie wyszły — serwer nie odpowiedział.",
        );
        return;
      }
      const paradoxes = Array.isArray(json.paradoxes) ? (json.paradoxes as ParadoxItem[]) : [];
      if (paradoxes.length > 0) setParadoxes(paradoxes);
      if (paradoxes.length === 0) {
        setRadarError(
          noticeOf(json) ||
            "Model nie oddał żadnego paradoksu — poniżej nie ma czego pokazać, spróbuj ponownie.",
        );
      }
    } catch (e) {
      console.error(e);
      setRadarError("Paradoksy nie wyszły — serwer nie odpowiedział.");
    } finally {
      setIsGeneratingFriction(false);
    }
  };

  const handleRecycleContent = async () => {
    if (!sourceText.trim()) return;
    if (/^https?:\/\//i.test(sourceText.trim())) {
      setRadarError(
        "Tu rozwijamy tekst. Wklej własną myśl, a link otwórz w narzędziu „Analiza linku”.",
      );
      return;
    }
    setIsRecycling(true);
    setRadarError("");
    try {
      const {
        data: json,
        degraded,
        status,
      } = await fetchJson("/api/ai/evergreen-recycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          excludeHooks: usedHookFingerprints(data),
        }),
      });
      if (degraded) {
        setRadarError(
          noticeOf(json) ||
            "Model nie przygotował materiału do Twojego tematu. Poprzedni wynik pozostaje zachowany.",
        );
        return;
      }
      if (status < 200 || status >= 300) {
        setRadarError(
          status
            ? `Remiks nie wyszedł (HTTP ${status}) — kliknięcie mogło zejść z licznika.`
            : "Remiks nie wyszedł — serwer nie odpowiedział.",
        );
        return;
      }
      // Trasa oddaje cztery null-e, gdy nie ma ani jednego zdania z materiału.
      // Cztery puste karty pod sobą wyglądałyby jak wygenerowana seria.
      if (!recycleHasContent(json)) {
        setRadarError(
          noticeOf(json) || "Model nie oddał materiału. Poprzedni wynik pozostaje zachowany.",
        );
        return;
      }
      setRecycledData(json);
      setRecycleNotice(noticeOf(json));
    } catch (e) {
      console.error(e);
      setRadarError("Remiks nie wyszedł — serwer nie odpowiedział.");
    } finally {
      setIsRecycling(false);
    }
  };

  if (!draft.ready)
    return <p className="p-4 text-[11px] font-mono text-neutral-400">{draft.notice}</p>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-white/10 border border-white/20 text-white">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Radar pomysłów
              </h2>
              {aiStatus?.configured ? (
                <span className="px-2 py-0.5 rounded-xs bg-[#A0A0A0]/20 border border-[#A0A0A0]/40 text-[#A0A0A0] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Silnik AI Aktywny
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-xs bg-[#A0A0A0]/20 border border-[#A0A0A0]/40 text-[#A0A0A0] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Brak klucza AI
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Tematy, różne spojrzenia i rozwijanie własnej myśli. Generacja zaczyna się dopiero po
              kliknięciu przycisku.
            </p>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">
              Propozycje od modelu, bez sprawdzania bieżących trendów i pomiaru zasięgu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openCarouselStudio({ title: "", slides: [] })}
          className="px-3 py-2 rounded border border-white/15 text-neutral-300 hover:text-white text-[11px] font-mono cursor-pointer"
        >
          Studio karuzeli · bez AI
        </button>
        {/* Sub-Tabs Switcher */}
        <div className="flex flex-wrap items-center bg-[#050505] p-1 border border-[rgba(255,255,255,0.1)] rounded-lg">
          <button
            onClick={() => setActiveSubModule("radar")}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "radar"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Tematy</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("angles");
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "angles"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Różne spojrzenia</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("friction");
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "friction"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kontrast</span>
          </button>

          <button
            onClick={() => {
              setActiveSubModule("recycler");
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubModule === "recycler"
                ? "bg-white text-black shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Rozwiń własną myśl</span>
          </button>
        </div>
      </div>

      <p className="text-[10px] font-mono text-neutral-500">{draft.notice}</p>
      {/* Awaria jest inną rzeczą niż bank treści: kliknięcie mogło zejść z
          licznika, a na ekranie nie ma niczyjego zdania. */}
      {radarError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-xs font-mono text-rose-300">
          {radarError}
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
                  <option value="Rolka pionowa">Rolka pionowa</option>
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
                      <span>Generuję...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Zaproponuj tematy · 1 generacja AI</span>
                    </>
                  )}
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

          {/* Sekcja: Wątki z niszy */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-neutral-400" />
                Propozycje tematów ({trends.length})
              </h3>
              {/* Etykieta wisi tylko na partii z tego kliknięcia — wątki wczytane
                  z pamięci nie niosą znaku pochodzenia i nie udają banku. */}
            </div>
            <p className="text-[10px] font-mono text-neutral-500 leading-relaxed -mt-1">
              Model proponuje materiał do dalszej redakcji: temat, problem odbiorcy i hook.
              Popularność i skuteczność tych propozycji nie zostały zmierzone.
            </p>

            <div className="space-y-3">
              {trends.length === 0 ? (
                <div className="p-6 text-center bg-[#0E0E0E] border border-[rgba(255,255,255,0.05)] rounded-lg">
                  <p className="text-xs font-mono text-neutral-400">
                    {isScanning
                      ? "Przygotowuję propozycje..."
                      : "Brak propozycji. Wpisz temat i uruchom generację przyciskiem wyżej."}
                  </p>
                </div>
              ) : (
                trends.map((trend, idx) => (
                  <div
                    key={trend.id || idx}
                    className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/20 rounded-lg space-y-2.5 transition-all"
                  >
                    <p className="text-xs font-mono font-bold text-white uppercase">
                      #{idx + 1} {trend.title}
                    </p>

                    <div className="grid gap-1.5 text-[10px] font-mono">
                      {trend.source_context && (
                        <p className="text-neutral-500">
                          <span className="uppercase text-neutral-600">Uzasadnienie modelu:</span>{" "}
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
                          const reel = radarMaterial(trend);
                          if (reel && onSendToPost)
                            onSendToPost(reel.hook!, reel.caption, reel.phrases?.slice(1));
                        }}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Do posta</span>
                      </button>

                      <button
                        onClick={() => {
                          const reel = radarMaterial(trend);
                          if (reel) onSendToReel?.(reel);
                        }}
                        className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>Do rolki</span>
                      </button>

                      <button
                        onClick={() =>
                          handleCopy(`tr-${idx}`, `${trend.title}\n${trend.core_message}`)
                        }
                        className="p-1.5 rounded bg-[#050505] hover:bg-[#161616] border border-[rgba(255,255,255,0.1)] text-xs font-mono font-bold text-neutral-300 transition-all cursor-pointer"
                        title="Kopiuj treść"
                      >
                        {copiedId === `tr-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-neutral-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
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
                    <span>Generuj spojrzenia · 1 generacja AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {angles.length === 0 ? (
            <div className="p-6 text-center bg-[#0E0E0E] border border-[rgba(255,255,255,0.05)] rounded-lg">
              <p className="text-xs font-mono text-neutral-400">
                {!isGeneratingAngles
                  ? "Matryca jest pusta — żaden kąt nie przyszedł w tej odpowiedzi. Rozbij temat przyciskiem wyżej."
                  : "Rozbijamy temat na cztery kąty..."}
              </p>
            </div>
          ) : (
            <>
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
                          <Check className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
                    <span>Generuj kontrast · 1 generacja AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {paradoxes.length === 0 ? (
            <div className="p-6 text-center bg-[#0E0E0E] border border-[rgba(255,255,255,0.05)] rounded-lg">
              <p className="text-xs font-mono text-neutral-400">
                {!isGeneratingFriction
                  ? "Brak paradoksów — ta odpowiedź nie przyniosła żadnego zdania po kontroli rzemiosła."
                  : "Szukamy sprzeczności w wybranym obszarze..."}
              </p>
            </div>
          ) : (
            <>
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
                          <Check className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUB-MODUŁ 4: EVERGREEN RECYCLER (Klonowanie i Remiks z Linku lub Tekstu) */}
      {activeSubModule === "recycler" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-white" />
                Wklej własną myśl, notatkę lub wcześniejszy post:
              </label>
            </div>
            <textarea
              rows={3}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Opisz jedną sytuację i myśl, którą chcesz rozwinąć. Link przeanalizujesz w narzędziu „Analiza linku”."
              className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] font-mono text-neutral-400">
                Model rozwinie tę samą myśl w rolkę, karuzelę i tezę do kadru z opisem. Każdy
                materiał sprawdzisz w studiu przed eksportem.
              </p>
              <button
                onClick={handleRecycleContent}
                disabled={isRecycling}
                className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
              >
                {isRecycling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rozwijam myśl...</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Rozwiń myśl · 1 generacja AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {recycledData && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {recycleNotice && (
                  <p className="text-[10px] font-mono text-neutral-500">{recycleNotice}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Format 1: Rolka Wideo */}
                <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                    <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                      <Film className="w-4 h-4 text-rose-400" />
                      1. Rolka
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {recycledData.reel?.duration || 8}s
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
                          duration: reel?.duration,
                          theme: reel?.suggestedTheme,
                          caption: recycledData.caption,
                        });
                      else onOpenVideoStudio?.(recycledData.reel?.hook);
                    }}
                    className="w-full py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Do rolki</span>
                  </button>
                </div>

                {/* Format 2: karuzela 4:5 — etykieta nie obiecuje liczby slajdów,
                  bo poniżej widać tylko te, które naprawdę przyszły */}
                <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                    <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-neutral-400" />
                      2. Karuzela 4:5
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
                      <div className="p-2 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] text-[11px] font-mono text-neutral-300 font-bold">
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
                    className="w-full py-1.5 px-3 rounded bg-neutral-500/20 hover:bg-neutral-500/30 border border-neutral-500/30 text-neutral-300 font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                        if (onSendToPost)
                          onSendToPost(
                            typeof firstSlide === "object" ? firstSlide?.headline || "" : text,
                            cap,
                            typeof firstSlide === "object" && firstSlide?.bodyText
                              ? [firstSlide.bodyText]
                              : undefined,
                          );
                        else onNavigateToTab(0);
                      }}
                      className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Do posta</span>
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
                    3. Teza do kadru
                  </span>
                  <p className="text-xs font-mono font-bold text-white p-3 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
                    "{recycledData.manifesto}"
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (onSendToPost)
                          onSendToPost(recycledData.manifesto, recycledData.caption);
                        else onNavigateToTab(0);
                      }}
                      className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Do posta</span>
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
                    <Zap className="w-4 h-4 text-neutral-400" />
                    Opis do rozwinięcia w studiu
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
            </>
          )}
        </div>
      )}

      {carouselStudio && (
        <CarouselStudioModal
          key={carouselStudio.id}
          title={carouselStudio.title}
          slides={carouselStudio.slides}
          caption={carouselStudio.caption}
          handle={data.social_handles?.instagram || "stark_focus"}
          onSave={handleCarouselSaved}
          onClose={() => setCarouselStudio(null)}
        />
      )}
    </div>
  );
};
