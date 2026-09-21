// SUB-MODUŁ 3: Generator Sprzeczności i Paradoksów (widok) — wydzielony z AiRadarTab.tsx (etap 2).
// Stan (frictionTopic / isGeneratingFriction / paradoxes) pozostaje w rodzicu.
import React from "react";
import { Check, Copy, Film, RefreshCw, Sparkles } from "lucide-react";
import type { ParadoxItem } from "./shared";

interface FrictionPanelProps {
  frictionTopic: string;
  onFrictionTopicChange: (value: string) => void;
  isGeneratingFriction: boolean;
  paradoxes: ParadoxItem[];
  onGenerateFriction: () => void;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSendToPost?: (text: string, caption?: string) => void;
  onSendToReel?: (hookText: string) => void;
}

export const FrictionPanel: React.FC<FrictionPanelProps> = ({
  frictionTopic,
  onFrictionTopicChange,
  isGeneratingFriction,
  paradoxes,
  onGenerateFriction,
  copiedId,
  onCopy,
  onNavigateToTab,
  onOpenVideoStudio,
  onSendToPost,
  onSendToReel,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
        <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block">
          Obszar tematyczny do poszukiwania sprzeczności:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={frictionTopic}
            onChange={(e) => onFrictionTopicChange(e.target.value)}
            placeholder="np. praca, odpoczynek, relacje, pieniądze, ambicja"
            className="flex-1 px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
          />
          <button
            onClick={onGenerateFriction}
            disabled={isGeneratingFriction}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isGeneratingFriction ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generowanie...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generuj Paradoksy</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paradoxes.map((pdx, idx) => (
          <div
            key={idx}
            className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/40 rounded-lg space-y-3 transition-all"
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
              <span className="text-xs font-mono font-bold text-white uppercase">
                ⚡ {pdx.title}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Pattern Interrupt
              </span>
            </div>

            <div className="p-3 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
              <p className="text-xs font-mono font-black text-white leading-relaxed">
                "{pdx.hook}"
              </p>
            </div>

            <p className="text-xs font-mono text-neutral-300">
              <strong className="text-neutral-500 uppercase text-[10px] block">Psychologia:</strong>
              {pdx.explanation}
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => {
                  if (onSendToPost) onSendToPost(pdx.hook, pdx.explanation);
                  else onNavigateToTab(0);
                }}
                className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>📸 Do Posta</span>
              </button>
              <button
                onClick={() => {
                  if (onSendToReel) onSendToReel(pdx.hook);
                  else onOpenVideoStudio?.(pdx.hook);
                }}
                className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>🎬 Do Rolki</span>
              </button>
              <button
                onClick={() => onCopy(`pdx-${idx}`, pdx.hook)}
                className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black text-neutral-300 border border-[rgba(255,255,255,0.1)] text-xs font-mono transition-all cursor-pointer"
                title="Kopiuj"
              >
                {copiedId === `pdx-${idx}` ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
