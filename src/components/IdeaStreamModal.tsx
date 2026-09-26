// IdeaStreamModal.tsx — strumień pomysłów z anty-powtórką.
// Historia odcisków (posty + dziennik + to, co wysłano do studia) decyduje, co nie wróci.
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
  X,
} from "lucide-react";
import { IdeaItem, ReelHandoff } from "../types";
import { formatById, formatByGrid } from "../lib/formats";
import { SIMILARITY } from "../lib/similarity";
import type { useIdeaStream } from "../hooks/useIdeaStream";

/**
 * Stan strumienia (lista pomysłów + pamięć tego, co wysłane do studia) trzyma
 * rodzic: modal jest renderowany warunkowo, więc po wysłaniu pomysłu do studia i
 * zamknięciu okna jego własny stan by przepadł.
 */
type IdeaStreamState = ReturnType<typeof useIdeaStream>;

interface IdeaStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: IdeaStreamState;
  onSendToReel: (reel: ReelHandoff) => void;
  /**
   * Trzeci argument to CAŁY pomysł z trasy (`layout` + `structure`), nie tekst:
   * tylko z nim studio posta zbuduje protokół, koszt albo kolaż. Bez niego
   * każdy pomysł zapada się w cytat na czerni.
   */
  onSendToPost: (text: string, caption?: string, idea?: IdeaItem) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const CARD = "p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2";
const ACTION_BTN =
  "py-1.5 px-3 rounded bg-[#141824] hover:bg-[#1E2638] border border-[#2C354B] text-[11px] font-mono font-bold text-slate-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer";
const GENERATE_BTN =
  "py-1.5 px-3 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/40 text-[11px] font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50";
/** Etykieta: kość na obsydianie. Akcent marki (karmazyn) tylko na kształcie kadru i na banku. */
const META_TAG =
  "text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-[#2C354B]";
const ACCENT_TAG =
  "text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-600/15 text-rose-300 border border-rose-600/30";

/** Nazwa układu po polsku, z tej samej tabeli, z której studio bierze kształt wypełnienia. */
function layoutLabel(layout?: string): string {
  if (!layout) return "Cytat";
  const format = formatByGrid(layout) ?? formatById(layout);
  return format?.label ?? "Cytat";
}

const BankTag: React.FC = () => (
  <span className={ACCENT_TAG}>treść z banku — model nie odpowiedział</span>
);

