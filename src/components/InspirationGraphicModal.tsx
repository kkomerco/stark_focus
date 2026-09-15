import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Download,
  Copy,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
  Sliders,
  RefreshCw,
  Zap,
  Film,
  ArrowRight,
  Upload,
  CheckCircle2,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Palette,
  Eye,
  Type,
  Video,
} from "lucide-react";
import { VisualTheme, SlideData } from "../types";

export interface InspirationSourceData {
  title: string;
  hookText: string;
  whyItWorks?: string;
  audioTitle?: string;
  adaptationForStark?: string;
  thumbnailUrl: string;
  url?: string;
  creator?: string;
  platform?: string;
  notes?: string;
}

interface InspirationGraphicModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspiration: InspirationSourceData | null;
  handle?: string;
  onSaveToPipeline?: (post: {
    title: string;
    format: string;
    asset: string;
    caption: string;
  }) => void;
  onOpenCarouselStudio?: (title?: string, slides?: SlideData[]) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSwitchToPipeline?: () => void;
}

export type ViralSchemeId =
  | "rapid_cut_broll" // Rolka ze zmieniającym się tłem co 0.5s z napisem na środku
  | "black_quote_highlight" // Czarne tło z cytatem na środku i wyróżnionymi słowami
  | "cinematic_zoom_7s" // Kinowy najazd 7s z wyśrodkowanym hookiem
  | "typewriter_reveal"; // Maszyna do pisania na czerni

export interface BrollMotif {
  id: string;
  name: string;
  badge: string;
  description: string;
  images: string[];
}

