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
  Type,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
  Upload,
  Trash2,
  Image as ImageIcon,
  Package,
  Split,
  Volume2,
  VolumeX,
  BookOpen,
  Compass,
} from "lucide-react";
import JSZip from "jszip";
import { Post, VaultAsset } from "../types";
import {
  VIRAL_REEL_TEMPLATES,
  NarrativeFormat,
  ReelTemplate,
  ReelVisualTheme,
} from "../data/reelTemplates";
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
import { CodexRule, STARK_CODEX_RULES } from "../data/starkCodex";
import { CINEMATIC_BROLL_LIBRARY } from "../data/brollLibrary";

interface VideoStudioModalProps {
  onClose: () => void;
  initialHook?: string;
  initialBgUrl?: string;
  availablePosts?: Post[];
  vaultAssets?: VaultAsset[];
  onSchedulePostFor1300?: (postData: any) => void;
  onSchedulePost?: (postData: any) => void;
}

import {
  VisualTheme,
  getPhraseTimeline,
  VISUAL_THEMES,
  parseTokens,
  isOrphanWord,
  layoutLines,
} from "./video/reel-helpers";
import { useReelDirector } from "./video/useReelDirector";
import { useTts } from "./video/useTTS";
import { useVariantGenerator } from "./video/useVariantGenerator";
import { ReelStagePreview } from "./video/ReelStagePreview";
import { CodexRulesModal } from "./video/CodexRulesModal";
import { VariantPickerModal } from "./video/VariantPickerModal";

const PRESET_STORAGE_KEY = "stark_reel_default_preset_v2";

