// CarouselStudioModal.tsx — Studio karuzeli 4:5: każdy slajd to osobny canvas z
// istniejącego silnika (drawSlideToCanvas), eksport to ZIP lub pojedynczy PNG.
// Rodzic montuje modal tylko gdy jest otwarty, więc slajdy normalizujemy raz —
// przy inicjalizacji stanu.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, FileArchive, Layers, Loader2, X } from "lucide-react";
import { drawSlideToCanvas, buildCarouselZip, exportSlideToBlob } from "../utils/canvasRenderer";
import type { RenderSlideOptions } from "../utils/canvasRenderer";
import type { CarouselFontFamily, SlideData, TopHeaderMode, VisualTheme } from "../types";
import { stripHashtagTail } from "../lib/caption";
import { CAROUSEL_MAX_SLIDES, CAROUSEL_TARGET_SLIDES } from "../lib/carousel";
import { ensureBrandFonts } from "../utils/fonts";
import { useStudioDraft } from "./useStudioDraft";
import { carouselContentKey, carouselCaptionText } from "../lib/carouselDraft";

const SLIDE_W = 1080;
const SLIDE_H = 1350; // 4:5 — standard karuzeli IG/TikTok
const HEADLINE_MAX = 160;
const BODY_MAX = 700;

const THEMES: Array<{ id: VisualTheme; label: string }> = [
  { id: "obsidian_monolith", label: "Obsydian (kość)" },
  { id: "crimson_eclipse", label: "Karmazyn (czerwień)" },
];

const FONTS: Array<{ id: CarouselFontFamily; label: string }> = [
  { id: "plus_jakarta", label: "Plus Jakarta Sans" },
  { id: "cinzel", label: "Cinzel" },
  { id: "cormorant", label: "Cormorant Garamond" },
];

const HEADERS: Array<{ id: TopHeaderMode; label: string }> = [
  { id: "protocol_standard", label: "STARK FOCUS" },
  { id: "clean_void", label: "Czysta góra" },
];

const FIELD =
  "w-full px-2.5 py-1.5 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-[11px] font-mono text-white focus:outline-none focus:border-white";
const MINI_BTN =
  "px-1.5 py-1 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-[9px] font-mono uppercase font-bold text-neutral-300 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed";

interface CarouselStudioModalProps {
  title: string;
  slides: unknown; // odpowiedź modelu / banku treści — kształt niezaufany
  caption?: string;
  handle: string;
  /**
   * Eksport karuzeli to skończony materiał, więc wchodzi do `data.posts` jak
   * zapisany post: bez tego `usedHookFingerprints` nie miałby czego wykluczyć.
   */
  onSave?: (carousel: { hook: string; title: string; caption: string; slideCount: number }) => void;
  onClose: () => void;
}

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/**
 * Wyróżnienia bywają ciągiem („discipline, silence") albo listą od modelu.
 * Lista wycięta do `""` znaczyła „ten slajd nie ma wyróżnień" — czyli pole
 * istniało w odpowiedzi i znikało bez śladu.
 */
function highlightList(value: unknown, max: number): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => text(item, max))
      .filter(Boolean)
      .join(", ")
      .slice(0, max);
  }
  return text(value, max);
}

/** Slajdy od modelu bywają stringami, nullami albo tablicą niepewną — nie throwujemy. */
function normalizeSlides(raw: unknown): SlideData[] {
  const list = Array.isArray(raw) ? raw.slice(0, CAROUSEL_MAX_SLIDES) : [];
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
    const highlights = highlightList(slide.highlightWords, 200);
    const next: SlideData = {
      headline: text(slide.headline, HEADLINE_MAX),
      bodyText: text(slide.bodyText, BODY_MAX),
    };
    if (highlights) next.highlightWords = highlights;
    slides.push(next);
  }

  // Pusta karuzela nadal musi być edytowalnym studiem, więc startujemy od jednego slajdu
  return slides.length > 0 ? slides : [{ headline: "", bodyText: "" }];
}

