import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import {
  Link2,
  Sparkles,
  RefreshCw,
  Film,
  Download,
  CheckCircle2,
  Copy,
  Check,
  Music,
  Upload,
  Type,
  Maximize2,
  Plus,
  Trash2,
  ArrowRight,
  Zap,
  Layers,
  Sparkle,
  Quote,
  Sliders,
  X,
  Package,
} from "lucide-react";
import { UniversalLayoutSpec, UniversalTextLayer } from "../types";
import { renderUniversalLayout, drawMinimalBlackQuoteSlide } from "../utils/canvasRenderer";

interface InspirationStudioProps {
  onSaveToPipeline?: (post: any) => void;
  userHandle?: string;
  initialText?: string;
  initialCaption?: string;
  onSendToReel?: (text: string) => void;
}

export interface StoicSaying {
  main: string;
  sub?: string;
  caption?: string;
}

export interface BatchPostItem {
  id: string;
  pillar: string;
  sayingMain: string;
  sayingSub?: string;
  caption: string;
  template?: "none_solid";
  fontColor?: "white" | "black";
}

// Bogata biblioteka krojów pisma Stark Focus (wyłącznie wybrane kroje)
export const FONT_OPTIONS = [
  { id: "sans", name: "Plus Jakarta", style: "Modern Sans" },
  { id: "cinzel", name: "Cinzel Roman", style: "Roman Antiqua" },
  { id: "inter", name: "Inter", style: "Swiss Clean" },
  { id: "cormorant", name: "Cormorant", style: "Stoic Serif" },
] as const;

// Domyślny format: Cytat na Czerni (format 9:16)
const SPEC_BLACK_QUOTE: UniversalLayoutSpec = {
  layoutName: "Cytat na Czerni",
  gridType: "none_solid",
  backgroundColor: "#000000",
  dividerWidth: 0,
  dividerColor: "#000000",
  slotCount: 0,
  slotLabels: [],
  textEffect: "flat",
  fontFamilyCustom: "sans",
  fontColorMode: "white",
  textLayers: [
    {
      id: "t1",
      text: "Silence cannot be misquoted.",
      fontFamily: "sans",
      fontSize: 82,
      fontWeight: "bold",
      fontStyle: "normal",
      casing: "preserve",
      color: "#FFFFFF",
      align: "left",
      posY: 0.46,
      posX: 0.12,
    },
  ],
  caption:
    "SILENCE CANNOT BE MISQUOTED.\n\nLet your standards speak for you in silence. Execute without announcing it.\n\nSave this reminder. Follow @stark_focus.\n\n#stoicism #discipline #mindset #focus #starkfocus",
  detectedAudio: "Czysty dźwięk",
};

const SPEC_COLLAGE_4: UniversalLayoutSpec = {
  layoutName: "Kolaż 4 Kadrów",
  gridType: "grid_2x2",
  backgroundColor: "#000000",
  dividerWidth: 8,
  dividerColor: "#000000",
  slotCount: 4,
  slotLabels: ["Kadr 1", "Kadr 2", "Kadr 3", "Kadr 4"],
  textEffect: "outline",
  fontFamilyCustom: "serif",
  fontColorMode: "white",
  textLayers: [
    {
      id: "t1",
      text: "This winter",
      fontFamily: "serif",
      fontSize: 76,
      fontWeight: "bold",
      fontStyle: "italic",
      casing: "preserve",
      color: "#FFFFFF",
      strokeColor: "#000000",
      strokeWidth: 14,
      align: "center",
      posY: 0.5,
    },
  ],
  caption:
    "This winter, disappear into obsession.\n\nSave this reminder. Follow @stark_focus.\n\n#winterarc #discipline #starkfocus",
  detectedAudio: "Oryginalny dźwięk",
};

