import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  X,
  Download,
  FolderArchive,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  Palette,
  Image as ImageIcon,
  Copy,
  Layers,
  Wand2,
  Upload,
  Shield,
  Eye,
  Check,
  Compass,
  FileText,
} from "lucide-react";
import { drawSlideToCanvas, exportAllSlidesAsZip } from "../utils/canvasRenderer";
import { EXPANDED_BACKGROUND_LIBRARY, getRandomBackgroundScene } from "../data/expandedBackgrounds";
import {
  VisualTheme,
  LogoSourceType,
  LogoPlacement,
  LogoGlowChoice,
  TopHeaderMode,
  SlideData,
  CarouselFontFamily,
  VaultAsset,
} from "../types";
import {
  STARK_THEMES,
  getStarkThemeConfig,
  normalizeLogoPlacement,
  STARK_TOP_HEADER_PRESETS,
} from "../utils/starkBrandTheme";

interface CarouselStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialSlides?: SlideData[];
  handle?: string;
  vaultAssets?: VaultAsset[];
}

export const STARK_CURATED_BACKGROUNDS = [
  {
    id: "procedural",
    name: "Shader Generatywny (Canvas FX - Czysty Obsidian)",
    url: "",
  },
];

const ENGLISH_CAROUSEL_PRESETS: { title: string; slides: SlideData[] }[] = [
  {
    title: "5 Brutal Stoic Rules to Master Your Mind",
    slides: [
      {
        headline: "THE COWARD'S TRAP",
        bodyText:
          "You change your standards to fit the room. That is not empathy—that is fear dressed as courtesy. Raise the bar or leave the room.",
      },
      {
        headline: "SENECAN REALITY",
        bodyText:
          "A man who seeks approval from everyone is a slave to whoever has none to give. Cut the leash and execute in silence.",
      },
      {
        headline: "RADICAL INDIFFERENCE",
        bodyText:
          "Step into the shadows. Let them misunderstand you. Silence cannot be misquoted, and results cannot be refuted.",
      },
      {
        headline: "THE 60-SECOND RULE",
        bodyText:
          "99% of men lose their day in the first 60 seconds by touching their phone. Reclaim your sovereignty before 6:00 AM.",
      },
      {
        headline: "EXECUTE IN THE DARK",
        bodyText:
          "Save this reminder. Re-read it when your finger hovers over excuses. Stay ruthless and execute in silence.",
      },
    ],
  },
  {
    title: "The Solitude Standard (Why You Must Disappear)",
    slides: [
      {
        headline: "DISAPPEAR FOR 6 MONTHS",
        bodyText:
          "Cut off the noise, the fake celebrations, and the digital validation. Solitude is where your highest standard is forged.",
      },
      {
        headline: "KILL THE NEED TO PROVE",
        bodyText:
          "Weak men announce their plans. Dangerous men show up with undeniable evidence. Move in calculated silence.",
      },
      {
        headline: "PAIN IS INFORMATION",
        bodyText:
          "When resistance screams at you to stop, that is the exact compass heading toward growth. Lean into the discomfort.",
      },
      {
        headline: "STANDARDS OVER EMOTIONS",
        bodyText:
          "Never negotiate with your morning feelings. Marcus Aurelius did not want to leave his bed—he conquered his weakness anyway.",
      },
      {
        headline: "THE MONK LAW",
        bodyText:
          "Silence is your highest leverage. Save this reminder and start building your empire in the dark.",
      },
    ],
  },
  {
    title: "Stop Negotiating With Weakness (5 Rules)",
    slides: [
      {
        headline: "THE ILLUSION OF BURNOUT",
        bodyText:
          "Most people are not burned out. They are bored, undisciplined, and distracted by cheap dopamine. Raise your leverage.",
      },
      {
        headline: "RUTHLESS FOCUS",
        bodyText:
          "Pick the single most uncomfortable objective today and crush it first. The rest of the world will still be making excuses.",
      },
      {
        headline: "EMOTIONAL DETACHMENT",
        bodyText:
          "Your feelings do not matter when duty calls. Train your nervous system to execute on autopilot.",
      },
      {
        headline: "THE COMPOUND TOLL",
        bodyText:
          "Every skipped rep and negotiated standard whispers to your subconscious that you are a fraud. Keep your word.",
      },
      {
        headline: "THE FINAL TEST",
        bodyText:
          "Character is what you do when nobody is looking and the reward is invisible. Keep your word to yourself.",
      },
    ],
  },
  {
    title: "The 2:00 AM Mirror Audit (Identity Shock)",
    slides: [
      {
        headline: "THE MIDNIGHT MIRROR",
        bodyText:
          "Look in the mirror at 2:00 AM. Stripped of filters, titles, and applause—are you proud of the man looking back at you?",
      },
      {
        headline: "KILL THE PHANTOM EXCUSES",
        bodyText:
          "You blame your upbringing, your lack of capital, your fatigue. The brutal truth: you just refuse to endure discomfort.",
      },
      {
        headline: "THE PRICE OF SOVEREIGNTY",
        bodyText:
          "Freedom requires an appetite for isolation. If you cannot spend three days alone with your thoughts, you are a puppet.",
      },
      {
        headline: "BUILD IN OBSCURITY",
        bodyText:
          "The seeds of monumentality grow in silence. Let others boast about dreams while you silently stack undeniable proof.",
      },
      {
        headline: "RAISE THE MINIMUM BAR",
        bodyText:
          "Your ceiling does not determine your life. Your lowest acceptable standard does. Reset the floor today.",
      },
    ],
  },
  {
    title: "Dopamine Detox & Monk Mode Protocol",
    slides: [
      {
        headline: "THE DIGITAL SLAVE SHIP",
        bodyText:
          "You trade 6 hours of sacred daily focus for 15-second dopamine hits from strangers who do not care about your legacy.",
      },
      {
        headline: "SEVER ALL CHEAP REWARDS",
        bodyText:
          "Zero mindless scrolling. Zero junk calories. Zero gossip. When you starve your brain of cheap thrills, real work becomes electric.",
      },
      {
        headline: "THE COLD OBSERVATION TEST",
        bodyText:
          "Feel the urge to reach for your phone. Pause. Watch the craving like a passing cloud. You are the observer, not the impulse.",
      },
      {
        headline: "MONK MODE EXECUTION",
        bodyText:
          "One primary goal. Four hours of uncompromising deep work before noon. Let the world think you disappeared.",
      },
      {
        headline: "RECLAIM YOUR EMPIRE",
        bodyText:
          "Clarity is the ultimate competitive advantage. Protect your attention with your life. Save this reminder.",
      },
    ],
  },
  {
    title: "Silence Is Your Highest Leverage (Move In The Dark)",
    slides: [
      {
        headline: "NEVER BROADCAST YOUR MOVES",
        bodyText:
          "Speaking about your intentions drains the dopamine needed to execute them. Lock your jaw and build in complete stealth.",
      },
      {
        headline: "THE FOOLISH COMPLAINT",
        bodyText:
          "Marcus Aurelius wrote: Be overheard complaining about nothing, even to yourself. Complaining is an admission of weakness.",
      },
      {
        headline: "FEED ON SKEPTICISM",
        bodyText:
          "When they doubt you, smile inwardly. Their disbelief is the highest octane fuel. Do not argue; let your finished work shatter their assumptions.",
      },
      {
        headline: "THE DISCIPLINE OF SECRECY",
        bodyText:
          "The less they know about your calendar, the more dangerous you become. Mystery breeds respect; oversharing breeds contempt.",
      },
      {
        headline: "THE UNDENIABLE STATEMENT",
        bodyText:
          "Show up one day with results so immense that questions become absurd. Execution is the only language that matters. Save this reminder.",
      },
    ],
  },
];

