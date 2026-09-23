// DeconstructViralModal.tsx — Analiza rynku: wklej link do viralowego posta,
// AI rozbiera go na czynniki i generuje własne warianty @stark_focus.
import React, { useState } from "react";
import { Check, Copy, Film, Link2, Loader2, Sparkles, TrendingUp, X } from "lucide-react";
import { DeconstructViralResponse, ReelHandoff, StarkVariant } from "../types";

interface DeconstructViralModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Wynik analizy trzyma rodzic — po wysłaniu wariantu do studia okno się zamyka. */
  url: string;
  onUrlChange: (url: string) => void;
  result: DeconstructViralResponse | null;
  onResultChange: (result: DeconstructViralResponse | null) => void;
  onSendToReel?: (reel: ReelHandoff) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer";

/** Odpowiedź trasy to kształt od modelu — nie mapujemy niczego bez sprawdzenia pola. */
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const textOf = (value: unknown): string => (typeof value === "string" ? value : "");
const listOf = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const DeconstructViralModal: React.FC<DeconstructViralModalProps> = ({
  isOpen,
  onClose,
  url,
  onUrlChange,
  result,
  onResultChange,
  onSendToReel,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const analyze = async () => {
    if (!url.trim()) {
      setError("Wklej link do posta (TikTok / IG / YouTube Shorts).");
      return;
    }
    setLoading(true);
    setError(null);
    onResultChange(null);
    try {
      const res = await fetch("/api/ai/deconstruct-viral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      onResultChange((await res.json()) as DeconstructViralResponse);
    } catch {
      setError("Nie udało się przeanalizować linku. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const original = result?.original;
  const deconstruction = result?.deconstruction;
  const variants = result ? listOf<StarkVariant>(result.starkVariants) : [];

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Analiza Virala
            </h3>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
              Dekonstrukcja + warianty
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="https://www.tiktok.com/@user/video/... lub link IG / Shorts"
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg bg-[#141824] border border-[#2C354B] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
          />
          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="py-2 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Analizuj
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
              <p className="text-xs font-mono text-slate-400">
                Pobieram metadane i dekonstruuję wzorzec...
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          {result && !loading && (
            <>
              <section className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Oryginał ({textOf(result.platform)})
                </h4>
                <p className="text-xs font-mono text-slate-300 break-all">
                  {textOf(original?.url)}
                </p>
                {textOf(original?.title) && (
                  <p className="text-[11px] font-mono text-slate-400">
                    Tytuł: {textOf(original?.title)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                  {textOf(original?.author) && <span>{textOf(original?.author)}</span>}
                  {textOf(original?.audioTrack) && <span>{textOf(original?.audioTrack)}</span>}
                  <span
                    className={
                      result.source === "ai"
                        ? "text-emerald-400"
                        : result.source === "error"
                          ? "text-red-400"
                          : "text-rose-400"
                    }
                  >
                    {result.source === "ai"
                      ? "GEMINI"
                      : result.source === "error"
                        ? "BŁĄD ANALIZY"
                        : "OFFLINE"}
                  </span>
                </div>
              </section>

              <section className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Dekonstrukcja wzorca
                </h4>
                <div className="space-y-1.5 text-[11px] font-mono">
                  <p>
                    <span className="text-slate-500">Typ hooka:</span>{" "}
                    <span className="text-white">{textOf(deconstruction?.hookType)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Hook:</span>{" "}
                    <span className="text-rose-300">{textOf(deconstruction?.hookText)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Struktura:</span>{" "}
                    <span className="text-slate-300">
                      {textList(deconstruction?.structure).join(" → ")}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {textList(deconstruction?.psychologicalTriggers).map((t, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/25"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-300 pt-1">{textOf(deconstruction?.whyItWorks)}</p>
                  {textOf(deconstruction?.visualStyle) && (
                    <p className="text-slate-500">{textOf(deconstruction?.visualStyle)}</p>
                  )}
                  {textOf(deconstruction?.audioStrategy) && (
                    <p className="text-slate-500">{textOf(deconstruction?.audioStrategy)}</p>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                  Twoje warianty @stark_focus
                </h4>
                {variants.map((v) => {
                  const hook = textOf(v.hook);
                  const phrases = textList(v.phrases);
                  return (
                    <div
                      key={textOf(v.id) || hook}
                      className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-mono font-black text-white flex-1">{hook}</p>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {v.viralityScore}%
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-200">{textOf(v.angle)}</p>
                      <div className="space-y-0.5 pl-2 border-l border-[#2C354B]">
                        {phrases.map((p, i) => (
                          <p key={i} className="text-[10px] font-mono text-slate-400">
                            {i + 1}. {p}
                          </p>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {onSendToReel && (
                          <button
                            type="button"
                            onClick={() =>
                              // Dekonstrukcja nie zwraca opisu — studio dopnie kadry i firmowe CTA.
                              onSendToReel({ hook: hook || phrases[0] || "", phrases })
                            }
                            className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                          >
                            <Film className="w-3 h-3" />
                            Do studia rolek
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(textOf(v.id) || hook, phrases.join("\n"))}
                          className={ACTION_BTN}
                        >
                          {copiedId === (textOf(v.id) || hook) ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedId === (textOf(v.id) || hook) ? "Skopiowano" : "Kopiuj frazy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
            </>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-16 text-xs font-mono text-slate-500">
              Wklej link do viralowego posta, aby rozłożyć go na czynniki i stworzyć własne
              warianty.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
