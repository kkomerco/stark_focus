import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  Download,
  Sparkles,
  Film,
  Check,
  Clock,
  Palette,
  Sliders,
  Copy,
  Smartphone,
  Volume2,
  Type,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
  Upload,
  Trash2,
  Image as ImageIcon,
  Package,
  Flame,
} from "lucide-react";
import JSZip from "jszip";
import { Post, ReelHandoff, VaultAsset } from "../types";
import { STARK_CTA, starkHashtags } from "../lib/caption";
import { BRAND_ACCENT } from "../utils/starkBrandTheme";
import { REEL_SAFE, bandCenter, safeBand } from "../utils/safeZones";
import { beatTimesFrom, renderReelBed } from "../utils/reelAudio";
import { VIRAL_REEL_TEMPLATES, type ReelTemplate } from "../data/reelTemplates";
import {
  STOIC_CATEGORIES,
  getRandomUniqueFormula,
  CATEGORY_BACKGROUND_RECOMMENDATIONS,
} from "../data/ideaMatrix";
import {
  EXPANDED_BACKGROUND_LIBRARY,
  getRandomBackgroundScene,
  BackgroundScene,
} from "../data/expandedBackgrounds";
import type {
  FontFamily,
  HighlightStyle,
  PacingMode,
  ReelDuration,
  ThemeMeta,
  VisualTheme,
} from "./video/reel-helpers";
import {
  getPhraseTimeline,
  isOrphanWord,
  layoutLines,
  parseTokens,
  VISUAL_THEMES,
} from "./video/reel-helpers";
import { pickBroll } from "../utils/brollPicker";

interface VideoStudioModalProps {
  onClose?: () => void;
  /** Pełny pakiet z generatora (hook + frazy + motyw + czas + opis + hashtagi). */
  initialReel?: ReelHandoff;
  initialBgUrl?: string;
  availablePosts?: Post[];
  vaultAssets?: VaultAsset[];
  onSchedulePostFor1300?: (postData: any) => void;
  onSchedulePost?: (postData: any) => void;
  embedded?: boolean;
  onSendToPost?: (text: string, caption?: string) => void;
}

export type ViralReelFormat =
  | "viral_loop_6s"
  | "hook_payoff_5s"
  | "dynamic_broll_cut"
  | "three_phases"
  /** Dlugy oddech: 5 zdan w 20 s. Nisza pokazuje, ze krotka petla nie jest jedynym formatem. */
  | "five_beats_20s";

const PRESET_STORAGE_KEY = "stark_reel_default_preset_v2";

const DEFAULT_PHRASES = ["Walk like a king, or walk like you don't care who the king is."];

const DEFAULT_CAPTION =
  "WALK LIKE A KING.\n\nOr walk like you don't care who the king is.\n\n3 rules of sovereign posture:\n1. Never seek validation from spectators.\n2. Hold your standards in absolute silence.\n3. Reclaim your inner territory.\n\nSave this reminder. Follow @stark_focus.";

// Hashtagi liczą się z treści rolki, nie ze stałej listy: Meta ucina ich
// pięć, a sztywny ogon sprawiał, że każdy post miał identyczną stopkę.
const DEFAULT_HASHTAGS = starkHashtags(DEFAULT_PHRASES[0]);

/** Wyjscie z lagodnym hamowaniem — liniowy fade wyglada jak włącznik swiatla. */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Studio ogarnia maksymalnie 4 kadry — dłuższe listy z modelu tniemy, nie renderujemy. */
const MAX_PHRASES = 5;

const ALLOWED_DURATIONS: ReelDuration[] = [5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 20, 25];

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

const squashSpaces = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Wszystko poniżej schodzi z odpowiedzi modelu, więc nie zakładamy kształtu pola:
 * brak tablicy = brak kadrów, brak liczby = brak czasu, zły motyw = zostaw obecny.
 */
function asPhraseList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asText(item)?.trim())
    .filter((item): item is string => Boolean(item))
    .slice(0, MAX_PHRASES);
}

function asReelTheme(value: unknown): VisualTheme | null {
  if (typeof value !== "string") return null;
  const wanted = value.trim() as VisualTheme;
  return VISUAL_THEMES.some((theme) => theme.id === wanted) ? wanted : null;
}

/** Model zwraca sekundy z zakresu 5-15 (trafia się 13), a studio zna tylko swoje kroki czasowe. */
function asReelDuration(value: unknown): ReelDuration | null {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return null;
  const seconds = Math.round(raw);
  return ALLOWED_DURATIONS.reduce((best, allowed) =>
    Math.abs(allowed - seconds) < Math.abs(best - seconds) ? allowed : best,
  );
}

/** Kadrami są frazy; hook to tylko ich pierwszy takt (albo całe zdanie w pętli). */
function resolvePhrases(reel?: ReelHandoff): string[] {
  if (!reel) return DEFAULT_PHRASES;
  const fromList = asPhraseList(reel.phrases);
  if (fromList.length > 0) return fromList;
  const fromHook = asPhraseList(asText(reel.hook)?.split("\n"));
  if (fromHook.length > 0) return fromHook;
  const single = asPhraseList([reel.hook]);
  return single.length > 0 ? single : DEFAULT_PHRASES;
}

/** Szablon z biblioteki łapiemy tylko gdy kadr/hook jest tym samym zdaniem. */
function findMatchedTemplate(reel?: ReelHandoff): ReelTemplate | null {
  if (!reel) return null;
  const wanted = [squashSpaces(reel.hook || ""), squashSpaces(resolvePhrases(reel).join(" "))]
    .map((text) => text.toUpperCase())
    .filter((text) => text.length > 0);
  const found = VIRAL_REEL_TEMPLATES.find((tpl) =>
    wanted.includes(squashSpaces(tpl.phrases.join(" ")).toUpperCase()),
  );
  return found || null;
}

function resolveCaption(reel: ReelHandoff | undefined, matched: ReelTemplate | null): string {
  if (!reel) return DEFAULT_CAPTION;
  const fromReel = asText(reel.caption);
  if (fromReel) return fromReel;
  if (matched && asText(matched.captionShort)) return matched.captionShort;
  // Generator bez opisu: dokładamy choćby kadry i firmowe CTA — twardy default
  // wchodzi wyłącznie na zimny start studia.
  return `${resolvePhrases(reel).join("\n")}\n\n${STARK_CTA}`;
}

/** Format to etykieta timingu — dobieramy ją do liczby kadrów z pakietu. */
function formatForPhraseCount(count: number): ViralReelFormat {
  if (count <= 1) return "viral_loop_6s";
  if (count === 2) return "hook_payoff_5s";
  if (count >= 5) return "five_beats_20s";
  return "three_phases";
}

/**
 * Bazę (prompt tła, opis-głęboki) bierzemy z pasującego szablonu, ale pola pakietu
 * je nadpisują — inaczej przełącznik „Krótki / Głębszy" cofnąłby opis do tekstu
 * z biblioteki zamiast tego, co użytkownik wybrał.
 */
function pickTemplate(reel?: ReelHandoff): ReelTemplate {
  const matched = findMatchedTemplate(reel);
  const base = matched || VIRAL_REEL_TEMPLATES[0];
  if (!reel) return base;

  const caption = resolveCaption(reel, matched);
  return {
    ...base,
    phrases: resolvePhrases(reel),
    captionShort: caption,
    captionDeep: caption,
    hashtags: starkHashtags(reel.hook || reel.caption || ""),
    suggestedTheme: asReelTheme(reel.theme) || base.suggestedTheme,
    suggestedDuration: asReelDuration(reel.duration) || base.suggestedDuration,
  };
}

