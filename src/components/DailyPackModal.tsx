// DailyPackModal.tsx — Klik 1: jedna paczka treści na cały dzień publikacji.
// Każdy element paczki przekazujemy jednym kliknięciem do istniejących studiów.
import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar,
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
  onSchedulePack?: (pack: DailyPack) => void;
  /** Odciski tego, co już poszło — paczka dnia nie może tego powtórzyć. */
  usedHooks?: string[];
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer";

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

export const DailyPackModal: React.FC<DailyPackModalProps> = ({
  isOpen,
  onClose,
  pack,
  onPackChange,
  onOpenVideoStudio,
  onOpenCarouselStudio,
  onSchedulePack,
  usedHooks,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/daily-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeHooks: usedHooks ?? [] }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      onPackChange((await res.json()) as DailyPack);
    } catch {
      setError("Nie udało się wygenerować paczki. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }, [onPackChange, usedHooks]);

  useEffect(() => {
    // Odświeżamy tylko gdy rodzic nie ma jeszcze paczki — inaczej każde
    // otwarcie okna kasowałoby to, co użytkownik zamierzał wysłać do studia.
    if (isOpen && !pack) generate();
  }, [isOpen, pack, generate]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const reels = pack && Array.isArray(pack.reels) ? pack.reels : [];
  const carouselTitle = textOf(pack?.carousel?.title);
  const carouselSlides = slidesOf(pack?.carousel?.slides);
  const postHeadline = textOf(pack?.post?.headline);
  const postBody = textOf(pack?.post?.body);
  const postPrompt = textOf(pack?.post?.bingPrompt);

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        {/* Nagłówek */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Paczka dnia
            </h3>
            {pack && (
              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                  pack.source === "ai"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                }`}
              >
                {pack.source === "ai" ? "🤖 GEMINI" : "📴 OFFLINE (bank lokalny)"}
              </span>
            )}
            {pack?.category && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                🎯 {pack.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pack && onSchedulePack && (
              <button
                type="button"
                onClick={() => {
                  onSchedulePack(pack);
                  setScheduled(true);
                  setTimeout(() => setScheduled(false), 3000);
                }}
                disabled={scheduled}
                className={`py-1.5 px-3 rounded text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                  scheduled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40"
                }`}
              >
                {scheduled ? (
                  <>
                    <Check className="w-3 h-3" /> Zaplanowano
                  </>
                ) : (
                  <>
                    <Calendar className="w-3 h-3" /> Zaplanuj publikację
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => generate()}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Wygeneruj nową paczkę"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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
                <div className="w-6 h-6 border-2 border-[#2C354B] border-t-amber-400 rounded-full animate-spin" />
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

          {!loading && pack && (
            <>
              {/* Rolki */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  🎬 Rolki 9:16 ({reels.length})
                </h4>
                {reels.map((reel, idx) => {
                  const hook = textOf(reel.hook);
                  const phrases = textList(reel.phrases);
                  const hashtags = textList(reel.hashtags);
                  const captionShort = textOf(reel.captionShort);
                  const duration = Number(reel.duration);
                  return (
                    <div
                      key={`reel-${idx}`}
                      className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-mono font-black text-amber-300">"{hook}"</p>
                        <div className="flex items-center gap-1.5 shrink-0">
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
                          onClick={() =>
                            handleCopy(`reel-caption-${idx}`, `${hook}\n\n${captionShort}`)
                          }
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
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  🖼️ Karuzela 4:5
                </h4>
                <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
                  <p className="text-xs font-mono font-black text-purple-300">{carouselTitle}</p>
                  <p className="text-[10px] font-mono text-slate-500">
                    {carouselSlides.length} slajdów:{" "}
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
              </section>

              {/* Post 1:1 */}
              <section className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  🏛️ Post 1:1 + prompt tła
                </h4>
                <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
                  <p className="text-xs font-mono font-black text-emerald-300">{postHeadline}</p>
                  <p className="text-[11px] font-mono text-slate-300 whitespace-pre-line">
                    {postBody}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 italic">{postPrompt}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopy("post-body", `${postHeadline}\n\n${postBody}`)}
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
              </section>

              {/* Podsumowanie paczki */}
              <section className="space-y-2 pt-2 border-t border-[#2C354B]">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  📋 Harmonogram publikacji
                </h4>
                <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="text-center p-2 bg-[#0F121C] rounded border border-[#2C354B]">
                      <div className="text-amber-400 font-bold">12:00</div>
                      <div className="text-slate-400">Rolka 1</div>
                    </div>
                    <div className="text-center p-2 bg-[#0F121C] rounded border border-[#2C354B]">
                      <div className="text-amber-400 font-bold">14:00</div>
                      <div className="text-slate-400">Karuzela</div>
                    </div>
                    <div className="text-center p-2 bg-[#0F121C] rounded border border-[#2C354B]">
                      <div className="text-amber-400 font-bold">15:00</div>
                      <div className="text-slate-400">Rolka 2</div>
                    </div>
                    <div className="text-center p-2 bg-[#0F121C] rounded border border-[#2C354B]">
                      <div className="text-amber-400 font-bold">18:00</div>
                      <div className="text-slate-400">Post 1:1</div>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 text-center pt-1">
                    Kliknij "Zaplanuj publikację" aby dodać te zadania do plannera
                  </p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
