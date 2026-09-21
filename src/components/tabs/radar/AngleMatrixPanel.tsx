// SUB-MODUŁ 2: Matryca Kątów Psychologicznych (widok) — wydzielony z AiRadarTab.tsx (etap 2).
// Stan (angleTopic / isGeneratingAngles / angles) pozostaje w rodzicu.
import React from "react";
import { Check, Copy, Film, RefreshCw, Sparkles, Zap } from "lucide-react";
import type { AngleItem } from "./shared";

interface AngleMatrixPanelProps {
  angleTopic: string;
  onAngleTopicChange: (value: string) => void;
  isGeneratingAngles: boolean;
  angles: AngleItem[];
  onGenerateAngles: () => void;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSendToPost?: (text: string, caption?: string) => void;
  onSendToReel?: (hookText: string) => void;
}

export const AngleMatrixPanel: React.FC<AngleMatrixPanelProps> = ({
  angleTopic,
  onAngleTopicChange,
  isGeneratingAngles,
  angles,
  onGenerateAngles,
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
          Wpisz Surowy Temat lub Problem:
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={angleTopic}
            onChange={(e) => onAngleTopicChange(e.target.value)}
            placeholder="np. Strach przed samotnością, prokrastynacja, budowanie firmy w ciszy"
            className="flex-1 px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
          />
          <button
            onClick={onGenerateAngles}
            disabled={isGeneratingAngles}
            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {isGeneratingAngles ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Rozbijanie...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Rozbij na 4 Kąty</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {angles.map((ang, idx) => (
          <div
            key={ang.angleId || idx}
            className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/40 rounded-lg space-y-3 transition-all"
          >
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
              <span className="text-xs font-mono font-bold text-white uppercase">
                {ang.angleName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                Kąt #{idx + 1}
              </span>
            </div>

            <div className="p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)]">
              <span className="text-[10px] text-neutral-500 uppercase font-mono block mb-0.5">
                Magnetyczny Hook:
              </span>
              <p className="text-xs font-mono font-bold text-white">"{ang.hook}"</p>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <span className="text-[10px] text-neutral-500 uppercase block">
                Struktura Wideo (3 Fazy):
              </span>
              <div className="space-y-1">
                {ang.phrases.map((ph, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-1.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] text-[11px] text-neutral-300"
                  >
                    {pIdx + 1}. {ph}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] font-mono text-neutral-400 italic">🧠 {ang.rationale}</p>

            <div className="flex items-center gap-2 pt-2 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => {
                  if (onSendToPost) onSendToPost(ang.hook, ang.caption);
                  else onNavigateToTab(0);
                }}
                className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>📸 Do Posta</span>
              </button>
              <button
                onClick={() => {
                  if (onSendToReel) onSendToReel(ang.hook);
                  else onOpenVideoStudio?.(ang.hook);
                }}
                className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>🎬 Do Rolki</span>
              </button>
              <button
                onClick={() => onCopy(`ang-${idx}`, `${ang.hook}\n\n${ang.phrases.join("\n")}`)}
                className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black text-neutral-300 border border-[rgba(255,255,255,0.1)] text-xs font-mono transition-all cursor-pointer"
                title="Kopiuj tekst"
              >
                {copiedId === `ang-${idx}` ? (
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
