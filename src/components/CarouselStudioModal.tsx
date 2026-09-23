// CarouselStudioModal.tsx — Studio karuzeli 4:5: każdy slajd to osobny canvas z
// istniejącego silnika (drawSlideToCanvas), eksport to ZIP lub pojedynczy PNG.
// Rodzic montuje modal tylko gdy jest otwarty, więc slajdy normalizujemy raz —
// przy inicjalizacji stanu.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Layers, Loader2, Download, FileArchive, X } from "lucide-react";
import {
  drawSlideToCanvas,
  exportAllSlidesAsZip,
  exportSlideToBlob,
} from "../utils/canvasRenderer";
import type { RenderSlideOptions } from "../utils/canvasRenderer";
import type { CarouselFontFamily, SlideData, TopHeaderMode, VisualTheme } from "../types";

const SLIDE_W = 1080;
const SLIDE_H = 1350; // 4:5 — standard karuzeli IG/TikTok
const MAX_SLIDES = 10; // twarde zdjęcie platformy — więcej canvasów nie ma sensu
const HEADLINE_MAX = 160;
const BODY_MAX = 700;

const THEMES: Array<{ id: VisualTheme; label: string }> = [
  { id: "obsidian_monolith", label: "Obsydian (cyjan)" },
  { id: "titanium_slate", label: "Tytan (stal)" },
  { id: "pantheon_mist", label: "Panteon (złoto)" },
  { id: "crimson_eclipse", label: "Karmazyn (czerwień)" },
];

const FONTS: Array<{ id: CarouselFontFamily; label: string }> = [
  { id: "plus_jakarta", label: "Plus Jakarta Sans" },
  { id: "cinzel", label: "Cinzel" },
  { id: "cormorant", label: "Cormorant Garamond" },
  { id: "inter", label: "Inter" },
];

const HEADERS: Array<{ id: TopHeaderMode; label: string }> = [
  { id: "protocol_standard", label: "STARK FOCUS" },
  { id: "daily_discipline", label: "DAILY DISCIPLINE" },
  { id: "cold_truth", label: "THE COLD TRUTH" },
  { id: "clean_void", label: "Czysta góra" },
];

const FIELD =
  "w-full px-2.5 py-1.5 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-[11px] font-mono text-white focus:outline-none focus:border-white";

interface CarouselStudioModalProps {
  title: string;
  slides: unknown; // odpowiedź modelu / banku treści — kształt niezaufany
  caption?: string;
  handle: string;
  onClose: () => void;
}

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Slajdy od modelu bywają stringami, nullami albo tablicą niepewną — nie throwujemy. */
function normalizeSlides(raw: unknown): SlideData[] {
  const list = Array.isArray(raw) ? raw.slice(0, MAX_SLIDES) : [];
  const slides: SlideData[] = [];

  for (const entry of list) {
    if (typeof entry === "string") {
      slides.push({ headline: text(entry, HEADLINE_MAX), bodyText: "" });
      continue;
    }
    if (!entry || typeof entry !== "object") {
      slides.push({ headline: "", bodyText: "" });
      continue;
    }
    const slide = entry as Record<string, unknown>;
    const highlightWords = text(slide.highlightWords, 200);
    const next: SlideData = {
      headline: text(slide.headline, HEADLINE_MAX),
      bodyText: text(slide.bodyText, BODY_MAX),
    };
    if (highlightWords) next.highlightWords = highlightWords;
    slides.push(next);
  }

  // Pusta karuzela nadal musi być edytowalnym studiem, więc startujemy od jednego slajdu
  return slides.length > 0 ? slides : [{ headline: "", bodyText: "" }];
}

function fontSpecs(fontChoice: CarouselFontFamily): string[] {
  const family =
    fontChoice === "cinzel"
      ? '"Cinzel"'
      : fontChoice === "cormorant"
        ? '"Cormorant Garamond"'
        : fontChoice === "inter"
          ? '"Inter"'
          : '"Plus Jakarta Sans"';
  return [`700 64px ${family}`, `400 32px ${family}`, '500 24px "Space Grotesk"'];
}

/** Canvas nie pobiera fontów sam — bez tego podgląd i eksport wychodzą w krój awaryjny. */
async function warmBrandFonts(fontChoice: CarouselFontFamily): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  await Promise.all(fontSpecs(fontChoice).map((spec) => fonts.load(spec).catch(() => null)));
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "karuzela";

