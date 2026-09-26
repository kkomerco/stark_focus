// DailyPackModal.tsx — Klik 1: jedna paczka treści na cały dzień publikacji.
// Każdy element paczki przekazujemy jednym kliknięciem do istniejących studiów.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Film,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { DailyPack, ReelHandoff } from "../types";

interface DailyPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Paczka żyje w rodzicu — modal jest renderowany warunkowo i ginie przy zamknięciu. */
  pack: DailyPack | null;
  onPackChange: (pack: DailyPack | null) => void;
  onOpenVideoStudio: (reel: ReelHandoff) => void;
  onOpenCarouselStudio: (
    title: string,
    slides: Array<{ headline: string; bodyText: string }>,
  ) => void;
  /** Bez tego post z paczki trzeba przepisywać ręcznie. */
  onOpenPostStudio?: (text: string, caption?: string) => void;
  /** Odciski tego, co już poszło — paczka dnia nie może tego powtórzyć. */
  usedHooks?: string[];
  /** Nasze najlepiej zarabiające zdania — wzorzec rytmu dla modelu. */
  exemplarHooks?: string[];
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer";
const PRIMARY_BTN =
  "py-1.5 px-3 rounded bg-white hover:bg-neutral-200 border border-white text-[11px] font-mono font-bold text-black transition-colors flex items-center gap-1.5 cursor-pointer";
const SECTION_H = "text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500";
const CARD = "p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2";
/** Uczciwy podpis na karcie: właściciel konta nie może wkleić zdania z banku, myśląc, że model napisał je do tego tematu. */
const BANK_NOTE = "treść z banku — model nie odpowiedział";

/** Kształt odpowiedzi modelu jest niezaufany — zanim coś trafi do studia, sprawdzamy pole. */
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const textOf = (value: unknown): string => (typeof value === "string" ? value : "");
const slidesOf = (value: unknown): Array<{ headline: string; bodyText: string }> =>
  Array.isArray(value)
    ? value.map((slide) => ({
        headline: textOf((slide as { headline?: unknown })?.headline),
        bodyText: textOf((slide as { bodyText?: unknown })?.bodyText),
      }))
    : [];

/** "1 slajd" / "2 slajdy" / "12 slajdów" — aplikacja jest po polsku, odmiana musi się zgadzać. */
function pluralSlides(n: number): string {
  if (n === 1) return "1 slajd";
  const tail = n % 10;
  const tens = n % 100;
  return tail >= 2 && tail <= 4 && (tens < 12 || tens > 14) ? `${n} slajdy` : `${n} slajdów`;
}

const BankTag: React.FC = () => (
  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
    {BANK_NOTE}
  </span>
);