export const InspirationStudio1to1: React.FC<InspirationStudioProps> = ({
  onSaveToPipeline,
  userHandle = "stark_focus",
  initialText,
  initialCaption,
  onSendToReel,
}) => {
  const [videoUrl, setVideoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Format proporcji: wyłącznie wertykalny 9:16 (1080x1920 PX)
  const aspectRatio = "9:16" as const;
  const dimensions = { width: 1080, height: 1920 };
  const [fontFamily, setFontFamily] = useState<string>("sans");
  const [textScale, setTextScale] = useState<number>(1.0);
  const [fontColor, setFontColor] = useState<"white" | "black">("white");

  // Zmiana koloru czcionki (biała vs czarna)
  const handleToggleFontColor = (color: "white" | "black") => {
    setFontColor(color);
    setSpec((prev) => {
      const nextHex = color === "white" ? "#FFFFFF" : "#161920";
      return {
        ...prev,
        fontColorMode: color,
        textLayers: prev.textLayers.map((layer, idx) => ({
          ...layer,
          color:
            prev.gridType === "none_solid" && idx === 1
              ? color === "white"
                ? "rgba(255, 255, 255, 0.72)"
                : "rgba(10, 11, 13, 0.65)"
              : nextHex,
        })),
      };
    });
  };

  // Stan generatora powiedzonek
  const [isGeneratingSayings, setIsGeneratingSayings] = useState(false);
  const [sayingTopic, setSayingTopic] = useState(
    "Dyscyplina stoicka, milczenie, wysokie standardy",
  );
  // Tryb cytatu: pojedyncza linijka (~5 słów), dwa krótkie wersy po 1 linii lub auto
  const [quoteStyleMode, setQuoteStyleMode] = useState<"single" | "two_lines" | "auto">("single");

  // Aktywna specyfikacja układu (domyślnie: czysty minimalistyczny cytat na czerni 9:16)
  const [spec, setSpec] = useState<UniversalLayoutSpec>(SPEC_BLACK_QUOTE);

  // Tablica zdjęć wgranych do slotów
  const [slotImages, setSlotImages] = useState<(string | null)[]>([]);
  const [activeSlotToUpload, setActiveSlotToUpload] = useState<number>(0);

  const [copiedCaption, setCopiedCaption] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stan Generatora Masowego (Batch Export & Zero Repetition)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchTopic, setBatchTopic] = useState("Stoic discipline, silence, and standards");
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchPosts, setBatchPosts] = useState<BatchPostItem[]>([]);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchCopiedId, setBatchCopiedId] = useState<string | null>(null);

  // Reakcja na przekazanie tekstu/pomysłu z zewnątrz (np. z zakładki Trendy i Pomysły)
  useEffect(() => {
    if (initialText) {
      setSpec((prev) => {
        const lines = initialText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

        if (lines.length > 1) {
          const newLayers: UniversalTextLayer[] = lines.map((line, idx) => ({
            id: `t${idx + 1}`,
            text: line,
            fontFamily: prev.textLayers[0]?.fontFamily || "sans",
            fontSize: prev.textLayers[0]?.fontSize || 62,
            fontWeight: "black" as const,
            fontStyle: "normal" as const,
            casing: "preserve" as const,
            color: prev.textLayers[0]?.color || "#FFFFFF",
            align: prev.textLayers[0]?.align || "left",
            posY: 0.28 + idx * 0.08,
            posX: 0.14,
          }));
          return {
            ...prev,
            textLayers: newLayers,
            caption: initialCaption || prev.caption,
          };
        }

        const nextLayers = prev.textLayers.map((layer, idx) => {
          if (idx === 0) return { ...layer, text: initialText };
          return layer;
        });
        return {
          ...prev,
          textLayers: nextLayers,
          caption: initialCaption || prev.caption,
        };
      });
    }
  }, [initialText, initialCaption]);

  // Załadowane obrazy
  const [loadedImages, setLoadedImages] = useState<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const nextLoaded: (HTMLImageElement | null)[] = slotImages.map(() => null);
    setLoadedImages(nextLoaded);

    let active = true;
    let loadedCount = 0;
    const totalToLoad = slotImages.filter(Boolean).length;

    if (totalToLoad === 0) {
      return;
    }

    slotImages.forEach((src, idx) => {
      if (!src) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => {
        if (!active) return;
        nextLoaded[idx] = img;
        loadedCount++;
        if (loadedCount === totalToLoad) {
          setLoadedImages([...nextLoaded]);
        }
      };
      img.onerror = () => {
        if (!active) return;
        loadedCount++;
        if (loadedCount === totalToLoad) {
          setLoadedImages([...nextLoaded]);
        }
      };
    });

    return () => {
      active = false;
    };
  }, [slotImages]);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderUniversalLayout(canvasRef.current, spec, loadedImages, {
      width: dimensions.width,
      height: dimensions.height,
      fontFamily: spec.fontFamilyCustom || fontFamily,
      textScale,
      handle: userHandle,
      fontColor: spec.fontColorMode || fontColor,
    });
  }, [
    spec,
    loadedImages,
    dimensions.width,
    dimensions.height,
    fontFamily,
    textScale,
    userHandle,
    fontColor,
  ]);

  // Zastosowanie wybranego powiedzonka na kadrze (1 uderzające zdanie LUB 2 ultra-krótkie wersy)
  const handleApplySaying = (saying: StoicSaying) => {
    const cleanMain = saying.main.trim();
    const cleanSub = (saying.sub || "").trim();
    const hasSub = cleanSub.length > 0;

    setSpec((prev) => ({
      ...prev,
      textLayers: hasSub
        ? [
            {
              id: "t1",
              text: cleanMain,
              fontFamily: prev.fontFamilyCustom || "sans",
              fontSize: 68,
              fontWeight: "bold",
              fontStyle: "normal",
              casing: "preserve",
              color: "#FFFFFF",
              align: "left",
              posY: 0.42,
              posX: 0.12,
            },
            {
              id: "t2",
              text: cleanSub,
              fontFamily: prev.fontFamilyCustom || "sans",
              fontSize: 42,
              fontWeight: "normal",
              fontStyle: "normal",
              casing: "preserve",
              color: "rgba(255, 255, 255, 0.72)",
              align: "left",
              posY: 0.5,
              posX: 0.12,
            },
          ]
        : [
            {
              id: "t1",
              text: cleanMain,
              fontFamily: prev.fontFamilyCustom || "sans",
              fontSize: 82,
              fontWeight: "bold",
              fontStyle: "normal",
              casing: "preserve",
              color: "#FFFFFF",
              align: "left",
              posY: 0.46,
              posX: 0.12,
            },
          ],
      caption: saying.caption || prev.caption,
    }));
  };

  // Generowanie unikalnego powiedzonka przez Gemini AI na podstawie wpisanego tematu i trybu
  const handleGenerateAiSayings = async () => {
    setIsGeneratingSayings(true);
    try {
      let formatGuide = "";
      if (quoteStyleMode === "single") {
        formatGuide = `ŚCIŚLE 1 POJEDYNCZE MOCNE ZDANIE (MAKSYMALNIE 4 DO 7 SŁÓW NA CAŁY EKRAN). Wartość "sub" MUSI BYĆ PUSTA ("").
NAMA WIAJĄCE DO MYŚLENIA, SKIEROWANE BEZPOŚREDNIO DO ODBIORCY w 2. osobie ("you", "your") lub suwerenny aforyzm.
Przykłady idealne:
- "Walk like a king, or walk like you don't care who the king is."
- "Notice how they treat you when you no longer need them."
- "You are not tired. You are uninspired."
- "The version of you they remember no longer exists."
- "If you don't build your peace, someone sells you chaos."
- "Silence cannot be misquoted."`;
      } else if (quoteStyleMode === "two_lines") {
        formatGuide = `ŚCIŚLE 2 BARDZO KRÓTKIE WERSY (PO DOKŁADNIE 1 KRÓTKIEJ LINIJCE KAŻDY, MAKSYMALNIE 2-5 SŁÓW NA WERS!). Żadnych długich zdań!
Przykłady idealne:
main: "Walk like a king.", sub: "or like you don't care who is."
main: "You are not tired.", sub: "you are uninspired."
main: "Stop explaining yourself.", sub: "let results speak."
main: "Comfort is poison.", sub: "seek the friction."`;
      } else {
        formatGuide = `Albo 1 pojedyncze zdanie 4-7 słów (sub: ""), albo 2 ultra-krótkie wersy po 1 linijce każdy (po 2-5 słów na wers). Cytaty silnie namawiające do myślenia, skierowane do widza.`;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Jesteś głównym kuratorem marki Stark Focus (brutalny stoicyzm, suwerenność psychologiczna, wysokie standardy, brak kompromisów).
Temat przewodni: "${sayingTopic || "Prowokujące cytaty stoickie namawiające do myślenia skierowane do odbiorcy"}".

${formatGuide}

Zwróć WYŁĄCZNIE czysty JSON:
{
  "main": "krótka teza namawiająca do myślenia (1 linijka)",
  "sub": "${quoteStyleMode === "single" ? "" : "krótki dopisek (1 linijka) lub puste dla 1 zdania"}",
  "caption": "krótki opis na Instagram z wezwaniem do działania i 4 hashtagami (#stoicism #discipline #mindset #focus)"
}`,
          systemInstruction: "Zwracaj wyłącznie czysty JSON bez znaczników markdown",
        }),
      });
      const data = await res.json();
      let raw = data.text || "";
      raw = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(raw);
      if (parsed && parsed.main) {
        if (quoteStyleMode === "single") {
          parsed.sub = "";
        }
        handleApplySaying(parsed);
      }
    } catch (err) {
      console.error("Błąd AI Sayings:", err);
    } finally {
      setIsGeneratingSayings(false);
    }
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSlotImages((prev) => {
          const next = [...prev];
          next[activeSlotToUpload] = dataUrl;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Analiza DOWOLNEGO linku
  const handleAnalyzeLink = async () => {
    if (!videoUrl.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch("/api/ai/analyze-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl.trim() }),
      });
      const data = await res.json();

      if (data.layoutSpec) {
        setSpec(data.layoutSpec);
        setSlotImages(Array(data.layoutSpec.slotCount || 1).fill(null));
      } else if (data.error) {
        setAnalysisError(data.error);
      }
    } catch (e) {
      console.error(e);
      setAnalysisError("Błąd analizy linku. Upewnij się, że URL jest publicznie dostępny.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTextLayer = (id: string, newText: string) => {
    setSpec((prev) => ({
      ...prev,
      textLayers: prev.textLayers.map((l) => (l.id === id ? { ...l, text: newText } : l)),
    }));
  };

  const handleAddTextLayer = () => {
    const newId = `t${spec.textLayers.length + 1}`;
    setSpec((prev) => ({
      ...prev,
      textLayers: [
        ...prev.textLayers,
        {
          id: newId,
          text: "Nowa linia",
          fontFamily: prev.textLayers[0]?.fontFamily || "sans",
          fontSize: prev.textLayers[0]?.fontSize || 62,
          fontWeight: "black",
          fontStyle: "normal",
          casing: "preserve",
          color: prev.textLayers[0]?.color || "#161920",
          align: "left",
          posY: 0.28 + prev.textLayers.length * 0.08,
          posX: 0.14,
        },
      ],
    }));
  };

  const handleRemoveTextLayer = (id: string) => {
    if (spec.textLayers.length <= 1) return;
    setSpec((prev) => ({
      ...prev,
      textLayers: prev.textLayers.filter((l) => l.id !== id),
    }));
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = `stark_post_${aspectRatio}_${spec.gridType}_${Date.now()}.png`;
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  const handleDownloadJPG = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = `stark_post_${aspectRatio}_${spec.gridType}_${Date.now()}.jpg`;
    a.href = canvasRef.current.toDataURL("image/jpeg", 0.95);
    a.click();
  };

  const handleSaveToPipeline = () => {
    if (onSaveToPipeline) {
      onSaveToPipeline({
        id: "post-" + Date.now(),
        title: spec.textLayers[0]?.text || spec.layoutName,
        format: spec.layoutName,
        asset: spec.gridType,
        caption: spec.caption,
        created_date: new Date().toISOString().split("T")[0],
      });
    }

    if (spec.caption) {
      navigator.clipboard.writeText(spec.caption);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSendCurrentToReel = () => {
    if (!onSendToReel) return;
    const textToPass = spec.textLayers.map((l) => l.text).join("\n");
    onSendToReel(textToPass);
  };

  // Generowanie masowej serii postów AI (Wysoka wariancja, 10 filarów)
  const handleGenerateBatch = async () => {
    setIsGeneratingBatch(true);
    try {
      const res = await fetch("/api/ai/batch-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: batchTopic, count: batchCount }),
      });
      const data = await res.json();
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        setBatchPosts(data.posts);
      }
    } catch (err) {
      console.error("Błąd generowania serii postów:", err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Załadowanie wybranego posta z serii do edytora
  const handleApplyBatchPost = (item: BatchPostItem) => {
    setFontColor("white");
    const cleanMain = item.sayingMain.trim();
    const cleanSub = (item.sayingSub || "").trim();
    const hasSub = cleanSub.length > 0;

    setSpec({
      ...SPEC_BLACK_QUOTE,
      layoutName: `STARK // ${item.pillar}`,
      gridType: "none_solid",
      fontColorMode: "white",
      caption: item.caption,
      textLayers: hasSub
        ? [
            {
              id: "t1",
              text: cleanMain,
              fontFamily: spec.fontFamilyCustom || "sans",
              fontSize: 68,
              fontWeight: "bold",
              fontStyle: "normal",
              casing: "preserve",
              color: "#FFFFFF",
              align: "left",
              posY: 0.42,
              posX: 0.12,
            },
            {
              id: "t2",
              text: cleanSub,
              fontFamily: spec.fontFamilyCustom || "sans",
              fontSize: 42,
              fontWeight: "normal",
              fontStyle: "normal",
              casing: "preserve",
              color: "rgba(255, 255, 255, 0.72)",
              align: "left",
              posY: 0.5,
              posX: 0.12,
            },
          ]
        : [
            {
              id: "t1",
              text: cleanMain,
              fontFamily: spec.fontFamilyCustom || "sans",
              fontSize: 82,
              fontWeight: "bold",
              fontStyle: "normal",
              casing: "preserve",
              color: "#FFFFFF",
              align: "left",
              posY: 0.46,
              posX: 0.12,
            },
          ],
    });
    setSlotImages([]);
    setIsBatchModalOpen(false);
  };

  // Bezpośrednie pobranie jednego posta z serii jako PNG (czysta biel na czerni 9:16)
  const handleDownloadSingleBatchPost = async (item: BatchPostItem) => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 1080;
    offscreen.height = 1920;
    drawMinimalBlackQuoteSlide(offscreen, {
      width: 1080,
      height: 1920,
      mainText: item.sayingMain,
      subText: item.sayingSub,
      fontFamily: spec.fontFamilyCustom || "sans",
      textScale: 1.0,
      fontColor: "white",
      handle: userHandle,
    });
    const link = document.createElement("a");
    link.download = `stark_${item.pillar.toLowerCase().replace(/[^a-z0-9]/gi, "_")}_9x16.png`;
    link.href = offscreen.toDataURL("image/png");
    link.click();
  };

  // Pobranie całej serii w archiwum .ZIP ze zdjęciami PNG (1080x1920) i plikami opisów
  const handleDownloadBatchZip = async () => {
    if (batchPosts.length === 0) return;
    setBatchDownloading(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < batchPosts.length; i++) {
        const item = batchPosts[i];
        const offscreen = document.createElement("canvas");
        offscreen.width = 1080;
        offscreen.height = 1920;
        drawMinimalBlackQuoteSlide(offscreen, {
          width: 1080,
          height: 1920,
          mainText: item.sayingMain,
          subText: item.sayingSub,
          fontFamily: spec.fontFamilyCustom || "sans",
          textScale: 1.0,
          fontColor: "white",
          handle: userHandle,
        });
        const dataUrl = offscreen.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const cleanName = `${String(i + 1).padStart(2, "0")}_${item.pillar.toLowerCase().replace(/[^a-z0-9]/gi, "_")}`;
        zip.file(`${cleanName}.png`, base64, { base64: true });
        zip.file(
          `${cleanName}_caption.txt`,
          `PILLAR: ${item.pillar}\nHOOK: ${item.sayingMain}\nSUB: ${item.sayingSub}\n\nCAPTION:\n${item.caption}`,
        );
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stark_focus_batch_9x16_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Błąd pobierania ZIP:", err);
    } finally {
      setBatchDownloading(false);
    }
  };

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 text-neutral-200">
      {/* Pasek linku */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-mono font-bold uppercase text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" /> GENERATOR POSTA ({dimensions.width}×
            {dimensions.height} PX)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-400">
              Format: <strong className="text-white">{spec.layoutName}</strong>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Wklej link do posta (Instagram, TikTok, Shorts), aby skopiować układ 1:1..."
              className="w-full bg-[#121212] border border-white/10 focus:border-white rounded-lg py-2.5 pl-9 pr-3 text-xs font-mono text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={handleAnalyzeLink}
            disabled={isAnalyzing || !videoUrl.trim()}
            className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono font-black text-xs uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 whitespace-nowrap shadow-md"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Film className="w-4 h-4" />
            )}
            <span>Odwzoruj Układ</span>
          </button>
        </div>

        {analysisError && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-lg text-xs font-mono text-rose-300">
            {analysisError}
          </div>
        )}
      </div>

      {/* Pasek wyboru Proporcji Kadru (1:1 / 4:5 / 9:16) oraz Szablonów */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Szablony układów */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-mono text-neutral-400 uppercase mr-1 shrink-0">
            Format:
          </span>
          <button
            type="button"
            onClick={() => {
              setSpec(SPEC_BLACK_QUOTE);
              setSlotImages([]);
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors shrink-0 ${
              spec.gridType === "none_solid"
                ? "bg-white text-black"
                : "bg-[#141414] text-neutral-400 border border-white/10 hover:text-white"
            }`}
          >
            ⬛ Cytat na Czerni (9:16)
          </button>

          <button
            type="button"
            onClick={() => {
              setSpec(SPEC_COLLAGE_4);
              setSlotImages([null, null, null, null]);
            }}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors shrink-0 ${
              spec.gridType === "grid_2x2"
                ? "bg-white text-black"
                : "bg-[#141414] text-neutral-400 border border-white/10 hover:text-white"
            }`}
          >
            🖼️ Kolaż 4 Kadrów (9:16)
          </button>
        </div>

        {/* Wymiar kadru - ZABLOKOWANY NA 9:16 zgodnie z wytycznymi */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#121212] px-3 py-1.5 rounded-lg border border-white/15">
            <span className="text-[9px] font-mono text-neutral-400 uppercase">Wymiary:</span>
            <span className="text-[11px] font-mono font-black text-amber-300">
              9:16 (1080×1920 PX)
            </span>
          </div>

          {/* Przycisk Generatora Masowego w pasku */}
          <button
            type="button"
            onClick={() => {
              setIsBatchModalOpen(true);
              if (batchPosts.length === 0) {
                handleGenerateBatch();
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all bg-[#141414] hover:bg-white text-amber-400 hover:text-black border border-amber-400/30 hover:border-white flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
            title="Generuj serię postów z różnorodnymi ideami (Wysoka wariancja)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>⚡ Seria Postów (Batch)</span>
          </button>
        </div>
      </div>

      {/* Podgląd Posta + Edycja */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lewa: Podgląd Live & Pobieranie JPG / PNG */}
        <div className="lg:col-span-5 flex flex-col items-center bg-[#050505] p-4 rounded-xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between w-full text-[10px] font-mono text-neutral-400">
            <span className="text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Maximize2 className="w-3 h-3 text-white" />
              PODGLĄD ({aspectRatio})
            </span>
            <span>
              {dimensions.width} × {dimensions.height} PX
            </span>
          </div>

          <div className="relative w-full max-w-[250px] aspect-[9/16] rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-black transition-all duration-200">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>

          {/* Przyciski Pobierania: PNG i JPG */}
          <div className="w-full max-w-[320px] flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleDownloadPNG}
              className="flex-1 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-xs font-black uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              title={`Pobierz bezstratną grafikę PNG ${dimensions.width}x${dimensions.height}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pobierz PNG</span>
            </button>

            <button
              onClick={handleDownloadJPG}
              className="flex-1 py-2.5 bg-[#181818] hover:bg-[#222222] text-neutral-200 border border-white/10 font-mono text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title={`Pobierz zoptymalizowane zdjęcie JPG ${dimensions.width}x${dimensions.height}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pobierz JPG</span>
            </button>
          </div>

          {/* Przycisk Generatora Masowego Postów */}
          <button
            type="button"
            onClick={() => {
              setIsBatchModalOpen(true);
              if (batchPosts.length === 0) {
                handleGenerateBatch();
              }
            }}
            className="w-full max-w-[320px] py-2.5 px-3 rounded-lg bg-[#141414] hover:bg-white hover:text-black text-amber-400 border border-amber-400/30 hover:border-white text-xs font-mono font-bold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md group"
            title="Wygeneruj od razu serię unikalnych postów z wysoką wariancją idei"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:text-black transition-colors" />
            <span>⚡ Generator Masowy (Seria Postów)</span>
          </button>

          {/* Przekaż treść do Rolki */}
          {onSendToReel && (
            <button
              type="button"
              onClick={handleSendCurrentToReel}
              className="w-full max-w-[320px] py-2 px-3 rounded-lg bg-[#141414] hover:bg-white hover:text-black text-neutral-300 border border-white/10 hover:border-white text-[11px] font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Przekaż ten cytat do Automontażysty 9-sekundowych rolek"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 Przekaż treść do Rolki (9s)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Prawa: Edycja Tekstów i Parametrów */}
        <div className="lg:col-span-7 space-y-4">
          {/* Typografia & Wybór Czcionki & Kolor */}
          <div className="bg-[#111111] p-3.5 rounded-xl border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
              <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-white" />
                Krój Pisma & Skala
              </span>

              {/* Wybór koloru czcionki: Biała vs Czarna */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">Kolor:</span>
                <div className="flex items-center gap-1 bg-[#181818] p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleToggleFontColor("white")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      (spec.fontColorMode || fontColor) === "white"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    title="Ustaw białą czcionkę (#FFFFFF)"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-300"></span>
                    <span>Biała</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFontColor("black")}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      (spec.fontColorMode || fontColor) === "black"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    title="Ustaw czarną czcionkę (#000000)"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-black border border-neutral-600"></span>
                    <span>Czarna</span>
                  </button>
                </div>

                <div className="h-4 w-px bg-white/10 hidden sm:block" />

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400">
                    Rozmiar: {Math.round(textScale * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.05"
                    value={textScale}
                    onChange={(e) => setTextScale(parseFloat(e.target.value))}
                    className="w-20 h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-white"
                    title="Dostosuj wielkość czcionki"
                  />
                </div>
              </div>
            </div>

            {/* Minimalistyczny grid z 8 krojami pisma Stark Focus */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {FONT_OPTIONS.map((f) => {
                const isActive = (spec.fontFamilyCustom || fontFamily) === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFontFamily(f.id);
                      setSpec((prev) => ({ ...prev, fontFamilyCustom: f.id }));
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer border ${
                      isActive
                        ? "bg-white text-black border-white shadow-sm"
                        : "bg-[#161616] text-neutral-300 border-white/10 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">{f.name}</div>
                    <div
                      className={`text-[9px] font-mono truncate ${
                        isActive ? "text-neutral-600" : "text-neutral-500"
                      }`}
                    >
                      {f.style}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DEDYKOWANY GENERATOR DLA "CYTAT NA CZERNI (9:16)" */}
          {spec.gridType === "none_solid" && (
            <div className="bg-[#111111] p-4 rounded-xl border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-white" />
                  Generator Cytatu na Czerni (9:16)
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  Wysoki Kontrast • Zero Długich Bloków
                </span>
              </div>

              {/* Wybór formatu cytatu: 1 zdanie (~5 słów) vs 2 krótkie wersy po 1 linii */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase block">
                  Układ Cytatu:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteStyleMode("single");
                      if (spec.textLayers.length > 1) {
                        setSpec((prev) => ({
                          ...prev,
                          textLayers: [
                            {
                              ...prev.textLayers[0],
                              fontSize: 82,
                              posY: 0.46,
                            },
                          ],
                        }));
                      }
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center ${
                      quoteStyleMode === "single" || spec.textLayers.length === 1
                        ? "bg-white text-black shadow-sm"
                        : "bg-[#080808] border border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    1 zdanie (~5 słów)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteStyleMode("two_lines");
                      if (spec.textLayers.length === 1) {
                        setSpec((prev) => ({
                          ...prev,
                          textLayers: [
                            {
                              ...prev.textLayers[0],
                              fontSize: 68,
                              posY: 0.42,
                            },
                            {
                              id: "t2",
                              text: "standards remain.",
                              fontFamily: prev.fontFamilyCustom || "sans",
                              fontSize: 42,
                              fontWeight: "normal",
                              fontStyle: "normal",
                              casing: "preserve",
                              color: "rgba(255, 255, 255, 0.72)",
                              align: "left",
                              posY: 0.5,
                              posX: 0.12,
                            },
                          ],
                        }));
                      }
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center ${
                      quoteStyleMode === "two_lines" && spec.textLayers.length > 1
                        ? "bg-white text-black shadow-sm"
                        : "bg-[#080808] border border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    2 wersy (po 1 linii)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuoteStyleMode("auto")}
                    className={`py-2 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer text-center ${
                      quoteStyleMode === "auto"
                        ? "bg-white text-black shadow-sm"
                        : "bg-[#080808] border border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Auto / AI Mix
                  </button>
                </div>
              </div>

              {/* Temat / Prompt do generatora */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase block">
                  Temat lub idea (np. dyscyplina, zima, brak wymówek, samotność):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={sayingTopic}
                    onChange={(e) => setSayingTopic(e.target.value)}
                    placeholder="Wpisz temat lub zostaw domyślny..."
                    className="flex-1 px-3 py-2 bg-[#080808] border border-white/15 rounded-lg text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiSayings}
                    disabled={isGeneratingSayings}
                    className="px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                  >
                    {isGeneratingSayings ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{isGeneratingSayings ? "Generuję..." : "Generuj z AI"}</span>
                  </button>
                </div>

                {/* Szybkie Wirale: Cytaty Namawiające do Myślenia (Do Odbiorcy) */}
                <div className="pt-2 space-y-1.5 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase flex items-center gap-1.5">
                      <span>👑</span> Hit Wirale: Prowokujące do myślenia (1-kliknięcie):
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500">
                      Format dopasowany ({quoteStyleMode === "single" ? "1 zdanie" : "2 wersy"})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {[
                      {
                        main: "Walk like a king, or walk like you don't care who the king is.",
                        sub: "",
                        topic: "Walk like a king",
                        caption:
                          "WALK LIKE A KING.\n\nOr walk like you don't care who the king is.\n\n3 rules of sovereign posture:\n1. Never seek validation from spectators.\n2. Hold your standards in absolute silence.\n3. Reclaim your inner territory.\n\nSave this reminder. Follow @stark_focus.\n\n#stoicism #discipline #mindset #focus #starkfocus",
                      },
                      {
                        main: "Notice how people treat you",
                        sub: "when you no longer need them.",
                        topic: "Power shift and sovereignty",
                        caption:
                          "NOTICE HOW THEY TREAT YOU WHEN YOU NO LONGER NEED THEM.\n\nTrue independence changes every dynamic.\n\n1. Become completely self-reliant.\n2. Never beg for access.\n3. Build your peace in private.\n\nSave this reminder. Follow @stark_focus.",
                      },
                      {
                        main: "You are not tired.",
                        sub: "You are uninspired.",
                        topic: "You are not tired",
                        caption:
                          "YOU ARE NOT TIRED. YOU ARE UNINSPIRED BY A LIFE YOU DIDN'T CHOOSE.\n\n1. Cut the meaningless obligations.\n2. Attack your true ambition.\n3. Stop settling for crumbs.\n\nSave this reminder. Follow @stark_focus.",
                      },
                      {
                        main: "The version of you they remember",
                        sub: "no longer exists.",
                        topic: "Outgrowing your past",
                        caption:
                          "THE VERSION OF YOU THEY REMEMBER NO LONGER EXISTS.\n\nStop apologizing for growth.\n\n1. Let go of past identities.\n2. Protect your upgraded standards.\n3. Execute without looking back.\n\nSave this. Follow @stark_focus.",
                      },
                      {
                        main: "If you don't build your peace,",
                        sub: "someone sells you their chaos.",
                        topic: "Protecting inner peace",
                        caption:
                          "IF YOU DON'T BUILD YOUR PEACE, SOMEONE SELLS YOU THEIR CHAOS.\n\n1. Close the door to drama.\n2. Guard your mental citadel.\n3. Say no without hesitation.\n\nSave this standard. Follow @stark_focus.",
                      },
                      {
                        main: "Stop explaining yourself",
                        sub: "to people committed to misunderstand you.",
                        topic: "Silence and results",
                        caption:
                          "STOP EXPLAINING YOURSELF.\n\nSilence cannot be misquoted. Let results do the talking.\n\nFollow @stark_focus.",
                      },
                      {
                        main: "Silence is not empty.",
                        sub: "It is full of answers you avoid.",
                        topic: "Silence and solitude",
                        caption:
                          "SILENCE IS NOT EMPTY. IT IS FULL OF ANSWERS YOU'RE AVOIDING.\n\nSit in silence for 20 minutes today. Reclaim your focus.\n\nFollow @stark_focus.",
                      },
                      {
                        main: "They want you to win,",
                        sub: "just not more than them.",
                        topic: "Hidden envy and focus",
                        caption:
                          "THEY WANT YOU TO WIN, JUST NOT MORE THAN THEM.\n\nKeep your moves silent until the checkmate.\n\nSave this. Follow @stark_focus.",
                      },
                      {
                        main: "Never let someone in a cage",
                        sub: "lecture you about flying.",
                        topic: "Unapologetic ambition",
                        caption:
                          "NEVER LET SOMEONE COMFORTABLE IN THEIR CAGE LECTURE YOU ABOUT FLYING.\n\nBreak free from mediocre standards.\n\nFollow @stark_focus.",
                      },
                      {
                        main: "Silence cannot be misquoted.",
                        sub: "",
                        topic: "Silence is power",
                        caption:
                          "SILENCE CANNOT BE MISQUOTED.\n\nExecute in silence. Shock them with results.\n\nFollow @stark_focus.",
                      },
                    ].map((item, idx) => {
                      const displayMain =
                        quoteStyleMode === "single" && item.sub
                          ? `${item.main} ${item.sub}`
                          : item.main;
                      const displaySub = quoteStyleMode === "single" ? "" : item.sub;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSayingTopic(item.topic);
                            handleApplySaying({
                              main: displayMain,
                              sub: displaySub,
                              caption: item.caption,
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0d0d0d] hover:bg-white hover:text-black border border-white/10 hover:border-white text-[11px] font-mono text-neutral-300 transition-all cursor-pointer text-left truncate max-w-full"
                          title="Kliknij, aby natychmiast wstawić na kadr"
                        >
                          "{displayMain}" {displaySub ? `— ${displaySub}` : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#121212] p-4 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase">
                Edycja Tekstu ({spec.layoutName})
              </span>
              {spec.detectedAudio && (
                <span className="text-[10px] font-mono text-neutral-300 flex items-center gap-1">
                  <Music className="w-3 h-3" /> {spec.detectedAudio}
                </span>
              )}
            </div>

            {/* Opcjonalne wgranie zdjęć dla slotów siatki */}
            {spec.slotCount > 0 && (
              <div className="space-y-2 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase block">
                    Wgraj zdjęcia dla siatki (2x2):
                  </label>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleUploadPhoto}
                  className="hidden"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {spec.slotLabels.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveSlotToUpload(idx);
                        fileInputRef.current?.click();
                      }}
                      className="p-2 rounded-lg bg-[#0A0A0A] hover:bg-[#1A1A1A] border border-white/10 hover:border-white text-left transition-colors cursor-pointer group"
                    >
                      <div className="aspect-video rounded overflow-hidden mb-1.5 bg-[#050505] border border-white/10 flex items-center justify-center">
                        {slotImages[idx] ? (
                          <img
                            src={slotImages[idx]!}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            Domyślny kadr
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-300 block truncate">
                        {label}
                      </span>
                      <span className="text-[9px] font-mono text-neutral-400 group-hover:text-white flex items-center gap-1 mt-0.5">
                        <Upload className="w-2.5 h-2.5" /> Wgraj plik
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warstwy tekstu */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-neutral-400 uppercase block">
                  {spec.gridType === "none_solid"
                    ? spec.textLayers.length === 1
                      ? "Cytat (Jedno zdanie, ~5 słów):"
                      : "Linie Cytatu (Ściśle po 1 linijce każda):"
                    : "Linijki Tekstu na Grafice:"}
                </label>
                <button
                  type="button"
                  onClick={handleAddTextLayer}
                  className="px-2 py-0.5 rounded bg-[#1A1A1A] hover:bg-white hover:text-black text-neutral-300 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Dodaj wers
                </button>
              </div>

              {spec.textLayers.map((layer, idx) => (
                <div key={layer.id} className="flex items-center gap-2">
                  <div className="text-[10px] font-mono text-neutral-400 w-16 shrink-0">
                    {spec.gridType === "none_solid" && spec.textLayers.length === 1
                      ? "Zdanie:"
                      : spec.gridType === "none_solid" && idx === 0
                        ? "Linia 1:"
                        : spec.gridType === "none_solid" && idx === 1
                          ? "Linia 2:"
                          : `Wers ${idx + 1}:`}
                  </div>
                  <input
                    type="text"
                    value={layer.text}
                    onChange={(e) => handleUpdateTextLayer(layer.id, e.target.value)}
                    className="flex-1 bg-[#0A0A0A] border border-white/10 focus:border-white rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none transition-colors"
                  />
                  {spec.textLayers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTextLayer(layer.id)}
                      className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Usuń ten wers (zostaw pojedyncze zdanie)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Opis posta z hashtagami */}
          <div className="bg-[#121212] p-4 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-neutral-400 uppercase">
                Opis posta pod zdjęcie/rolkę:
              </label>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(spec.caption);
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                }}
                className="text-[10px] font-mono text-white hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedCaption ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copiedCaption ? "Skopiowano!" : "Kopiuj Opis"}
              </button>
            </div>

            <textarea
              rows={4}
              value={spec.caption}
              onChange={(e) => setSpec((prev) => ({ ...prev, caption: e.target.value }))}
              className="w-full bg-[#0A0A0A] border border-white/10 focus:border-white rounded-lg p-2.5 text-xs font-mono text-neutral-300 focus:outline-none leading-relaxed transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Skopiowano opis do schowka!
              </span>
            ) : (
              <div />
            )}

            <button
              onClick={handleSaveToPipeline}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Copy className="w-4 h-4" /> Kopiuj Opis i Zapisz Post
            </button>
          </div>
        </div>
      </div>

      {/* MODAL GENERATORA MASOWEGO (BATCH POSTS) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0A0A0A] border border-white/20 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111111]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-mono font-black text-white uppercase tracking-wider flex items-center gap-2">
                    GENERATOR MASOWY POSTÓW // WYSOKA RÓŻNORODNOŚĆ IDEI
                  </h3>
                  <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                    10 unikalnych filarów stoickich • Zero powtarzalności • Format 3D Studio Wall
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#181818] hover:bg-white hover:text-black text-neutral-400 transition-colors cursor-pointer"
                title="Zamknij"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div className="p-4 border-b border-white/10 bg-[#0E0E0E] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={batchTopic}
                  onChange={(e) => setBatchTopic(e.target.value)}
                  placeholder="Temat przewodni (np. Stoic discipline, silence, standards, winter arc)..."
                  className="flex-1 px-3 py-2 bg-[#050505] border border-white/15 rounded-lg text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
                <select
                  value={batchCount}
                  onChange={(e) => setBatchCount(Number(e.target.value))}
                  className="px-3 py-2 bg-[#050505] border border-white/15 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-white"
                >
                  <option value={5}>5 Postów (Różne filary)</option>
                  <option value={10}>10 Postów (Pełna wariancja)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  disabled={isGeneratingBatch}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isGeneratingBatch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generowanie Serii...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generuj Serię</span>
                    </>
                  )}
                </button>

                {batchPosts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadBatchZip}
                    disabled={batchDownloading}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                    title="Pobierz wszystkie wygenerowane posty jako archiwum ZIP"
                  >
                    {batchDownloading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Pakowanie ZIP...</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-3.5 h-3.5" />
                        <span>Pobierz Wszystkie (ZIP)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content - Lista wygenerowanych postów */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              {batchPosts.length === 0 && !isGeneratingBatch && (
                <div className="text-center py-16 space-y-2 font-mono text-neutral-500">
                  <Package className="w-10 h-10 mx-auto text-neutral-600" />
                  <p className="text-xs">
                    Kliknij "Generuj Serię", aby wygenerować pakiet zróżnicowanych postów.
                  </p>
                </div>
              )}

              {isGeneratingBatch && (
                <div className="text-center py-16 space-y-3 font-mono text-neutral-400">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-white" />
                  <p className="text-xs uppercase font-bold tracking-wider">
                    Konstruowanie 10 odrębnych koncepcji stoickich...
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Każdy post pochodzi z innego filaru psychologicznego (Silence, Friction,
                    Citadel, Monkish, Standard...)
                  </p>
                </div>
              )}

              {batchPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {batchPosts.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-[#121212] border border-white/10 rounded-xl p-4 space-y-3 hover:border-white/25 transition-all shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-amber-300 border border-white/15 text-[10px] font-mono font-bold uppercase tracking-wider">
                            {item.pillar}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                        </div>

                        {/* Podgląd tekstu na karcie */}
                        <div className="p-3 bg-[#080808] rounded-lg border border-white/10 space-y-1">
                          <div className="text-sm font-mono font-black text-white">
                            "{item.sayingMain}"
                          </div>
                          <div className="text-xs font-mono text-neutral-400">{item.sayingSub}</div>
                        </div>

                        {/* Format */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-neutral-400">
                          <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white font-bold">
                            9:16 (1080×1920)
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                            Biały Tekst na Czerni
                          </span>
                        </div>

                        {/* Opis */}
                        <p className="text-[10px] font-mono text-neutral-400 line-clamp-2">
                          {item.caption}
                        </p>
                      </div>

                      {/* Przyciski Akcji */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => handleApplyBatchPost(item)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-mono font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Wczytaj do Edytora</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSingleBatchPost(item)}
                          className="py-1.5 px-2.5 rounded-lg bg-[#181818] hover:bg-white hover:text-black text-neutral-200 border border-white/10 font-mono font-bold text-[11px] uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title="Pobierz PNG tego posta"
                        >
                          <Download className="w-3 h-3" />
                          <span>PNG</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${item.sayingMain}\n${item.sayingSub}\n\n${item.caption}`,
                            );
                            setBatchCopiedId(item.id || String(idx));
                            setTimeout(() => setBatchCopiedId(null), 2000);
                          }}
                          className="p-1.5 rounded-lg bg-[#181818] hover:bg-white hover:text-black text-neutral-300 border border-white/10 text-xs font-mono transition-all cursor-pointer"
                          title="Kopiuj treść i opis"
                        >
                          {batchCopiedId === (item.id || String(idx)) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