/** „1 slajd" / „2 slajdy" / „12 slajdów" — aplikacja jest po polsku, odmiana musi się zgadzać. */
function pluralSlides(n: number): string {
  if (n === 1) return "1 slajd";
  const tail = n % 10;
  const tens = n % 100;
  return tail >= 2 && tail <= 4 && (tens < 12 || tens > 14) ? `${n} slajdy` : `${n} slajdów`;
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "karuzela";

interface CarouselDraft {
  slides: SlideData[];
  theme: VisualTheme;
  fontChoice: CarouselFontFamily;
  topHeaderMode: TopHeaderMode;
  caption: string;
  captionSourceKey: string;
}

export const CarouselStudioModal: React.FC<CarouselStudioModalProps> = ({
  title,
  slides: incomingSlides,
  caption,
  handle,
  onSave,
  onClose,
}) => {
  const [slides, setSlides] = useState<SlideData[]>(() => normalizeSlides(incomingSlides));
  const [theme, setTheme] = useState<VisualTheme>("obsidian_monolith");
  const [fontChoice, setFontChoice] = useState<CarouselFontFamily>("plus_jakarta");
  const [topHeaderMode, setTopHeaderMode] = useState<TopHeaderMode>("protocol_standard");
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [busyPngIndex, setBusyPngIndex] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState(() => stripHashtagTail(caption || ""));
  const [captionSourceKey, setCaptionSourceKey] = useState(() => carouselContentKey(slides));
  const [overflowSlides, setOverflowSlides] = useState<number[]>([]);
  const [draftKey] = useState(
    () => `carousel:${title}:${carouselContentKey(normalizeSlides(incomingSlides))}`,
  );
  const contentKey = useMemo(() => carouselContentKey(slides), [slides]);
  const draftValue = useMemo<CarouselDraft>(
    () => ({ slides, theme, fontChoice, topHeaderMode, caption: captionDraft, captionSourceKey }),
    [slides, theme, fontChoice, topHeaderMode, captionDraft, captionSourceKey],
  );
  const restoreDraft = useCallback((saved: CarouselDraft) => {
    setSlides(normalizeSlides(saved.slides));
    setTheme(THEMES.some((item) => item.id === saved.theme) ? saved.theme : "obsidian_monolith");
    setFontChoice(
      FONTS.some((item) => item.id === saved.fontChoice) ? saved.fontChoice : "plus_jakarta",
    );
    setTopHeaderMode(
      HEADERS.some((item) => item.id === saved.topHeaderMode)
        ? saved.topHeaderMode
        : "protocol_standard",
    );
    setCaptionDraft(text(saved.caption, 5000));
    setCaptionSourceKey(typeof saved.captionSourceKey === "string" ? saved.captionSourceKey : "");
  }, []);
  const draft = useStudioDraft(draftKey, draftValue, restoreDraft);
  const busy = isExportingZip || busyPngIndex !== null;
  const zipKey = useMemo(
    () =>
      JSON.stringify([
        contentKey,
        slides.map((slide) => slide.highlightWords),
        theme,
        fontChoice,
        topHeaderMode,
        handle,
        captionDraft,
      ]),
    [contentKey, slides, theme, fontChoice, topHeaderMode, handle, captionDraft],
  );
  const [readyZip, setReadyZip] = useState<{ url: string; name: string; key: string } | null>(null);
  const zipUrlRef = useRef("");
  useEffect(
    () => () => {
      if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
    },
    [],
  );

  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  // Ten sam ZIP pobrany trzy razy nie może dać trzech wpisów w historii postów.
  const recordedRef = useRef(false);

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
    if (!draft.ready) return;
    let cancelled = false;
    // 150 ms wstrzymania: pełny kadr 1080x1350 rysujemy dopiero gdy user przestanie pisać
    const timer = setTimeout(() => {
      void ensureBrandFonts().then(() => {
        if (cancelled) return;
        const overflow: number[] = [];
        slides.forEach((_, index) => {
          const canvas = canvasRefs.current[index];
          if (canvas && drawSlideToCanvas(canvas, buildOptions(index))?.fits === false)
            overflow.push(index + 1);
        });
        setOverflowSlides(overflow);
      });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slides, buildOptions, draft.ready]);

  const patchSlide = (index: number, field: "headline" | "bodyText", value: string) => {
    const max = field === "headline" ? HEADLINE_MAX : BODY_MAX;
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, [field]: value.slice(0, max) } : slide)),
    );
  };

  const addSlide = () =>
    setSlides((prev) =>
      prev.length >= CAROUSEL_MAX_SLIDES ? prev : [...prev, { headline: "", bodyText: "" }],
    );

  const removeSlide = (index: number) =>
    setSlides((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const moveSlide = (index: number, delta: number) =>
    setSlides((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });

  const handleDownloadPng = async (index: number) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return;
    setBusyPngIndex(index);
    setExportError(null);
    try {
      await ensureBrandFonts();
      const blob = await exportSlideToBlob(canvas, buildOptions(index));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stark_slide_${index + 1}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setExportError("Nie udało się wygenerować PNG tego slajdu.");
    } finally {
      setBusyPngIndex(null);
    }
  };

  /**
   * Opis ZIP-a jest zawsze nasz: gdy źródło dało własny opis, doklejamy do
   * niego hashtagi z `caption.ts`; gdy nie dał nic, stopkę układamy z tezy
   * pierwszego slajdu. Dawniej wpadało tu „Slajd 1: …" pisane z etykiet UI,
   * czyli polski podpis wychodził jako opis angielskiego materiału.
   */
  const buildCaptionText = useCallback(
    (thesis: string): string => {
      return carouselCaptionText(slides, captionDraft, thesis);
    },
    [slides, captionDraft],
  );

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    setExportError(null);
    try {
      await ensureBrandFonts();
      // Teza karuzeli to pierwsze zdanie, które faktycznie jest na kadrach —
      // bez niego opis nie miałby czego rozwijać.
      const thesis = slides.find((slide) => slide.headline.trim())?.headline || title;
      const captionText = buildCaptionText(thesis);
      const zipName = `stark_karuzela_${slugify(thesis || title)}_${Date.now()}.zip`;
      const blob = await buildCarouselZip(slides, {
        ...buildOptions(0),
        slideNumber: 1,
        totalSlides: slides.length,
        captionText,
      });
      const url = URL.createObjectURL(blob);
      if (zipUrlRef.current) URL.revokeObjectURL(zipUrlRef.current);
      zipUrlRef.current = url;
      setReadyZip({ url, name: zipName, key: zipKey });
      if (!recordedRef.current) {
        recordedRef.current = true;
        onSave?.({ hook: thesis, title, caption: captionText, slideCount: slides.length });
      }
    } catch {
      setExportError("Eksport ZIP nie powiódł się. Spróbuj ponownie.");
    } finally {
      setIsExportingZip(false);
    }
  };

  const isEmptyCarousel = slides.every((slide) => !slide.headline && !slide.bodyText);
  const isShort = slides.length < CAROUSEL_TARGET_SLIDES;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0E0E0E] border border-[rgba(255,255,255,0.12)] rounded-xl">
        {/* Nagłówek */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-[rgba(255,255,255,0.1)]">
          <div className="min-w-0">
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" />
              Studio Karuzeli 4:5
            </h3>
            <p className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
              {title || "Bez tytułu"} • {pluralSlides(slides.length)} • {SLIDE_W}×{SLIDE_H} px
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

        <fieldset disabled={!draft.ready || busy} className="contents">
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
              <p className="mb-3 p-2.5 bg-white/5 border border-white/15 rounded text-[11px] font-mono text-neutral-300">
                Slajdy są puste — wpisz nagłówki i treść poniżej, a potem pobierz ZIP.
              </p>
            )}
            {isShort && (
              <p className="mb-3 p-2.5 bg-[#161616] border border-[rgba(255,255,255,0.12)] rounded text-[11px] font-mono text-neutral-300">
                Materiał ma {pluralSlides(slides.length)}. Dłuższy wywód możesz rozwinąć do{" "}
                {CAROUSEL_TARGET_SLIDES}+ slajdów. Każdy slajd powinien dopowiadać coś do jednej
                tezy; nie dodawaj slajdów tylko dla liczby.
              </p>
            )}
            {overflowSlides.length > 0 && (
              <p
                role="status"
                className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded text-[11px] font-mono text-rose-300"
              >
                Tekst nie mieści się w polu treści: slajdy {overflowSlides.join(", ")}. Skróć go lub
                podziel slajd. Nie zmniejszam pisma poniżej 48 px. To wskazówka; decyzja o eksporcie
                należy do Ciebie.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="p-3 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-neutral-400">
                      Slajd {index + 1} / {slides.length}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        className={MINI_BTN}
                        title="Przesuń slajd wyżej"
                      >
                        Góra
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === slides.length - 1}
                        className={MINI_BTN}
                        title="Przesuń slajd niżej"
                      >
                        Dół
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlide(index)}
                        disabled={slides.length <= 1}
                        className={MINI_BTN}
                        title="Usuń ten slajd"
                      >
                        Usuń
                      </button>
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
                    aria-label={`Nagłówek slajdu ${index + 1}`}
                    value={slide.headline}
                    onChange={(e) => patchSlide(index, "headline", e.target.value)}
                    placeholder="NAGŁÓWEK SLAJDU"
                    className={FIELD}
                  />
                  <textarea
                    aria-label={`Treść slajdu ${index + 1}`}
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
            <section className="mt-4 p-3 bg-[#050505] border border-white/10 rounded-lg space-y-2">
              <label className="block text-[11px] font-mono text-neutral-300">
                Opis do publikacji (po angielsku, bez hashtagów)
                <textarea
                  aria-label="Opis karuzeli"
                  value={captionDraft}
                  maxLength={5000}
                  onChange={(event) => setCaptionDraft(event.target.value)}
                  rows={4}
                  placeholder="Rozwiń temat karuzeli. Bez opisu eksport zawiera tylko tezę i stopkę marki."
                  className={`${FIELD} mt-2 resize-y leading-relaxed`}
                />
              </label>
              <p className="text-[10px] font-mono text-neutral-500">
                Hashtagi dobieram do aktualnej treści slajdów. Opis trafia do ZIP-a.
              </p>
              {captionDraft.trim() && captionSourceKey !== contentKey && (
                <div className="text-[11px] font-mono text-rose-300 space-y-2">
                  <p>Treść slajdów zmieniła się. Sprawdź, czy opis nadal pasuje do materiału.</p>
                  <button
                    type="button"
                    className={MINI_BTN}
                    onClick={() => setCaptionSourceKey(contentKey)}
                  >
                    Opis sprawdzony
                  </button>
                </div>
              )}
            </section>
          </div>
        </fieldset>

        {/* Stopka eksportu */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-[rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 min-w-0">
            <span role="status" className="text-[10px] font-mono text-neutral-500">
              {draft.notice}
            </span>
            {exportError && (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                {exportError}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addSlide}
              disabled={!draft.ready || busy || slides.length >= CAROUSEL_MAX_SLIDES}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.12)] text-[11px] font-mono uppercase font-bold text-neutral-300 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                slides.length >= CAROUSEL_MAX_SLIDES
                  ? `Sufit karuzeli to ${CAROUSEL_MAX_SLIDES} slajdów`
                  : "Dodaj pusty slajd na końcu"
              }
            >
              <span>Dodaj slajd</span>
            </button>
            {readyZip?.key === zipKey ? (
              <a
                href={readyZip.url}
                download={readyZip.name}
                className="px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Pobierz ZIP (4:5)
              </a>
            ) : (
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={!draft.ready || busy}
                className="px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isExportingZip ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileArchive className="w-4 h-4" />
                )}
                <span>{isExportingZip ? "Pakuję slajdy..." : "Przygotuj ZIP (4:5)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