export const IdeaStreamModal: React.FC<IdeaStreamModalProps> = ({
  isOpen,
  onClose,
  stream,
  onSendToReel,
  onSendToPost,
}) => {
  const { ideas, loading, error, notice, usedCount, generateIdeas, markUsed, clearHistory, abort } =
    stream;
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  // Kasowanie pamięci generatora wymaga drugiego kliknięcia: to jedyna rzecz,
  // która chroni przed powtórkami, a wchodzi w nią tylko to, po co kliknął.
  const [confirmForget, setConfirmForget] = React.useState(false);

  // Widok nie płaci za model: confirm kasowania wraca dopiero po zamknięciu okna.
  React.useEffect(() => {
    if (!isOpen) setConfirmForget(false);
  }, [isOpen]);

  // Odmontowanie modala przerywa zapytanie w locie — odpowiedź i tak byłaby do
  // wyrzucenia, a bez tego spinner zostawałby w rodzicu do końca sesji.
  React.useEffect(() => abort, [abort]);

  const close = () => {
    abort();
    onClose();
  };

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
              Strumień pomysłów
            </h3>
            <span className={META_TAG}>{usedCount} w historii</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateIdeas(5)}
              disabled={loading}
              className={GENERATE_BTN}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Nowa partia
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmForget) {
                  setConfirmForget(true);
                  return;
                }
                clearHistory();
                setConfirmForget(false);
              }}
              title="Zapomina zdania wysłane do studia z tego generatora. Postów i dziennika publikacji nie dotyka."
              className={`p-1.5 rounded border cursor-pointer ${
                confirmForget
                  ? "bg-rose-600/25 border-rose-600/50 text-rose-200"
                  : "bg-[#141824] hover:bg-[#1E2638] border-[#2C354B] text-slate-400 hover:text-rose-300"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={close}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {confirmForget && (
          <p className="text-[10px] font-mono text-rose-300">
            Kliknij ponownie, aby zapomnieć zdania wysłane do studia. Kolejna partia może je
            powtórzyć.
          </p>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading && ideas.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
              <p className="text-xs font-mono text-slate-400">
                Pytam modelu o pomysły (omijam {usedCount} zdań z historii)...
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="p-3 bg-rose-600/10 border border-rose-600/30 rounded-lg text-xs font-mono text-rose-300">
              {error}
            </div>
          )}

          {/* Bank potrafi się wyczerpać — pokazujemy to zamiast udawać pełną partię. */}
          {!loading && !error && notice && (
            <div className="p-3 bg-rose-600/10 border border-rose-600/30 rounded-lg text-xs font-mono text-rose-300">
              {notice}
            </div>
          )}

          {!loading &&
            ideas.map((idea) => {
              const steps = idea.structure?.steps ?? [];
              const cost = idea.structure?.cost ?? [];
              const forfeit = idea.structure?.forfeit ?? [];
              const closing = idea.structure?.closing ?? "";
              const figure = idea.structure?.figure ?? "";
              const structured = steps.length > 0 || cost.length > 0;
              return (
                <div key={idea.id} className={CARD}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-mono font-black text-white leading-snug flex-1">
                      {idea.hook}
                    </p>
                    <span className={ACCENT_TAG}>{layoutLabel(idea.layout)}</span>
                  </div>

                  {/* Przed kliknięciem widać kształt: ten sam układ narysuje studio. */}
                  {steps.length > 0 && (
                    <ol className="space-y-0.5 pl-3 border-l border-[#2C354B] list-decimal">
                      {steps.map((step, index) => (
                        <li key={index} className="text-[10px] font-mono text-slate-400">
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}

                  {cost.length > 0 && (
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase tracking-wider text-slate-500">
                        <span>Cena</span>
                        <span>Utrata</span>
                      </div>
                      {cost.map((price, index) => (
                        <div key={index} className="grid grid-cols-2 gap-2">
                          <p className="text-[10px] font-mono text-slate-400">{price}</p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {forfeit[index] ?? ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {closing && (
                    <p className="text-[10px] font-mono text-slate-400 pl-2 border-l border-[#2C354B]">
                      {closing}
                    </p>
                  )}

                  {figure && <p className="text-[10px] font-mono text-slate-500">{figure}</p>}

                  {/* Bez fraz strukturalnych pokazujemy fazy roli; pusty wers to pusty kadr. */}
                  {!structured &&
                    idea.phrases
                      .filter((phrase) => phrase !== idea.hook)
                      .map((phrase, index) => (
                        <p key={index} className="text-[10px] font-mono text-slate-400">
                          {index + 2}. {phrase}
                        </p>
                      ))}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {idea.source === "offline" && <BankTag />}
                    {idea.similarity >= SIMILARITY.WARN && (
                      <span className={META_TAG}>podobne do wcześniejszego materiału</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        markUsed(idea.hook);
                        onSendToReel({
                          hook: idea.hook,
                          phrases: idea.phrases,
                          theme: idea.theme,
                          caption: idea.caption,
                          hashtags: idea.hashtags,
                        });
                      }}
                      className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                    >
                      <Film className="w-3 h-3" />
                      Do studia rolek
                    </button>
                    <button
                      type="button"
                      // Cały pomysł, nie tylko tekst: `layout` i `structure` są tym,
                      // co sprawia, że studio robi protokół/koszt/kolaż zamiast cytatu.
                      onClick={() => {
                        markUsed(idea.hook);
                        onSendToPost(idea.hook, idea.caption || undefined, idea);
                      }}
                      className={ACTION_BTN}
                    >
                      <Sparkles className="w-3 h-3" />
                      Do posta 1:1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(idea.id + "-caption", idea.caption)}
                      className={ACTION_BTN}
                    >
                      {copiedId === idea.id + "-caption" ? (
                        <Check className="w-3 h-3 text-rose-400" />
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
              Kliknij „Nowa partia", aby zapytać model o pomysły — jedno kliknięcie to jedno
              zapytanie.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
