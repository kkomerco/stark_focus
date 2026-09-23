// AbModal.tsx — Eksperymenty A/B: 2 warianty TEJ SAMEJ rolki.
// Publikujesz oba, wpisujesz wyniki, AI wyciąga zwycięski wzorzec (pętla uczenia).
import React, { useState } from "react";
import { Film, Loader2, Repeat, TrendingUp, X } from "lucide-react";
import { AbVariant, AbExperiment, ReelHandoff, StarkFocusData } from "../types";

export interface AbResultRow {
  label: "A" | "B";
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/**
 * Przebieg eksperymentu trzyma rodzic: modal jest renderowany warunkowo, a bez tego
 * wysłanie zwycięzcy do studia kasowało warianty i wpisane wyniki.
 */
export interface AbDraft {
  topic: string;
  variants: AbVariant[];
  experimentId: string;
  results: AbResultRow[];
  conclusion: { winner?: string; lesson?: string } | null;
}

interface AbModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  draft: AbDraft;
  // Aktualizacja przez funkcję, nie przez wartość: dwa zapisy w jednym handlerze
  // nadpisaliby się nawzajem na starym domknięciu.
  onDraftChange: (update: (prev: AbDraft) => AbDraft) => void;
  onSendToReel?: (reel: ReelHandoff) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";

/** Odpowiedź trasy to kształt od modelu — nie mapujemy bez sprawdzenia pola. */
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

export const AbModal: React.FC<AbModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
  draft,
  onDraftChange,
  onSendToReel,
}) => {
  const { topic, variants, experimentId, results, conclusion } = draft;
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (next: Partial<AbDraft>) => onDraftChange((prev) => ({ ...prev, ...next }));

  const startExperiment = async () => {
    setLoading(true);
    setError(null);
    patch({ conclusion: null });
    setSaved(false);
    try {
      // Pętla uczenia: przekazujemy historię zakończonych eksperymentów do generatora,
      // aby nowe warianty uczyły się na zwycięskich wzorcach.
      const history = (data.ab_experiments || [])
        .filter((e) => e.winner && e.concludedAt)
        .map((e) => {
          const w = e.variants.find((v) => v.label === e.winner);
          return {
            winner: e.winner,
            lesson: e.lesson || "",
            winningHook: w?.hook || "",
            angle: w?.angle || "",
          };
        });

      const res = await fetch("/api/ai/ab-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, history }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const vs: AbVariant[] = Array.isArray(json.variants) ? json.variants : [];
      patch({
        variants: vs,
        experimentId: String(json.experimentId || `ab-${Date.now()}`),
        results: vs.map((v) => ({
          label: v.label,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        })),
      });
    } catch {
      setError("Nie udało się wygenerować wariantów A/B.");
    } finally {
      setLoading(false);
    }
  };

  const setMetric = (idx: number, field: keyof AbResultRow, value: string) => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    patch({ results: results.map((r, i) => (i === idx ? { ...r, [field]: n } : r)) });
  };

  const conclude = async () => {
    if (results.length < 2) return;
    setConcluding(true);
    try {
      const res = await fetch("/api/ai/ab-conclusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId,
          results: results.map((r) => ({
            label: r.label,
            views: r.views,
            likes: r.likes,
            comments: r.comments,
            shares: r.shares,
            saves: r.saves,
          })),
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      patch({ conclusion: json });

      // ===== PĘTLA UCZENIA: zapisujemy eksperyment, aby wzorzec wracał do generatora =====
      const experiment: AbExperiment = {
        id: experimentId || `ab-${Date.now()}`,
        topic,
        createdAt: new Date().toISOString(),
        variants: variants.map((v) => {
          const r = results.find((x) => x.label === v.label);
          return {
            ...v,
            publishedAt: new Date().toISOString(),
            metrics: {
              views: r?.views || 0,
              likes: r?.likes || 0,
              comments: r?.comments || 0,
              shares: r?.shares || 0,
              saves: r?.saves || 0,
            },
          };
        }),
        winner: json.winner === "A" || json.winner === "B" ? json.winner : null,
        lesson: String(json.lesson || ""),
        concludedAt: new Date().toISOString(),
      };
      onUpdateData((prev) => ({
        ...prev,
        ab_experiments: [experiment, ...(prev.ab_experiments || [])].slice(0, 50),
      }));
      setSaved(true);
    } catch {
      setError("Nie udało się policzyć zwycięzcy.");
    } finally {
      setConcluding(false);
    }
  };

  const winnerVariant = conclusion
    ? variants.find((v) => v.label === conclusion.winner)
    : undefined;

  /** Wariant A/B nie ma opisu — składamy go z hooka i firmowego CTA tego wariantu. */
  const reelFromVariant = (v: AbVariant): ReelHandoff => {
    const hook = textOf(v.hook);
    const phrases = textList(v.phrases);
    const caption = [hook, textOf(v.cta)].filter(Boolean).join("\n\n");
    return {
      hook: hook || phrases[0] || "",
      phrases,
      theme: textOf(v.theme) || undefined,
      caption: caption || undefined,
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Eksperyment A/B
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="text-[11px] font-mono text-slate-400">
          Temat eksperymentu:
          <input
            type="text"
            value={topic}
            onChange={(e) => patch({ topic: e.target.value })}
            className="ml-2 w-full max-w-xs px-2 py-1 rounded bg-[#141824] border border-[#2C354B] text-xs font-mono text-white"
          />
        </label>
        <button
          type="button"
          onClick={startExperiment}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
          Generuj warianty A i B
        </button>

        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {variants.map((v) => {
            const hook = textOf(v.hook);
            const phrases = textList(v.phrases);
            return (
              <div
                key={textOf(v.label) || phrases.join("-")}
                className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-black text-white">
                    WARIANT {textOf(v.label)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{textOf(v.theme)}</span>
                </div>
                <p className="text-sm font-mono font-bold text-white">{hook}</p>
                <p className="text-[10px] font-mono text-zinc-200">⚡ {textOf(v.angle)}</p>
                <div className="space-y-0.5 pl-2 border-l border-[#2C354B]">
                  {phrases.map((p, i) => (
                    <p key={i} className="text-[10px] font-mono text-slate-400">
                      {i + 1}. {p}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => onSendToReel?.(reelFromVariant(v))}
                    className="py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Film className="w-3 h-3" /> Do studia rolek
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {variants.length >= 2 && (
          <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
              📊 Wyniki (wpisz po publikacji obu wariantów)
            </h4>
            <div className="space-y-1.5 text-[10px] font-mono">
              {results.map((r, idx) => (
                <div key={r.label} className="flex flex-wrap gap-1 items-center">
                  <span className="text-emerald-300 font-bold w-4">{r.label}</span>
                  <span className="text-slate-400">Views:</span>
                  <input
                    type="number"
                    min="0"
                    value={r.views}
                    onChange={(e) => setMetric(idx, "views", e.target.value)}
                    className="w-16 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                  />
                  <span className="text-slate-400">Likes:</span>
                  <input
                    type="number"
                    min="0"
                    value={r.likes}
                    onChange={(e) => setMetric(idx, "likes", e.target.value)}
                    className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                  />
                  <span className="text-slate-400">Koment.:</span>
                  <input
                    type="number"
                    min="0"
                    value={r.comments}
                    onChange={(e) => setMetric(idx, "comments", e.target.value)}
                    className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                  />
                  <span className="text-slate-400">Udost.:</span>
                  <input
                    type="number"
                    min="0"
                    value={r.shares}
                    onChange={(e) => setMetric(idx, "shares", e.target.value)}
                    className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                  />
                  <span className="text-slate-400">Saves:</span>
                  <input
                    type="number"
                    min="0"
                    value={r.saves}
                    onChange={(e) => setMetric(idx, "saves", e.target.value)}
                    className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={conclude}
              disabled={concluding || results.some((r) => r.views === 0)}
              className="w-full py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {concluding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              Wyciągnij zwycięski wzorzec
            </button>
          </div>
        )}

        {conclusion && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
            <p className="text-[10px] font-mono text-amber-300 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Wygrał wariant <strong>{conclusion.winner}</strong>
            </p>
            <p className="text-[11px] font-mono text-slate-300">{conclusion.lesson}</p>
            <p className="text-[9px] font-mono text-slate-500">
              W kolejnych generacjach stosuj więcej tego typu hooków.
              {saved && " ✅ Wzorzec zapisany do pętli uczenia."}
            </p>
            {onSendToReel && winnerVariant && (
              <button
                type="button"
                onClick={() => onSendToReel(reelFromVariant(winnerVariant))}
                className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Film className="w-3 h-3" />
                Wyślij zwycięzcę do studia rolek
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
