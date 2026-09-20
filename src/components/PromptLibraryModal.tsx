// PromptLibraryModal.tsx — Biblioteka promptów tła (spójny feed) + "reroll" w tym samym stylu.
// Zbiera bingPrompty z postów w galerię i pozwala wygenerować nowy prompt w identycznym
// stylu wizualnym (endpoint /api/ai/reroll-prompt) — estetyka feedu bez myślenia.
import React, { useState } from "react";
import {
  Check,
  Copy,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { PromptLibraryItem, StarkFocusData } from "../types";

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50";
const REROLL_BTN =
  "py-1.5 px-3 rounded bg-lime-500/15 hover:bg-lime-500/25 border border-lime-500/40 text-[11px] font-mono font-bold text-lime-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50";

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
}) => {
  const library = data.prompt_library || [];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rerollingId, setRerollingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addPrompt = (prompt: string, style: string, source: string) => {
    const item: PromptLibraryItem = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt,
      style,
      source,
      createdAt: new Date().toISOString(),
      uses: 0,
    };
    onUpdateData((prev) => ({
      ...prev,
      prompt_library: [item, ...(prev.prompt_library || [])],
    }));
  };

  const bumpUses = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      prompt_library: (prev.prompt_library || []).map((p) =>
        p.id === id ? { ...p, uses: p.uses + 1 } : p,
      ),
    }));
  };

  const removePrompt = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      prompt_library: (prev.prompt_library || []).filter((p) => p.id !== id),
    }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    bumpUses(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReroll = async (item?: PromptLibraryItem) => {
    const reference = (item?.prompt || draft).trim();
    if (reference.length < 10) return;
    const style = item?.style || "dark_minimalist";
    setError(null);
    setRerollingId(item?.id || "__draft__");
    try {
      const res = await fetch("/api/ai/reroll-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referencePrompt: reference, format: "1:1" }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const prompt = String(json.prompt || "").trim();
      if (prompt.length < 20) throw new Error("too short");
      addPrompt(prompt, style, item ? "reroll" : "manual");
      setDraft("");
    } catch {
      setError("Nie udało się wygenerować nowego promptu — spróbuj ponownie.");
    } finally {
      setRerollingId(null);
    }
  };

  const handleAddDraft = () => {
    const text = draft.trim();
    if (text.length < 10) return;
    addPrompt(text, "dark_minimalist", "manual");
    setDraft("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-3xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-lime-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Biblioteka Promptów
            </h3>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-lime-500/15 text-lime-400 border border-lime-500/30">
              🖼️ {library.length} zapisanych
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

        <p className="text-[11px] font-mono text-slate-400">
          Zbierz prompty tła w jedno miejsce i rób „reroll"{" "}
          <span className="text-slate-200">w tym samym stylu</span> — spójna estetyka feedu bez
          zastanawiania się.
        </p>

        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Wklej prompt tła (z paczki dnia lub studia 1:1)..."
            className="w-full h-20 px-3 py-2 rounded bg-[#141824] border border-[#2C354B] text-[11px] font-mono text-slate-200 placeholder-slate-600 resize-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddDraft}
              disabled={draft.trim().length < 10}
              className={ACTION_BTN}
            >
              <Plus className="w-3 h-3" />
              Dodaj do biblioteki
            </button>
            <button
              type="button"
              onClick={() => handleReroll()}
              disabled={draft.trim().length < 10 || rerollingId === "__draft__"}
              className={REROLL_BTN}
            >
              {rerollingId === "__draft__" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              Reroll w tym stylu
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {library.length === 0 && (
            <div className="text-center py-12 text-xs font-mono text-slate-500">
              Biblioteka jest pusta. Wklej prompt tła powyżej albo użyj „Reroll w tym stylu".
            </div>
          )}

          {library.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-mono text-slate-200 flex-1 whitespace-pre-wrap">
                  {item.prompt}
                </p>
                <button
                  type="button"
                  onClick={() => removePrompt(item.id)}
                  title="Usuń z biblioteki"
                  className="p-1 text-slate-500 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-300 border border-slate-500/25">
                  {item.style}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25">
                  {item.source}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  użyć: {item.uses}
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.prompt)}
                  className={ACTION_BTN}
                >
                  {copiedId === item.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === item.id ? "Skopiowano" : "Kopiuj"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReroll(item)}
                  disabled={rerollingId === item.id}
                  className={REROLL_BTN}
                >
                  {rerollingId === item.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Reroll
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
