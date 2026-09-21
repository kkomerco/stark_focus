// SUB-MODUŁ 4: Evergreen Recycler (widok) — wydzielony z AiRadarTab.tsx w etapie 2 refaktoryzacji.
// Stan (sourceText / isRecycling / recycledData) pozostaje w rodzicu — komponent jest prezentacyjny.
import React from "react";
import {
  BookOpen,
  Check,
  Copy,
  Film,
  Layers,
  Link,
  RefreshCw,
  Repeat,
  Sparkles,
  Zap,
} from "lucide-react";

interface RecyclerPanelProps {
  sourceText: string;
  onSourceTextChange: (value: string) => void;
  isRecycling: boolean;
  recycledData: any | null;
  onRecycle: () => void;
  onCopy: (id: string, text: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSendToPost?: (text: string, caption?: string) => void;
  onSendToReel?: (hookText: string) => void;
}

export const RecyclerPanel: React.FC<RecyclerPanelProps> = ({
  sourceText,
  onSourceTextChange,
  isRecycling,
  recycledData,
  onRecycle,
  onCopy,
  onNavigateToTab,
  onOpenVideoStudio,
  onSendToPost,
  onSendToReel,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-white" />
            Wklej Bezpośredni Link (Reels, TikTok, Shorts) LUB Wpisz Tekst:
          </label>
          {/^(https?:\/\/|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/)/i.test(sourceText.trim()) && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Wykryto Bezpośredni Link Social Media
            </span>
          )}
        </div>
        <textarea
          rows={3}
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          placeholder="Wklej bezpośredni link do posta/rolki (np. https://www.instagram.com/reel/... lub TikTok / YouTube Shorts) ALBO wpisz własną myśl, stary post lub notatkę..."
          className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white resize-none"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] font-mono text-neutral-400">
            AI zdekonstruuje mechanizm psychologiczny z podanego linku/tekstu i wygeneruje 4
            kompletne formaty STARK w 100% po angielsku.
          </p>
          <button
            onClick={onRecycle}
            disabled={isRecycling}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shrink-0"
          >
            {isRecycling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Dekonstrukcja & Remiks...</span>
              </>
            ) : (
              <>
                <Repeat className="w-3.5 h-3.5" />
                <span>Zremiksuj na 4 Formaty STARK</span>
              </>
            )}
          </button>
        </div>
      </div>

      {recycledData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Format 1: Rolka Wideo */}
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
              <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Film className="w-4 h-4 text-amber-400" />
                1. Rolka 7-Sekundowa (Wideo)
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {recycledData.reel?.duration || 8}s • Climax Hold
              </span>
            </div>

            <div className="p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
              <span className="text-[10px] text-neutral-500 uppercase font-mono block">
                Hook 0-3s:
              </span>
              <p className="text-xs font-mono font-bold text-white">"{recycledData.reel?.hook}"</p>
            </div>

            <ol className="list-decimal list-inside space-y-1 text-xs font-mono text-neutral-300">
              {recycledData.reel?.phrases?.map((ph: string, idx: number) => (
                <li key={idx}>{ph}</li>
              ))}
            </ol>

            <button
              onClick={() => {
                if (onSendToReel) onSendToReel(recycledData.reel?.hook);
                else onOpenVideoStudio?.(recycledData.reel?.hook);
              }}
              className="w-full py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 Wyrzuć do Rolki</span>
            </button>
          </div>

          {/* Format 2: 5-Slajdowa Karuzela */}
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
              <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                2. Karuzela 5 Slajdów
              </span>
              <span className="text-[10px] font-mono text-neutral-400">5 Slajdów • Format 4:5</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {recycledData.carousel?.slides?.map((sl: any, sIdx: number) => (
                <div
                  key={sIdx}
                  className="p-2 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] text-[11px] font-mono space-y-0.5"
                >
                  <div className="text-white font-bold">
                    #{sIdx + 1} {sl.headline}
                  </div>
                  <div className="text-neutral-400 truncate">{sl.bodyText}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const firstSlide = recycledData.carousel?.slides?.[0];
                  const text = firstSlide ? `${firstSlide.headline}\n${firstSlide.bodyText}` : "";
                  const cap = recycledData.caption || "";
                  if (onSendToPost) onSendToPost(text, cap);
                  else onNavigateToTab(0);
                }}
                className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>📸 Wyrzuć do Posta</span>
              </button>
              <button
                onClick={() => {
                  const text = recycledData.carousel?.slides
                    ?.map(
                      (s: { headline: string; bodyText: string }, i: number) =>
                        `Slajd ${i + 1}: ${s.headline}\n${s.bodyText}`,
                    )
                    .join("\n\n");
                  if (text) {
                    navigator.clipboard.writeText(text);
                    onCopy("rec-car", text);
                  }
                }}
                className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-all cursor-pointer"
                title="Kopiuj treść slajdów"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Format 3: Stoicki Manifest */}
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.1)] pb-2">
              <BookOpen className="w-4 h-4 text-neutral-300" />
              3. Stoicki Manifest (1 Zdanie)
            </span>
            <p className="text-xs font-mono font-bold text-white p-3 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
              "{recycledData.manifesto}"
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onSendToPost) onSendToPost(recycledData.manifesto, recycledData.caption);
                  else onNavigateToTab(0);
                }}
                className="flex-1 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black font-bold uppercase text-xs font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>📸 Wyrzuć do Posta</span>
              </button>
              <button
                onClick={() => onCopy("rec-man", recycledData.manifesto)}
                className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-all cursor-pointer"
                title="Kopiuj Manifest"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Format 4: Opis Instagram (Caption) */}
          <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
            <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.1)] pb-2">
              <Zap className="w-4 h-4 text-purple-400" />
              4. Gotowy Opis Posta (Instagram)
            </span>
            <p className="text-[11px] font-mono text-neutral-300 p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] max-h-24 overflow-y-auto whitespace-pre-wrap">
              {recycledData.caption}
            </p>
            <button
              onClick={() => onCopy("rec-cap", recycledData.caption)}
              className="w-full py-1.5 px-3 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-xs font-mono text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Kopiuj Opis i Hashtagi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