export const CarouselStudioModal: React.FC<CarouselStudioModalProps> = ({
  isOpen,
  onClose,
  initialTitle = "STARK FOCUS",
  initialSlides,
  handle = "stark_focus",
  vaultAssets = [],
}) => {
  const [availablePresets, setAvailablePresets] =
    useState<{ title: string; slides: SlideData[] }[]>(ENGLISH_CAROUSEL_PRESETS);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState<boolean>(false);
  const [templateTopicInput, setTemplateTopicInput] = useState<string>("");
  const [showTemplateGenerator, setShowTemplateGenerator] = useState<boolean>(false);
  const [generationFeedback, setGenerationFeedback] = useState<string>("");

  const [slides, setSlides] = useState<SlideData[]>(() => {
    if (initialSlides && initialSlides.length > 0) return initialSlides;
    return ENGLISH_CAROUSEL_PRESETS[0].slides;
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<"4:5" | "9:16">("4:5");
  const [userHandle, setUserHandle] = useState<string>(handle);
  const [footerSignature, setFooterSignature] = useState<string>("THE UNFORGIVING STANDARD");
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isGeneratingSingleSlide, setIsGeneratingSingleSlide] = useState<boolean>(false);

  // Brand Styling & Theme (Mroczne Motywy STARK)
  const [theme, setTheme] = useState<VisualTheme>("obsidian_monolith");
  const [fontChoice, setFontChoice] = useState<CarouselFontFamily>("plus_jakarta");
  const [isContinuous, setIsContinuous] = useState<boolean>(true);
  const [topHeaderMode, setTopHeaderMode] = useState<TopHeaderMode>("protocol_standard");
  const [customTopHeaderText, setCustomTopHeaderText] = useState<string>("STARK FOCUS");

  // Brand Logo Engine (Tylko Oficjalne Logo STARK, 3 pozycje + brak)
  const [logoSourceType] = useState<LogoSourceType>("seal");
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("background_watermark");
  const [logoSize, setLogoSize] = useState<number>(48);
  const [logoOpacity, setLogoOpacity] = useState<number>(25);
  const [logoGlow, setLogoGlow] = useState<LogoGlowChoice>("none");

  // Wbudowany Generator Tła (DALL-E / Bing Prompter bezpośrednio w studiu)
  const [bgPromptSubject, setBgPromptSubject] = useState<string>("");
  const [copiedBgPrompt, setCopiedBgPrompt] = useState<boolean>(false);
  const [newBgUrlInput, setNewBgUrlInput] = useState<string>("");
  const [bgNotice, setBgNotice] = useState<string | null>(null);

  // Backgrounds: Default Procedural + User Uploads + Vault Assets (Zero default static clutter)
  const [selectedBgId, setSelectedBgId] = useState<string>("procedural");
  const [customUploadedBgs, setCustomUploadedBgs] = useState<
    { id: string; name: string; url: string }[]
  >([]);

  const [activeTab, setActiveTab] = useState<"slides" | "branding" | "background">("slides");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedBgImageRef = useRef<HTMLImageElement | null>(null);
  const loadedLogoImgRef = useRef<HTMLImageElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const logoUploadInputRef = useRef<HTMLInputElement | null>(null);

  const allAvailableBgs = useMemo(
    () => [
      ...STARK_CURATED_BACKGROUNDS,
      ...customUploadedBgs,
      ...(vaultAssets || [])
        .filter((a) => a.type === "bg")
        .map((a) => ({
          id: a.id,
          name: `📁 [Skarbiec] ${a.filename}`,
          url: a.url,
        })),
    ],
    [customUploadedBgs, vaultAssets],
  );

  // Sync initialSlides when changed
  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) {
      setSlides(initialSlides);
      setCurrentSlideIndex(0);
    }
  }, [initialSlides]);

  const width = 1080;
  const height = aspectRatio === "4:5" ? 1350 : 1920;

  const triggerRedraw = useCallback(() => {
    if (!canvasRef.current || slides.length === 0) return;
    const currentSlide = slides[currentSlideIndex] || slides[0];
    drawSlideToCanvas(canvasRef.current, {
      width,
      height,
      slideNumber: currentSlideIndex + 1,
      totalSlides: slides.length,
      headline: currentSlide.headline,
      bodyText: currentSlide.bodyText,
      theme,
      handle: userHandle,
      bgImage: loadedBgImageRef.current,
      logoImg: loadedLogoImgRef.current,
      logoSourceType,
      logoPlacement,
      logoSize,
      logoOpacity,
      logoGlow,
      topHeaderMode,
      topHeaderCustom: customTopHeaderText,
      textOffsetY: currentSlide.textOffsetY || 0,
      highlightWords: currentSlide.highlightWords || "",
      fontChoice,
      isContinuous,
      footerSignature,
    });
  }, [
    slides,
    currentSlideIndex,
    width,
    height,
    theme,
    fontChoice,
    isContinuous,
    userHandle,
    footerSignature,
    logoSourceType,
    logoPlacement,
    logoSize,
    logoOpacity,
    logoGlow,
    topHeaderMode,
    customTopHeaderText,
  ]);

  // Load selected official logo
  useEffect(() => {
    const logoUrl = "/stark_seal_logo.png";
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
    img.onload = () => {
      loadedLogoImgRef.current = img;
      triggerRedraw();
    };
    img.onerror = () => {
      loadedLogoImgRef.current = null;
      triggerRedraw();
    };
  }, [triggerRedraw]);

  // Preload background image if selected
  useEffect(() => {
    const bgObj = allAvailableBgs.find((b) => b.id === selectedBgId);
    if (bgObj && bgObj.url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = bgObj.url;
      img.onload = () => {
        loadedBgImageRef.current = img;
        triggerRedraw();
      };
      img.onerror = () => {
        loadedBgImageRef.current = null;
        triggerRedraw();
      };
    } else {
      loadedBgImageRef.current = null;
      triggerRedraw();
    }
  }, [selectedBgId, allAvailableBgs, triggerRedraw]);

  // Redraw canvas whenever slide or options change
  useEffect(() => {
    if (!isOpen) return;
    triggerRedraw();
  }, [isOpen, triggerRedraw]);

  if (!isOpen) return null;

  const handleDownloadCurrentPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `stark_slide_${currentSlideIndex + 1}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      await exportAllSlidesAsZip(slides, {
        width,
        height,
        theme,
        handle: userHandle,
        zipName: `${initialTitle.replace(/[^a-zA-Z0-9]/g, "_")}_carousel.zip`,
        bgImage: loadedBgImageRef.current,
        logoImg: loadedLogoImgRef.current,
        logoSourceType,
        logoPlacement,
        logoSize,
        logoOpacity,
        logoGlow,
        topHeaderMode,
        topHeaderCustom: customTopHeaderText,
        fontChoice,
        isContinuous,
        footerSignature,
      });
    } catch (err) {
      console.error("Error generating zip:", err);
      setExportError("Nie udało się wygenerować archiwum ZIP.");
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleUpdateSlide = <K extends keyof SlideData>(field: K, value: SlideData[K]) => {
    setSlides((prev) => {
      const next = [...prev];
      if (next[currentSlideIndex]) {
        next[currentSlideIndex] = {
          ...next[currentSlideIndex],
          [field]: value,
        };
      }
      return next;
    });
  };

  const handleAddSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        headline: "UNYIELDING STANDARD",
        bodyText:
          "The moment you negotiate with excuses, you surrender your authority. Cut all weakness in silence.",
      },
    ]);
    setCurrentSlideIndex(slides.length);
  };

  const handleDuplicateSlide = () => {
    const current = slides[currentSlideIndex];
    if (!current) return;
    setSlides((prev) => {
      const next = [...prev];
      next.splice(currentSlideIndex + 1, 0, { ...current });
      return next;
    });
    setCurrentSlideIndex((prev) => prev + 1);
  };

  const handleDeleteSlide = () => {
    if (slides.length <= 1) return;
    setSlides((prev) => prev.filter((_, idx) => idx !== currentSlideIndex));
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSetTargetSlideCount = (targetCount: number) => {
    if (targetCount < 1) return;
    setSlides((prev) => {
      if (prev.length === targetCount) return prev;
      if (prev.length < targetCount) {
        const added: SlideData[] = [];
        for (let i = prev.length; i < targetCount; i++) {
          added.push({
            headline: `RULE 0${i + 1} // RUTHLESS DISCIPLINE`,
            bodyText:
              "Execute without emotion. Comfort is the weapon of the modern world designed to keep you sedated.",
          });
        }
        return [...prev, ...added];
      } else {
        return prev.slice(0, targetCount);
      }
    });
    if (currentSlideIndex >= targetCount) {
      setCurrentSlideIndex(targetCount - 1);
    }
  };

  const handleApplyPreset = (presetIdx: number) => {
    const p = availablePresets[presetIdx];
    if (!p) return;
    setSlides(p.slides);
    setCurrentSlideIndex(0);
  };

  const handleGenerateTemplate = async (overrideTopic?: string) => {
    const topicToUse =
      (overrideTopic || templateTopicInput).trim() ||
      "5 Non-Negotiable Stoic Laws to Master Your Mind";
    setIsGeneratingTemplate(true);
    setGenerationFeedback("Generowanie szablonu karuzeli AI...");
    try {
      const res = await fetch("/api/ai/generate-carousel-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicToUse,
          slideCount: slides.length || 5,
          randomSeed: Date.now() + Math.random(),
        }),
      });
      const data = await res.json();
      if (data.template && Array.isArray(data.template.slides) && data.template.slides.length > 0) {
        const newPreset = {
          title: `✨ AI: ${data.template.name || topicToUse}`,
          slides: data.template.slides,
        };
        setAvailablePresets((prev) => [newPreset, ...prev]);
        setSlides(newPreset.slides);
        setCurrentSlideIndex(0);
        setGenerationFeedback(`Wygenerowano: "${data.template.name}"`);
        setTimeout(() => setGenerationFeedback(""), 4000);
        setShowTemplateGenerator(false);
        setTemplateTopicInput("");
      } else {
        throw new Error("Invalid response data");
      }
    } catch (err) {
      console.error("Failed to generate carousel template:", err);
      setGenerationFeedback("Błąd generowania szablonu AI.");
      setTimeout(() => setGenerationFeedback(""), 3000);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const handleGenerateSingleSlide = async () => {
    setIsGeneratingSingleSlide(true);
    setGenerationFeedback(`Generowanie treści slajdu ${currentSlideIndex + 1}...`);
    try {
      const slideType =
        currentSlideIndex === 0
          ? "hook"
          : currentSlideIndex === slides.length - 1
            ? "cta"
            : "lesson";

      const topicContext =
        templateTopicInput.trim() ||
        initialTitle ||
        slides[0]?.headline ||
        "Stoic Discipline & Relentless Focus";

      const res = await fetch("/api/ai/generate-single-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicContext,
          slideIndex: currentSlideIndex,
          totalSlides: slides.length,
          slideType,
          currentHeadline: slides[currentSlideIndex]?.headline,
          currentBodyText: slides[currentSlideIndex]?.bodyText,
        }),
      });

      const data = await res.json();
      if (data.slide) {
        setSlides((prev) => {
          const next = [...prev];
          if (next[currentSlideIndex]) {
            next[currentSlideIndex] = {
              ...next[currentSlideIndex],
              headline: data.slide.headline || next[currentSlideIndex].headline,
              bodyText: data.slide.bodyText || next[currentSlideIndex].bodyText,
              highlightWords: data.slide.highlightWords || next[currentSlideIndex].highlightWords,
            };
          }
          return next;
        });
        setGenerationFeedback(`✓ Slajd #${currentSlideIndex + 1} wygenerowany!`);
        setTimeout(() => setGenerationFeedback(""), 3000);
      } else {
        throw new Error("Błąd w odpowiedzi serwera");
      }
    } catch (err) {
      console.error("Failed to generate single slide:", err);
      setGenerationFeedback("Nie udało się wygenerować pojedynczego slajdu.");
      setTimeout(() => setGenerationFeedback(""), 3000);
    } finally {
      setIsGeneratingSingleSlide(false);
    }
  };

  const activeThemeConfig = getStarkThemeConfig(theme);

  return (
    <div
      id="carousel-studio-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#141824] border border-[#2C354B] rounded-xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[94vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C354B] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-sm bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                STUDIO GRAFIK KARUZELI // STARK FOCUS BRAND ENGINE
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                5 slajdów bez kompromisów • Te same kolory i logo co w Automontażyście • Brak
                kolizji UI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-[#1D2333] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs for Controls: Treść Slajdów | Kolorystyka & Logo | Tło & Format */}
        <div className="flex items-center gap-2 border-b border-[#2C354B] pb-2">
          <button
            onClick={() => setActiveTab("slides")}
            className={`px-3 py-1.5 text-xs font-bold font-mono rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "slides"
                ? "bg-[#38BDF8] text-[#141824]"
                : "bg-[#1D2333] text-slate-300 hover:text-white border border-[#2C354B]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> 1. Treść i Slajdy ({slides.length})
          </button>
          <button
            onClick={() => setActiveTab("branding")}
            className={`px-3 py-1.5 text-xs font-bold font-mono rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "branding"
                ? "bg-[#38BDF8] text-[#141824]"
                : "bg-[#1D2333] text-slate-300 hover:text-white border border-[#2C354B]"
            }`}
          >
            <Palette className="w-3.5 h-3.5" /> 2. Motywy & Logo STARK
          </button>
          <button
            onClick={() => setActiveTab("background")}
            className={`px-3 py-1.5 text-xs font-bold font-mono rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "background"
                ? "bg-[#38BDF8] text-[#141824]"
                : "bg-[#1D2333] text-slate-300 hover:text-white border border-[#2C354B]"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" /> 3. Tło & Format
          </button>
        </div>

        {/* Studio Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Controls Editor (Left 7 cols) */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* TAB 1: SLIDES & CONTENT */}
            {activeTab === "slides" && (
              <div className="space-y-3">
                {/* Arbitrary Slide Count Bar & English Presets */}
                <div className="bg-[#1D2333] p-3 rounded-lg border border-[#2C354B] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span className="text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider font-mono">
                        Liczba slajdów:
                      </span>
                      <div className="flex items-center gap-1">
                        {[3, 4, 5, 7, 10].map((count) => (
                          <button
                            key={count}
                            onClick={() => handleSetTargetSlideCount(count)}
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-colors cursor-pointer ${
                              slides.length === count
                                ? "bg-[#38BDF8] text-[#141824]"
                                : "bg-[#141824] text-slate-300 hover:text-white border border-[#2C354B]"
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Wand2 className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span className="text-[10px] text-slate-400 font-mono">
                        Szablony ({availablePresets.length}):
                      </span>
                      <select
                        onChange={(e) => {
                          if (e.target.value !== "") {
                            handleApplyPreset(parseInt(e.target.value, 10));
                            e.target.value = "";
                          }
                        }}
                        className="text-[10px] font-bold py-0.5 px-2 bg-[#141824] border border-[#2C354B] rounded text-[#38BDF8] max-w-[210px] truncate"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Wybierz szablon ({availablePresets.length} dostępnych)...
                        </option>
                        {availablePresets.map((p, idx) => (
                          <option key={idx} value={idx}>
                            {p.title} ({p.slides.length} sl.)
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowTemplateGenerator(!showTemplateGenerator)}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors border ${
                          showTemplateGenerator
                            ? "bg-[#38BDF8] text-[#141824] border-[#38BDF8]"
                            : "text-[#38BDF8] bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border-[#38BDF8]/40"
                        }`}
                        title="Wygeneruj nowy autorski szablon karuzeli AI"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>✨ Generuj Nowy Szablon</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Template Generator Expandable Box */}
                  {showTemplateGenerator && (
                    <div className="mt-2.5 p-3 rounded-lg bg-[#141824] border border-[#38BDF8]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase text-[#38BDF8] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Generator Szablonu Karuzeli AI (100% English):
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          Hook na 1. slajdzie + unikalne zasady
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={templateTopicInput}
                          onChange={(e) => setTemplateTopicInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleGenerateTemplate();
                            }
                          }}
                          placeholder="Temat szablonu np. Solitude Protocol, 5 Non-Negotiable Rules, Monk Mode..."
                          className="flex-1 text-xs py-1.5 px-2.5 bg-[#0F121C] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none font-mono"
                          disabled={isGeneratingTemplate}
                        />
                        <button
                          type="button"
                          onClick={() => handleGenerateTemplate()}
                          disabled={isGeneratingTemplate}
                          className="px-3 py-1.5 rounded bg-[#38BDF8] text-[#141824] font-mono font-bold text-xs hover:bg-[#38BDF8]/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isGeneratingTemplate ? (
                            <>
                              <div className="w-3 h-3 border-2 border-[#141824] border-t-transparent rounded-full animate-spin" />
                              <span>Generuję...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generuj</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quick Idea Chips */}
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[9px] font-mono text-slate-400">Szybkie tematy:</span>
                        {[
                          "Dopamine Fasting",
                          "Silence & Stealth",
                          "Marcus Aurelius Standard",
                          "Pain Is Information",
                          "Early Morning Execution",
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleGenerateTemplate(chip)}
                            disabled={isGeneratingTemplate}
                            className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#1D2333] hover:bg-[#2C354B] text-slate-300 hover:text-white border border-[#2C354B] transition-colors cursor-pointer"
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>

                      {generationFeedback && (
                        <div className="text-[10px] font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-1 rounded border border-[#10B981]/30">
                          {generationFeedback}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Slide Navigation Pills */}
                <div className="flex items-center justify-between bg-[#1D2333] px-3 py-2 rounded-lg border border-[#2C354B]">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`px-2.5 py-1 text-xs font-mono rounded font-bold transition-all shrink-0 cursor-pointer ${
                          currentSlideIndex === idx
                            ? "bg-[#38BDF8] text-[#141824]"
                            : "bg-[#141824] text-slate-300 hover:text-white border border-[#2C354B]"
                        }`}
                      >
                        Slajd {idx + 1}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={handleAddSlide}
                      className="px-2 py-1 text-[11px] font-mono font-bold text-[#10B981] hover:bg-[#10B981]/10 rounded border border-[#10B981]/30 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Dodaj kolejny slajd"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Slajd
                    </button>
                    <button
                      onClick={handleDuplicateSlide}
                      className="p-1 text-[#38BDF8] hover:bg-[#38BDF8]/10 rounded border border-[#38BDF8]/30 transition-colors cursor-pointer"
                      title="Duplikuj obecny slajd"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {slides.length > 1 && (
                      <button
                        onClick={handleDeleteSlide}
                        className="p-1 text-[#EF4444] hover:bg-[#EF4444]/10 rounded border border-[#EF4444]/30 transition-colors cursor-pointer"
                        title="Usuń ten slajd"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Slide Content Editor */}
                <div className="bg-[#1D2333] p-4 rounded-lg border border-[#2C354B] space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Edycja Slajdu {currentSlideIndex + 1} z {slides.length} (100% English)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGenerateSingleSlide}
                        disabled={isGeneratingSingleSlide}
                        className="px-2.5 py-1 rounded bg-[#E2E8F0] hover:bg-white text-[#0B0F19] text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                        title="Wygeneruj treść tylko dla tego pojedynczego slajdu"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#0B0F19]" />
                        <span>
                          {isGeneratingSingleSlide
                            ? "Generowanie..."
                            : `✨ Generuj Slajd #${currentSlideIndex + 1} (AI)`}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Headline (Nagłówek w j. angielskim)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        ↵ Enter = podział wierszy nagłówka
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={slides[currentSlideIndex]?.headline || ""}
                      onChange={(e) => handleUpdateSlide("headline", e.target.value)}
                      placeholder="e.g. THE UNFORGIVING&#10;STANDARD"
                      className="w-full text-sm font-black py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none resize-none uppercase font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Body Text (Treść slajdu w j. angielskim)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        ↵ Enter = precyzyjny podział wierszy / puste linie
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={slides[currentSlideIndex]?.bodyText || ""}
                      onChange={(e) => handleUpdateSlide("bodyText", e.target.value)}
                      placeholder="e.g. You do not lack motivation.&#10;&#10;You lack non-negotiable standards."
                      className="w-full text-xs leading-relaxed py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none resize-none font-sans"
                    />
                  </div>

                  {/* Ręczna regulacja: Przesunięcie tekstu w pionie (Offset Y) */}
                  <div className="pt-2 border-t border-[#2C354B]/60 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                      <span className="font-mono">PRZESUNIĘCIE TEKSTU W PIONIE (OFFSET Y):</span>
                      <span className="text-[#38BDF8] font-mono text-xs">
                        {(slides[currentSlideIndex]?.textOffsetY || 0) > 0
                          ? `+${slides[currentSlideIndex]?.textOffsetY}px`
                          : `${slides[currentSlideIndex]?.textOffsetY || 0}px`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={-140}
                        max={140}
                        step={2}
                        value={slides[currentSlideIndex]?.textOffsetY || 0}
                        onChange={(e) => handleUpdateSlide("textOffsetY", Number(e.target.value))}
                        className="flex-1 accent-[#38BDF8]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSlide(
                              "textOffsetY",
                              (slides[currentSlideIndex]?.textOffsetY || 0) - 20,
                            )
                          }
                          className="px-2 py-1 bg-[#141824] hover:bg-[#2C354B] text-slate-300 hover:text-white rounded border border-[#2C354B] cursor-pointer"
                          title="Przesuń tekst wyżej o 20px"
                        >
                          ▲ Wyżej (-20px)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSlide("textOffsetY", 0)}
                          className="px-2 py-1 bg-[#141824] hover:bg-[#2C354B] text-[#38BDF8] hover:text-white rounded border border-[#2C354B] cursor-pointer"
                          title="Wyśrodkuj tekst idealnie"
                        >
                          ● Środek (0px)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSlide(
                              "textOffsetY",
                              (slides[currentSlideIndex]?.textOffsetY || 0) + 20,
                            )
                          }
                          className="px-2 py-1 bg-[#141824] hover:bg-[#2C354B] text-slate-300 hover:text-white rounded border border-[#2C354B] cursor-pointer"
                          title="Przesuń tekst niżej o 20px"
                        >
                          ▼ Niżej (+20px)
                        </button>
                      </div>
                      <span className="text-slate-500 text-[9px]">Zakres: -140px do +140px</span>
                    </div>
                  </div>

                  {/* Wyróżnienie słów kluczowych (Wprowadzanie ręczne) */}
                  <div className="pt-2 border-t border-[#2C354B]/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                        Wyróżnienie Słów Kluczowych (Wpisz ręcznie po przecinku):
                      </label>
                      <span className="text-[9px] font-mono text-slate-400">
                        Pogrubione / Kolor Motywu / Podkreślone
                      </span>
                    </div>

                    <input
                      type="text"
                      value={slides[currentSlideIndex]?.highlightWords || ""}
                      onChange={(e) => handleUpdateSlide("highlightWords", e.target.value)}
                      placeholder="Wpisz słowa do wyróżnienia np. standards, silence, results, discipline"
                      className="w-full text-xs font-mono py-1.5 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:outline-none focus:border-[#38BDF8]"
                    />
                    <p className="text-[9px] text-slate-500 font-mono">
                      💡 Wskazówka: Wpisz dowolne słowa po przecinku lub otocz słowa gwiazdkami bezpośrednio w tekście, np. <span className="text-slate-300">**standards**</span>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BRANDING, THEMES & LOGO */}
            {activeTab === "branding" && (
              <div className="space-y-3.5">
                {/* 1. Motywy Wizualne STARK (Tylko 3 ciemne/mroczne motywy stoickie) */}
                <div className="bg-[#1D2333] p-3.5 rounded-lg border border-[#2C354B] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Mroczne Motywy STARK (Czerń, Grafit, Cień & Karmazyn)
                    </span>
                    <span className="text-[10px] font-mono text-[#38BDF8]">
                      4 wyselekcjonowane warianty
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {STARK_THEMES.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => setTheme(th.id)}
                        className={`text-left p-3 rounded border transition-all cursor-pointer ${
                          theme === th.id
                            ? "bg-[#141824] border-[#38BDF8] shadow-sm"
                            : "bg-[#141824]/60 border-[#2C354B] hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: th.accentColor }}
                            />
                            {th.name}
                          </span>
                          {theme === th.id && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">{th.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Brand Logo Engine (Tylko Oficjalne Logo STARK + 3 Pozycje + Brak) */}
                <div className="bg-[#1D2333] p-3.5 rounded-lg border border-[#2C354B] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2C354B] pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Oficjalne Logo STARK (Jedyny Autoryzowany Znak)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Zablokowane na stałe
                    </span>
                  </div>

                  {/* Karta Oficjalnego Emblematu */}
                  <div className="flex items-center gap-3 p-2.5 bg-[#141824] rounded border border-[#2C354B]">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-black/60 border border-slate-700 flex items-center justify-center shrink-0 p-1">
                      <img
                        src="/stark_seal_logo.png"
                        alt="Oficjalne Logo STARK"
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <span>STARK FOCUS OFFICIAL SEAL</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                          AKTYWNY
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Jedyny autoryzowany emblemat profilu. Brak możliwości wgrania innych plików,
                        aby zachować 100% spójności wizualnej marki.
                      </p>
                    </div>
                  </div>

                  {/* Logo Placement Selection: Ograniczone do 3 pozycji + brak */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Pozycja Logo na Slajdzie (3 Opcje + Brak):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      {[
                        {
                          id: "background_watermark",
                          label: "1. Znak wodny w tle",
                          desc: "Duży, subtelny ZA tekstem w centrum",
                        },
                        {
                          id: "bottom_under",
                          label: "2. Na dole kadru",
                          desc: "Podpis ze znakiem obok @stark_focus",
                        },
                        {
                          id: "top_left",
                          label: "3. U góry kadru",
                          desc: "W nagłówku kadru z bezpiecznym marginesem",
                        },
                        { id: "none", label: "4. Brak logo", desc: "Czysty kadr bez sygnetu" },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setLogoPlacement(pos.id as LogoPlacement)}
                          className={`p-2.5 text-left rounded border transition-colors cursor-pointer ${
                            logoPlacement === pos.id
                              ? "bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]"
                              : "bg-[#141824] border-[#2C354B] text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          <span className="text-[11px] font-bold block">{pos.label}</span>
                          <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                            {pos.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders: Size & Opacity */}
                  {logoPlacement !== "none" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#2C354B]/60">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                          <span>ROZMIAR LOGO:</span>
                          <span className="text-white font-mono">{logoSize}px</span>
                        </div>
                        <input
                          type="range"
                          min={28}
                          max={96}
                          value={logoSize}
                          onChange={(e) => setLogoSize(Number(e.target.value))}
                          className="w-full accent-[#38BDF8]"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1">
                          <span>PRZEZROCZYSTOŚĆ (DZIAŁA NA ZNAK WODNY):</span>
                          <span className="text-[#38BDF8] font-mono font-bold">{logoOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          step={1}
                          value={logoOpacity}
                          onChange={(e) => setLogoOpacity(Number(e.target.value))}
                          className="w-full accent-[#38BDF8]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Top Header Mode & Custom text input */}
                <div className="bg-[#1D2333] p-3 rounded-lg border border-[#2C354B] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Górna Belka / Safe-Zone (Praktyczne warianty):
                    </label>
                    <span className="text-[10px] font-mono text-[#38BDF8]">
                      Pełna edycja tekstu
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                    {STARK_TOP_HEADER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setTopHeaderMode(preset.id);
                          if (preset.displayText) {
                            setCustomTopHeaderText(preset.displayText);
                          }
                        }}
                        className={`p-2 text-left rounded border transition-colors cursor-pointer ${
                          topHeaderMode === preset.id
                            ? "bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]"
                            : "bg-[#141824] border-[#2C354B] text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        <span className="text-[11px] font-bold block truncate">{preset.label}</span>
                        <span className="text-[9px] text-slate-400 block truncate">
                          {preset.desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Pole własnego tekstu belki */}
                  {topHeaderMode !== "clean_void" && (
                    <div className="pt-2 border-t border-[#2C354B]/60">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Edytuj treść nagłówka (wyświetli się dokładnie to co wpiszesz):
                      </label>
                      <input
                        type="text"
                        value={customTopHeaderText}
                        onChange={(e) => {
                          setCustomTopHeaderText(e.target.value);
                          setTopHeaderMode("custom");
                        }}
                        placeholder="np. STARK FOCUS // PROTOCOL albo TWOJA WŁASNA SERIA"
                        className="w-full text-xs font-mono py-1.5 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:outline-none focus:border-[#38BDF8]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: BACKGROUND & FORMAT */}
            {activeTab === "background" && (
              <div className="space-y-3.5">
                {/* Wbudowany Generator Promptów AI dla Tła (Format 9:16 / 4:5) */}
                <div className="bg-[#1D2333] p-3.5 rounded-lg border border-[#2C354B] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2C354B] pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Generator Promptów Tła AI (Bing Image Creator / DALL-E)
                    </span>
                    <span className="text-[10px] font-mono text-[#38BDF8]">100% Dark Stoic</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-400">
                      Wybierz motyw z bazy 100+ ujęć lub wylosuj unikalną scenerię:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const random = getRandomBackgroundScene();
                        setBgPromptSubject(random.bingPrompt);
                        setBgNotice(`🎲 Wylosowano: ${random.name} (${random.category})`);
                        setTimeout(() => setBgNotice(null), 3000);
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>🎲 Losuj z 100+ Motywów</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {EXPANDED_BACKGROUND_LIBRARY.slice(0, 10).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setBgPromptSubject(preset.bingPrompt)}
                        className="text-[10px] font-mono px-2 py-1 rounded bg-[#141824] hover:bg-[#141824]/80 text-slate-300 hover:text-white border border-[#2C354B] cursor-pointer"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={bgPromptSubject}
                      onChange={(e) => setBgPromptSubject(e.target.value)}
                      placeholder="Wpisz własny motyw np. cisza, nocny bieg, samotny trening, mroczny horyzont..."
                      className="w-full text-xs font-mono py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
                    />

                    {/* Skompilowany prompt z przyciskiem kopiowania */}
                    {(() => {
                      const raw = bgPromptSubject.trim();
                      let synthesizedPrompt = "";

                      if (!raw) {
                        synthesizedPrompt =
                          "Ultra-minimalist pitch black infinite void, razor-thin single beam of cold diffuse directional light cutting through dense atmosphere, mysterious enigmatic moody darkness, subtle volumetric haze, vast negative space for typography overlay, dark stoic aesthetic, high contrast, moody deep shadows, 8k photorealistic, raw texture, vertical " +
                          (aspectRatio === "4:5" ? "4:5" : "9:16") +
                          " composition, minimalist editorial photography, shot on 35mm lens, strictly no text, no words, no letters, no watermark";
                      } else {
                        const t = raw.toLowerCase();
                        let coreScene = "";
                        if (t.includes("1%") || t.includes("protokół") || t.includes("protokol")) {
                          coreScene =
                            "Abstract minimalist dark architecture, razor-thin sliver of cold diffuse light cutting through pure pitch black darkness, matte carbon textures, stark silent geometry, haunting volumetric fog, mysterious liminal perspective";
                        } else if (
                          t.includes("ruthless") ||
                          t.includes("bezwzględ") ||
                          t.includes("zimn")
                        ) {
                          coreScene =
                            "Ultra-minimalist dark composition, solitary shadowy silhouette standing motionless at the edge of a deep charcoal abyss, cold sharp directional rim lighting, eerie silent atmosphere, mysterious cinematic chiaroscuro";
                        } else if (
                          t.includes("poranek") ||
                          t.includes("rano") ||
                          t.includes("morning") ||
                          t.includes("świt") ||
                          t.includes("bieg")
                        ) {
                          coreScene =
                            "Minimalist moody dark city skyline at 4:30 AM before dawn, thick atmospheric fog rolling over wet asphalt, lone solitary figure in dark trench coat in distance, eerie silence, vast negative space";
                        } else if (
                          t.includes("samotn") ||
                          t.includes("cisz") ||
                          t.includes("droga")
                        ) {
                          coreScene =
                            "Eerie infinite empty black road shrouded in impenetrable silent mist, faint cold ambient twilight gradient in the far horizon, solitary stoic mood, minimalist editorial framing";
                        } else if (
                          t.includes("trening") ||
                          t.includes("gym") ||
                          t.includes("siłownia")
                        ) {
                          coreScene =
                            "Ultra-dark minimalist underground training facility, raw iron textures shrouded in heavy moody chiaroscuro shadows, single cold overhead spotlight cutting through atmospheric dust, empty negative space";
                        } else {
                          coreScene = `Abstract minimalist dark void inspired by ${raw}, razor-thin beam of cold diffused light cutting through black atmospheric fog, deep chiaroscuro, matte obsidian textures, generous negative space for overlay`;
                        }
                        synthesizedPrompt = `${coreScene}, dark stoic aesthetic, high contrast, cinematic dramatic lighting, moody deep shadows, 8k photorealistic, raw texture, vertical ${aspectRatio === "4:5" ? "4:5" : "9:16"} composition, minimalist editorial photography, shot on 35mm lens, strictly no text, no words, no letters, no typography, no watermark`;
                      }

                      const fullPrompt = synthesizedPrompt;
                      return (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex-1 text-[10px] font-mono text-slate-400 bg-[#0F121C] p-2 rounded border border-[#2C354B] truncate">
                            {fullPrompt}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(fullPrompt);
                              setCopiedBgPrompt(true);
                              setBgNotice("✓ Prompt skopiowany! Wklej go do Bing Image Creator.");
                              setTimeout(() => {
                                setCopiedBgPrompt(false);
                                setBgNotice(null);
                              }, 3000);
                            }}
                            className="px-3 py-2 rounded bg-[#38BDF8] text-[#141824] text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 hover:bg-[#38BDF8]/90 transition-colors cursor-pointer"
                          >
                            {copiedBgPrompt ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedBgPrompt ? "Skopiowano!" : "Kopiuj Prompt"}</span>
                          </button>
                        </div>
                      );
                    })()}

                    {bgNotice && (
                      <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                        {bgNotice}
                      </div>
                    )}
                  </div>
                </div>

                {/* Aktywne Tło & Wgrywanie */}
                <div className="bg-[#1D2333] p-4 rounded-lg border border-[#2C354B] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2C354B] pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Wybór Tła i Wgrywanie
                    </span>
                    <button
                      type="button"
                      onClick={() => fileUploadInputRef.current?.click()}
                      className="text-xs font-bold text-[#38BDF8] hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> + Wgraj pobrany plik
                    </button>
                    <input
                      type="file"
                      ref={fileUploadInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const dataUrl = ev.target?.result as string;
                            if (dataUrl) {
                              const newBg = {
                                id: "custom-" + Date.now(),
                                name: `📁 ${file.name.slice(0, 24)}`,
                                url: dataUrl,
                              };
                              setCustomUploadedBgs((prev) => [newBg, ...prev]);
                              setSelectedBgId(newBg.id);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Wybierz aktywne tło:
                    </label>
                    <select
                      value={selectedBgId}
                      onChange={(e) => setSelectedBgId(e.target.value)}
                      className="w-full text-xs font-bold py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-[#38BDF8] focus:outline-none"
                    >
                      {allAvailableBgs.map((bg) => (
                        <option key={bg.id} value={bg.id}>
                          {bg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Format Kadru:
                      </label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as any)}
                        className="w-full text-xs font-bold py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:outline-none"
                      >
                        <option value="4:5">4:5 Karuzela Instagram (1080x1350)</option>
                        <option value="9:16">9:16 TikTok / Reels Slides (1080x1920)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Znak Wodny / Handle:
                      </label>
                      <input
                        type="text"
                        value={userHandle}
                        onChange={(e) => setUserHandle(e.target.value)}
                        placeholder="stark_focus"
                        className="w-full text-xs font-mono py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#2C354B]/60">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Zestaw Czcionek Karuzeli (Dedykowane):
                      </label>
                      <select
                        value={fontChoice}
                        onChange={(e) => setFontChoice(e.target.value as CarouselFontFamily)}
                        className="w-full text-xs font-bold py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-[#E2E8F0] focus:border-[#E2E8F0] focus:outline-none font-sans"
                      >
                        <option value="plus_jakarta">
                          Plus Jakarta Sans (Nowoczesna Czystość)
                        </option>
                        <option value="cinzel">Cinzel (Klasyczne Cesarstwo Rzymskie)</option>
                        <option value="cormorant">Cormorant Garamond (Editorial Elegance)</option>
                        <option value="outfit">Outfit (Geometryczny Stoicki Minimalizm)</option>
                        <option value="syne">Syne (Mocny Bezwzględny Kontrast)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Stały Podpis w Stopce:
                      </label>
                      <input
                        type="text"
                        value={footerSignature}
                        onChange={(e) => setFooterSignature(e.target.value)}
                        placeholder="THE UNFORGIVING STANDARD"
                        className="w-full text-xs font-mono py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#E2E8F0] focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#2C354B]/60">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Styl Karuzeli (Płynność):
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsContinuous((prev) => !prev)}
                      className={`w-full text-xs font-bold py-2 px-3 rounded border text-left flex items-center justify-between cursor-pointer transition-all ${
                        isContinuous
                          ? "bg-[#141824] border-[#10B981] text-[#10B981]"
                          : "bg-[#141824] border-[#2C354B] text-slate-300"
                      }`}
                    >
                      <span>
                        {isContinuous
                          ? "Karuzela Ciągła (Seamless — płynne krawędzie slajdów)"
                          : "Slajdy Osobne (Klasyczne — niezależne slajdy)"}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                        {isContinuous ? "AKTYWNA" : "WYŁ"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions / Navigation */}
            <div className="flex items-center justify-between pt-1 border-t border-[#2C354B]">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-sm bg-[#1D2333] border border-[#2C354B] text-xs font-bold text-white hover:border-[#38BDF8] disabled:opacity-40 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Poprzedni
                </button>
                <button
                  disabled={currentSlideIndex === slides.length - 1}
                  onClick={() =>
                    setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))
                  }
                  className="px-3 py-1.5 rounded-sm bg-[#1D2333] border border-[#2C354B] text-xs font-bold text-white hover:border-[#38BDF8] disabled:opacity-40 flex items-center gap-1 transition-all cursor-pointer"
                >
                  Następny <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {exportError && (
                <div className="p-2 bg-rose-500/15 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
                  {exportError}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCurrentPNG}
                  className="px-3 py-2 rounded-sm bg-transparent border border-[#38BDF8] hover:bg-[#38BDF8]/10 text-xs font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Ten Slajd (PNG)
                </button>

                <button
                  onClick={handleDownloadZip}
                  disabled={isExportingZip}
                  className="px-4 py-2 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  <FolderArchive className="w-4 h-4" />
                  {isExportingZip
                    ? "Pakowanie ZIP..."
                    : `Eksportuj Wszystkie (${slides.length} PNG w ZIP)`}
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Live Preview (Right 5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#0B0F19] rounded-lg border border-[#2C354B] p-4 relative min-h-[460px]">
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              PODGLĄD LIVE • Slajd {currentSlideIndex + 1}/{slides.length}
            </div>

            <div className="absolute top-3 right-3 text-[10px] font-mono text-[#38BDF8] border border-[#38BDF8]/40 px-1.5 py-0.5 rounded-xs">
              {aspectRatio === "4:5" ? "1080 × 1350" : "1080 × 1920"}
            </div>

            <div className="w-full flex items-center justify-center py-3">
              <canvas
                ref={canvasRef}
                className="max-h-[500px] max-w-full rounded shadow-2xl border border-[#2C354B]/60 object-contain"
              />
            </div>

            {/* Szybka korekta pozycji tekstu bezpośrednio pod podglądem */}
            <div className="w-full flex items-center justify-between bg-[#141824] px-3 py-2 rounded border border-[#2C354B] mb-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="text-slate-400">Pozycja tekstu:</span>
                <span className="text-[#38BDF8] font-bold">
                  {(slides[currentSlideIndex]?.textOffsetY || 0) > 0
                    ? `+${slides[currentSlideIndex]?.textOffsetY}px`
                    : `${slides[currentSlideIndex]?.textOffsetY || 0}px`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateSlide(
                      "textOffsetY",
                      (slides[currentSlideIndex]?.textOffsetY || 0) - 15,
                    )
                  }
                  className="px-2 py-1 bg-[#1D2333] hover:bg-[#2C354B] text-white rounded border border-[#2C354B] text-[10px] cursor-pointer"
                  title="Przesuń tekst o 15px w górę"
                >
                  ▲ Wyżej
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateSlide("textOffsetY", 0)}
                  className="px-2 py-1 bg-[#1D2333] hover:bg-[#2C354B] text-[#38BDF8] rounded border border-[#2C354B] text-[10px] cursor-pointer"
                  title="Wyzeruj przesunięcie tekstu"
                >
                  ● Środek
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateSlide(
                      "textOffsetY",
                      (slides[currentSlideIndex]?.textOffsetY || 0) + 15,
                    )
                  }
                  className="px-2 py-1 bg-[#1D2333] hover:bg-[#2C354B] text-white rounded border border-[#2C354B] text-[10px] cursor-pointer"
                  title="Przesuń tekst o 15px w dół"
                >
                  ▼ Niżej
                </button>
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-[#2C354B]/60">
              <span>
                Motyw: <strong className="text-white">{activeThemeConfig.name}</strong>
              </span>
              <span>
                Czcionka: <strong className="text-[#38BDF8]">{fontChoice}</strong> •{" "}
                {isContinuous ? "Ciągła" : "Osobna"}
              </span>
            </div>

            {/* Pozioma taśma miniaturek wszystkich slajdów na dole podglądu */}
            <div className="w-full pt-2.5 mt-2 border-t border-[#2C354B]/60 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>TAŚMA SLAJDÓW ({slides.length}):</span>
                <span className="text-[#38BDF8]">Aktywny: #{currentSlideIndex + 1}</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {slides.map((s, idx) => {
                  const isCurrent = idx === currentSlideIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`group relative shrink-0 w-16 h-20 rounded border p-1 flex flex-col justify-between text-left transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-[#1E293B] border-[#38BDF8] ring-1 ring-[#38BDF8] shadow-md shadow-[#38BDF8]/20"
                          : "bg-[#141824] border-[#2C354B] hover:border-slate-400 opacity-75 hover:opacity-100"
                      }`}
                      title={`Przejdź do slajdu ${idx + 1}: ${s.headline || "Bez tytułu"}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                            isCurrent
                              ? "bg-[#38BDF8] text-[#141824] font-black"
                              : "bg-black/60 text-slate-300 font-bold"
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        {idx === 0 && (
                          <span className="text-[7px] font-mono text-[#38BDF8] uppercase font-bold">
                            HOOK
                          </span>
                        )}
                        {idx === slides.length - 1 && (
                          <span className="text-[7px] font-mono text-amber-400 uppercase font-bold">
                            CTA
                          </span>
                        )}
                      </div>
                      <p className="text-[7px] font-bold text-white line-clamp-2 leading-tight uppercase font-mono">
                        {s.headline || "SLAJD"}
                      </p>
                      <div className="w-full h-0.5 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full ${isCurrent ? "bg-[#38BDF8]" : "bg-transparent"}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