export const VideoStudioModal: React.FC<VideoStudioModalProps> = ({
  onClose,
  initialReel,
  initialBgUrl,
  embedded = false,
  onSendToPost,
}) => {
  // Read saved preset from localStorage if exists
  const savedPreset = useMemo(() => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  // 1. Initial State z pakietu generatora, a gdy pakietu brak — z curated templates
  const initialTpl = useMemo(() => pickTemplate(initialReel), [initialReel]);

  // Director Controls - Formaty Łamiące Algorytmy (Domyślnie 7s, czcionka Cormorant)
  const [reelFormat, setReelFormat] = useState<ViralReelFormat>(() =>
    initialReel ? formatForPhraseCount(resolvePhrases(initialReel).length) : "viral_loop_6s",
  );
  const [duration, setDuration] = useState<ReelDuration>(
    () => asReelDuration(initialReel?.duration) || 7,
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>("cormorant");
  const pacingMode: PacingMode = "climax_hold";
  const fontSize: number = 64;
  const textCase: "natural" | "uppercase" = "natural";
  const highlightStyle: HighlightStyle = "bold";
  const verticalPos: number = 42;

  const [selectedTheme, setSelectedTheme] = useState<VisualTheme>(
    // motyw z pakietu > zapisany styl > sugestia szablonu
    () =>
      asReelTheme(initialReel?.theme) ||
      asReelTheme(savedPreset?.selectedTheme) ||
      initialTpl.suggestedTheme ||
      "obsidian_void",
  );
  const [captionStyle, setCaptionStyle] = useState<"short" | "deep">("deep");

  // Custom Background State (Image or Video)
  const [customBgType, setCustomBgType] = useState<"none" | "image" | "video">("none");
  const [customBgName, setCustomBgName] = useState<string>("");
  const customImageRef = useRef<HTMLImageElement | null>(null);
  const customVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-load initial background if provided
  useEffect(() => {
    if (initialBgUrl) {
      const isVid = initialBgUrl.match(/\.(mp4|webm|mov)(\?.*)?$/i);
      if (isVid) {
        const vid = document.createElement("video");
        vid.crossOrigin = "anonymous";
        vid.src = initialBgUrl;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        vid.onloadeddata = () => {
          customVideoRef.current = vid;
          setCustomBgType("video");
          setCustomBgName("Vault Video");
          vid.play().catch(() => {});
        };
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = initialBgUrl;
        img.onload = () => {
          customImageRef.current = img;
          setCustomBgType("image");
          setCustomBgName("Vault Background");
        };
      }
    }
  }, [initialBgUrl]);

  // Editable phrases for quick preview & correction (kadry z pakietu generatora)
  const [phrases, setPhrases] = useState<string[]>(() => resolvePhrases(initialReel));

  // Current template reference for caption toggling
  const [activeTemplate, setActiveTemplate] = useState<ReelTemplate>(initialTpl);

  // Ready-to-copy Caption & Hashtags — twardy default tylko na zimny start bez pakietu
  const [caption, setCaption] = useState<string>(
    initialReel ? initialTpl.captionShort || DEFAULT_CAPTION : DEFAULT_CAPTION,
  );
  const [hashtags, setHashtags] = useState<string[]>(
    initialReel && initialTpl.hashtags.length > 0 ? initialTpl.hashtags : DEFAULT_HASHTAGS,
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Każdy pakiet — także ten wysłany bez przeładowania studia — nadpisuje kadry,
  // motyw, czas i opis. Bez tego studio zostawało z treścią poprzedniej rolki.
  useEffect(() => {
    const reel = initialReel;
    if (!reel) return;
    const nextPhrases = resolvePhrases(reel);
    const nextTemplate = pickTemplate(reel);
    setPhrases(nextPhrases);
    setActiveTemplate(nextTemplate);
    setReelFormat(formatForPhraseCount(nextPhrases.length));
    const nextDuration = asReelDuration(reel.duration);
    if (nextDuration) setDuration(nextDuration);
    const nextTheme = asReelTheme(reel.theme);
    if (nextTheme) setSelectedTheme(nextTheme);
    else {
      // Rolka przyszła gołym tekstem (radar, post, batch) bez motywu. Bez
      // tego trzymała tło poprzedniej — dobór musi wynikać z jej treści.
      const scene = pickBroll(nextPhrases.join(" ")).scene;
      setSelectedTheme((prev) => asReelTheme(scene.suggestedTheme) ?? prev);
    }
    setCaption(nextTemplate.captionShort);
    setHashtags(starkHashtags(nextPhrases.join(" ")));
    timeRef.current = 0;
    setCurrentTime(0);
  }, [initialReel]);

  // Playback & Canvas Loop
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showTikTokGuides, setShowTikTokGuides] = useState<boolean>(false);
  // Bed proceduralny (dron + uderzenia na grzbietach) zamiast cichego pliku.
  const [reelAudioEnabled, setReelAudioEnabled] = useState<boolean>(true);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const seenTitlesRef = useRef<string[]>([]);

  // Dynamic Pacing Timeline and Metrics
  const activeTimeline = useMemo(() => {
    return getPhraseTimeline(phrases, duration, pacingMode);
  }, [phrases, duration, pacingMode]);

  const avgPhraseDuration = useMemo(() => {
    if (phrases.length <= 1) return duration;
    return duration / phrases.length;
  }, [duration, phrases.length]);

  const currentPhraseIndex = useMemo(() => {
    if (phrases.length <= 1) return 0;
    const found = activeTimeline.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end,
    );
    return found !== -1 ? found : activeTimeline.length - 1;
  }, [activeTimeline, currentTime, phrases.length]);

  // Export State — 30 FPS to jedyny tryb: `canvas.captureStream(30)` poniżej,
  // a standard Reels/TikTok/Shorts też wynosi 30 FPS (brak podwajania czasu).
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const isExportingRef = useRef<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // TURNKEY EXPORT: 1. "Ready-to-Post" ZIP Bundle (2 klatki PNG + TXT — bez wideo,
  // bo nagranie wymagałoby wcześniejszego eksportu rolki)
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  const handleExportZipBundle = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExportingZip(true);
    setToastMessage("Pakowanie zestawu ZIP (2 klatki PNG + opis)...");

    try {
      const zip = new JSZip();

      // Klatka okładkowa (Hook)
      renderFrame(0.5);
      const coverDataUrl = canvas.toDataURL("image/png");
      const coverBlob = await (await fetch(coverDataUrl)).blob();
      zip.file("1_COVER_HOOK_1080x1920.png", coverBlob);

      // Klatka finałowa (Climax)
      renderFrame(Math.max(1, duration - 0.5));
      const climaxDataUrl = canvas.toDataURL("image/png");
      const climaxBlob = await (await fetch(climaxDataUrl)).blob();
      zip.file("2_CLIMAX_PUNCHLINE_1080x1920.png", climaxBlob);

      // Gotowy plik tekstowy z opisem posta i hashtagami
      const postText = `STARK FOCUS // READY-TO-POST CONTENT BUNDLE (2 klatki PNG + ten opis)
============================================================
DATA GENERACJI: ${new Date().toISOString()}
FORMAT: Kadr 9:16 (1080x1920 Full HD) — pakiet nie zawiera wideo
CZAS NARRACJI: ${duration}.00s (rolkę nagrywa osobny przycisk "Pobierz Rolkę")
MOTYW: ${selectedTheme}

------------------------------------------------------------
[1] HOOK (0-3 SEKUNDY):
"${phrases[0] || ""}"

[2] PEŁNA NARRACJA (FAZY):
${phrases.map((p, i) => `Faza #${i + 1}: ${p}`).join("\n")}

[3] PUENTA (CLIMAX):
"${phrases[phrases.length - 1] || ""}"

------------------------------------------------------------
[4] OPIS POSTA (INSTAGRAM / TIKTOK CAPTION):
${caption}

------------------------------------------------------------
[5] HASHTAGI:
${hashtags.join(" ")}
============================================================
Wygenerowano przez STARK FOCUS TURNKEY BUNDLE PIPELINE.`;

      zip.file("POST_CAPTION_HASHTAGS.txt", postText);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STARK_READY_TO_POST_${duration}s_${selectedTheme}_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToastMessage("✓ Pakiet ZIP został pobrany!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("ZIP export error:", err);
      setToastMessage("Błąd eksportu pakietu ZIP.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsExportingZip(false);
      setIsPlaying(true);
    }
  };

  // Handle Custom Media Upload (Image or Video)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setCustomBgName(file.name);

    if (file.type.startsWith("video/")) {
      const vid = document.createElement("video");
      vid.src = fileUrl;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.autoplay = true;
      vid.play().catch(() => {});
      customVideoRef.current = vid;
      customImageRef.current = null;
      setCustomBgType("video");
      setToastMessage("✓ Załadowano własne tło wideo!");
    } else if (file.type.startsWith("image/")) {
      const img = new Image();
      img.src = fileUrl;
      img.onload = () => {
        customImageRef.current = img;
        customVideoRef.current = null;
        setCustomBgType("image");
        setToastMessage("✓ Załadowano własne tło graficzne!");
      };
    }
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClearCustomBg = () => {
    if (customVideoRef.current) {
      customVideoRef.current.pause();
      customVideoRef.current.src = "";
      customVideoRef.current = null;
    }
    customImageRef.current = null;
    setCustomBgType("none");
    setCustomBgName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setToastMessage("Przywrócono domyślny motyw wizualny.");
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Toggle between Short Punchy Caption vs Deep Stoic Breakdown
  const handleCaptionStyleToggle = (style: "short" | "deep") => {
    setCaptionStyle(style);
    if (style === "short") {
      setCaption(activeTemplate.captionShort);
    } else {
      setCaption(activeTemplate.captionDeep);
    }
  };

  // Save Current Setup as User's Default
  const handleSaveAsDefault = () => {
    const preset = {
      duration,
      pacingMode,
      selectedTheme,
      fontFamily,
      fontSize,
      textCase,
      highlightStyle,
      verticalPos,
      captionStyle,
    };
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(preset));
      setToastMessage("✓ Zapisano Twój domyślny styl rolek!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      // ignore
    }
  };

  // 1-Click AI Reel Director (Łamacz algorytmów: Viral 6s loop, 5s hook-payoff, dynamic B-roll cut)
  const handleGenerateAiReel = async () => {
    setIsGeneratingAi(true);
    // Automatyczny losowy dobór kąta stoickiego
    const randomCat = STOIC_CATEGORIES[Math.floor(Math.random() * STOIC_CATEGORIES.length)];
    const chosenCategoryId = randomCat?.id || "sovereign_mindset";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/ghostwrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:
            "Ruthless stoic discipline, sovereign posture, high-leverage focus, psychological power shift",
          format: reelFormat,
          category: chosenCategoryId,
          excludeTitles: seenTitlesRef.current,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        let parsedData = json;
        if (!json.phrases && json.content) {
          try {
            const match = json.content.match(/\{[\s\S]*\}/);
            if (match) parsedData = JSON.parse(match[0]);
          } catch {
            // keep json
          }
        }

        if (
          parsedData.phrases &&
          Array.isArray(parsedData.phrases) &&
          parsedData.phrases.length > 0
        ) {
          const freshTitle = parsedData.title || "Sovereign Mindset Protocol";
          seenTitlesRef.current.push(freshTitle.toLowerCase().replace(/\s+/g, "_"));
          if (seenTitlesRef.current.length > 60) seenTitlesRef.current.shift();

          // Dopasowanie fraz i długości do wybranego formatu
          let finalPhrases = parsedData.phrases;
          if (reelFormat === "viral_loop_6s" && finalPhrases.length > 1) {
            finalPhrases = [finalPhrases.join(" ")];
          } else if (reelFormat === "hook_payoff_5s" && finalPhrases.length > 2) {
            finalPhrases = [finalPhrases[0], finalPhrases.slice(1).join(" ")];
          }

          setPhrases(finalPhrases);

          if (parsedData.duration) {
            setDuration(parsedData.duration as ReelDuration);
          } else {
            if (reelFormat === "viral_loop_6s") setDuration(6);
            else if (reelFormat === "hook_payoff_5s") setDuration(5);
            else if (reelFormat === "dynamic_broll_cut") setDuration(6);
            else setDuration(9);
          }

          const shortC =
            parsedData.captionShort ||
            parsedData.caption ||
            "Walk like a king, or walk like you don't care who the king is. Read caption.";
          const deepC =
            parsedData.captionDeep ||
            `${shortC}\n\n3 sovereign rules for your day:\n1. Never negotiate with weakness.\n2. Execute in complete silence.\n3. Reclaim your internal sovereignty.\n\nSave this reel. Follow @stark_focus.`;

          const validThemes: VisualTheme[] = [
            "obsidian_void",
            "crimson_eclipse",
            "emerald_abyss",
            "carbon_aura",
            "silver_mist",
          ];
          const nextTheme = validThemes.includes(parsedData.suggestedTheme as VisualTheme)
            ? (parsedData.suggestedTheme as VisualTheme)
            : selectedTheme;

          const randBg = getRandomBackgroundScene();
          const dynamicTpl: ReelTemplate = {
            id: `ai_${Date.now()}`,
            format: "three_phases",
            title: freshTitle,
            phrases: finalPhrases,
            captionShort: shortC,
            captionDeep: deepC,
            hashtags: starkHashtags(finalPhrases.join(" ")),
            suggestedTheme: nextTheme,
            suggestedDuration: duration,
            suggestedBackground: parsedData.suggestedBackground || randBg.name,
            backgroundRationale: parsedData.backgroundRationale || randBg.rationale,
          };

          setActiveTemplate(dynamicTpl);
          setCaption(captionStyle === "deep" ? deepC : shortC);
          setHashtags(starkHashtags(dynamicTpl.phrases.join(" ")));
          setSelectedTheme(nextTheme);
          timeRef.current = 0;
          setCurrentTime(0);

          setToastMessage(`✓ Wygenerowano unikalną rolkę: "${freshTitle}"!`);
          setTimeout(() => setToastMessage(null), 2800);
          setIsGeneratingAi(false);
          return;
        }
      }
    } catch {
      // fallback to instant combinatorial matrix
    }

    // Dynamic Combinatorial Matrix Fallback (Zero duplicates, 28,000+ linked stoic formulas)
    const formula = getRandomUniqueFormula("three_phases", chosenCategoryId, seenTitlesRef.current);
    seenTitlesRef.current.push(formula.title.toLowerCase().replace(/\s+/g, "_"));
    if (seenTitlesRef.current.length > 60) seenTitlesRef.current.shift();

    let fallbackPhrases = formula.phrases;
    if (reelFormat === "viral_loop_6s") {
      fallbackPhrases = [
        formula.phrases[0] || "Walk like a king, or walk like you don't care who the king is.",
      ];
      setDuration(6);
    } else if (reelFormat === "hook_payoff_5s") {
      fallbackPhrases = [formula.phrases[0], formula.phrases[formula.phrases.length - 1]];
      setDuration(5);
    } else {
      setDuration(9);
    }

    setActiveTemplate(formula);
    setPhrases(fallbackPhrases);
    setCaption(captionStyle === "deep" ? formula.captionDeep : formula.captionShort);
    setHashtags(starkHashtags(fallbackPhrases.join(" ")));
    setSelectedTheme(formula.suggestedTheme);
    timeRef.current = 0;
    setCurrentTime(0);

    setToastMessage(`✓ Wygenerowano unikalny pomysł: "${formula.title}"!`);
    setTimeout(() => setToastMessage(null), 2800);
    setIsGeneratingAi(false);
  };

  // Copy Caption to Clipboard
  const handleCopyCaption = () => {
    const fullText = `${phrases.join("\n")}\n\n${caption}\n\n${hashtags.join(" ")}`;
    navigator.clipboard.writeText(fullText);
    setToastMessage("✓ Skopiowano opis ze znacznikami do schowka!");
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Balance active phrase to equal lines
  const handleBalancePhrase = (index: number) => {
    const raw = phrases[index] || "";
    const words = raw.replace(/\n+/g, " ").trim().split(/\s+/);
    if (words.length <= 2) return;

    let mid = Math.round(words.length / 2);
    if (mid > 1 && isOrphanWord(words[mid - 1])) mid--;

    const balanced = `${words.slice(0, mid).join(" ")}\n${words.slice(mid).join(" ")}`;
    const copy = [...phrases];
    copy[index] = balanced;
    setPhrases(copy);
    timeRef.current = 0;
  };

  // Render Frame on Canvas (Native Full HD 1080x1920)
  const renderFrame = useCallback(
    (timeSec: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 1080;
      const height = 1920;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const totalDuration = duration;
      const zoomProgress = Math.min(1, Math.max(0, timeSec / totalDuration));
      const isDynamicCut = reelFormat === "dynamic_broll_cut" && timeSec >= totalDuration * 0.48;
      // Ken Burns startuje od 1,02, nie od 1,00: kadr, ktory w pierwszej
      // sekundzie nie drgnie, nie jest hookiem — jest stopklatka.
      // Ostatnie 12% wraca do 1,02, zeby zapetlenie nie bylo widoczne jako skok.
      const loopReturn = Math.max(0, (zoomProgress - 0.88) / 0.12);
      const zoomScale = isDynamicCut
        ? 1.09 + 0.03 * ((timeSec - totalDuration * 0.48) / (totalDuration * 0.52))
        : 1.02 + 0.03 * easeOutCubic(zoomProgress) * (1 - loopReturn);

      // 1. Background: Custom Upload (Image or Video) or Dark Generative Theme with Slow Zoom
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomScale, zoomScale);
      if (isDynamicCut) {
        ctx.rotate(0.008); // Subtelne mikronachylenie przy cięciu kamery
      }
      ctx.translate(-width / 2, -height / 2);

      if (customBgType === "video" && customVideoRef.current) {
        const vid = customVideoRef.current;
        const vidW = vid.videoWidth || 1080;
        const vidH = vid.videoHeight || 1920;
        const scale = Math.max(width / vidW, height / vidH);
        const drawW = vidW * scale;
        const drawH = vidH * scale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;
        ctx.drawImage(vid, drawX, drawY, drawW, drawH);
        // Dark overlay for contrast
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, width, height);
      } else if (customBgType === "image" && customImageRef.current) {
        const img = customImageRef.current;
        const imgW = img.naturalWidth || 1080;
        const imgH = img.naturalHeight || 1920;
        const scale = Math.max(width / imgW, height / imgH);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const drawX = (width - drawW) / 2;
        const drawY = (height - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        // Dark overlay for contrast
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(0, 0, width, height);
      } else if (selectedTheme === "crimson_eclipse") {
        // Crimson Eclipse: Pitch black with deep brooding blood-crimson chiaroscuro eclipse
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.42,
          60,
          width * 0.5,
          height * 0.45,
          height * 0.75,
        );
        bgGrad.addColorStop(0, "#2A0808");
        bgGrad.addColorStop(0.25, "#150404");
        bgGrad.addColorStop(0.55, "#080202");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle celestial eclipse ring behind the text focal point
        const ringGrad = ctx.createLinearGradient(0, height * 0.28, 0, height * 0.58);
        ringGrad.addColorStop(0, "rgba(220, 38, 38, 0.18)");
        ringGrad.addColorStop(0.5, "rgba(153, 27, 27, 0.05)");
        ringGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.43, 340, 0, Math.PI * 2);
        ctx.stroke();
      } else if (selectedTheme === "emerald_abyss") {
        // Emerald Abyss: Deep dark jade void with cold stoic granite undertone
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.44,
          80,
          width * 0.5,
          height * 0.48,
          height * 0.8,
        );
        bgGrad.addColorStop(0, "#081E15");
        bgGrad.addColorStop(0.3, "#04110C");
        bgGrad.addColorStop(0.65, "#020705");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle vertical jade light shaft
        const shaftGrad = ctx.createLinearGradient(width * 0.5 - 140, 0, width * 0.5 + 140, 0);
        shaftGrad.addColorStop(0, "rgba(16, 185, 129, 0)");
        shaftGrad.addColorStop(0.5, "rgba(52, 211, 153, 0.07)");
        shaftGrad.addColorStop(1, "rgba(16, 185, 129, 0)");
        ctx.fillStyle = shaftGrad;
        ctx.fillRect(width * 0.5 - 140, 0, 280, height);
      } else if (selectedTheme === "carbon_aura") {
        // Carbon Aura: Velvet anthracite with subtle warm-cold golden ember glow
        const bgGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.43,
          90,
          width * 0.5,
          height * 0.45,
          height * 0.8,
        );
        bgGrad.addColorStop(0, "#1F1A15");
        bgGrad.addColorStop(0.35, "#100E0C");
        bgGrad.addColorStop(0.7, "#080706");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Subtle elliptical golden ember halo behind center
        const haloGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.43,
          10,
          width * 0.5,
          height * 0.43,
          320,
        );
        haloGrad.addColorStop(0, "rgba(217, 119, 6, 0.08)");
        haloGrad.addColorStop(0.5, "rgba(180, 83, 9, 0.03)");
        haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = haloGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (selectedTheme === "silver_mist") {
        // Silver Mist: Deep atmospheric midnight slate with layered volumetric mist & silver horizon rim
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, "#080A0D");
        bgGrad.addColorStop(0.35, "#101418");
        bgGrad.addColorStop(0.65, "#0A0D10");
        bgGrad.addColorStop(1, "#030405");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 1. Volumetric horizontal silver mist band at center
        const mistCenterY = height * 0.43;
        const mistBand = ctx.createLinearGradient(0, mistCenterY - 300, 0, mistCenterY + 300);
        mistBand.addColorStop(0, "rgba(200, 215, 230, 0)");
        mistBand.addColorStop(0.25, "rgba(215, 228, 242, 0.035)");
        mistBand.addColorStop(0.5, "rgba(235, 245, 255, 0.08)");
        mistBand.addColorStop(0.75, "rgba(215, 228, 242, 0.035)");
        mistBand.addColorStop(1, "rgba(200, 215, 230, 0)");
        ctx.fillStyle = mistBand;
        ctx.fillRect(0, mistCenterY - 300, width, 600);

        // 2. Soft elliptical radiant silver core behind the central text area
        const radiantCore = ctx.createRadialGradient(
          width * 0.5,
          mistCenterY,
          20,
          width * 0.5,
          mistCenterY,
          width * 0.7,
        );
        radiantCore.addColorStop(0, "rgba(240, 246, 255, 0.09)");
        radiantCore.addColorStop(0.4, "rgba(180, 200, 220, 0.035)");
        radiantCore.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = radiantCore;
        ctx.fillRect(0, 0, width, height);

        // 3. Diffused atmospheric mist clouds
        const cloud1 = ctx.createRadialGradient(
          width * 0.28,
          mistCenterY - 70,
          15,
          width * 0.28,
          mistCenterY - 70,
          width * 0.45,
        );
        cloud1.addColorStop(0, "rgba(225, 235, 248, 0.05)");
        cloud1.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = cloud1;
        ctx.fillRect(0, mistCenterY - 250, width * 0.7, 360);

        const cloud2 = ctx.createRadialGradient(
          width * 0.72,
          mistCenterY + 60,
          15,
          width * 0.72,
          mistCenterY + 60,
          width * 0.48,
        );
        cloud2.addColorStop(0, "rgba(225, 235, 248, 0.045)");
        cloud2.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = cloud2;
        ctx.fillRect(width * 0.3, mistCenterY - 150, width * 0.7, 360);

        // 4. Razor-thin platinum horizon hairline with feathered lateral dissipation
        const horizonGrad = ctx.createLinearGradient(0, 0, width, 0);
        horizonGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
        horizonGrad.addColorStop(0.2, "rgba(225, 235, 250, 0.05)");
        horizonGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.16)");
        horizonGrad.addColorStop(0.8, "rgba(225, 235, 250, 0.05)");
        horizonGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(width * 0.08, mistCenterY - 1, width * 0.84, 2);
      } else {
        // Pure monumental black (Domyślne tło: czyste, głębokie czarne tło monumentalne)
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore(); // end slow zoom

      // 2. Cinematic Edge Vignette
      const vignette = ctx.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0.84)");
      vignette.addColorStop(0.18, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.82, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.92)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // 2b. Ziarno. Plaska czerń wygląda jak tło z generatora grafik — to ona
      // sprawia, że materiał wygląda na wypluty, a nie nagrany. Seed idzie po
      // numerze klatki, więc ziarno żyje, ale nie skacze między odtworzeniami.
      ctx.save();
      let grainState = (Math.floor(timeSec * 24) + 1) * 2654435761;
      ctx.fillStyle = "rgba(248, 250, 252, 0.055)";
      for (let i = 0; i < 700; i++) {
        grainState = (Math.imul(grainState, 1664525) + 1013904223) | 0;
        const x = ((grainState >>> 8) / 16777216) * width;
        grainState = (Math.imul(grainState, 1664525) + 1013904223) | 0;
        const y = ((grainState >>> 8) / 16777216) * height;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();

      // 3. Kinowa typografia: wybrane pismo i marginesy
      let selectedFont = '"Cormorant Garamond", "Cormorant", Georgia, serif';
      if (fontFamily === "cinzel") {
        selectedFont = '"Cinzel", "Times New Roman", Georgia, serif';
      } else if (fontFamily === "sans") {
        selectedFont = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
      } else if (fontFamily === "inter") {
        selectedFont = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
      } else if (fontFamily === "cormorant") {
        selectedFont = '"Cormorant Garamond", "Cormorant", Georgia, serif';
      }

      // Szerokość tekstu dopasowana do marginesu (1080 * 0.12 = 130px z lewej i prawej => max text width = 820px)
      // Jedna zrodlo liczb dla kadra: to samo, po czym rysujemy przewodnik
      // stref, trzyma teraz tekst i handle.
      const band = safeBand(height, width, true);
      const leftMargin = band.side;
      const maxTextWidth = width - band.side * 2;

      // 4. Frazy wchodzą i ZOSTAJĄ. Wcześniej każda gasła po swojej sekundzie,
      // więc trzy zdania zachowywały się jak migawka. Bieżąca odsłania się
      // maską lewo->prawo w 0,28 s, poprzednie ściemniają pod nią do 28%.
      // Maska, nie słowo-po-słowie: karaoke bez lektora irytuje.
      let visible: { text: string; opacity: number; reveal: number }[];
      const timeline =
        phrases.length > 1 ? getPhraseTimeline(phrases, totalDuration, pacingMode) : [];

      if (phrases.length <= 1) {
        visible = [{ text: phrases[0] || "", opacity: 1, reveal: 1 }];
      } else if (timeSec >= totalDuration - 0.4) {
        // Szew pętli: ostatnie 0,4 s pokazuje dokładnie to, co klatka zero.
        visible = [{ text: timeline[0].text, opacity: 1, reveal: 1 }];
      } else {
        let active = 0;
        for (let i = 0; i < timeline.length; i++) {
          if (timeSec >= timeline[i].start) active = i;
        }
        visible = timeline.slice(Math.max(0, active - 2), active + 1).map((item, idx, arr) => {
          const isLast = idx === arr.length - 1;
          const age = timeSec - item.start;
          return {
            text: item.text,
            // Pierwszy kadr jest czytelny od zera: decyzja o przewinięciu
            // zapada po ~1,7 s, a fade od zera znaczy czarny ekran.
            opacity: isLast ? (item.index === 0 ? 1 : Math.min(1, age / 0.12)) : 0.28,
            reveal: isLast && item.index > 0 ? easeOutCubic(age / 0.28) : 1,
          };
        });
      }

      const blocks = visible
        .filter((entry) => entry.text.trim() !== "")
        .map((entry) => ({
          ...entry,
          layout: layoutLines(entry.text, ctx, maxTextWidth, 64, selectedFont),
          reveal: entry.reveal,
        }));

      // Odstęp między BLOKAMI musi być liczony od pełnej linii, nie od jej
      // środka do środka następnej — 30 px przy ~80 px linii sprawiało, że
      // zdania wchodziły na siebie i robiły się nieczytelne.
      const blockGap = 28;
      const blockHeights = blocks.map(
        (block) => block.layout.lines.length * block.layout.lineHeight,
      );
      const totalH =
        blockHeights.reduce((sum, h) => sum + h, 0) + blockGap * Math.max(0, blocks.length - 1);

      ctx.save();
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
      ctx.shadowBlur = 16;

      // Kolumna trzyma się środka bezpiecznego pasa, nie magicznego 0,42.
      let cursorY = bandCenter(band) - totalH / 2;
      let accentUsed = false;

      blocks.forEach((block, blockIdx) => {
        const { lines, fontSize, lineHeight } = block.layout;
        ctx.globalAlpha = block.opacity;
        if (block.reveal < 1) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, cursorY - lineHeight, width * block.reveal, lineHeight * (lines.length + 1));
          ctx.clip();
        }
        // Pomiar i rysowanie na tym samym kroju — inaczej słowa wchodzą na siebie.
        ctx.font = `600 ${fontSize}px ${selectedFont}`;
        const spaceW = ctx.measureText(" ").width;

        lines.forEach((line, lIdx) => {
          const lineY = cursorY + lineHeight / 2 + lIdx * lineHeight;
          let curX = leftMargin;
          line.tokens.forEach((tok) => {
            // Jeden akcent na kadr: *słowo* w tekście rolki łapie karmazyn,
            // reszta zostaje kością. Bez tego wyróżniony był cały wers.
            const accent = tok.isKeyword && !accentUsed;
            if (accent) accentUsed = true;
            ctx.fillStyle = accent ? BRAND_ACCENT : "#F8FAFC";
            ctx.fillText(tok.raw, curX, lineY);
            curX += ctx.measureText(tok.raw).width + spaceW;
          });
        });

        if (block.reveal < 1) ctx.restore();
        cursorY += blockHeights[blockIdx] + blockGap;
      });

      ctx.restore();

      // 5. Handle tuż nad strefą, którą platforma zakrywa opisem i komentarzami.
      // Wcześniej stał na 0,88 wysokości, czyli dokładnie w pasie oznaczonym
      // przez nasz własny przewodnik na czerwono.
      ctx.save();
      ctx.font = `400 24px ${selectedFont}`;
      ctx.fillStyle = "rgba(248, 250, 252, 0.45)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("@stark_focus", leftMargin, band.bottom - 30);
      ctx.restore();

      // 6. ZERO LOOP BAR: Clean monumental canvas.

      // 7. Optional TikTok Safe Zone UI overlay (Preview only)
      if (showTikTokGuides && !isExportingRef.current) {
        ctx.save();
        // Przewodnik rysuje TE same liczby, które trzymają tekst i handle.
        const scale = height / 1920;
        const topEdge = Math.round(REEL_SAFE.top * scale);
        const bottomEdge = band.bottom;
        const sideEdge = Math.round(REEL_SAFE.side * scale);

        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.fillRect(0, 0, width, topEdge);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, topEdge);
        ctx.lineTo(width, topEdge);
        ctx.stroke();

        ctx.fillStyle = "#F87171";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GÓRNY PASEK PLATFORMY", width / 2, topEdge / 2);

        // Right Action Icons
        ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
        ctx.fillRect(
          width - sideEdge,
          Math.round(height * 0.36),
          sideEdge,
          Math.round(height * 0.47),
        );
        ctx.fillText("SIDEBAR", width - sideEdge / 2, Math.round(height * 0.6));

        // Bottom Caption Danger Zone
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.fillRect(0, bottomEdge, width, height - bottomEdge);
        ctx.beginPath();
        ctx.moveTo(0, bottomEdge);
        ctx.lineTo(width, bottomEdge);
        ctx.stroke();
        ctx.fillText(
          "DOLNA STREFA (OPIS, DŹWIĘK, PROFIL)",
          width / 2,
          bottomEdge + (height - bottomEdge) / 2,
        );
        ctx.restore();
      }
    },
    [
      customBgType,
      selectedTheme,
      showTikTokGuides,
      phrases,
      reelFormat,
      duration,
      fontFamily,
      pacingMode,
    ],
  );

  // Pętla podglądu w czasie rzeczywistym (taktowana requestAnimationFrame)
  useEffect(() => {
    let lastStamp = performance.now();
    let lastShown = -1;

    const loop = (stamp: number) => {
      const delta = (stamp - lastStamp) / 1000;
      lastStamp = stamp;

      if (isExportingRef.current) {
        animationFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      if (isPlayingRef.current) {
        timeRef.current += delta;
        if (timeRef.current >= duration) {
          timeRef.current = 0;
        }
      }

      // Re-render Reacta 60 razy na sekundę zjadał klatki dokładnie na
      // przejściach, więc etykieta czasu odświeża się co 0,1 s.
      const shown = Math.round(timeRef.current * 10) / 10;
      if (shown !== lastShown) {
        lastShown = shown;
        setCurrentTime(shown);
      }
      renderFrame(timeRef.current);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [duration, renderFrame]);

  // Export rolki: nagranie z canvasu 1080x1920 w 30 FPS (mp4 albo webm, zależnie od
  // przeglądarki) — zegarmistrzowski czas 1:1, bez podwajania, bez ścieżki dźwiękowej
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // `duration` bywa podsunięty przez AI ("8s", 999, NaN). Gdy nie jest liczbą,
    // warunek końcowy pętli poniżej nigdy nie zachodzi, a MediaRecorder nagrywa
    // w nieskończoność i dokłada chunki do pamięci.
    const totalDur = Number(duration);
    if (!Number.isFinite(totalDur) || totalDur < 1 || totalDur > 60) {
      setToastMessage("Czas trwania rolki jest poza zakresem 1-60 s — nie ma czego nagrać.");
      setTimeout(() => setToastMessage(null), 3500);
      return;
    }

    isExportingRef.current = true;
    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    try {
      // FIX BŁĘDU PODWAJANIA DŁUGOŚCI ROLKI:
      // W silnikach Chromium (Chrome/Edge/Brave) CanvasCaptureMediaStreamTrack przy taktowaniu
      // wyższym niż 30 fps indeksuje klatki w kontenerze z domyślnym czasem 33,3 ms (30 fps),
      // co powodowało odtwarzanie w zwolnionym tempie (0.5x) i podwajało czas trwania z np. 7s do 14s.
      // Standardem platform wertykalnych (Instagram Reels, TikTok, YouTube Shorts) jest 30 FPS,
      // więc stałe taktowanie captureStream(30) z bitrate 18 Mbps gwarantuje:
      // 1. Idealny czas trwania 1:1 (film 7s ma dokładnie 7.00s na każdym odtwarzaczu i w social media).
      // 2. Maksymalną ostrość typografii i brak zacinania.
      // Strumień z canvasu jest wyłącznie wideo — dlatego na liście nie ma kodka audio, a eksport
      // nie ma ścieżki dźwiękowej (dźwięk dodaje się w aplikacji social media).
      const stream = canvas.captureStream(30);

      // Dźwięk składamy w kodzie, nie z pliku: aplikacja jest lokalna, bez
      // konta i bez prawa do bibliotek platformowych (konto firmowe dostaje
      // tylko próbkę komercyjną). Render jest deterministyczny, więc ten sam
      // kadr brzmi identycznie przy każdym eksporcie.
      let audioCtx: AudioContext | null = null;
      let audioSource: AudioBufferSourceNode | null = null;
      if (reelAudioEnabled) {
        try {
          const bed = await renderReelBed({
            durationSec: totalDur,
            beatTimes: beatTimesFrom(getPhraseTimeline(phrases, totalDur, pacingMode)),
          });
          audioCtx = new AudioContext();
          audioSource = audioCtx.createBufferSource();
          audioSource.buffer = bed;
          const out = audioCtx.createMediaStreamDestination();
          audioSource.connect(out);
          for (const track of out.stream.getAudioTracks()) stream.addTrack(track);
        } catch (err) {
          console.error("Bed dźwiękowy nie powstał, nagrywamy bez niego:", err);
          void audioCtx?.close();
          audioCtx = null;
          audioSource = null;
        }
      }

      const mimeTypes = audioSource
        ? [
            'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
            "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
            "video/mp4",
            'video/webm;codecs="vp9,opus"',
            "video/webm;codecs=vp9,opus",
            "video/webm",
          ]
        : [
            "video/mp4;codecs=avc1.42E01E",
            "video/mp4;codecs=avc1",
            "video/mp4",
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
          ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";
      // Firefox/Safari wybierają z listy webm — plik .mp4 z bajtami webm nie da się otworzyć.
      const extension = selectedMime.includes("mp4") ? "mp4" : "webm";

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 18000000,
      });

      // Canvas capture track żyje dopóki go nie zamkniemy — bez tego każda
      // kolejna eksport zostawia w karcie aktywny strumień.
      const releaseStream = () => {
        stream.getTracks().forEach((track) => track.stop());
        try {
          audioSource?.stop();
        } catch {
          // już zatrzymany przez odtworzenie do końca bufora
        }
        void audioCtx?.close();
      };

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => {
        console.error("Błąd MediaRecorder:", recorder.state);
        releaseStream();
        isExportingRef.current = false;
        setIsExporting(false);
        setToastMessage("Nagrywanie przerwane przez przeglądarkę.");
        setTimeout(() => setToastMessage(null), 3500);
      };

      recorder.onstop = () => {
        releaseStream();
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stark_reel_1080x1920_${totalDur}s_${selectedTheme}_${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Synchroniczne revoke() kasuje pobieranie w Firefox/Safari — pobieranie
        // startuje asynchronicznie i potrzebuje adresu jeszcze przez chwilę.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);

        isExportingRef.current = false;
        setIsExporting(false);
        setIsPlaying(true);
        setToastMessage(`✓ Rolka 1080x1920 pobrana! Dokładny czas trwania: ${totalDur}.00s`);
        setTimeout(() => setToastMessage(null), 3000);
      };

      recorder.start();
      // Ten sam takt co nagrywarka: bed startuje w momencie, w którym klatka
      // zero idzie do pliku, więc uderzenia trafiają w grzbiety fraz.
      try {
        audioSource?.start();
      } catch (err) {
        console.error("Nie udało się wystartować ścieżki dźwiękowej:", err);
      }

      const startTime = performance.now();

      // Zabezpieczenie po czasie zegara ściennego: ukryta albo zamrożona karta
      // przestaje dostawać requestAnimationFrame, a nagrywarka leci dalej — bez
      // tego kill switcha plik rósłby w nieskończoność z jedną zamrożoną klatką.
      const killSwitch = setTimeout(
        () => {
          if (recorder.state === "recording") recorder.stop();
        },
        totalDur * 1000 + 5000,
      );

      const stopRecording = () => {
        clearTimeout(killSwitch);
        setTimeout(() => {
          try {
            if (recorder.state === "recording") recorder.stop();
          } catch (e) {
            console.error(e);
          }
        }, 150);
      };

      const step = (stamp: number) => {
        const elapsed = (stamp - startTime) / 1000;
        if (elapsed >= totalDur) {
          // Ostatnia klatka tuż przed końcem fade-outu — inaczej film urywa się
          // czarnym kadrze bez tekstu.
          renderFrame(Math.max(0, totalDur - 1 / 30));
          setExportProgress(100);
          stopRecording();
          return;
        }

        renderFrame(elapsed);
        setExportProgress(Math.min(99, Math.round((elapsed / totalDur) * 100)));
        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    } catch (err) {
      console.error("Recording error:", err);
      isExportingRef.current = false;
      setIsExporting(false);
      setIsPlaying(true);
      setToastMessage("Błąd nagrywania wideo. Spróbuj pobrać klatkę PNG.");
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Export Still Frame PNG (Full HD 1080x1920)
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `stark_reel_frame_1080x1920_${Date.now()}.png`;
    a.click();
  };

  const studioBody = (
    <div
      className={`relative w-full ${
        embedded ? "min-h-[85vh]" : "max-w-6xl max-h-[95vh]"
      } bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-neutral-200 select-none`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-white text-black font-mono text-xs font-black tracking-wider shadow-2xl flex items-center gap-2 border border-neutral-300">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-[#0E0E0E]">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-white/10 text-white border border-white/20">
            <Film className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              AUTOMONTAŻYSTA ROLEK // DARK STOIC ENGINE (1080x1920)
            </h2>
            <p className="text-[11px] text-neutral-400 font-mono">
              1080x1920 Full HD • 30 FPS • Czysty monumentalny kadr • Slow Zoom & Chiaroscuro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAsDefault}
            className="px-2.5 py-1.5 rounded-lg bg-[#141414] hover:bg-white hover:text-black text-neutral-300 border border-white/10 hover:border-white text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Zapisz aktualny czas, czcionkę, motyw i pozycję jako domyślne"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Zapisz mój styl</span>
          </button>

          {!embedded && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Zamknij studio"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace: Left 9:16 Stage + Right Director Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-4 sm:p-5 flex-1 overflow-y-auto">
        {/* Left: 9:16 Live Canvas Player */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#050505] border border-white/10 rounded-xl p-3 sm:p-4">
          <div className="relative w-full max-w-[270px] sm:max-w-[290px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/15 bg-black">
            <canvas ref={canvasRef} className="w-full h-full object-cover" />

            {/* Stopwatch & Phrase HUD */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/80 border border-white/20 font-mono text-[10px] text-white font-bold backdrop-blur-sm flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-neutral-300" />
              <span>{currentTime.toFixed(2)}s</span>
              <span className="text-neutral-500">/ {duration}.00s</span>
              {phrases.length > 1 && (
                <span
                  className={`ml-0.5 pl-1.5 border-l border-white/20 text-[9px] ${
                    activeTimeline[currentPhraseIndex]?.isClimax && pacingMode === "climax_hold"
                      ? "text-rose-300 font-black"
                      : "text-neutral-300"
                  }`}
                >
                  F{currentPhraseIndex + 1}/{phrases.length}
                  {activeTimeline[currentPhraseIndex]?.isClimax &&
                    pacingMode === "climax_hold" &&
                    " "}
                </span>
              )}
            </div>

            {/* Duration Badge */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[9px] text-white font-bold backdrop-blur-sm uppercase">
              {duration}.0s • Full HD
            </div>
          </div>

          {/* Playback Controls & Time Scrub */}
          <div className="w-full max-w-[290px] mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded bg-white hover:bg-neutral-200 text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex-1 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Pauza
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Odtwórz
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowTikTokGuides(!showTikTokGuides)}
                className={`px-2.5 py-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                  showTikTokGuides
                    ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
                    : "bg-[#141414] border-white/10 text-neutral-400 hover:text-white"
                }`}
                title="Włącz siatkę bezpiecznych stref TikToka / Reels"
              >
                <Smartphone className="w-3.5 h-3.5" />
                TikTok UI
              </button>

              <button
                type="button"
                onClick={() => setReelAudioEnabled(!reelAudioEnabled)}
                className={`px-2.5 py-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                  reelAudioEnabled
                    ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
                    : "bg-[#141414] border-white/10 text-neutral-400 hover:text-white"
                }`}
                title="Dodaj do eksportu proceduralny bed: dron basowy i uderzenia na grzbietach fraz"
              >
                <Volume2 className="w-3.5 h-3.5" />
                {reelAudioEnabled ? "Dźwięk w pliku" : "Bez dźwięku"}
              </button>
            </div>

            {/* Scrub Slider */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="0"
                max={duration}
                step="0.05"
                value={currentTime}
                onChange={(e) => {
                  const t = parseFloat(e.target.value);
                  timeRef.current = t;
                  setCurrentTime(t);
                  renderFrame(t);
                }}
                className="w-full h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-white"
              />

              {/* Multi-segment Pacing Track */}
              {phrases.length > 1 && (
                <div className="w-full flex items-center gap-1 h-1.5 rounded-full overflow-hidden bg-[#161616] p-0.5 border border-white/10">
                  {activeTimeline.map((seg, sIdx) => {
                    const isCurrentSeg = currentPhraseIndex === sIdx;
                    const widthPct = (seg.duration / duration) * 100;
                    return (
                      <div
                        key={sIdx}
                        style={{ width: `${widthPct}%` }}
                        title={`Fraza ${sIdx + 1}: ${seg.duration.toFixed(1)}s (${seg.start.toFixed(1)}s – ${seg.end.toFixed(1)}s)`}
                        className={`h-full rounded-sm transition-all ${
                          isCurrentSeg
                            ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                            : seg.isClimax && pacingMode === "climax_hold"
                              ? "bg-rose-400/40"
                              : "bg-white/20"
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Director Controls & Quick Editor */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Automontażysta rolek: Wybór formatu pod algorytmy + Generowanie AI */}
          <div className="p-4 rounded-xl bg-[#111111] border border-white/10 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                    Automontażysta Rolek:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-black text-[9px] font-mono font-black uppercase tracking-wider">
                    {duration}.0s •{" "}
                    {reelFormat === "viral_loop_6s"
                      ? "Pętla 200% Retencji"
                      : reelFormat === "hook_payoff_5s"
                        ? "Wstrząs & Puenta"
                        : reelFormat === "dynamic_broll_cut"
                          ? "Cięcie B-Roll"
                          : "3 Fazy"}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-4 h-4 text-white" />
                  Formaty łamiące algorytmy (Viral Architecture)
                </h3>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiReel}
                disabled={isGeneratingAi}
                className="w-full sm:w-auto px-5 py-3 rounded-lg bg-white hover:bg-neutral-200 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-white/10 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {isGeneratingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Montowanie...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generuj rolkę AI
                  </>
                )}
              </button>
            </div>

            {/* Wybór Formatu Wiralowego */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-white/5">
              {[
                {
                  id: "viral_loop_6s" as ViralReelFormat,
                  dur: 6 as ReelDuration,
                  name: "Pętla 6s",
                  badge: "200%+ Retencji",
                  desc: "1 Zdanie w pętli",
                },
                {
                  id: "hook_payoff_5s" as ViralReelFormat,
                  dur: 5 as ReelDuration,
                  name: "Wstrząs 5s",
                  badge: "2 Szybkie Takty",
                  desc: "Hook (0-2s) ➔ Puenta (2-5s)",
                },
                {
                  id: "dynamic_broll_cut" as ViralReelFormat,
                  dur: 6 as ReelDuration,
                  name: "B-Roll Cut",
                  badge: "Cięcie Kamery",
                  desc: "Zmiana kąta przy puencie",
                },
                {
                  id: "three_phases" as ViralReelFormat,
                  dur: 9 as ReelDuration,
                  name: "3 Fazy 9s",
                  badge: "Klasyczny",
                  desc: "Hook ➔ Prawda ➔ Puenta",
                },
                {
                  id: "five_beats_20s" as ViralReelFormat,
                  dur: 20 as ReelDuration,
                  name: "5 Taktów 20s",
                  badge: "Długi oddech",
                  desc: "Zdanie po zdaniu, pętla bez szwu",
                },
              ].map((fmt) => {
                const isCurrent = reelFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setReelFormat(fmt.id);
                      setDuration(fmt.dur);
                      if (fmt.id === "viral_loop_6s") {
                        if (phrases.length > 1) {
                          setPhrases([phrases[0]]);
                        }
                      } else if (fmt.id === "hook_payoff_5s") {
                        if (phrases.length === 1) {
                          setPhrases([phrases[0], "You just stopped feeding their noise."]);
                        } else if (phrases.length > 2) {
                          setPhrases([phrases[0], phrases[phrases.length - 1]]);
                        }
                      }
                      timeRef.current = 0;
                      setCurrentTime(0);
                    }}
                    className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-white text-black border-white shadow-md font-bold"
                        : "bg-[#161616] border-white/10 text-neutral-400 hover:text-white hover:border-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-black">{fmt.name}</span>
                      <span
                        className={`text-[8px] font-mono px-1 py-0.2 rounded uppercase ${
                          isCurrent
                            ? "bg-black/10 text-black font-bold"
                            : "bg-white/10 text-neutral-300"
                        }`}
                      >
                        {fmt.badge}
                      </span>
                    </div>
                    <div
                      className={`text-[9px] font-mono mt-1 truncate ${
                        isCurrent ? "text-neutral-700" : "text-neutral-500"
                      }`}
                    >
                      {fmt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tło (Własne media / Prompt 9:16) & Typografia */}
          <div className="bg-[#111111] p-3 rounded-xl border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono font-bold uppercase text-neutral-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-neutral-300" />
                Tło rolki (Własne wideo / foto):
              </label>

              {/* Custom Background Upload Button */}
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="custom-bg-upload"
                />
                <label
                  htmlFor="custom-bg-upload"
                  className="px-2.5 py-1 rounded bg-[#181818] hover:bg-white hover:text-black text-neutral-300 text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-white/10 hover:border-white"
                  title="Prześlij własne wideo lub grafikę w tle"
                >
                  <Upload className="w-3 h-3" />
                  Wgraj tło (Wideo / Foto)
                </label>

                {customBgType !== "none" && (
                  <button
                    type="button"
                    onClick={handleClearCustomBg}
                    className="p-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer border border-rose-500/30"
                    title="Usuń własne tło"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Custom background active notice */}
            {customBgType !== "none" && (
              <div className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/15 flex items-center justify-between text-[10px] font-mono text-neutral-300">
                <span className="flex items-center gap-1.5 truncate">
                  <ImageIcon className="w-3 h-3 text-white" />
                  Aktywne własne tło ({customBgType === "video" ? "Wideo" : "Grafika"}):{" "}
                  <strong className="text-white truncate max-w-[200px]">{customBgName}</strong>
                </span>
                <span className="text-[9px] text-emerald-400 uppercase">[Aktywne]</span>
              </div>
            )}

            {/* Rekomendacja promptu AI do tła */}
            {(() => {
              const bgInfo =
                activeTemplate.suggestedBackground && activeTemplate.backgroundRationale
                  ? {
                      sceneName: activeTemplate.suggestedBackground,
                      rationale: activeTemplate.backgroundRationale,
                      theme: activeTemplate.suggestedTheme,
                    }
                  : CATEGORY_BACKGROUND_RECOMMENDATIONS[selectedCategory] ||
                    CATEGORY_BACKGROUND_RECOMMENDATIONS.discipline_vs_motivation;

              const matchingExpanded = EXPANDED_BACKGROUND_LIBRARY.find(
                (b) =>
                  b.name.toLowerCase() === bgInfo.sceneName.toLowerCase() ||
                  b.id === bgInfo.sceneName,
              );

              const matchingCategoryRec =
                Object.values(CATEGORY_BACKGROUND_RECOMMENDATIONS).find(
                  (r) => r.sceneName === bgInfo.sceneName,
                ) ||
                CATEGORY_BACKGROUND_RECOMMENDATIONS[selectedCategory] ||
                CATEGORY_BACKGROUND_RECOMMENDATIONS.discipline_vs_motivation;

              const activePrompt =
                matchingExpanded?.bingPrompt ||
                matchingCategoryRec?.bingPrompt ||
                `Ultra-minimalist dark stoic composition, ${bgInfo.sceneName}, cinematic moody lighting, raw texture, 8k vertical 9:16 format, no text, no watermark`;

              return (
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#181818] via-[#141414] to-[#0E0E0E] border border-rose-500/30 space-y-2 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs"></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase text-rose-400 tracking-wider">
                            Sugerowane ujęcie w tle:
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-neutral-400">
                            Baza 100+ ujęć
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white font-mono">
                          {bgInfo.sceneName}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const randScene = getRandomBackgroundScene();
                          setActiveTemplate((prev) => ({
                            ...prev,
                            suggestedBackground: randScene.name,
                            backgroundRationale: randScene.rationale,
                            suggestedTheme: randScene.theme,
                          }));
                          setSelectedTheme(randScene.theme);
                          setToastMessage(` Wylosowano nowe ujęcie: ${randScene.name}`);
                          setTimeout(() => setToastMessage(null), 2500);
                        }}
                        className="px-2 py-1 rounded bg-[#202020] hover:bg-white hover:text-black text-neutral-300 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                        title="Wylosuj inne z ponad 100 unikalnych ujęć"
                      >
                        <Sparkles className="w-3 h-3 text-rose-400" />
                        <span>Losuj inne (100+)</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          // `writeText` odpalony bez czekania i bez kopii
                          // zapasowej udawał sukces, kiedy karta straciła fokus
                          // albo clipboard nie był dostępny — nic nie wpadało
                          // do schowka, a użytkownik widział „✓ skopiowano".
                          try {
                            await navigator.clipboard.writeText(activePrompt);
                            setToastMessage("✓ Skopiowano prompt tła (9:16).");
                          } catch {
                            setToastMessage(
                              "Nie udało się skopiować — prompt jest pod przyciskiem, zaznacz go ręcznie.",
                            );
                          }
                          setTimeout(() => setToastMessage(null), 2500);
                        }}
                        className="px-2.5 py-1 rounded bg-[#202020] hover:bg-rose-400 hover:text-black text-rose-200 text-[10px] font-mono font-bold border border-rose-500/30 hover:border-rose-400 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Skopiuj gotowy prompt do wygenerowania tego tła w Bing Image Creator / Midjourney"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Kopiuj prompt AI tła (9:16)</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                    <strong>Dlaczego to pasuje:</strong> {bgInfo.rationale}
                  </p>
                </div>
              );
            })()}

            {/* Czcionka i Czas trwania */}
            <div className="pt-2.5 border-t border-white/10 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono">
                <span className="text-neutral-400 font-bold uppercase">
                  Krój pisma (Zatwierdzone czcionki):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "cinzel" as FontFamily, name: "Cinzel Roman" },
                    { id: "sans" as FontFamily, name: "Plus Jakarta" },
                    { id: "inter" as FontFamily, name: "Inter" },
                    { id: "cormorant" as FontFamily, name: "Cormorant" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontFamily(f.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        fontFamily === f.id
                          ? "bg-white text-black font-black shadow-sm"
                          : "bg-[#181818] text-neutral-400 hover:text-white border border-white/10"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Szybka Korekta Tekstu (Tradycyjna wielkość liter, podgląd na żywo) */}
          <div className="bg-[#111111] p-3.5 rounded-xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-white" />
                  Tekst i Fazy Rolki ({duration}s):
                </label>
                <span className="text-[9px] font-mono text-emerald-400 block mt-0.5">
                  {phrases.length === 1
                    ? "1 zdanie w pętli 6s — widz czyta 2 razy, co daje 200% watch-time"
                    : phrases.length === 2
                      ? "2 szybkie takty: Hook (0-2s) ➔ Puenta (2-5s)"
                      : "Klasyczna narracja: Hook ➔ Zasada ➔ Puenta"}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {phrases.length < 4 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhrases([...phrases, "Reclaim your inner sovereignty."]);
                      timeRef.current = 0;
                    }}
                    className="px-2 py-0.5 rounded bg-[#181818] hover:bg-white hover:text-black text-neutral-300 text-[10px] font-mono border border-white/10 transition-all cursor-pointer"
                    title="Dodaj kolejną fazę tekstu"
                  >
                    + Dodaj wers
                  </button>
                )}
                {phrases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhrases(phrases.slice(0, -1));
                      timeRef.current = 0;
                    }}
                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-300 text-[10px] font-mono border border-rose-500/30 transition-all cursor-pointer"
                    title="Usuń ostatnią fazę"
                  >
                    - Usuń wers
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {phrases.map((phrase, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-200">
                        {phrases.length === 1
                          ? "Główny Cytat (Pętla Retencji)"
                          : phrases.length === 2
                            ? idx === 0
                              ? "Takt 1: Hook (Wstrząs & Prowokacja)"
                              : "Takt 2: Puenta (Payoff)"
                            : idx === 0
                              ? "Faza 1: Hook (Wstrząs & Prowokacja)"
                              : idx === 1
                                ? "Faza 2: Prawda Stoicka (Zasada)"
                                : "Faza 3: Puenta Climax (Dyrektywa)"}
                      </span>

                      {activeTimeline[idx] && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 ${
                            currentPhraseIndex === idx
                              ? "bg-white text-black font-bold shadow-sm"
                              : activeTimeline[idx].isClimax && pacingMode === "climax_hold"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold"
                                : "bg-[#181818] text-neutral-400 border border-white/5"
                          }`}
                        >
                          <span>
                            {activeTimeline[idx].start.toFixed(1)}s –{" "}
                            {activeTimeline[idx].end.toFixed(1)}s (
                            {activeTimeline[idx].duration.toFixed(1)}s)
                          </span>
                          {activeTimeline[idx].isClimax && pacingMode === "climax_hold" && (
                            <span className="text-rose-300 font-bold">Zatrzymanie</span>
                          )}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBalancePhrase(idx)}
                      className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-[10px] font-mono font-bold"
                      title="Rozdziel na 2 równe linie bez wiszących spójników"
                    >
                      Zbalansuj linie
                    </button>
                  </div>
                  <textarea
                    rows={phrase.includes("\n") ? 2 : 1}
                    value={phrase}
                    onChange={(e) => {
                      const copy = [...phrases];
                      copy[idx] = e.target.value; // Natural casing preserved
                      setPhrases(copy);
                      timeRef.current = 0;
                    }}
                    className="w-full text-xs font-mono font-bold py-2 px-3 bg-[#181818] border border-white/10 rounded-lg text-white focus:border-white focus:outline-none tracking-wide leading-relaxed resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 5. Gotowy Opis (Caption) & Hashtagi: Krótki vs Głębszy */}
          <div className="bg-[#111111] p-3 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5 text-neutral-300" />
                  Opis (Caption) pod Rolkę:
                </span>
                {/* Przełącznik: Krótki vs Głębszy */}
                <div className="flex items-center bg-[#181818] border border-white/10 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => handleCaptionStyleToggle("short")}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                      captionStyle === "short"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Krótki (Punchy)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCaptionStyleToggle("deep")}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                      captionStyle === "deep"
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Głębszy (3 Lekcje)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyCaption}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white text-white hover:text-black text-[10px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border border-white/20"
              >
                <Copy className="w-3 h-3" />
                Kopiuj Opis
              </button>
            </div>

            <textarea
              rows={captionStyle === "deep" ? 4 : 2}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full text-xs font-mono p-2 bg-[#181818] border border-white/10 rounded text-neutral-300 focus:border-white focus:outline-none resize-none leading-relaxed"
            />

            <div className="text-[10px] font-mono text-neutral-400 px-1 flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>
                Opis nie powiela słów z wideo — dostarcza nową perspektywę i rozwija lekcję pod
                algorytm.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-neutral-400 border border-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 6. Eksport 1080x1920 Full HD (30 FPS, precyzyjny czas 1:1 bez podwajania) */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
              <span>
                Jakość: <strong className="text-white">1080x1920 Full HD</strong> • Klatki:{" "}
                <strong className="text-neutral-300">30 FPS (standard Reels / TikTok)</strong> •
                Czas: <strong className="text-emerald-400">{duration}.00s (Dokładny 1:1)</strong>
              </span>

              {/* captureStream(30) daje sam obraz — plik nie ma ścieżki dźwiękowej. */}
              <span
                className="text-[10px] text-rose-300"
                title="Nagrywarka dostaje wyłącznie strumień z canvasu, więc w pliku nie ma audio."
              >
                bez dźwięku — dodaj go w aplikacji social media
              </span>

              {isExporting && (
                <span className="text-white font-mono font-bold animate-pulse ml-2">
                  [Eksport: {exportProgress}%]
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onSendToPost && (
                <button
                  type="button"
                  onClick={() => onSendToPost(phrases.join("\n"), caption)}
                  className="px-3 py-2 rounded-lg bg-[#181818] hover:bg-white hover:text-black text-white border border-white/20 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Przekaż treść i hook do Generatora Posta (JPG/PNG)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Do Posta</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportZipBundle}
                disabled={isExporting || isExportingZip}
                className="px-3 py-2 rounded-lg bg-[#181818] hover:bg-rose-400 hover:text-black text-rose-300 border border-rose-500/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                title="Pobierz ZIP: 2 klatki PNG (hook + puenta) i plik TXT z opisem posta i hashtagami. Bez pliku wideo — rolkę nagrywa osobny przycisk."
              >
                <Package className="w-3.5 h-3.5" />
                {isExportingZip ? "Pakowanie..." : "Klatki + TXT (ZIP)"}
              </button>

              <button
                type="button"
                onClick={handleExportPng}
                disabled={isExporting}
                className="px-3 py-2 rounded-lg bg-[#181818] hover:bg-[#222222] text-neutral-200 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                title="Pobierz klatkę jako grafikę PNG 1080x1920"
              >
                <Download className="w-3.5 h-3.5" />
                Klatka PNG
              </button>

              <button
                type="button"
                onClick={handleExportVideo}
                disabled={isExporting}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.35)] transition-all cursor-pointer disabled:opacity-50"
                title={`Pobierz wideo w pętli 1080x1920 (30 FPS, ${duration}.00s, bez dźwięku — dodaj go w aplikacji social media)`}
              >
                <Film className="w-4 h-4" />
                {isExporting
                  ? `Eksportowanie (${exportProgress}%)...`
                  : ` Pobierz Rolkę (${duration}s • 30 FPS • ${reelAudioEnabled ? "z bedem" : "bez dźwięku"})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="w-full animate-in fade-in duration-200">{studioBody}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in select-none">
      {studioBody}
    </div>
  );
};
