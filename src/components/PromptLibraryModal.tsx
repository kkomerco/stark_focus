// Ręczne archiwum promptów. Nowe plany oprawy powstają przy konkretnej treści w studiu.
import React, { useState } from "react";
import { Check, Copy, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import { PromptLibraryItem, StarkFocusData } from "../types";

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
}

const PANEL = "bg-[#0E0E0E] border border-[#303030] rounded-xl";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#161616] hover:bg-[#242424] border border-[#303030] text-[11px] font-mono font-bold text-neutral-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50";
const META_BADGE =
  "text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-200 border border-zinc-500/40";
const STYLE_BADGE =
  "text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-300 border border-neutral-500/25";
const BANK_BADGE =
  "text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30";

/** Uczciwy podpis: szablon z pliku nie ma prawa wyglądać jak zaprojektowany w stylu feedu. */
const BANK_NOTE = "treść z banku — model nie odpowiedział";
/** Wartość pola `source` dla promptu, który oddał bank, nie reroll od modelu. */
const BANK_SOURCE = "reroll z banku";

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
}) => {
  const library = data.prompt_library || [];
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addPrompt = (prompt: string, style: string, source: string) => {
    const item: PromptLibraryItem = {
      id: `pl-${Date.now()}-${crypto.randomUUID()}`,
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

  const handleCopy = async (id: string, text: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      bumpUses(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Nie udało się skopiować promptu. Zaznacz tekst i skopiuj go ręcznie.");
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
        <div className="flex items-center justify-between pb-3 border-b border-[#303030]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Zapisane prompty
            </h3>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {library.length} zapisanych
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-mono text-neutral-400">
          Zachowaj prompty, do których chcesz wracać. Nowy plan oprawy przygotujesz przy treści w
          studiu posta lub rolki. Zapisywanie i kopiowanie nie wywołuje AI.
        </p>

        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Wklej prompt z panelu oprawy lub własny opis sceny..."
            className="w-full h-20 px-3 py-2 rounded bg-[#161616] border border-[#303030] text-[11px] font-mono text-neutral-200 placeholder-neutral-600 resize-none"
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
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {library.length === 0 && (
            <div className="text-center py-12 text-xs font-mono text-neutral-500">
              Biblioteka jest pusta. Wklej prompt, który chcesz zachować.
            </div>
          )}

          {library.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-[#161616] border border-[#303030] rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-mono text-neutral-200 flex-1 whitespace-pre-wrap">
                  {item.prompt}
                </p>
                <button
                  type="button"
                  onClick={() => removePrompt(item.id)}
                  title="Usuń z biblioteki"
                  className="p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={STYLE_BADGE}>{item.style}</span>
                {item.source === BANK_SOURCE ? (
                  <span className={BANK_BADGE}>{BANK_NOTE}</span>
                ) : (
                  <span className={META_BADGE}>{item.source}</span>
                )}
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25">
                  użyć: {item.uses}
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.prompt)}
                  className={ACTION_BTN}
                >
                  {copiedId === item.id ? (
                    <Check className="w-3 h-3 text-neutral-200" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === item.id ? "Skopiowano" : "Kopiuj"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