const BROLL_MOTIFS: BrollMotif[] = [
  {
    id: "statues",
    name: "🏛️ Stoickie Rzeźby & Marmur",
    badge: "Marek Aureliusz & Bazalt",
    description: "Starożytne popiersia z ciemnego marmuru, monolity i dramatyczny światłocień.",
    images: [
      "/backgrounds/stark_dark_monolith.jpg",
      "/backgrounds/stark_noir_studio.jpg",
      "/backgrounds/stark_void_horizon.jpg",
      "https://images.unsplash.com/photo-1549887534-1541e9326642?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1080&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "gym",
    name: "🏋️ Siłownia, Żelazo & Pot",
    badge: "Brutalny Trening w Mroku",
    description: "Ciężary w mroku, magnezja, pot i bezkompromisowa dyscyplina fizyczna.",
    images: [
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1080&auto=format&fit=crop&q=80",
      "/backgrounds/stark_matte_carbon.jpg",
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1080&auto=format&fit=crop&q=80",
    ],
  },
  {
    id: "rain_city",
    name: "🌧️ Nocne Miasto & Deszcz",
    badge: "Ciemne Wieżowce & Mrok",
    description: "Deszcz na szybach, neonowe odbicia, puste ulice o 4:00 nad ranem.",
    images: [
      "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&auto=format&fit=crop&q=80",
      "/backgrounds/stark_brutalist_slit.jpg",
    ],
  },
  {
    id: "boxing",
    name: "🥊 Boks & Cienie Wojowników",
    badge: "Skupienie & Walka w Mroku",
    description: "Cienie w ringu, bandaże, rękawice bokserskie i surowy instynkt przetrwania.",
    images: [
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1509563423082-f198103c8060?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1080&auto=format&fit=crop&q=80",
      "/backgrounds/stark_dark_monolith.jpg",
    ],
  },
  {
    id: "nature_fog",
    name: "🌲 Mglisty Las & Samotność",
    badge: "Cisza & Surowa Natura",
    description: "Gęsta mgła pośród sosen, zimny górski szczyt, surowa samotność.",
    images: [
      "https://images.unsplash.com/photo-1511497584788-87676104235f?w=1080&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&auto=format&fit=crop&q=80",
      "/backgrounds/stark_void_horizon.jpg",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1080&auto=format&fit=crop&q=80",
    ],
  },
];

const SCHEME_DEFINITIONS: Array<{
  id: ViralSchemeId;
  name: string;
  badge: string;
  desc: string;
  icon: string;
}> = [
  {
    id: "rapid_cut_broll",
    name: "Rolka ze zmieniającym się tłem",
    badge: "Rapid Cut 0.5s",
    desc: "W tle seria ujęć zmieniających się co 0.5s w spójnym motywie + wyśrodkowany napis z podświetleniem.",
    icon: "⚡",
  },
  {
    id: "black_quote_highlight",
    name: "Czarne tło z cytatem i wyróżnieniem",
    badge: "Obsidian Quote",
    desc: "Czysta głęboka czerń OLED lub subtelny dym + potężny cytat z 1-2 słowami w kolorze akcentu.",
    icon: "♟️",
  },
  {
    id: "cinematic_zoom_7s",
    name: "Kinowy zoom 7s (Slow Cinematic)",
    badge: "Kinowy Monolog",
    desc: "Powolny, hipnotyzujący najazd na rzeźbę/kadr w tle z pulsującym napisem w bezpiecznej strefie.",
    icon: "🏛️",
  },
  {
    id: "typewriter_reveal",
    name: "Maszyna do pisania na czerni",
    badge: "Typewriter Reveal",
    desc: "Tekst piszący się na żywo litera po literze z pulsującym kursorem na mrocznym tle.",
    icon: "📜",
  },
];

const HIGHLIGHT_COLORS = [
  { id: "yellow_neon", name: "Żółty Neon", hex: "#FACC15", textClass: "text-yellow-400" },
  { id: "cyber_cyan", name: "Cyber Cyan", hex: "#00F2FE", textClass: "text-[#00F2FE]" },
  { id: "pure_gold", name: "Złoto Stoickie", hex: "#F59E0B", textClass: "text-amber-400" },
  { id: "pure_white", name: "Czysta Biel", hex: "#FFFFFF", textClass: "text-white" },
];

const CUT_INTERVALS = [
  { sec: 0.3, label: "0.3s (Ultra Fast)" },
  { sec: 0.5, label: "0.5s (Wirusowy TikTok)" },
  { sec: 0.8, label: "0.8s (Kinowe)" },
  { sec: 1.0, label: "1.0s (Spokojne)" },
  { sec: 1.5, label: "1.5s (Refleksyjne)" },
  { sec: 2.0, label: "2.0s (Głębokie)" },
];

export const InspirationGraphicModal: React.FC<InspirationGraphicModalProps> = ({
  isOpen,
  onClose,
  inspiration,
  handle = "stark_focus",
  onSaveToPipeline,
  onOpenCarouselStudio,
  onOpenVideoStudio,
  onSwitchToPipeline,
}) => {
  // Primary Viral Scheme State
  const [selectedScheme, setSelectedScheme] = useState<ViralSchemeId>("rapid_cut_broll");
  const [selectedMotifId, setSelectedMotifId] = useState<string>("statues");
  const [cutIntervalSec, setCutIntervalSec] = useState<number>(0.5);
  const [highlightColor, setHighlightColor] = useState<string>("#FACC15"); // Yellow neon by default
  const [overlayDarkness, setOverlayDarkness] = useState<number>(65); // 65% darkness for optimal readability
  const [includeThumbnailInCuts, setIncludeThumbnailInCuts] = useState<boolean>(true);

  // Original Stoic Content (Never stolen, 100% original inspired by pattern psychology)
  const [originalHook, setOriginalHook] = useState<string>("YOUR STANDARDS DETERMINE YOUR DESTINY");
  const [originalPunchline, setOriginalPunchline] = useState<string>(
    "Never lower them for temporary comfort.",
  );
  const [highlightWords, setHighlightWords] = useState<string[]>(["STANDARDS", "DESTINY"]);
  const [originalCaption, setOriginalCaption] = useState<string>("");
  const [categoryTag, setCategoryTag] = useState<string>("VIRAL PATTERN // STARK_FOCUS");

  // Video Animation & Player State (60 FPS Canvas)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const durationSec = 7.0; // 7.0s optimal reel loop length

  // Export States
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [videoExportProgress, setVideoExportProgress] = useState<number>(0);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Canvas & Media References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const loadedImagesRef = useRef<HTMLImageElement[]>([]);
  const userUploadInputRef = useRef<HTMLInputElement | null>(null);
  const customUploadedImagesRef = useRef<string[]>([]);
  const particlesRef = useRef<
    Array<{ x: number; y: number; size: number; speed: number; opacity: number }>
  >([]);

  // Initialize Particles once
  useEffect(() => {
    const list = [];
    for (let i = 0; i < 45; i++) {
      list.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        size: Math.random() * 2.5 + 0.8,
        speed: Math.random() * 0.9 + 0.3,
        opacity: Math.random() * 0.7 + 0.2,
      });
    }
    particlesRef.current = list;
  }, []);

  // Initialize Stoic Content inspired by the pattern when modal opens or inspiration changes
  useEffect(() => {
    if (!inspiration) return;

    // Detect if inspiration notes or title suggest black quote or rapid cut
    const noteText = (inspiration.notes || "").toLowerCase();
    const titleText = (inspiration.title || "").toLowerCase();
    const hookSource = (inspiration.hookText || "").toLowerCase();

    if (
      noteText.includes("czarn") ||
      noteText.includes("cytat") ||
      noteText.includes("black") ||
      noteText.includes("quote")
    ) {
      setSelectedScheme("black_quote_highlight");
    } else {
      setSelectedScheme("rapid_cut_broll");
    }

    // Generate smart initial original hook and caption inspired by the essence
    // If the hook is in English, adapt stoically without stealing exact sentences
    const wordsInHook = (inspiration.hookText || inspiration.title || "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .map((w) => w.toUpperCase());

    const chosenKeywords = wordsInHook.slice(0, 2);
    const safeKeywords = chosenKeywords.length > 0 ? chosenKeywords : ["STANDARDS", "DESTINY"];

    let initialHook = "YOUR STANDARDS DETERMINE YOUR DESTINY";
    const initialPunch = "Never lower them for temporary comfort.";

    // Create unique inspired hook based on source
    if (inspiration.hookText && inspiration.hookText.trim().length > 3) {
      const clean = inspiration.hookText.trim().toUpperCase();
      // If short enough (under 45 chars), adapt it cleanly
      if (clean.length <= 45 && !clean.includes("HTTP")) {
        initialHook = clean;
      }
    }

    setOriginalHook(initialHook);
    setOriginalPunchline(initialPunch);
    setHighlightWords(safeKeywords);

    const safeCaption = `${initialHook}\n\n${initialPunch} Motivation is an emotional trap designed for spectators. Sovereign operators execute when they hate every single second of the grind.\n\nSave this reminder. Review tomorrow at 6:00 AM.\n\n// @${handle}\n\n#stoicism #discipline #mentaltoughness #focus #starkfocus #monkmode #relentless`;
    setOriginalCaption(safeCaption);
    setCategoryTag(`SCHEMAT WZORCA // @${inspiration.creator || "VIRAL"}`);
  }, [inspiration, handle]);

  // Load B-Roll Image Set whenever Motif or Inspiration thumbnail changes
  useEffect(() => {
    const motif = BROLL_MOTIFS.find((m) => m.id === selectedMotifId) || BROLL_MOTIFS[0];
    const imageCandidates: string[] = [];

    // Add inspiration thumbnail if requested and available
    if (includeThumbnailInCuts && inspiration?.thumbnailUrl) {
      imageCandidates.push(inspiration.thumbnailUrl);
    }

    // Add user custom uploaded images
    customUploadedImagesRef.current.forEach((url) => imageCandidates.push(url));

    // Add curated motif images
    motif.images.forEach((url) => imageCandidates.push(url));

    // Preload HTMLImageElement objects
    const loadedList: HTMLImageElement[] = [];
    imageCandidates.forEach((src) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      // Route external URLs through /api/proxy-image to guarantee no CORS / tainted canvas
      const effectiveSrc =
        src.startsWith("http://") || src.startsWith("https://")
          ? `/api/proxy-image?url=${encodeURIComponent(src)}`
          : src;
      img.src = effectiveSrc;
      img.onload = () => {
        loadedList.push(img);
        loadedImagesRef.current = [...loadedList];
      };
      img.onerror = () => {
        // Silently skip broken images
      };
    });
  }, [selectedMotifId, includeThumbnailInCuts, inspiration?.thumbnailUrl]);

  // Handle AI Stoic Regeneration (Calls backend with schemeId)
  const handleRegenerateWithAi = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/ai/generate-scheme-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId: selectedScheme,
          themeMotif: selectedMotifId,
          inspirationTitle: inspiration?.title || "",
          inspirationNotes: inspiration?.notes || "",
          userInstruction: "Mocny, bezwzględny hook 1-2 linijki ALL CAPS ze słowami do wyróżnienia",
        }),
      });
      const data = await res.json();
      if (data && data.hook) {
        setOriginalHook(data.hook);
        if (data.highlightWords && Array.isArray(data.highlightWords)) {
          setHighlightWords(data.highlightWords);
        }
        if (data.punchline) {
          setOriginalPunchline(data.punchline);
        }
        if (data.caption) {
          setOriginalCaption(data.caption);
        }
      }
    } catch (err) {
      console.warn("AI scheme regeneration notice:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Toggle highlight on a specific word
  const toggleHighlightWord = (word: string) => {
    const clean = word.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!clean) return;
    setHighlightWords((prev) =>
      prev.includes(clean) ? prev.filter((w) => w !== clean) : [...prev, clean],
    );
  };

  // -------------------------------------------------------------
  // CORE CANVAS RENDERING ENGINE (1080x1920 9:16 Vertical Reel)
  // -------------------------------------------------------------
  const renderFrame = useCallback(
    (
      timeSec: number,
      targetCtx?: CanvasRenderingContext2D,
      width: number = 1080,
      height: number = 1920,
    ) => {
      const ctx = targetCtx || canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const progress = Math.min(1, Math.max(0, timeSec / durationSec));
      const darknessAlpha = overlayDarkness / 100;

      // ---------------------------------------------------------
      // 1. BACKGROUND RENDERING ACCORDING TO VIRAL SCHEME
      // ---------------------------------------------------------
      if (selectedScheme === "rapid_cut_broll") {
        const images = loadedImagesRef.current;
        if (images.length > 0) {
          // Calculate which image index to show based on cutIntervalSec
          const sliceIndex = Math.floor(timeSec / cutIntervalSec) % images.length;
          const currentImg = images[sliceIndex];

          // Micro Ken Burns slow pan within the 0.5s slice
          const sliceTime = timeSec % cutIntervalSec;
          const sliceProgress = sliceTime / cutIntervalSec;
          const zoom = 1.0 + sliceProgress * 0.025;

          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(zoom, zoom);
          try {
            ctx.drawImage(currentImg, -width / 2, -height / 2, width, height);
          } catch {
            // Fallback gradient if drawImage fails
            ctx.fillStyle = "#0B0F19";
            ctx.fillRect(-width / 2, -height / 2, width, height);
          }
          ctx.restore();

          // Cut Flash: First 0.05s of each slice has a very subtle 14% white flash
          if (sliceTime < 0.05) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
            ctx.fillRect(0, 0, width, height);
          }
        } else {
          // Procedural dark textured fallback
          const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
          bgGrad.addColorStop(0, "#04060A");
          bgGrad.addColorStop(0.5, "#0E1422");
          bgGrad.addColorStop(1, "#020306");
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, width, height);
        }

        // Cinematic Dark Vignette & Readability Gradient Overlay
        const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
        overlayGrad.addColorStop(0, `rgba(3, 5, 8, ${darknessAlpha * 0.9})`);
        overlayGrad.addColorStop(0.35, `rgba(5, 7, 12, ${darknessAlpha * 0.65})`);
        overlayGrad.addColorStop(0.65, `rgba(5, 7, 12, ${darknessAlpha * 0.75})`);
        overlayGrad.addColorStop(1, `rgba(3, 5, 8, ${darknessAlpha * 0.95})`);
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, width, height);
      } else if (
        selectedScheme === "black_quote_highlight" ||
        selectedScheme === "typewriter_reveal"
      ) {
        // Deep Pitch-Black OLED Obsidian (#020306)
        ctx.fillStyle = "#020306";
        ctx.fillRect(0, 0, width, height);

        // Very subtle radial chiaroscuro center glow
        const radGrad = ctx.createRadialGradient(
          width / 2,
          height / 2,
          80,
          width / 2,
          height / 2,
          height * 0.65,
        );
        radGrad.addColorStop(0, "rgba(20, 30, 48, 0.25)");
        radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);

        // Floating Silver Stardust Particles
        particlesRef.current.forEach((p) => {
          p.y -= p.speed * 0.8;
          if (p.y < 0) p.y = height;
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.45})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (selectedScheme === "cinematic_zoom_7s") {
        const images = loadedImagesRef.current;
        if (images.length > 0) {
          const img = images[0];
          // Continuous 7-second slow push-in zoom 1.0 -> 1.08
          const zoom = 1.0 + progress * 0.08;
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(zoom, zoom);
          try {
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
          } catch {
            ctx.fillStyle = "#0B0F19";
            ctx.fillRect(-width / 2, -height / 2, width, height);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = "#04060A";
          ctx.fillRect(0, 0, width, height);
        }

        const overlayGrad = ctx.createLinearGradient(0, 0, 0, height);
        overlayGrad.addColorStop(0, `rgba(3, 5, 8, ${darknessAlpha * 0.85})`);
        overlayGrad.addColorStop(0.5, `rgba(5, 7, 12, ${darknessAlpha * 0.6})`);
        overlayGrad.addColorStop(1, `rgba(3, 5, 8, ${darknessAlpha * 0.9})`);
        ctx.fillStyle = overlayGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // ---------------------------------------------------------
      // 2. TOP HEADER & PROTOCOL BADGE (Safe Zone 9:16)
      // ---------------------------------------------------------
      const topSafeY = height * 0.18; // In vertical 9:16, safe zone starts ~18% from top

      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.font = "700 22px monospace";
      ctx.letterSpacing = "3px";
      ctx.fillText(`[ ${categoryTag.toUpperCase()} ]`, width / 2, topSafeY);

      // ---------------------------------------------------------
      // 3. CENTER HOOK WITH SMART KEYWORD HIGHLIGHT
      // ---------------------------------------------------------
      const centerY = height * 0.48; // Centered in optical focus
      const words = originalHook.trim().split(/\s+/);

      // If typewriter scheme, only show letters up to current progress
      let displayHook = originalHook;
      if (selectedScheme === "typewriter_reveal") {
        const totalChars = originalHook.length;
        const visibleCount = Math.min(totalChars, Math.floor(progress * totalChars * 1.35));
        displayHook = originalHook.slice(0, visibleCount);
        // Add blinking cursor
        if (Math.floor(timeSec * 4) % 2 === 0 && visibleCount < totalChars) {
          displayHook += " ▋";
        }
      }

      // Measure & break text into semantic lines
      ctx.font = "900 68px system-ui, -apple-system, sans-serif";
      const maxLineWidth = width * 0.82;
      const lines: string[] = [];
      let currentLine = "";

      const wordsToLayout =
        selectedScheme === "typewriter_reveal" ? displayHook.split(/\s+/) : words;

      wordsToLayout.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        if (testWidth > maxLineWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);

      const lineHeight = 86;
      const totalTextHeight = lines.length * lineHeight;
      let startY = centerY - totalTextHeight / 2;

      // Draw each line word-by-word with highlight support
      lines.forEach((line) => {
        const lineWords = line.split(/\s+/);
        // Calculate total width of line to center properly
        let totalLineWidth = 0;
        const wordMetrics = lineWords.map((w) => {
          const wWidth = ctx.measureText(w + " ").width;
          totalLineWidth += wWidth;
          return { word: w, width: wWidth };
        });

        let curX = (width - totalLineWidth) / 2;

        wordMetrics.forEach(({ word, width: wWidth }) => {
          const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          const isHighlighted = highlightWords.some((hw) => hw.toUpperCase() === cleanWord);

          // Shadow for maximum contrast over dynamic backgrounds
          ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;

          if (isHighlighted) {
            // Highlighted word color (Neon yellow / Cyber cyan)
            ctx.fillStyle = highlightColor;
            // Draw subtle accent pill or glow
            ctx.fillText(word, curX, startY);
          } else {
            // Pure high-contrast white
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(word, curX, startY);
          }

          curX += wWidth;
        });

        startY += lineHeight;
      });

      // Reset shadows
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // ---------------------------------------------------------
      // 4. PUNCHLINE / SUBTITLE
      // ---------------------------------------------------------
      if (originalPunchline) {
        ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
        ctx.font = "500 32px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(originalPunchline, width / 2, startY + 28);
      }

      // ---------------------------------------------------------
      // 5. BOTTOM BRAND SIGNATURE & SAVE CALL-TO-ACTION
      // ---------------------------------------------------------
      const bottomSafeY = height * 0.84;

      // Accent horizontal divider
      const divWidth = 140;
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo((width - divWidth) / 2, bottomSafeY - 45);
      ctx.lineTo((width + divWidth) / 2, bottomSafeY - 45);
      ctx.stroke();

      // Brand handle
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 30px system-ui, -apple-system, sans-serif";
      ctx.letterSpacing = "2px";
      ctx.textAlign = "center";
      ctx.fillText(`@${handle.toUpperCase()}`, width / 2, bottomSafeY);

      // Call to action
      ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
      ctx.font = "700 20px monospace";
      ctx.letterSpacing = "3px";
      ctx.fillText("SAVE FOR MORNING DISCIPLINE // ♟️", width / 2, bottomSafeY + 38);
    },
    [
      selectedScheme,
      cutIntervalSec,
      overlayDarkness,
      highlightColor,
      categoryTag,
      originalHook,
      originalPunchline,
      highlightWords,
      handle,
      durationSec,
    ],
  );

  // 60 FPS Real-time Animation Loop
  useEffect(() => {
    if (!isOpen || isExportingVideo) return;

    let localTime = 0;

    const loop = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      if (isPlaying) {
        localTime += delta;
        if (localTime >= durationSec) {
          localTime = 0; // Seamless loop at 7.00s
        }
        setCurrentTimeSec(localTime);
      }

      renderFrame(localTime);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      lastTimestampRef.current = null;
    };
  }, [isOpen, isPlaying, isExportingVideo, renderFrame, durationSec]);

  // Video Export Handler (Creates real 1080x1920 MP4/WebM video via MediaRecorder)
  const handleExportFullVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsExportingVideo(true);
    setIsPlaying(false);
    setVideoExportProgress(0);

    try {
      // Create off-screen canvas at full 1080x1920 resolution for pristine quality
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = 1080;
      exportCanvas.height = 1920;
      const exportCtx = exportCanvas.getContext("2d");
      if (!exportCtx) throw new Error("Cannot acquire canvas context");

      const stream = exportCanvas.captureStream(60);
      const mimeTypes = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ];
      const selectedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 8000000, // 8 Mbps crisp bitrate
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMime });
        const ext = selectedMime.includes("mp4") ? "mp4" : "webm";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `STARK_FOCUS_REEL_${selectedScheme}_${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExportingVideo(false);
        setIsPlaying(true);
      };

      recorder.start();

      const startTime = performance.now();
      const recordStep = (now: number) => {
        const elapsed = (now - startTime) / 1000;
        if (elapsed >= durationSec) {
          renderFrame(durationSec, exportCtx, 1080, 1920);
          setVideoExportProgress(100);
          setTimeout(() => {
            if (recorder.state === "recording") {
              recorder.stop();
            }
          }, 100);
          return;
        }

        renderFrame(elapsed, exportCtx, 1080, 1920);
        setVideoExportProgress(Math.min(99, Math.round((elapsed / durationSec) * 100)));
        requestAnimationFrame(recordStep);
      };

      requestAnimationFrame(recordStep);
    } catch (err) {
      console.error("Video export error:", err);
      setIsExportingVideo(false);
      setIsPlaying(true);
    }
  };

  // Download High-Resolution Static Frame (PNG HD 1080x1920)
  const handleDownloadStaticFrame = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderFrame(currentTimeSec, ctx, 1080, 1920);
    const link = document.createElement("a");
    link.download = `STARK_FOCUS_FRAME_${selectedScheme}_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  };

  // Copy Frame Image to Clipboard
  const handleCopyFrameToClipboard = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderFrame(currentTimeSec, ctx, 1080, 1920);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (err) {
        console.warn("Clipboard copy error:", err);
      }
    }, "image/png");
  };

  // Save to Pipeline Handler
  const handleSavePost = () => {
    if (!onSaveToPipeline) return;

    // Generate static preview data URL for the pipeline card asset
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      renderFrame(currentTimeSec, ctx, 1080, 1920);
    }
    const assetDataUrl = canvas.toDataURL("image/jpeg", 0.85);

    const schemeName =
      SCHEME_DEFINITIONS.find((s) => s.id === selectedScheme)?.name || "Rolka Wideo";

    onSaveToPipeline({
      title: `${originalHook.slice(0, 45)} [${selectedScheme}]`,
      format: `🎬 ${schemeName}`,
      asset: assetDataUrl,
      caption: originalCaption,
    });

    setSaveSuccessMsg("✓ Zapisano w kolejce LEJEK (+50 XP)!");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Handle user uploading custom B-roll images
  const handleUploadCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          customUploadedImagesRef.current.push(result);
          // Reload images
          const img = new Image();
          img.src = result;
          img.onload = () => {
            loadedImagesRef.current.push(img);
          };
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#141824] border-2 border-[#00F2FE]/50 rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#1D2333] border-b border-[#2C354B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded bg-[#00F2FE]/20 border border-[#00F2FE]/40 text-[#00F2FE]">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black font-mono text-white tracking-wider uppercase">
                  STUDIO SCHEMATU WZORCA 1:1 // VIRAL PATTERN REPLICATOR
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F2FE]/20 text-[#00F2FE] border border-[#00F2FE]/30 font-bold">
                  AUTORSKA TREŚĆ STARK
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Inspirowane strukturą:{" "}
                <strong className="text-slate-200">
                  {inspiration?.title || "Wirusowy format"}
                </strong>{" "}
                • Treść: 100% autorska bez kradzieży cudzych słów.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-[#2C354B] rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Player (9:16) & Right Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (5 cols): Live Canvas Player (9:16) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-between space-y-3 bg-[#0B0F19] p-3 rounded-lg border border-[#2C354B]">
            {/* Live Canvas Preview (9:16 aspect ratio) */}
            <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-md overflow-hidden shadow-2xl border border-[#2C354B] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={1080}
                height={1920}
                className="w-full h-full object-contain"
              />

              {/* Real-Time Playing Indicator Pill */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/20 text-[10px] font-mono text-white flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPlaying ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span>{currentTimeSec.toFixed(1)}s / 7.0s</span>
                <span className="text-slate-400">| 60 FPS</span>
              </div>

              {/* Selected Scheme Badge */}
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-[#00F2FE]/20 backdrop-blur-sm border border-[#00F2FE]/40 text-[9px] font-mono font-bold text-[#00F2FE]">
                {selectedScheme === "rapid_cut_broll" ? "⚡ CIĘCIA CO 0.5s" : "♟️ CZARNY OBSIDIAN"}
              </div>
            </div>

            {/* Video Controls Toolbar */}
            <div className="w-full max-w-[320px] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1 py-1.5 px-3 rounded bg-[#1D2333] hover:bg-[#2C354B] text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors border border-[#2C354B]"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" /> Pauza
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400" /> Odtwórz (60 FPS)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentTimeSec(0);
                    renderFrame(0);
                  }}
                  className="py-1.5 px-2.5 rounded bg-[#1D2333] hover:bg-[#2C354B] text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors border border-[#2C354B]"
                  title="Od początku"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Progress Scrub Bar */}
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={durationSec}
                  step="0.05"
                  value={currentTimeSec}
                  onChange={(e) => {
                    const t = parseFloat(e.target.value);
                    setCurrentTimeSec(t);
                    renderFrame(t);
                  }}
                  className="w-full h-1.5 bg-[#1D2333] rounded-lg appearance-none cursor-pointer accent-[#00F2FE]"
                />
              </div>

              {/* Export Video Actions */}
              <div className="pt-2 border-t border-[#2C354B] space-y-2">
                <button
                  type="button"
                  onClick={handleExportFullVideo}
                  disabled={isExportingVideo}
                  className="w-full py-2.5 px-3 rounded bg-gradient-to-r from-[#00F2FE] via-cyan-300 to-[#00F2FE] hover:brightness-110 text-[#141824] font-black text-xs font-mono uppercase flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg active:scale-98 disabled:opacity-50 animate-pulse"
                >
                  <Film className="w-4 h-4 text-[#141824]" />
                  <span>
                    {isExportingVideo
                      ? `Eksport Wideo (${videoExportProgress}%)...`
                      : "🎬 POBIERZ CAŁY FILMIK (WIDEO 9:16 HD)"}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadStaticFrame}
                    className="py-1.5 px-2 rounded bg-[#1D2333] hover:bg-[#2C354B] text-slate-200 text-xs font-mono flex items-center justify-center gap-1 cursor-pointer border border-[#2C354B]"
                    title="Pobierz klatkę jako PNG HD"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Pobierz Klatkę
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyFrameToClipboard}
                    className="py-1.5 px-2 rounded bg-[#1D2333] hover:bg-[#2C354B] text-slate-200 text-xs font-mono flex items-center justify-center gap-1 cursor-pointer border border-[#2C354B]"
                    title="Kopiuj klatkę do schowka"
                  >
                    {copyFeedback ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Skopiowano
                      </span>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Kopiuj Obraz
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Scheme Settings, Original Copy & Thematic Motifs */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. VIRAL SCHEME SELECTOR */}
            <div className="p-3.5 bg-[#1D2333] rounded-lg border border-[#2C354B] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono font-bold text-[#00F2FE] uppercase flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Krok 1: Wybierz Schemat Wzorca (Viral Structure Archetype):
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  Łapiemy schemat, nie treść
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCHEME_DEFINITIONS.map((s) => {
                  const isSelected = selectedScheme === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedScheme(s.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#00F2FE]/15 border-[#00F2FE] text-white shadow-md"
                          : "bg-[#141824] border-[#2C354B] text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="text-xs font-mono font-black flex items-center gap-1">
                          <span>{s.icon}</span> {s.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-[#00F2FE] text-[#141824] font-black"
                              : "bg-[#1D2333] text-slate-400"
                          }`}
                        >
                          {s.badge}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 leading-tight">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. RAPID CUT CONTROLS (Only visible if rapid cut is selected) */}
            {selectedScheme === "rapid_cut_broll" && (
              <div className="p-3.5 bg-[#1D2333] rounded-lg border border-[#00F2FE]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#00F2FE] uppercase flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5" />
                    Krok 2: Motyw Cięć B-Roll & Tempo Zmiany Teł:
                  </span>
                  <button
                    type="button"
                    onClick={() => userUploadInputRef.current?.click()}
                    className="px-2 py-0.5 rounded bg-[#141824] hover:bg-[#2C354B] text-slate-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer border border-[#2C354B]"
                  >
                    <Upload className="w-3 h-3" />+ Dodaj Własne Ujęcia
                  </button>
                  <input
                    ref={userUploadInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadCustomImage}
                  />
                </div>

                {/* Tempo Cięć (Cut Interval) */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">
                    Tempo zmiany teł w rolce:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CUT_INTERVALS.map((int) => (
                      <button
                        key={int.sec}
                        type="button"
                        onClick={() => setCutIntervalSec(int.sec)}
                        className={`py-1.5 px-2 rounded text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                          cutIntervalSec === int.sec
                            ? "bg-[#00F2FE] text-[#141824] border-[#00F2FE] shadow-sm"
                            : "bg-[#141824] text-slate-300 border-[#2C354B] hover:bg-[#2C354B]"
                        }`}
                      >
                        {int.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motyw Ujęć B-Roll */}
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1 uppercase">
                    Motyw ujęć w tle:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {BROLL_MOTIFS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMotifId(m.id)}
                        className={`p-2 rounded text-left transition-all cursor-pointer border ${
                          selectedMotifId === m.id
                            ? "bg-[#00F2FE]/20 border-[#00F2FE] text-white"
                            : "bg-[#141824] border-[#2C354B] text-slate-300 hover:bg-[#2C354B]"
                        }`}
                      >
                        <div className="text-[11px] font-mono font-bold truncate">{m.name}</div>
                        <div className="text-[9px] font-mono text-slate-400 truncate">
                          {m.badge}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Include original inspiration thumbnail toggle */}
                {inspiration?.thumbnailUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="incThumb"
                      checked={includeThumbnailInCuts}
                      onChange={(e) => setIncludeThumbnailInCuts(e.target.checked)}
                      className="rounded bg-[#141824] border-[#2C354B] accent-[#00F2FE] cursor-pointer"
                    />
                    <label
                      htmlFor="incThumb"
                      className="text-[11px] font-mono text-slate-300 cursor-pointer"
                    >
                      Włącz kadr z oryginalnej inspiracji do pętli zmieniających się ujęć
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* 3. 100% ORIGINAL STOIC COPY ENGINE */}
            <div className="p-3.5 bg-[#1D2333] rounded-lg border border-[#2C354B] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Krok 3: 100% Autorska Treść Stoicka (Inspirowana, Nie Kradziona):
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block">
                    Zero kopiowania cudzego opisu. Czysty stoicki rygor @stark_focus.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerateWithAi}
                  disabled={isGeneratingAi}
                  className="px-3 py-1 rounded bg-[#00F2FE]/20 hover:bg-[#00F2FE]/30 text-[#00F2FE] border border-[#00F2FE]/50 text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingAi ? "animate-spin" : ""}`} />
                  {isGeneratingAi ? "Generuję AI..." : "⚡ Wymuś Nowy Wariant AI"}
                </button>
              </div>

              {/* Hook Input & Word Highlights */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold text-slate-300 block uppercase">
                  Napis na Środku (Hook ALL CAPS):
                </label>
                <input
                  type="text"
                  value={originalHook}
                  onChange={(e) => setOriginalHook(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#00F2FE] focus:outline-none"
                  placeholder="np. YOUR STANDARDS DETERMINE YOUR DESTINY"
                />

                {/* Clickable Words to Toggle Highlight */}
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block mb-1">
                    Kliknij słowo poniżej, aby je wyróżnić kolorem akcentu:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {originalHook.split(/\s+/).map((w, i) => {
                      const clean = w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                      if (!clean) return null;
                      const isHighlighted = highlightWords.includes(clean);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleHighlightWord(clean)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                            isHighlighted
                              ? "bg-amber-400 text-black border-amber-300 shadow-sm"
                              : "bg-[#141824] text-slate-300 border-[#2C354B] hover:bg-[#2C354B]"
                          }`}
                        >
                          {isHighlighted ? `★ ${clean}` : clean}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Punchline & Highlight Color Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase">
                    Podtytuł / Punchline:
                  </label>
                  <input
                    type="text"
                    value={originalPunchline}
                    onChange={(e) => setOriginalPunchline(e.target.value)}
                    className="w-full text-xs font-mono py-1.5 px-2.5 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#00F2FE] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase">
                    Kolor wyróżnienia słów:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setHighlightColor(c.hex)}
                        className={`flex-1 py-1.5 px-1.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer text-center ${
                          highlightColor === c.hex
                            ? "bg-white/10 border-white text-white shadow-sm ring-1 ring-white"
                            : "bg-[#141824] border-[#2C354B] text-slate-400"
                        }`}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Caption (Opis do publikacji z hashtagami) */}
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 block mb-1 uppercase">
                  Autorski Opis do Postu (Caption z hashtagami):
                </label>
                <textarea
                  rows={4}
                  value={originalCaption}
                  onChange={(e) => setOriginalCaption(e.target.value)}
                  className="w-full text-xs font-mono py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#00F2FE] focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* 4. FINAL ACTIONS & PIPELINE INTEGRATION */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-2.5">
              <div className="flex items-center gap-2">
                {onOpenCarouselStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCarouselStudio(`Karuzela: ${originalHook.slice(0, 35)}`);
                      onClose();
                    }}
                    className="px-3 py-2 rounded bg-[#1D2333] hover:bg-[#2C354B] text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-[#2C354B]"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Rozwiń w Karuzelę (5 slajdów)
                  </button>
                )}

                {onOpenVideoStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenVideoStudio(originalHook, inspiration?.thumbnailUrl);
                      onClose();
                    }}
                    className="px-3 py-2 rounded bg-[#1D2333] hover:bg-[#2C354B] text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer border border-[#2C354B]"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Zaawansowane Studio Wideo
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {saveSuccessMsg && (
                  <span className="text-xs font-mono text-emerald-400 font-bold animate-fadeIn">
                    {saveSuccessMsg}
                  </span>
                )}

                {onSaveToPipeline && (
                  <button
                    type="button"
                    onClick={handleSavePost}
                    className="px-4 py-2 rounded bg-[#10B981] hover:bg-[#10B981]/90 text-[#141824] font-black text-xs font-mono uppercase flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Zapisz Post do Lejka (+50 XP)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
