import React, { useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { formatStarkCaption, isPolishCopy, starkCaption, starkPinned } from "../lib/caption";
import { postChecklist } from "../lib/prepublish";
import { ChecklistPanel } from "./ChecklistPanel";
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
import { StructuredContent, structuredSpec } from "../utils/ideaLayout";
import { FrameFormat, formatByGrid } from "../lib/formats";
import { groupText, nextLayerId, PRIMARY_LAYER_ID } from "../utils/canvas/layerRoles";

interface InspirationStudioProps {
  onSaveToPipeline?: (post: any) => void;
  userHandle?: string;
  initialText?: string;
  initialCaption?: string;
  /** Gotowy kadr z pomysłem i układem — ma priorytet nad initialText. */
  initialSpec?: UniversalLayoutSpec;
  onSendToReel?: (text: string) => void;
  /** Odciski treści, która już poszła — generatory mają jej nie powtarzać. */
  usedHooks?: string[];
  /** Nasze zdania o najlepszym wyniku — wzorzec rytmu dla modelu. */
  exemplarHooks?: string[];
}

export interface StoicSaying {
  main: string;
  sub?: string;
  caption?: string;
}

/** Nazwy figur zwracanych przez `/api/ai/hooks` — w UI po polsku, w materiale po angielsku. */
const ARCHETYPE_LABELS: Record<string, string> = {
  accusation: "oskarżenie o gest",
  "two-selves": "dwa ja w czasie",
  ledger: "rachunek kosztu",
  inversion: "odwrócone przekonanie",
  object: "jeden przedmiot",
  "subverted-proverb": "złamane porzekadło",
  "quiet-close": "ciche zamknięcie",
  "counted-finitude": "policzona skończoność",
  "withdrawn-audience": "widownia bez oklasku",
  "earned-command": "rozkaz po diagnozie",
  unlabeled: "bez figury",
};

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
  caption: formatStarkCaption("This winter, disappear into obsession.", [
    "Nobody is coming to save your potential.",
    "Private victories build permanent foundations.",
    "Let the results make the noise.",
  ]),
  detectedAudio: "Oryginalny dźwięk",
};

/**
 * UKŁADY ZE STRUKTURĄ.
 *
 * Dołożone dlatego, że materiał wychodzący z aplikacji był w ~80% cytatem na
 * czarnym tle — ten sam kształt po trzydziestu postach przestaje zatrzymywać
 * kciuk. Protokół, tabela kosztu i księga niosą treść, którą czytelnik musi
 * dokończyć, więc działają niezależnie od tego, jak mocny jest sam hook.
 *
 * Presety buduje ten sam `structuredSpec`, z którego powstaje kadr z pomysłu:
 * wybrany format i wygenerowana treść nie mogą się od siebie różnić geometrycznie.
 */
const SPEC_PROTOCOL = structuredSpec("Protokół", "protocol_list", {
  primary: "You don't lack discipline. You lack a sequence.",
  steps: [
    "Phone in another room before you decide anything.",
    "First block of the day belongs to the hardest task.",
    "No negotiations before noon. The deal is already signed.",
  ],
});

const SPEC_COST_REWARD = structuredSpec("Koszt i utrata", "cost_vs_reward", {
  primary: "What does it cost to stay who you are?",
  cost: [
    "One hour you will never get back",
    "The promise you broke in private",
    "The rep of being someone who starts",
  ],
  forfeit: [
    "The body you had two years ago",
    "The work only you could have made",
    "The respect you stopped earning",
  ],
  closing: "You already paid. Decide what it bought.",
});

/**
 * Lista formatów w jednym miejscu — dawniej każdy układ był dodawanym
 * przyciskiem w JSX, przez co pasek rósł szybciej niż możliwości.
 */