export const DailyPackModal: React.FC<DailyPackModalProps> = ({
  isOpen,
  onClose,
  pack,
  onPackChange,
  onOpenVideoStudio,
  onOpenCarouselStudio,
  onOpenPostStudio,
  usedHooks,
  exemplarHooks,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Trasa ma własny łańcuch fallbacku modeli (3 modele × 2 próby × limit czasu),
  // więc bez abortu spinner kręciłby się długo po zamknięciu okna, a wynik
  // wpisałby się w paczkę, której nikt już nie ogląda.
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, [isOpen]);

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/daily-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeHooks: usedHooks ?? [], exemplars: exemplarHooks ?? [] }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      onPackChange((await res.json()) as DailyPack);
    } catch {
      if (!cancelledRef.current) {
        setError("Nie udało się wygenerować paczki. Spróbuj ponownie.");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!cancelledRef.current) setLoading(false);
    }
  }, [onPackChange, usedHooks, exemplarHooks]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const fromBank = pack?.source !== "ai";
  const reels = pack && Array.isArray(pack.reels) ? pack.reels : [];
  const carouselTitle = textOf(pack?.carousel?.title);
  const carouselSlides = slidesOf(pack?.carousel?.slides);
  const postHeadline = textOf(pack?.post?.headline);
  const postBody = textOf(pack?.post?.body);
  const postPrompt = textOf(pack?.post?.bingPrompt);

  // Trasa oddaje to, co przyszło od modelu, nawet gdy któraś część jest pusta —
  // płacenie drugi raz za całą paczkę przez jedno martwe pole byłoby uczciwsze
  // dopiero wtedy, gdy nie ma nic.
  const missingNote = (what: string) =>
    fromBank
      ? `Brak ${what}: bank treści nie ma już wolnej pozycji na dzisiejszy temat.`
      : `Brak ${what}: nie było tego w odpowiedzi modelu. Reszta paczki jest jego autorstwa.`;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        {/* Nagłówek */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Paczka dnia
            </h3>
            {pack && (
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                  fromBank
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}
              >
                {fromBank ? "BANK TREŚCI" : "MODEL GEMINI"}
              </span>
            )}
            {pack?.category && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-white/5 text-slate-400 border border-[#2C354B]">
                {pack.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pack && (
              <button
                type="button"
                onClick={() => generate()}
                disabled={loading}
                className={ACTION_BTN}
                title="Kolejna paczka to kolejne zapytanie do modelu"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                Nowa paczka · 1 zapytanie
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zawartość */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#2C354B] border-t-rose-400 rounded-full animate-spin" />
                <div className="text-[11px] font-mono text-slate-400 animate-pulse">
                  Składam paczkę dnia (rolki + karuzela + post)...
                </div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          {/* Samo otwarcie okna nie wolno zapytania: licznik darmowego tieru
              jest dobrem właściciela konta, więc koszt stoi przy przycisku.
              Ten sam stan zostaje po błędzie — inaczej awaria zostawiałaby okno
              bez żadnego sposobu na ponowną próbę. */}
          {!loading && !pack && (
            <div className="py-14 flex flex-col items-center gap-4 text-center">
              <p className="text-[11px] font-mono text-slate-400 max-w-md">
                Paczka dnia składa rolki 9:16, karuzelę 4:5 i kadr 1:1 na dziś. Nic nie zeszło z
                licznika przy otwarciu tego okna.
              </p>
              <button type="button" onClick={() => generate()} className={PRIMARY_BTN}>
                <Sparkles className="w-3 h-3" />
                Pobierz paczkę · 1 zapytanie
              </button>
            </div>
          )}

          {!loading && pack && (
            <>
              {/* Rolki */}
              <section className="space-y-2">
                <h4 className={SECTION_H}>Rolki 9:16 ({reels.length})</h4>
                {reels.length === 0 && (
                  <p className={`${CARD} text-[10px] font-mono text-slate-500`}>
                    {missingNote("rolek")}
                  </p>
                )}
                {reels.map((reel, idx) => {
                  const hook = textOf(reel.hook);
                  const phrases = textList(reel.phrases);
                  const hashtags = textList(reel.hashtags);
                  const captionShort = textOf(reel.captionShort);
                  const duration = Number(reel.duration);
                  return (
                    <div key={`reel-${idx}`} className={CARD}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono font-black text-rose-300">"{hook}"</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {fromBank && <BankTag />}
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-[#2C354B] text-slate-400">
                            {textOf(reel.theme)}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-[#2C354B] text-slate-400">
                            {Number.isFinite(duration) ? duration : ""}s
                          </span>
                        </div>
                      </div>
                      <ol className="space-y-0.5 list-decimal list-inside">
                        {phrases.map((phrase, pIdx) => (
                          <li key={pIdx} className="text-[11px] font-mono text-slate-300">
                            {phrase}
                          </li>
                        ))}
                      </ol>
                      <p className="text-[10px] font-mono text-slate-500">{hashtags.join(" ")}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            // Cały pakiet, nie sam hook — studio ma wyrenderować to,
                            // co użytkownik zobaczył w paczce.
                            onOpenVideoStudio({
                              hook: hook || phrases[0] || "",
                              phrases,
                              theme: textOf(reel.theme) || undefined,
                              duration: Number.isFinite(duration) ? duration : undefined,
                              caption: captionShort || undefined,
                              hashtags,
                            });
                          }}
                          className="py-1.5 px-3 rounded bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/40 text-[11px] font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                        >
                          <Film className="w-3 h-3" />
                          Studio Wideo
                        </button>
                        <button
                          type="button"
                          // `captionShort` to już pełny opis marki (zdanie + CTA z
                          // puli + hashtagi) i zaczyna się od hooku wielkimi literami
                          // — doklejanie hooku powtarzało to samo zdanie dwa razy.
                          onClick={() => handleCopy(`reel-caption-${idx}`, captionShort)}
                          className={ACTION_BTN}
                        >
                          {copiedId === `reel-caption-${idx}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedId === `reel-caption-${idx}` ? "Skopiowano" : "Kopiuj caption"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Karuzela */}
              <section className="space-y-2">
                <h4 className={SECTION_H}>Karuzela 4:5 · {pluralSlides(carouselSlides.length)}</h4>
                {carouselSlides.length === 0 ? (
                  <p className={`${CARD} text-[10px] font-mono text-slate-500`}>
                    {missingNote("karuzeli")}
                  </p>
                ) : (
                  <div className={CARD}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-black text-purple-300">
                        {carouselTitle}
                      </p>
                      {fromBank && <BankTag />}
                    </div>
                    <p className="text-[10px] font-mono text-slate-500">
                      {carouselSlides.map((s) => s.headline).join(" → ")}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCarouselStudio(carouselTitle, carouselSlides);
                      }}
                      className="py-1.5 px-3 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      Studio Karuzeli
                    </button>
                  </div>
                )}
              </section>

              {/* Post 1:1 */}
              <section className="space-y-2">
                <h4 className={SECTION_H}>Post 1:1 + prompt tła</h4>
                {!postHeadline ? (
                  <p className={`${CARD} text-[10px] font-mono text-slate-500`}>
                    {missingNote("postu 1:1")}
                  </p>
                ) : (
                  <div className={CARD}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-mono font-black text-emerald-300">
                        {postHeadline}
                      </p>
                      {fromBank && <BankTag />}
                    </div>
                    <p className="text-[11px] font-mono text-slate-300 whitespace-pre-line">
                      {postBody}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 italic">{postPrompt}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {onOpenPostStudio && (
                        <button
                          type="button"
                          // Kadr dostaje TEZĘ, opis dostaje `postBody`. Studio rozdziela
                          // `initialText` wierszami na `textLayers`, więc wysłanie tu
                          // opisu znaczyłoby wypalenie CTA i hashtagów na czarnym kadrze.
                          onClick={() => onOpenPostStudio(postHeadline, postBody)}
                          className={PRIMARY_BTN}
                        >
                          <ArrowRight className="w-3 h-3" />
                          Otwórz w studiu posta
                        </button>
                      )}
                      <button
                        type="button"
                        // `postBody` to już opis (zdanie od modelu + CTA z puli +
                        // hashtagi); teza zostaje na kadrze i pod nim się nie powtarza.
                        onClick={() => handleCopy("post-body", postBody)}
                        className={ACTION_BTN}
                      >
                        {copiedId === "post-body" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedId === "post-body" ? "Skopiowano" : "Kopiuj opis"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy("post-prompt", postPrompt)}
                        className={ACTION_BTN}
                      >
                        {copiedId === "post-prompt" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ImageIcon className="w-3 h-3" />
                        )}
                        {copiedId === "post-prompt" ? "Skopiowano" : "Kopiuj prompt tła"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