export const CarouselStudioModal: React.FC<CarouselStudioModalProps> = ({
  title,
  slides: incomingSlides,
  caption,
  handle,
  onClose,
}) => {
  const [slides, setSlides] = useState<SlideData[]>(() => normalizeSlides(incomingSlides));
  const [theme, setTheme] = useState<VisualTheme>("obsidian_monolith");
  const [fontChoice, setFontChoice] = useState<CarouselFontFamily>("plus_jakarta");
  const [topHeaderMode, setTopHeaderMode] = useState<TopHeaderMode>("protocol_standard");
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [busyPngIndex, setBusyPngIndex] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  const buildOptions = useCallback(
    (index: number): RenderSlideOptions => ({
      width: SLIDE_W,
      height: SLIDE_H,
      slideNumber: index + 1,
      totalSlides: slides.length,
      headline: slides[index]?.headline ?? "",
      bodyText: slides[index]?.bodyText ?? "",
      highlightWords: slides[index]?.highlightWords,
      handle,
      theme,
      fontChoice,
      topHeaderMode,
    }),
    [slides, handle, theme, fontChoice, topHeaderMode],
  );

  useEffect(() => {
    let cancelled = false;
    // 150 ms wstrzymania: pełny kadr 1080x1350 rysujemy dopiero gdy user przestanie pisać
    const timer = setTimeout(() => {
      void warmBrandFonts(fontChoice).then(() => {
        if (cancelled) return;
        slides.forEach((_, index) => {
          const canvas = canvasRefs.current[index];
          if (canvas) drawSlideToCanvas(canvas, buildOptions(index));
        });
      });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slides, buildOptions, fontChoice]);

  const patchSlide = (index: number, field: "headline" | "bodyText", value: string) => {
    const max = field === "headline" ? HEADLINE_MAX : BODY_MAX;
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, [field]: value.slice(0, max) } : slide)),
    );
  };

  const handleDownloadPng = async (index: number) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    setBusyPngIndex(index);
    setExportError(null);
    try {
      await warmBrandFonts(fontChoice);
      const blob = await exportSlideToBlob(canvas, buildOptions(index));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stark_slide_${index + 1}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Nie udało się wygenerować PNG tego slajdu.");
    } finally {
      setBusyPngIndex(null);
    }
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    setExportError(null);
    try {
      await warmBrandFonts(fontChoice);
      // Bez opisu od AI i tak pakujemy treść slajdów — ZIP ma być gotowy do publikacji
      const captionText =
        text(caption, 5000) ||
        slides
          .map((slide, i) => `Slajd ${i + 1}: ${slide.headline}\n${slide.bodyText}`)
          .join("\n\n");
      await exportAllSlidesAsZip(slides, {
        ...buildOptions(0),
        slideNumber: 1,
        totalSlides: slides.length,
        captionText,
        zipName: `stark_karuzela_${slugify(title)}_${Date.now()}.zip`,
      });
    } catch {
      setExportError("Eksport ZIP nie powiódł się. Spróbuj ponownie.");
    } finally {
      setIsExportingZip(false);
    }
  };

  const isEmptyCarousel = slides.every((slide) => !slide.headline && !slide.bodyText);

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0E0E0E] border border-[rgba(255,255,255,0.12)] rounded-xl">
        {/* Nagłówek */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="min-w-0">
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Studio Karuzeli 4:5
            </h3>
            <p className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
              {title || "Bez tytułu"} • {slides.length} slajdów • {SLIDE_W}×{SLIDE_H} px
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white cursor-pointer shrink-0"
            title="Zamknij studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sterowanie kadrem */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-4 border-b border-[rgba(255,255,255,0.1)]">
          <label className="space-y-1">
            <span className="text-[10px] text-neutral-500 font-mono uppercase font-bold block">
              Motyw marki
            </span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as VisualTheme)}
              className={FIELD}
            >
              {THEMES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-neutral-500 font-mono uppercase font-bold block">
              Krój pisma
            </span>
            <select
              value={fontChoice}
              onChange={(e) => setFontChoice(e.target.value as CarouselFontFamily)}
              className={FIELD}
            >
              {FONTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-neutral-500 font-mono uppercase font-bold block">
              Belka nagłówka
            </span>
            <select
              value={topHeaderMode}
              onChange={(e) => setTopHeaderMode(e.target.value as TopHeaderMode)}
              className={FIELD}
            >
              {HEADERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Podgląd slajdów */}
        <div className="overflow-y-auto p-4 flex-1">
          {isEmptyCarousel && (
            <p className="mb-3 p-2.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded text-[11px] font-mono text-[#F59E0B]">
              Slajdy są puste — wpisz nagłówki i treść poniżej, a potem pobierz ZIP.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((slide, index) => (
              <div
                key={index}
                className="p-3 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">
                    Slajd {index + 1} / {slides.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadPng(index)}
                    disabled={busyPngIndex !== null}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-[10px] font-mono uppercase font-bold text-neutral-300 transition-all cursor-pointer disabled:opacity-40"
                    title={`Pobierz slajd ${index + 1} jako PNG`}
                  >
                    {busyPngIndex === index ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    PNG
                  </button>
                </div>

                <canvas
                  ref={(el) => {
                    canvasRefs.current[index] = el;
                  }}
                  width={SLIDE_W}
                  height={SLIDE_H}
                  className="w-full h-auto block rounded border border-[rgba(255,255,255,0.08)] bg-black"
                />

                <input
                  type="text"
                  value={slide.headline}
                  onChange={(e) => patchSlide(index, "headline", e.target.value)}
                  placeholder="NAGŁÓWEK SLAJDU"
                  className={FIELD}
                />
                <textarea
                  value={slide.bodyText}
                  onChange={(e) => patchSlide(index, "bodyText", e.target.value)}
                  placeholder="Treść slajdu (1-2 zdania)"
                  rows={3}
                  className={`${FIELD} resize-y leading-relaxed`}
                />
                {slide.highlightWords && (
                  <p className="text-[10px] font-mono text-neutral-500 truncate">
                    Wyróżnienia: {slide.highlightWords}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stopka eksportu */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 min-w-0">
            {exportError && (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {exportError}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={isExportingZip}
            className="px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isExportingZip ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileArchive className="w-4 h-4" />
            )}
            <span>{isExportingZip ? "Pakuję slajdy..." : "Pobierz ZIP (4:5)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