const LAYOUT_PICKER: Array<{
  gridType: UniversalLayoutSpec["gridType"];
  label: string;
  spec: UniversalLayoutSpec;
}> = [
  { gridType: "none_solid", label: "Cytat", spec: SPEC_BLACK_QUOTE },
  { gridType: "protocol_list", label: "Protokół", spec: SPEC_PROTOCOL },
  { gridType: "cost_vs_reward", label: "Koszt", spec: SPEC_COST_REWARD },
  { gridType: "grid_2x2", label: "Kolaż", spec: SPEC_COLLAGE_4 },
];

/** Gdzie napis stoi w kadrze — ten sam tekst, trzy różne sceny. */
const SIGN_SCENES: Array<{ scene: "wall" | "neon" | "billboard"; label: string }> = [
  { scene: "wall", label: "Ściana 3D" },
  { scene: "neon", label: "Neon" },
  { scene: "billboard", label: "Baner" },
];

/** Kandydat z generatora: cała struktura kadru plus to, co widać na liście. */
interface FrameCandidate {
  key: string;
  preview: string;
  extra: string;
  archetype: string;
  content: StructuredContent;
  /** Opis pisany pod kadr, nie z niego. Pusty = studio samo nic nie dopisze. */
  caption: string;
  /** Pytanie do przypiętego komentarza — trafione, bo pisane pod ten tekst. */
  question: string;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

/**
 * Odpowiedź serwera (pole modelu) → struktura kadru. Listy zostają listami:
 * gdyby tu spłaszczyć kroki do jednego zdania, protokół znowu byłby cytatem.
 */
function asCandidate(
  frame: Record<string, unknown>,
  format: FrameFormat | undefined,
): FrameCandidate | null {
  const steps = asStringList(frame.steps);
  const cost = asStringList(frame.cost);
  const forfeit = asStringList(frame.forfeit);
  const primary = String(frame.primary ?? "").trim();
  const closing = String(frame.closing ?? "").trim();
  if (!primary) return null;
  const paired = !!format?.fields.some((field) => field.pair);
  const keeps = (key: string) =>
    !!format?.fields.some((field) => field.key === key || (field.pair && paired));
  // Para zostaje parą na liście: dwa osobne słupki w podglądzie nie mówią,
  // która utrata pada z której ceny.
  const rows = paired ? cost.map((left, i) => `${left}  ->  ${forfeit[i] ?? ""}`) : [];
  const lists = paired ? [rows] : [steps, cost, forfeit].filter((list) => list.length > 0);
  return {
    key: `${primary}|${lists.map((list) => list.join(" ")).join("|")}`,
    preview: primary,
    extra: lists
      .flat()
      .concat(closing ? [closing] : [])
      .join("\n"),
    archetype: String(frame.archetype ?? "unlabeled"),
    caption: String(frame.caption ?? "").trim(),
    question: String(frame.question ?? "").trim(),
    content: {
      primary,
      steps: keeps("steps") ? steps : undefined,
      cost: keeps("cost") ? cost : undefined,
      forfeit: keeps("forfeit") ? forfeit : undefined,
      closing: keeps("closing") ? closing : "",
    },
  };
}

/**
 * Etykieta wiersza edytora z roli warstwy. Bez niej przy protokole było osiem
 * pól "Wers 1..8" i nie dało się zgadnąć, które idzie do lewego słupka.
 */
const ROLE_LABELS: Record<string, string> = {
  step: "Krok",
  cost: "Cena",
  forfeit: "Utrata",
};

const EXACT_LAYER_LABELS: Record<string, string> = {
  closing: "Puenta:",
  figure: "Cyfra:",
  [PRIMARY_LAYER_ID]: "Teza:",
};

function layerLabel(spec: UniversalLayoutSpec, layer: UniversalTextLayer, index: number): string {
  if (spec.gridType === "none_solid") {
    return spec.textLayers.length === 1 ? "Zdanie:" : `Linia ${index + 1}:`;
  }
  if (EXACT_LAYER_LABELS[layer.id]) return EXACT_LAYER_LABELS[layer.id];
  const role = /^([a-z]+)(\d+)$/.exec(layer.id);
  if (role && ROLE_LABELS[role[1]]) return `${ROLE_LABELS[role[1]]} ${role[2]}:`;
  return `Wers ${index + 1}:`;
}

export const InspirationStudio1to1: React.FC<InspirationStudioProps> = ({
  onSaveToPipeline,
  userHandle = "stark_focus",
  initialText,
  initialCaption,
  initialSpec,
  onSendToReel,
  usedHooks = [],
  exemplarHooks = [],
}) => {
  // Format proporcji: wyłącznie wertykalny 9:16 (1080x1920 PX)
  const aspectRatio = "9:16" as const;
  const dimensions = { width: 1080, height: 1920 };
  const [fontFamily, setFontFamily] = useState<string>("sans");
  const [textScale, setTextScale] = useState<number>(1.0);

  // Stan generatora powiedzonek
  const [isGeneratingSayings, setIsGeneratingSayings] = useState(false);
  const [sayingError, setSayingError] = useState<string | null>(null);
  /**
   * Kandydat to cały kadr, nie jedno zdanie: struktura idzie z formatem, który
   * stoi aktualnie w studio, więc "Generuj z AI" pod protokół zwraca protokół.
   */
  const [sayingCandidates, setSayingCandidates] = useState<FrameCandidate[]>([]);
  const [sayingTopic, setSayingTopic] = useState(
    "Dyscyplina stoicka, milczenie, wysokie standardy",
  );
  // Tryb cytatu: pojedyncza linijka (~5 słów), dwa krótkie wersy po 1 linii lub auto
  const [quoteStyleMode, setQuoteStyleMode] = useState<"single" | "two_lines" | "auto">("single");

  // Aktywna specyfikacja układu (domyślnie: czysty minimalistyczny cytat na czerni 9:16)
  const [spec, setSpec] = useState<UniversalLayoutSpec>(SPEC_BLACK_QUOTE);

  // Generator ma pisać pod ten układ, pod którym patrzy się w podgląd.
  const activeFormat = formatByGrid(spec.gridType);

  // Tablica zdjęć wgranych do slotów
  const [slotImages, setSlotImages] = useState<(string | null)[]>([]);
  const [activeSlotToUpload, setActiveSlotToUpload] = useState<number>(0);

  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedPinned, setCopiedPinned] = useState(false);
  /** Pytanie od modelu. Puste = pytanie liczona z układu kadru. */
  const [pinnedQuestion, setPinnedQuestion] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stan Generatora Masowego (Batch Export & Zero Repetition)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [batchTopic, setBatchTopic] = useState("Stoic discipline, silence, and standards");
  const [batchCount, setBatchCount] = useState<number>(10);
  const [batchPosts, setBatchPosts] = useState<BatchPostItem[]>([]);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchCopiedId, setBatchCopiedId] = useState<string | null>(null);

  // Reakcja na przekazanie tekstu/pomysłu z zewnątrz (np. z zakładki Trendy i Pomysły)
  useEffect(() => {
    // Pomysł z układem i strukturą jest gotowym kadrem — nie ma sensu
    // rozbierać go z powrotem na same linie tekstu i renderować jako cytat.
    if (initialSpec) {
      setSpec(initialSpec);
      setSlotImages(initialSpec.gridType === "grid_2x2" ? [null, null, null, null] : []);
      return;
    }

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
  }, [initialText, initialCaption, initialSpec]);

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
      fontColor: "white",
    });
  }, [spec, loadedImages, dimensions.width, dimensions.height, fontFamily, textScale, userHandle]);

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
      caption: starkCaption(cleanMain, saying.caption || ""),
    }));
  };

  /**
   * Studio nie prosi modelu o jedną odpowiedź, tylko o kilka, i pokazuje je do
   * wyboru. Limitem jest liczba zapytań na dobę, nie tokeny. Model dostaje
   * format aktualnego kadru, więc wypełnia protokół krokami, a koszt słupkami —
   * dawniej zawsze dostawał jedno zdanie i każdy format zapadał się w cytat.
   */
  const handleGenerateAiSayings = async () => {
    setIsGeneratingSayings(true);
    setSayingError(null);
    const format = activeFormat;
    try {
      const res = await fetch("/api/ai/frame-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: format?.id ?? "quote",
          topic: sayingTopic || "Prowokujące treści stoickie skierowane do odbiorcy",
          count: 3,
          excludeHooks: usedHooks,
          exemplars: exemplarHooks,
        }),
      });
      const data = await res.json();
      const list = Array.isArray(data?.frames) ? data.frames : [];

      if (list.length === 0) {
        setSayingError(
          typeof data?.notice === "string"
            ? data.notice
            : typeof data?.error === "string"
              ? data.error
              : `Serwer nie zwrócił treści (HTTP ${res.status}).`,
        );
        return;
      }

      setSayingCandidates(
        list
          .map((frame: Record<string, unknown>) => asCandidate(frame, format))
          .filter((candidate: FrameCandidate | null): candidate is FrameCandidate => !!candidate),
      );
    } catch (err) {
      setSayingError("Nie udało się połączyć z generatorem. Sprawdź, czy serwer działa.");
      console.error("Błąd AI Sayings:", err);
    } finally {
      setIsGeneratingSayings(false);
    }
  };

  // Wybranie kandydata, nie „generuj aż wypadnie dobrze": decyzja jest ludzka.
  const handleApplyCandidate = (candidate: FrameCandidate) => {
    setSayingCandidates([]);
    if (isPolishCopy(candidate.preview)) {
      setSayingError("Ta linia jest po polsku. Wybierz inną albo generuj ponownie.");
      return;
    }
    setPinnedQuestion(candidate.question);
    applyStructuredFrame(candidate.content, candidate.caption);
  };

  /** Przebudowa kadru z zachowaniem tego, co właściciel marki ustawił sam. */
  const applyStructuredFrame = (content: StructuredContent, modelCaption = "") => {
    const next = structuredSpec(
      spec.layoutName,
      spec.gridType,
      content,
      spec.layoutData ?? {},
      modelCaption,
    );
    setSpec((prev) => ({
      ...next,
      fontFamilyCustom: prev.fontFamilyCustom,
      fontColorMode: prev.fontColorMode,
      backgroundColor: prev.backgroundColor,
    }));
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

  const handleUpdateTextLayer = (id: string, newText: string) => {
    setSpec((prev) => ({
      ...prev,
      textLayers: prev.textLayers.map((l) => (l.id === id ? { ...l, text: newText } : l)),
    }));
  };

  const handleAddTextLayer = () => {
    // W układach strukturalnych render bierze wiersze z grup id (`step-N`,
    // `cost-N`); warstwa poza grupą wylądowałaby w edytorze i na żadnym kadrze.
    const costs = groupText(spec, "cost").length;
    const forfeits = groupText(spec, "forfeit").length;
    const prefix =
      spec.gridType === "protocol_list"
        ? "step"
        : spec.gridType === "cost_vs_reward"
          ? costs <= forfeits
            ? "cost"
            : "forfeit"
          : "t";
    const newId = nextLayerId(spec, prefix);
    setSpec((prev) => ({
      ...prev,
      textLayers: [
        ...prev.textLayers,
        {
          id: newId,
          text: "New line",
          fontFamily: prev.textLayers[0]?.fontFamily || "sans",
          fontSize: prev.textLayers[0]?.fontSize || 62,
          fontWeight: "black",
          fontStyle: "normal",
          casing: "preserve",
          color: prev.textLayers[0]?.color || "#161920",
          align: "left",
          posY: 0.28 + prev.textLayers.length * 0.08,
          posX: prefix === "forfeit" ? 0.54 : 0.14,
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
        body: JSON.stringify({
          topic: batchTopic,
          count: batchCount,
          excludeHooks: usedHooks,
          exemplars: exemplarHooks,
        }),
      });
      const data = await res.json();
      setBatchNotice(typeof data.notice === "string" ? data.notice : null);
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

  // Napis w scenie ma trzy miejsca na litery (ściana, neon, baner) — dochodzi
  // dopiero przy kadrze z analizy linku, więc format nie mnoży się w pickerze.
  const variantChoices: {
    label: string;
    options: Array<{ value: "wall" | "neon" | "billboard"; label: string }>;
  } =
    spec.gridType === "studio_wall_3d"
      ? { label: "Scena", options: SIGN_SCENES.map((s) => ({ value: s.scene, label: s.label })) }
      : { label: "", options: [] };

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 text-neutral-200">
      {/* Pasek linku */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-mono font-bold uppercase text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            GENERATOR POSTA ({dimensions.width}×{dimensions.height} PX)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-neutral-400">
              Format: <strong className="text-white">{spec.layoutName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Pasek wyboru Proporcji Kadru (1:1 / 4:5 / 9:16) oraz Szablonów */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Szablony układów */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[10px] font-mono text-neutral-400 uppercase mr-1 shrink-0">
            Format:
          </span>
          {LAYOUT_PICKER.map((option) => (
            <button
              key={option.gridType}
              type="button"
              onClick={() => {
                setSpec(option.spec);
                setSlotImages(option.gridType === "grid_2x2" ? [null, null, null, null] : []);
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors shrink-0 ${
                spec.gridType === option.gridType
                  ? "bg-white text-black"
                  : "bg-[#141414] text-neutral-400 border border-white/10 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Wariant kadru: gdzie stoi napis. */}
        {variantChoices.options.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-neutral-500 uppercase shrink-0">
              {variantChoices.label}:
            </span>
            {variantChoices.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSpec((prev) => ({
                    ...prev,
                    layoutData: { ...prev.layoutData, scene: option.value },
                  }))
                }
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-colors shrink-0 ${
                  (spec.layoutData?.scene ?? "wall") === option.value
                    ? "bg-[#E11D48] text-white"
                    : "bg-[#141414] text-neutral-500 border border-white/10 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* Wymiar kadru jest stały — mówi go podpis nad podglądem. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsBatchModalOpen(true);
              if (batchPosts.length === 0) {
                handleGenerateBatch();
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all bg-[#141414] hover:bg-white text-neutral-300 hover:text-black border border-white/10 hover:border-white flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Generuj serię postów z różnorodnymi ideami (wysoka wariancja)"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Seria postów</span>
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

          {/* Przekaż treść do Rolki */}
          {onSendToReel && (
            <button
              type="button"
              onClick={handleSendCurrentToReel}
              className="w-full max-w-[320px] py-2 px-3 rounded-lg bg-[#141414] hover:bg-white hover:text-black text-neutral-300 border border-white/10 hover:border-white text-[11px] font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Przekaż ten tekst do Automontażysty 9-sekundowych rolek"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Przekaż do rolki (9s)</span>
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

              <div className="flex flex-wrap items-center gap-2">
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

          {/*
            GENERATOR TREŚCI — dla każdego formatu, nie tylko cytatu.
            Kształt tego, co zwraca model, dyktuje `activeFormat`, więc
            "Generuj z AI" pod protokół daje protokół z krokami.
          */}
          <div className="bg-[#111111] p-4 rounded-xl border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-white" />
                Generator treści — {activeFormat?.label ?? spec.layoutName}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {activeFormat?.shape ?? "Jedno zdanie na kadr"}
              </span>
            </div>

            {/* Wybór formatu cytatu: 1 zdanie (~5 słów) vs 2 krótkie wersy po 1 linii */}
            {spec.gridType === "none_solid" && (
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
            )}

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
              {sayingError && <p className="text-[10px] font-mono text-rose-400">{sayingError}</p>}
              {sayingCandidates.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">
                    Kandydaci w formacie „{activeFormat?.label ?? spec.layoutName}" — wybierz jeden
                  </p>
                  {sayingCandidates.map((candidate) => (
                    <button
                      key={candidate.key}
                      type="button"
                      onClick={() => handleApplyCandidate(candidate)}
                      className="w-full text-left px-3 py-2 bg-[#080808] border border-white/10 hover:border-white rounded-lg transition-all cursor-pointer"
                    >
                      <span className="block text-[11px] font-mono text-white leading-snug">
                        {candidate.preview}
                      </span>
                      {candidate.extra && (
                        <span className="block text-[10px] font-mono text-neutral-400 leading-snug mt-1 whitespace-pre-line">
                          {candidate.extra}
                        </span>
                      )}
                      <span className="block text-[9px] font-mono text-neutral-500 uppercase mt-0.5">
                        {ARCHETYPE_LABELS[candidate.archetype] ?? candidate.archetype}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                        <Upload className="w-2.5 h-2.5" />
                        Wgraj plik
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
                    : "Treść kadru — zawsze po angielsku:"}
                </label>
                <button
                  type="button"
                  onClick={handleAddTextLayer}
                  className="px-2 py-0.5 rounded bg-[#1A1A1A] hover:bg-white hover:text-black text-neutral-300 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Dodaj wers
                </button>
              </div>

              {spec.textLayers.map((layer, idx) => (
                <div key={layer.id} className="flex items-center gap-2">
                  <div className="text-[10px] font-mono text-neutral-400 w-16 shrink-0">
                    {layerLabel(spec, layer, idx)}
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

          {(() => {
            const rows = spec.textLayers.filter((layer) => layer.id !== PRIMARY_LAYER_ID);
            const pinned = starkPinned(
              spec.textLayers.find((layer) => layer.id === PRIMARY_LAYER_ID)?.text ??
                spec.textLayers[0]?.text ??
                "",
              rows.map((layer) => layer.text ?? ""),
              pinnedQuestion,
              spec.gridType === "none_solid" || spec.gridType === "studio_wall_3d"
                ? "single"
                : "list",
            );
            return (
              <div className="bg-[#121212] p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase">
                    Komentarz przypięty pod postem:
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pinned);
                      setCopiedPinned(true);
                      setTimeout(() => setCopiedPinned(false), 2000);
                    }}
                    className="text-[10px] font-mono text-white hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPinned ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedPinned ? "Skopiowano!" : "Kopiuj komentarz"}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 whitespace-pre-line leading-relaxed">
                  {pinned}
                </p>
                <p className="text-[9px] font-mono text-neutral-600 leading-relaxed">
                  Komentarze są jedyną rzeczą, którą konto poniżej 10k obserwujących uzbiera bez
                  zasięgu. Wklej to i przypnij zaraz po publikacji.
                </p>
              </div>
            );
          })()}

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Skopiowano opis do schowka!
              </span>
            ) : (
              <div />
            )}

            <ChecklistPanel
              title="Kontrola przed publikacja"
              items={postChecklist({
                primary:
                  spec.textLayers.find((layer) => layer.id === PRIMARY_LAYER_ID)?.text ??
                  spec.textLayers[0]?.text ??
                  "",
                lines: spec.textLayers
                  .filter((layer) => layer.id !== PRIMARY_LAYER_ID)
                  .map((layer) => layer.text?.trim() ?? "")
                  .filter(Boolean),
                caption: spec.caption,
              })}
            />

            <button
              onClick={handleSaveToPipeline}
              className="px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-mono font-black text-xs uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Copy className="w-4 h-4" />
              Kopiuj Opis i Zapisz Post
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
                <div className="p-2 rounded-lg bg-rose-400/10 border border-rose-400/30 text-rose-400">
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
                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-black font-mono font-black text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
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
                    {batchNotice ||
                      'Kliknij "Generuj Serię", aby wygenerować pakiet zróżnicowanych postów.'}
                  </p>
                </div>
              )}

              {isGeneratingBatch && (
                <div className="text-center py-16 space-y-3 font-mono text-neutral-400">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-white" />
                  <p className="text-xs uppercase font-bold tracking-wider">
                    Konstruowanie serii postów...
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Każdy post z innego filaru i żaden z tych, które już poszły.
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
                          <span className="px-2 py-0.5 rounded bg-white/10 text-rose-300 border border-white/15 text-[10px] font-mono font-bold uppercase tracking-wider">
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