export const VideoStudioModal: React.FC<VideoStudioModalProps> = ({
  onClose,
  initialHook,
  initialBgUrl,
}) => {
  // Read saved preset from localStorage if exists
  const director = useReelDirector({ initialHook });

  const {
    duration,
    setDuration,
    pacingMode,
    setPacingMode,
    format,
    setFormat,
    selectedTheme,
    setSelectedTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    textCase,
    setTextCase,
    highlightStyle,
    setHighlightStyle,
    verticalPos,
    setVerticalPos,
    captionStyle,
    setCaptionStyle,
    phrases,
    setPhrases,
    activeTemplate,
    setActiveTemplate,
    caption,
    setCaption,
    hashtags,
    setHashtags,
    toastMessage,
    setToastMessage,
  } = director;

  // 1. Initial State from curated templates
  const initialTpl = initialHook
    ? (VIRAL_REEL_TEMPLATES.find(
        (t) => t.phrases.join(" ").toUpperCase() === initialHook.toUpperCase(),
      ) ?? VIRAL_REEL_TEMPLATES[0])
    : VIRAL_REEL_TEMPLATES[0];

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

  // Playback & Canvas Loop
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showTikTokGuides, setShowTikTokGuides] = useState<boolean>(false);
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const showToast = useCallback(
    (message: string | null) => setToastMessage(message),
    [setToastMessage],
  );

  const applyVariantState = useCallback(
    (variant: any) => {
      setPhrases(variant.phrases);
      setSelectedTheme(variant.theme);
      setDuration(variant.duration || 8);
    },
    [setPhrases, setSelectedTheme, setDuration],
  );

  const {
    isGeneratingVariants,
    multiVariants,
    showVariantsModal,
    setShowVariantsModal,
    handleGenerateMultiVariants,
    handleApplyVariant,
  } = useVariantGenerator({
    getTopic: () => phrases[0] || "Solitude and relentless standards",
    applyVariant: applyVariantState,
    showToast,
  });

  const { enableTts, setEnableTts, speakPhrase, requestSpokenPhrase } = useTts({
    isPlaying,
    currentPhraseIndex,
    phrases,
  });

  // ZERO-CLICK PIPELINE: 3. Auto-dopasowanie kinowego tła B-Roll do fraz
  const [matchedBrollNotice, setMatchedBrollNotice] = useState<string | null>(null);

  const handleAutoMatchBroll = () => {
    const haystack = `${phrases.join(" ")} ${caption}`.toLowerCase();
    let bestScene: (typeof CINEMATIC_BROLL_LIBRARY)[number] | null = null;
    let bestScore = 0;

    for (const scene of CINEMATIC_BROLL_LIBRARY) {
      const score = scene.matchKeywords.reduce(
        (acc, keyword) => (keyword && haystack.includes(keyword.toLowerCase()) ? acc + 1 : acc),
        0,
      );
      if (score > bestScore) {
        bestScore = score;
        bestScene = scene;
      }
    }

    const chosen = bestScene ?? CINEMATIC_BROLL_LIBRARY[0];
    setSelectedTheme(chosen.suggestedTheme);
    setMatchedBrollNotice(`${chosen.name} • ${chosen.ambientVibe}`);
    setToastMessage(
      bestScene
        ? `✓ Dopasowano B-Roll: ${chosen.name}`
        : `✓ Ustawiono domyślne B-Roll: ${chosen.name}`,
    );
    setTimeout(() => setToastMessage(null), 2500);
  };
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // TURNKEY EXPORT: 3. STARK CODEX Integration
  const [showCodexModal, setShowCodexModal] = useState<boolean>(false);

  const handleApplyCodexRule = (rule: CodexRule) => {
    setPhrases([rule.hook0to3s, rule.corePrinciple, rule.actionDirective]);
    setSelectedTheme(rule.suggestedTheme);
    setCaption(
      `${rule.ruleNumber}: ${rule.title}\n\n${rule.rationale}\n\nZasada: ${rule.corePrinciple}`,
    );
    setShowCodexModal(false);
    setToastMessage(`✓ Załadowano Zasadę ${rule.ruleNumber}: ${rule.title}`);
    setTimeout(() => setToastMessage(null), 3000);
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

  // Adjust phrases when changing narrative format
  const handleFormatChange = (newFormat: NarrativeFormat) => {
    setFormat(newFormat);
    const matching = VIRAL_REEL_TEMPLATES.filter((t) => t.format === newFormat);
    if (matching.length > 0) {
      const nextTpl = matching[Math.floor(Math.random() * matching.length)];
      setActiveTemplate(nextTpl);
      setPhrases(nextTpl.phrases);
      setCaption(captionStyle === "deep" ? nextTpl.captionDeep : nextTpl.captionShort);
      setHashtags(nextTpl.hashtags);
      setSelectedTheme(nextTpl.suggestedTheme);
      setDuration(nextTpl.suggestedDuration);
    } else {
      if (newFormat === "single_quote") {
        setPhrases([phrases.join(" ")]);
      } else if (newFormat === "two_phases" && phrases.length !== 2) {
        setPhrases([
          phrases[0] || "They wait for inspiration.",
          phrases[1] || "The stoic works regardless of emotion.",
        ]);
      } else if (newFormat === "three_phases" && phrases.length !== 3) {
        setPhrases([
          phrases[0] || "They want you distracted.",
          phrases[1] || "Because a focused mind is impossible to control.",
          "Execute in total silence.",
        ]);
      } else if (newFormat === "four_phrases" && phrases.length !== 4) {
        setPhrases([
          "Wake up early.",
          "Kill your excuses.",
          "Work in total silence.",
          "Shock them with results.",
        ]);
      }
    }
    timeRef.current = 0;
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

  // 1-Click AI Reel Director (Always in English, Natural sentence case, Deeply linked narrative)
  const handleGenerateAiReel = async () => {
    setIsGeneratingAi(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5500);

      const res = await fetch("/api/ghostwrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Ruthless stoic discipline, solitude, high-leverage focus, modern dark philosophy",
          format,
          category: selectedCategory,
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
          const freshTitle = parsedData.title || "Stoic Sovereign Protocol";
          seenTitlesRef.current.push(freshTitle.toLowerCase().replace(/\s+/g, "_"));
          if (seenTitlesRef.current.length > 60) seenTitlesRef.current.shift();

          setPhrases(parsedData.phrases);
          const shortC =
            parsedData.captionShort ||
            parsedData.caption ||
            "Execute in total silence. Save this reminder.";
          const deepC =
            parsedData.captionDeep ||
            `${shortC}\n\n3 stoic rules to conquer your day:\n1. Wake up without hesitation.\n2. Do the hardest task first.\n3. Hold your standard.\n\nSave this reel. Follow @stark_focus for daily focus.`;

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

          const dynamicTpl: ReelTemplate = {
            id: `ai_${Date.now()}`,
            format,
            title: freshTitle,
            phrases: parsedData.phrases,
            captionShort: shortC,
            captionDeep: deepC,
            hashtags:
              parsedData.hashtags && Array.isArray(parsedData.hashtags)
                ? parsedData.hashtags
                : ["#stoicism", "#discipline", "#focus", "#starkfocus"],
            suggestedTheme: nextTheme,
            suggestedDuration: parsedData.suggestedDuration || duration,
            suggestedBackground: parsedData.suggestedBackground,
            backgroundRationale: parsedData.backgroundRationale,
          };

          setActiveTemplate(dynamicTpl);
          setCaption(captionStyle === "deep" ? deepC : shortC);
          setHashtags(dynamicTpl.hashtags);
          setSelectedTheme(nextTheme);
          if (parsedData.suggestedDuration) setDuration(parsedData.suggestedDuration);
          timeRef.current = 0;
          setCurrentTime(0);

          setToastMessage(`✓ Wygenerowano powiązaną narrację: "${freshTitle}"!`);
          setTimeout(() => setToastMessage(null), 2800);
          setIsGeneratingAi(false);
          return;
        }
      }
    } catch {
      // fallback to instant combinatorial matrix
    }

    // Dynamic Combinatorial Matrix Fallback (Zero duplicates, 28,000+ linked stoic formulas)
    const formula = getRandomUniqueFormula(format, selectedCategory, seenTitlesRef.current);
    seenTitlesRef.current.push(formula.title.toLowerCase().replace(/\s+/g, "_"));
    if (seenTitlesRef.current.length > 60) seenTitlesRef.current.shift();

    setActiveTemplate(formula);
    setPhrases(formula.phrases);
    setCaption(captionStyle === "deep" ? formula.captionDeep : formula.captionShort);
    setHashtags(formula.hashtags);
    setSelectedTheme(formula.suggestedTheme);
    setDuration(formula.suggestedDuration);
    timeRef.current = 0;
    setCurrentTime(0);

    setToastMessage(`✓ Zmontowano z Matrycy Idei: "${formula.title}"!`);
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
      // Subtle cinematic Ken Burns zoom (1.00x -> 1.04x)
      const zoomScale = 1.0 + 0.04 * zoomProgress;

      // 1. Background: Custom Upload (Image or Video) or Dark Generative Theme with Slow Zoom
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoomScale, zoomScale);
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
        // Obsidian Void (Deepest pure black & stardust radial falloff)
        const bgGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          80,
          width / 2,
          height / 2,
          height * 0.8,
        );
        bgGrad.addColorStop(0, "#111111");
        bgGrad.addColorStop(0.45, "#060606");
        bgGrad.addColorStop(1, "#000000");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Ultra-subtle vertical central spine
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(width / 2, height * 0.2);
        ctx.lineTo(width / 2, height * 0.8);
        ctx.stroke();
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

      // 3. Kinetic Phrase Calculation with Dynamic Pacing & Smooth Transitions
      let activeText = "";
      let phraseOpacity = 1;

      if (format === "single_quote" || phrases.length <= 1) {
        activeText = phrases[0] || "";
        // Smooth loop blend edge (first 250ms & last 250ms)
        const edge = 0.25;
        if (timeSec < edge) {
          phraseOpacity = Math.max(0, timeSec / edge);
        } else if (timeSec > totalDuration - edge) {
          phraseOpacity = Math.max(0, (totalDuration - timeSec) / edge);
        } else {
          phraseOpacity = 1;
        }
      } else {
        const timeline = getPhraseTimeline(phrases, totalDuration, pacingMode);
        const activeItem =
          timeline.find((item) => timeSec >= item.start && timeSec < item.end) ||
          timeline[timeline.length - 1];
        activeText = activeItem.text;

        const localTime = timeSec - activeItem.start;
        const itemDur = activeItem.duration;

        // Smooth cinematic fade in & out tailored to item duration and pacing mode
        const fadeDuration =
          pacingMode === "stoic_steady"
            ? Math.min(0.28, itemDur * 0.18)
            : Math.min(0.22, itemDur * 0.15);

        if (localTime < fadeDuration) {
          phraseOpacity = Math.min(1, Math.max(0, localTime / fadeDuration));
        } else if (localTime > itemDur - fadeDuration) {
          phraseOpacity = Math.min(1, Math.max(0, (itemDur - localTime) / fadeDuration));
        } else {
          phraseOpacity = 1;
        }
      }

      // 4. Typography Rendering
      const selectedFont =
        fontFamily === "cinzel"
          ? '"Cinzel", "Times New Roman", Georgia, serif'
          : fontFamily === "cormorant"
            ? '"Cormorant Garamond", Georgia, serif'
            : '"Montserrat", -apple-system, sans-serif';

      const textToLayout = textCase === "uppercase" ? activeText.toUpperCase() : activeText;
      const layout = layoutLines(textToLayout, ctx, 840, fontSize, selectedFont);

      ctx.save();
      ctx.globalAlpha = phraseOpacity;
      // Dynamic vertical position (default: 42% of height)
      const targetY = height * (verticalPos / 100);
      ctx.translate(width / 2, targetY);

      ctx.textBaseline = "middle";

      const totalH = (layout.lines.length - 1) * layout.lineHeight;
      const startY = -totalH / 2;

      layout.lines.forEach((line, lIdx) => {
        const lineY = startY + lIdx * layout.lineHeight;
        const spaceW = ctx.measureText(" ").width;
        let curX = -line.width / 2;

        line.tokens.forEach((tok) => {
          const wordW = ctx.measureText(tok.raw).width;

          if (tok.isKeyword) {
            ctx.save();
            if (highlightStyle === "white_halo") {
              // High-Visibility Platinum Glow (White Halo) - Ultra-vivid double aura
              ctx.font = `900 ${layout.fontSize}px ${selectedFont}`;
              ctx.fillStyle = "#FFFFFF";
              ctx.shadowColor = "rgba(255, 255, 255, 1.0)";
              ctx.shadowBlur = 55;
              // Draw primary text with intense glow
              ctx.fillText(tok.raw, curX, lineY);
              // Secondary stroke to amplify luminous intensity
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
              ctx.strokeText(tok.raw, curX, lineY);
            } else {
              // Bold Platinum (Crisp pure white with chiaroscuro depth & bright contour)
              ctx.font = `900 ${layout.fontSize}px ${selectedFont}`;
              ctx.fillStyle = "#FFFFFF";
              ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
              ctx.shadowBlur = 18;
              ctx.fillText(tok.raw, curX, lineY);
            }
            ctx.restore();
          } else {
            // Standard Text (Refined Platinum Chiaroscuro)
            ctx.save();
            ctx.font =
              highlightStyle === "bold"
                ? `700 ${layout.fontSize}px ${selectedFont}`
                : `800 ${layout.fontSize}px ${selectedFont}`;
            ctx.fillStyle = highlightStyle === "bold" ? "rgba(226, 232, 240, 0.88)" : "#F1F5F9";
            ctx.shadowColor = "rgba(0, 0, 0, 0.96)";
            ctx.shadowBlur = 24;
            ctx.fillText(tok.raw, curX, lineY);
            ctx.restore();
          }

          curX += wordW + spaceW;
        });
      });

      ctx.restore();

      // 6. ZERO LOOP BAR: As requested, the loop bar is completely removed. Clean monumental canvas.

      // 7. Optional TikTok Safe Zone UI overlay (Preview only)
      if (showTikTokGuides && !isExportingRef.current) {
        ctx.save();
        // Top Danger Zone
        ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
        ctx.fillRect(0, 0, width, 210);
        ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(0, 210);
        ctx.lineTo(width, 210);
        ctx.stroke();

        ctx.fillStyle = "#F87171";
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚠️ GÓRNY PASEK TIKTOK (STATUS / TABS)", width / 2, 110);

        // Right Action Icons
        ctx.fillStyle = "rgba(239, 68, 68, 0.10)";
        ctx.fillRect(width - 130, 690, 130, 900);
        ctx.fillText("SIDEBAR", width - 65, 1140);

        // Bottom Caption Danger Zone
        ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
        ctx.fillRect(0, 1560, width, 360);
        ctx.beginPath();
        ctx.moveTo(0, 1560);
        ctx.lineTo(width, 1560);
        ctx.stroke();
        ctx.fillText("⚠️ DOLNA STREFA TIKTOK (OPIS, DŹWIĘK, PROFIL)", width / 2, 1710);
        ctx.restore();
      }
    },
    [
      duration,
      customBgType,
      selectedTheme,
      fontFamily,
      fontSize,
      textCase,
      highlightStyle,
      verticalPos,
      showTikTokGuides,
      format,
      pacingMode,
      phrases,
    ],
  );

  // 60 FPS Real-time Loop
  useEffect(() => {
    let lastStamp = performance.now();

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

      setCurrentTime(timeRef.current);
      renderFrame(timeRef.current);

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [duration, renderFrame]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Export Still Frame PNG (Full HD 1080x1920)

    try {
      // FIX BŁĘDU 60 FPS (PODWAJANIE DŁUGOŚCI ROLKI):
      // W silnikach Chromium (Chrome/Edge/Brave) CanvasCaptureMediaStreamTrack przy 60fps
      // indeksuje klatki w kontenerze z domyślnym czasem 33.3ms (30fps), co powodowało odtwarzanie
      // w zwolnionym tempie (0.5x) i podwajało czas trwania z np. 7s do 14s.
      // Standardem platform wertykalnych (Instagram Reels, TikTok, YouTube Shorts) jest 30 FPS.
      // Taktowanie captureStream na stabilne 30 FPS z bitrate 18-24 Mbps gwarantuje:
      // 1. Idealny czas trwania 1:1 (film 7s ma dokładnie 7.00s na każdym odtwarzaczu i w social media).
      // 2. Maksymalną ostrość typografii i brak jakiegokolwiek zacinania czy rozbieżności audio/video.
      const stream = canvas.captureStream(30);
      const mimeTypes = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: exportFps === 60 ? 24000000 : 18000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stark_reel_1080x1920_${duration}s_${selectedTheme}_${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        isExportingRef.current = false;
        setIsExporting(false);
        setIsPlaying(true);
        setToastMessage(`✓ Rolka 1080x1920 pobrana! Dokładny czas trwania: ${duration}.00s`);
        setTimeout(() => setToastMessage(null), 3000);
      };

      recorder.start();

      const startTime = performance.now();
      const totalDur = duration;

      const step = (stamp: number) => {
        const elapsed = (stamp - startTime) / 1000;
        if (elapsed >= totalDur) {
          renderFrame(totalDur);
          setExportProgress(100);
          setTimeout(() => {
            try {
              if (recorder.state === "recording") recorder.stop();
            } catch (e) {
              console.error(e);
            }
          }, 150);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-neutral-200">
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
                1080x1920 Full HD • 60 FPS • Czysty monumentalny kadr • Slow Zoom & Chiaroscuro
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

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Zamknij studio"
            >
              <X className="w-5 h-5" />
            </button>
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
                        ? "text-amber-300 font-black"
                        : "text-neutral-300"
                    }`}
                  >
                    F{currentPhraseIndex + 1}/{phrases.length}
                    {activeTimeline[currentPhraseIndex]?.isClimax &&
                      pacingMode === "climax_hold" &&
                      " ⭐"}
                  </span>
                )}
              </div>

              {/* Format Badge */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[9px] text-white font-bold backdrop-blur-sm uppercase">
                {format === "three_phases"
                  ? "3 Fazy"
                  : format === "single_quote"
                    ? "1 Cytat"
                    : format === "two_phases"
                      ? "2 Fazy"
                      : "4 Frazy"}
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
                      <Pause className="w-3.5 h-3.5 fill-current" /> Pauza
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Odtwórz
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
                  onClick={() => {
                    const next = !enableTts;
                    setEnableTts(next);
                    if (next && isPlaying && phrases[currentPhraseIndex]) {
                      speakPhrase(phrases[currentPhraseIndex]);
                    }
                    setToastMessage(next ? "✓ Lektor stoicki TTS włączony" : "Lektor wyłączony");
                    setTimeout(() => setToastMessage(null), 2000);
                  }}
                  className={`px-2.5 py-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                    enableTts
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      : "bg-[#141414] border-white/10 text-neutral-400 hover:text-white"
                  }`}
                  title="Automatyczny lektor czytający frazy synchronicznie z klatkami"
                >
                  {enableTts ? (
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                  <span>TTS</span>
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
                                ? "bg-amber-400/40"
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
            {/* ZERO-CLICK PIPELINE QUICK ACTIONS */}
            <div className="p-3 bg-[#131313] border border-white/15 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-inner">
              <span className="text-[10px] font-mono uppercase font-black tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Zero-Click Pipeline:
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowCodexModal(true)}
                  className="px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-white hover:text-black text-neutral-200 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Wybierz jedną z 10 Zasad STARK Codex z gotowymi frazami i tłem"
                >
                  <BookOpen className="w-3 h-3 text-amber-400" />
                  <span>🏛️ Kodeks STARK (10 Zasad)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoMatchBroll}
                  className="px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-white hover:text-black text-neutral-200 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Inteligentnie dopasuj tło kinowe B-Roll na podstawie fraz"
                >
                  <Compass className="w-3 h-3 text-cyan-400" />
                  <span>🎬 Auto-Dopasuj B-Roll</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateMultiVariants}
                  disabled={isGeneratingVariants}
                  className="px-2.5 py-1.5 rounded bg-[#1C1C1C] hover:bg-white hover:text-black text-neutral-200 text-[10px] font-mono font-bold border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="1-klik generator 3 wariantów A/B/C do testów wirusowości"
                >
                  <Split className="w-3 h-3 text-purple-400" />
                  <span>⚡ Warianty A/B/C</span>
                </button>
              </div>
            </div>

            {matchedBrollNotice && (
              <div className="p-2.5 bg-[#101923] border border-cyan-500/30 rounded-lg text-[10px] font-mono text-cyan-300 flex items-center justify-between">
                <span>🎯 {matchedBrollNotice}</span>
                <button
                  type="button"
                  onClick={() => setMatchedBrollNotice(null)}
                  className="text-cyan-400 hover:text-white cursor-pointer ml-2"
                >
                  ✕
                </button>
              </div>
            )}
            {/* 1. Primary AI In-Flight Generator with Combinatorial Idea Matrix */}
            <div className="p-4 rounded-xl bg-[#111111] border border-white/10 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                      Generowanie w locie:
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold">
                      Matryca Idei: 10 000+ kombinacji
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                    Zmontuj powiązaną rolkę stoicką
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAiReel}
                  disabled={isGeneratingAi}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-white/10 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Montowanie...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />⚡ Generuj unikalny pomysł
                    </>
                  )}
                </button>
              </div>

              {/* Wybór kategorii stoickiej z matrycy */}
              <div className="pt-2 border-t border-white/5">
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-neutral-400">
                  <span>Kąt filozoficzny / Temat wiodący:</span>
                  <span className="text-[9px] text-neutral-500">100% spójność logiczna fraz</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STOIC_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        selectedCategory === cat.id
                          ? "bg-white text-black border-white shadow-sm"
                          : "bg-[#181818] text-neutral-400 border-white/10 hover:text-white hover:border-white/20"
                      }`}
                      title={cat.description}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Długość filmu, Tempo (Pacing) & Format narracji */}
            <div className="bg-[#111111] p-3.5 rounded-xl border border-white/10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Długość pętli */}
                <div className="sm:col-span-7 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-white" />
                      Długość filmu:
                    </label>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Aktualnie: <strong className="text-white">{duration}s</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {([6, 8, 9, 11, 14, 15] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDuration(d);
                          timeRef.current = 0;
                        }}
                        className={`py-1.5 px-1 text-center rounded text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          duration === d
                            ? "bg-white text-black border-white shadow-sm"
                            : "bg-[#181818] text-neutral-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format narracji */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-white" />
                    Format narracji:
                  </label>
                  <select
                    value={format}
                    onChange={(e) => handleFormatChange(e.target.value as NarrativeFormat)}
                    className="w-full text-xs font-mono font-bold py-1.5 px-2 bg-[#181818] border border-white/10 rounded text-white focus:outline-none focus:border-white"
                  >
                    <option value="three_phases">3 Fazy (Hook → Prawda → Pętla)</option>
                    <option value="four_phrases">4 Frazy (Sekwencja stoicka)</option>
                    <option value="two_phases">Problem / Zasada (2 Fazy)</option>
                    <option value="single_quote">1 Stały Cytat (Czysty Przekaz)</option>
                  </select>
                </div>
              </div>

              {/* Rytm cięć & Pacing fraz */}
              <div className="pt-2.5 border-t border-white/10 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[10px] font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Rytm i Tempo fraz (Pacing):
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      {
                        id: "climax_hold" as const,
                        label: "Zatrzymanie na puencie ⭐",
                        tip: "Finałowe zdanie wisi ~2x dłużej, dając widzowi czas na przyswojenie sedna",
                      },
                      {
                        id: "stoic_steady" as const,
                        label: "Stonowane (Spokojne)",
                        tip: "Wydłużona lektura i łagodniejsze przejścia pod stoicką refleksję",
                      },
                      {
                        id: "uniform" as const,
                        label: "Równomierne",
                        tip: "Równy podział sekund pomiędzy wszystkie frazy",
                      },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPacingMode(p.id);
                          timeRef.current = 0;
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                          pacingMode === p.id
                            ? "bg-white text-black border-white font-bold shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                            : "bg-[#181818] text-neutral-400 border-white/10 hover:text-white"
                        }`}
                        title={p.tip}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wskaźnik czytelności tempa (Pacing Health Alert) */}
                {avgPhraseDuration < 2.0 && format !== "single_quote" ? (
                  <div className="px-2.5 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <span>⚡</span>
                      <span>
                        Szybkie tempo: ~<strong>{avgPhraseDuration.toFixed(1)}s</strong> / frazę.
                        Tekst może przeskakiwać za szybko.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-neutral-400">Wydłuż:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDuration(9);
                          timeRef.current = 0;
                        }}
                        className="px-2 py-0.5 bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-black rounded border border-amber-400/40 text-[9px] font-bold transition-all cursor-pointer"
                      >
                        9s
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDuration(12);
                          timeRef.current = 0;
                        }}
                        className="px-2 py-0.5 bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-black rounded border border-amber-400/40 text-[9px] font-bold transition-all cursor-pointer"
                      >
                        12s
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-[10px] font-mono text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <span>🧘</span>
                      <span>
                        Stonowany, stoicki rytm: ~<strong>{avgPhraseDuration.toFixed(1)}s</strong> /
                        frazę (Wysoka czytelność i retencja).
                      </span>
                    </span>
                    <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">
                      {pacingMode === "climax_hold"
                        ? "Puenta: Zatrzymanie"
                        : pacingMode === "stoic_steady"
                          ? "Płynny Rytm"
                          : "Równe Cięcia"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Mroczny motyw wizualny, Własne tło & Krój czcionki */}
            <div className="bg-[#111111] p-3 rounded-xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono font-bold uppercase text-neutral-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-neutral-300" />
                  Motyw tła (Minimalistyczna poświata lub własne media):
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
                      title="Usuń własne tło i wróć do motywu"
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
                  <span className="text-[9px] text-neutral-400 uppercase">[Nadpisuje motyw]</span>
                </div>
              )}

              {/* Rekomendacja tła dopasowana do wygenerowanej rolki */}
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

                const matchingCategoryRec =
                  Object.values(CATEGORY_BACKGROUND_RECOMMENDATIONS).find(
                    (r) => r.sceneName === bgInfo.sceneName,
                  ) ||
                  CATEGORY_BACKGROUND_RECOMMENDATIONS[selectedCategory] ||
                  CATEGORY_BACKGROUND_RECOMMENDATIONS.discipline_vs_motivation;

                return (
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[#181818] via-[#141414] to-[#0E0E0E] border border-amber-500/30 space-y-2 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs">
                          🎯
                        </span>
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                            Rekomendowane tło do tej rolki:
                          </span>
                          <h4 className="text-xs font-bold text-white font-mono">
                            {bgInfo.sceneName}
                          </h4>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (matchingCategoryRec.bingPrompt) {
                            navigator.clipboard.writeText(matchingCategoryRec.bingPrompt);
                            setToastMessage("✓ Skopiowano prompt 9:16 do Bing/Midjourney!");
                            setTimeout(() => setToastMessage(null), 2500);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-[#202020] hover:bg-amber-400 hover:text-black text-amber-200 text-[10px] font-mono font-bold border border-amber-500/30 hover:border-amber-400 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Skopiuj gotowy prompt do wygenerowania tego tła w Bing Image Creator / Midjourney"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Kopiuj prompt AI tła (9:16)</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-neutral-300 font-sans leading-relaxed">
                      💡 <strong>Dlaczego to pasuje:</strong> {bgInfo.rationale}
                    </p>

                    <div className="flex flex-wrap items-center justify-between pt-1 border-t border-white/5 text-[10px] font-mono text-neutral-400 gap-2">
                      <span>
                        Sugerowany motyw cieni:{" "}
                        <strong className="text-white capitalize">
                          {bgInfo.theme.replace("_", " ")}
                        </strong>
                      </span>
                      {selectedTheme !== bgInfo.theme && (
                        <button
                          type="button"
                          onClick={() => {
                            if (customBgType !== "none") handleClearCustomBg();
                            setSelectedTheme(bgInfo.theme);
                          }}
                          className="text-amber-400 hover:text-white underline font-bold transition-colors cursor-pointer"
                        >
                          Zastosuj ten motyw →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {VISUAL_THEMES.map((theme) => {
                  const isCurrent = selectedTheme === theme.id && customBgType === "none";
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        if (customBgType !== "none") {
                          handleClearCustomBg();
                        }
                        setSelectedTheme(theme.id);
                      }}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-[#1E1E1E] border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.12)]"
                          : "bg-[#141414] border-white/10 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="text-[11px] font-mono font-black">{theme.name}</div>
                      <div className="text-[9px] text-neutral-500 font-mono mt-0.5 truncate">
                        {theme.badge}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Biblioteka Kinowych Scen B-Roll */}
              <div className="pt-2.5 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1.5 font-bold uppercase text-neutral-300">
                    <Film className="w-3 h-3 text-cyan-400" />
                    Kinowe Sceny B-Roll (Zero-Click):
                  </span>
                  <span className="text-[9px] text-neutral-500">6 gotowych ujęć</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {CINEMATIC_BROLL_LIBRARY.map((broll) => (
                    <button
                      key={broll.id}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(broll.suggestedTheme);
                        setMatchedBrollNotice(`${broll.name} • ${broll.ambientVibe}`);
                        setToastMessage(`✓ Wybrano B-Roll: ${broll.name}`);
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="p-1.5 rounded bg-[#161616] hover:bg-[#202020] border border-white/10 hover:border-cyan-500/40 text-left transition-all cursor-pointer"
                    >
                      <div className="text-[10px] font-mono font-bold text-white truncate">
                        {broll.name}
                      </div>
                      <div className="text-[8px] font-mono text-neutral-500 truncate">
                        {broll.ambientVibe}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Czcionka, Rozmiar, Wielkość Liter i Styl podświetlania */}
              <div className="space-y-3 pt-2.5 border-t border-white/10">
                {/* Wiersz 1: Krój pisma i Wielkość liter */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Krój pisma */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-neutral-400">Krój:</span>
                    {[
                      { id: "cinzel" as const, label: "Cinzel (Rzymski)" },
                      { id: "cormorant" as const, label: "Cormorant (Szeryf)" },
                      { id: "montserrat" as const, label: "Montserrat (Modern)" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontFamily(f.id)}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                          fontFamily === f.id
                            ? "bg-white text-black border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]"
                            : "bg-[#181818] text-neutral-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Wielkość liter: Tradycyjna vs Wersaliki */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-neutral-400">Litery:</span>
                    {[
                      { id: "natural" as const, label: "Naturalna (Aa)" },
                      { id: "uppercase" as const, label: "WIELKIE (AA)" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTextCase(c.id)}
                        className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                          textCase === c.id
                            ? "bg-white text-black border-white font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                            : "bg-[#181818] text-neutral-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wiersz 2: Suwak rozmiaru czcionki z presetami */}
                <div className="bg-[#0D0D0D] p-2.5 rounded-lg border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                    <span className="flex items-center gap-1 text-neutral-300">
                      <Type className="w-3 h-3 text-white" />
                      Rozmiar czcionki tekstu:
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[
                          { sz: 64, label: "64px (Drobny)" },
                          { sz: 76, label: "76px (Standard)" },
                          { sz: 88, label: "88px (Monumentalny)" },
                        ].map((p) => (
                          <button
                            key={p.sz}
                            type="button"
                            onClick={() => setFontSize(p.sz)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer border ${
                              fontSize === p.sz
                                ? "bg-white/20 text-white border-white/40 font-bold"
                                : "bg-[#141414] text-neutral-500 border-white/5 hover:text-neutral-300"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      <span className="text-white font-bold px-1.5 py-0.5 bg-[#1C1C1C] rounded border border-white/10 min-w-[42px] text-center">
                        {fontSize}px
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="52"
                    max="96"
                    step="2"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                {/* Wiersz 3: Akcent słów kluczowych i Wysokość tekstu w kadrze */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  {/* Akcent słów kluczowych: Tylko Platynowy Blask i Pogrubienie */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-neutral-400">Wyróżnienie:</span>
                    {[
                      { id: "white_halo" as const, label: "Platynowy Blask (Mocny)" },
                      { id: "bold" as const, label: "Pogrubienie" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setHighlightStyle(s.id)}
                        className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                          highlightStyle === s.id
                            ? "bg-white text-black border-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                            : "bg-[#181818] text-neutral-400 border-white/10 hover:text-white"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {/* Pozycja w pionie (Złoty środek kadru) */}
                  <div className="flex items-center gap-2 min-w-[200px] flex-1 sm:flex-initial">
                    <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" />
                      Wysokość:
                    </span>
                    <input
                      type="range"
                      min="32"
                      max="55"
                      step="1"
                      value={verticalPos}
                      onChange={(e) => setVerticalPos(parseInt(e.target.value))}
                      className="w-24 sm:w-28 h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <span className="text-white text-[10px] font-mono font-bold">
                      {verticalPos}%
                    </span>
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
                    Korekta tekstu (Powiązana narracja stoicka):
                  </label>
                  <span className="text-[9px] font-mono text-emerald-400 block mt-0.5">
                    ⛓️ Spójny cel i sens: każda faza logicznie wynika z poprzedniej
                  </span>
                </div>
                <span className="text-[9px] font-mono text-neutral-500">
                  Wpisz *słowo* by wyróżnić blaskiem
                </span>
              </div>

              <div className="space-y-2">
                {phrases.map((phrase, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-200">
                          {format === "three_phases"
                            ? idx === 0
                              ? "Faza 1: Hook (Wstrząs & Prowokacja)"
                              : idx === 1
                                ? "Faza 2: Prawda Stoicka (Zasada)"
                                : "Faza 3: Puenta Climax (Dyrektywa)"
                            : format === "two_phases"
                              ? idx === 0
                                ? "Faza 1: Złudzenie / Pułapka 99%"
                                : "Faza 2: Standard Suwerenny 1%"
                              : format === "four_phrases"
                                ? idx === 0
                                  ? "Faza 1: Hook / Wymówka (Ujawnienie złudzenia)"
                                  : idx === 1
                                    ? "Faza 2: Bolesny Kontrast (Diagnoza prawdy)"
                                    : idx === 2
                                      ? "Faza 3: Prawo Stoickie (Nienegocjowalna reguła)"
                                      : "Faza 4: Puenta Climax (Zatrzymanie & Pętla)"
                                : "Główny Aforyzm Stoicki (Pętla)"}
                        </span>

                        {activeTimeline[idx] && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-1 ${
                              currentPhraseIndex === idx
                                ? "bg-white text-black font-bold shadow-sm"
                                : activeTimeline[idx].isClimax && pacingMode === "climax_hold"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold"
                                  : "bg-[#181818] text-neutral-400 border border-white/5"
                            }`}
                          >
                            <span>
                              {activeTimeline[idx].start.toFixed(1)}s –{" "}
                              {activeTimeline[idx].end.toFixed(1)}s (
                              {activeTimeline[idx].duration.toFixed(1)}s)
                            </span>
                            {activeTimeline[idx].isClimax && pacingMode === "climax_hold" && (
                              <span className="text-amber-300 font-bold">⭐ Zatrzymanie</span>
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
                        ⚖️ Zbalansuj linie
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

            {/* 6. Eksport 1080x1920 Full HD (Precyzyjny czas 1:1 bez podwajania) */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
                <span>
                  Jakość: <strong className="text-white">1080x1920 Full HD</strong> • Czas:{" "}
                  <strong className="text-emerald-400">{duration}.00s (Dokładny 1:1)</strong>
                </span>

                <div className="flex items-center bg-[#181818] border border-white/10 rounded p-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => setExportFps(30)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                      exportFps === 30
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    title="Oficjalny standard Instagram Reels & TikTok (Brak podwajania czasu trwania, 18 Mbps)"
                  >
                    30 FPS (Zalecane)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFps(60)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-all ${
                      exportFps === 60
                        ? "bg-white text-black shadow-sm"
                        : "text-neutral-400 hover:text-white"
                    }`}
                    title="Ultra płynność i maksymalny bitrate 24 Mbps z precyzyjnym czasem 1:1"
                  >
                    60 FPS (Ultra)
                  </button>
                </div>

                {isExporting && (
                  <span className="text-white font-mono font-bold animate-pulse ml-2">
                    [Eksport: {exportProgress}%]
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportZipBundle}
                  disabled={isExporting || isExportingZip}
                  className="px-3 py-2 rounded-lg bg-[#181818] hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-500/30 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  title="Turnkey Export: Pobierz kompletny ZIP z wideo, klatkami i plikiem tekstowym z opisem posta i hashtagami"
                >
                  <Package className="w-3.5 h-3.5" />
                  {isExportingZip ? "Pakowanie..." : "📦 Pakiet ZIP"}
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
                  title={`Pobierz gotowe wideo w pętli 1080x1920 (MP4, ${duration}.00s, ${exportFps} FPS)`}
                >
                  <Film className="w-4 h-4" />
                  {isExporting
                    ? `Eksportowanie (${exportProgress}%)...`
                    : `🎬 Pobierz Rolkę (${duration}s • ${exportFps} FPS)`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: KODEKS STARK (10 Zasad) */}
        {showCodexModal && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/20 rounded-xl p-5 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
                    STARK CODEX // 10 ŻELAZNYCH ZASAD
                  </h3>
                </div>
                <button
                  onClick={() => setShowCodexModal(false)}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
                {STARK_CODEX_RULES.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-[#161616] border border-white/10 hover:border-white/30 rounded-lg space-y-1.5 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        #{rule.ruleNumber} {rule.title}
                      </span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                        {rule.suggestedTheme}
                      </span>
                    </div>

                    <p className="text-xs font-mono font-bold text-amber-300">"{rule.hook0to3s}"</p>
                    <p className="text-[11px] font-mono text-neutral-400">{rule.corePrinciple}</p>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-neutral-500">
                        Puenta: {rule.actionDirective}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyCodexRule(rule)}
                        className="px-3 py-1 rounded bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                      >
                        Załaduj do Rolki →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: MULTI-VARIANT REELS (A/B TESTING) */}
        {showVariantsModal && (
          <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/20 rounded-xl p-5 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
                    1-CLICK MULTI-VARIANT TEST FACTORY (A/B/C)
                  </h3>
                </div>
                <button
                  onClick={() => setShowVariantsModal(false)}
                  className="p-1 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {multiVariants.map((varItem, vIdx) => (
                  <div
                    key={vIdx}
                    className="p-3.5 bg-[#161616] border border-white/10 hover:border-white/30 rounded-lg space-y-2 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        {varItem.variantName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {varItem.duration}s • {varItem.theme}
                      </span>
                    </div>

                    <div className="p-2 bg-black/60 rounded border border-white/5">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block">
                        Hook 0-3s:
                      </span>
                      <p className="text-xs font-mono font-bold text-white">"{varItem.hook}"</p>
                    </div>

                    <div className="space-y-0.5 text-[11px] font-mono text-neutral-400">
                      <span className="text-[9px] text-neutral-500 uppercase block">
                        3 Fazy narracji:
                      </span>
                      {varItem.phrases?.map((ph: string, pIdx: number) => (
                        <div key={pIdx}>• {ph}</div>
                      ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleApplyVariant(varItem)}
                        className="px-4 py-1.5 rounded bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                      >
                        Wybierz ten wariant →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
