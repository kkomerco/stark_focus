// IdeaStreamModal.tsx — Nieskończony generator pomysłów z anty-powtórką.
// Historia fingerprintów (localStorage) gwarantuje, że pomysły się nie powtarzają.
import React from "react";
import {
  Check,
  Copy,
  Film,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { IdeaItem, ReelHandoff } from "../types";
import type { useIdeaStream } from "../hooks/useIdeaStream";

/**
 * Stan strumienia (lista pomysłów + historia anty-powtórek) trzyma rodzic:
 * modal jest renderowany warunkowo, więc po wysłaniu pomysłu do studia i zamknięciu
 * okna jego własny stan by przepadł.
 */
type IdeaStreamState = ReturnType<typeof useIdeaStream>;

interface IdeaStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: IdeaStreamState;
  onSendToReel?: (reel: ReelHandoff) => void;
  onSendToPost?: (text: string, caption?: string, idea?: IdeaItem) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer";

/** Kształt z modelu jest niezaufany — sprawdzamy pola zanim zaczniemy je mapować. */
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

export const IdeaStreamModal: React.FC<IdeaStreamModalProps> = ({
  isOpen,
  onClose,
  stream,
  onSendToReel,
  onSendToPost,
}) => {
  const { ideas, loading, error, notice, generateIdeas, clearHistory, usedCount } = stream;
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && ideas.length === 0) generateIdeas(5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Nieskończone Pomysły
            </h3>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {usedCount} użytych
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateIdeas(5)}
              disabled={loading}
              className="py-1.5 px-3 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[11px] font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Więcej pomysłów
            </button>
            <button
              type="button"
              onClick={clearHistory}
              title="Wyczyść historię (pozwoli na ponowne użycie pomysłów)"
              className="p-1.5 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-slate-400 hover:text-red-400 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
              <p className="text-xs font-mono text-slate-400">
                Generuję unikalne pomysły (unikam {usedCount} poprzednich)...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          {/* Bank potrafi się wyczerpać — pokazujemy to zamiast udawać pełną partię. */}
          {!loading && !error && notice && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-mono text-rose-300">
              {notice}
            </div>
          )}

          {!loading &&
            ideas.map((idea) => {
              const hook = textOf(idea.hook);
              const phrases = textList(idea.phrases);
              const caption = textOf(idea.caption);
              return (
                <div
                  key={idea.id}
                  className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-mono font-black text-white leading-snug flex-1">
                      {hook}
                    </p>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {idea.viralityScore}%
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/25">
                      {idea.category}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-300 border border-zinc-500/25">
                      {idea.archetype}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25">
                      {idea.emotionalTarget}
                    </span>
                    {idea.similarity >= 0.45 ? (
                      <span
                        title={idea.similarTo ? `Najbliższy w historii: "${idea.similarTo}"` : ""}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30"
                      >
                        podobny {Math.round(idea.similarity * 100)}%
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                        ✓ świeży (max {Math.round(idea.similarity * 100)}%)
                      </span>
                    )}
                  </div>

                  {phrases.length > 1 && (
                    <div className="space-y-0.5 pl-2 border-l border-[#2C354B]">
                      {phrases.map((p, i) => (
                        <p key={i} className="text-[10px] font-mono text-slate-400">
                          {i + 1}. {p}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onSendToReel && (
                      <button
                        type="button"
                        onClick={() =>
                          onSendToReel({
                            hook,
                            phrases,
                            theme: textOf(idea.theme) || undefined,
                            caption: caption || undefined,
                            hashtags: textList(idea.hashtags),
                          })
                        }
                        className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                      >
                        <Film className="w-3 h-3" />
                        Do studia rolek
                      </button>
                    )}
                    {onSendToPost && (
                      <button
                        type="button"
                        // Idea-stream jest jedyną trasą, która zwraca gotowy opis marki —
                        // bez niego posta 1:1 startowałby z obcego szablonu.
                        onClick={() => onSendToPost(hook, caption || undefined, idea)}
                        className={ACTION_BTN}
                      >
                        <Sparkles className="w-3 h-3" />
                        Do posta 1:1
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(idea.id + "-caption", caption)}
                      className={ACTION_BTN}
                    >
                      {copiedId === idea.id + "-caption" ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedId === idea.id + "-caption" ? "Skopiowano" : "Kopiuj opis"}
                    </button>
                  </div>
                </div>
              );
            })}

          {!loading && !error && ideas.length === 0 && (
            <div className="text-center py-16 text-xs font-mono text-slate-500">
              Kliknij „Więcej pomysłów", aby wygenerować strumień treści.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
