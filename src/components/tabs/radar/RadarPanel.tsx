// SUB-MODUŁ 1: Radar Trendów & Formatów Wiralowych (widok) — wydzielony z AiRadarTab.tsx (etap 2).
// Stan pozostaje w rodzicu (używany też przez przełącznik zakładek i inne sekcje).
import React from "react";
import {
  Bookmark,
  Check,
  Copy,
  Film,
  Flame,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import type { TrendItem } from "../../../types";
import type { ViralFormatItem } from "./shared";

interface RadarPanelProps {
  niche: string;
  onNicheChange: (value: string) => void;
  platform: string;
  onPlatformChange: (value: string) => void;
  isScanning: boolean;
  scanMessage: string;
  viralFormats: ViralFormatItem[];
  trends: TrendItem[];
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onScanTrends: () => void;
  onGoToBatch: () => void;
  onNavigateToTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSendToPost?: (text: string, caption?: string) => void;
  onSendToReel?: (hookText: string) => void;
}

export const RadarPanel: React.FC<RadarPanelProps> = ({
  niche,
  onNicheChange,
  platform,
  onPlatformChange,
  isScanning,
  scanMessage,
  viralFormats,
  trends,
  copiedId,
  onCopy,
  onScanTrends,
  onGoToBatch,
  onNavigateToTab,
  onOpenVideoStudio,
  onSendToPost,
  onSendToReel,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Panel Wyszukiwania */}
      <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
              Nisza & Psychologia Odbiorcy:
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => onNicheChange(e.target.value)}
              placeholder="np. dark stoicism, digital dopamine detox, discipline"
              className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>
          <div className="w-full sm:w-64">
            <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
              Format Publikacji:
            </label>
            <select
              value={platform}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white focus:outline-none focus:border-white"
            >
              <option value="Instagram Karuzela / TikTok">Instagram Karuzela / TikTok</option>
              <option value="Rolka 7s B-Roll z Basem">Rolka 7s B-Roll z Basem</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={onScanTrends}
              disabled={isScanning}
              className="w-full sm:w-auto px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Skanowanie...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Skanuj Sieć</span>
                </>
              )}
            </button>

            <button
              onClick={onGoToBatch}
              className="w-full sm:w-auto px-4 py-2 rounded bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-200 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="Przejdź do generatora masowego"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Masowe Rolki</span>
            </button>
          </div>
        </div>
      </div>

      {scanMessage && (
        <div className="p-3 bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-neutral-300 flex items-center justify-between">
          <span>{scanMessage}</span>
          <span className="text-[10px] text-neutral-500 font-mono">Baza: STARK_OS_RADAR</span>
        </div>
      )}
      {/* Sekcja: Psychologiczne Formaty Wiralowe (Wysoka Konwersja) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Matryca Sprawdzonych Formatów Wirali (Reels / TikTok Hooks)
          </h3>
          <span className="text-[10px] font-mono text-neutral-500">
            Szablony o udowodnionej retencji 0-3s
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {viralFormats.map((fmt, fIdx) => (
            <div
              key={fmt.formatKey || fIdx}
              className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/40 rounded-lg space-y-3 transition-all"
            >
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-2">
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                  <span className="text-amber-400">⚡</span> {fmt.formatName}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                  Format STARK
                </span>
              </div>

              <div className="p-2.5 bg-[#050505] rounded border border-[rgba(255,255,255,0.1)] space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase font-mono block">
                  Hook 0-3s:
                </span>
                <p className="text-xs font-mono text-white font-bold">"{fmt.hook}"</p>
              </div>

              <div className="space-y-1 text-xs font-mono text-neutral-400">
                <span className="text-[10px] text-neutral-500 uppercase block">
                  Struktura 3 Faz:
                </span>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-neutral-300">
                  {fmt.phrases.map((phrase, pIdx) => (
                    <li key={pIdx}>{phrase}</li>
                  ))}
                </ol>
              </div>

              <div className="text-[11px] font-mono text-neutral-400 italic">
                💡 {fmt.rationale}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    if (onSendToPost) onSendToPost(fmt.hook, fmt.rationale);
                    else onNavigateToTab(0);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>📸 Do Posta</span>
                </button>
                <button
                  onClick={() => {
                    if (onSendToReel) onSendToReel(fmt.hook);
                    else onOpenVideoStudio?.(fmt.hook);
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>🎬 Do Rolki</span>
                </button>
                <button
                  onClick={() => onCopy(`vf-${fIdx}`, fmt.hook)}
                  className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black text-neutral-300 border border-[rgba(255,255,255,0.1)] text-xs font-mono transition-all cursor-pointer"
                  title="Kopiuj hook"
                >
                  {copiedId === `vf-${fIdx}` ? (
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
      {/* Sekcja: Zidentyfikowane Wątki Sieciowe */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-400" />
          Przeskanowane Wątki Sieci ({trends.length})
        </h3>

        <div className="space-y-3">
          {trends.map((trend, idx) => (
            <div
              key={trend.id || idx}
              className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] hover:border-white/20 rounded-lg space-y-2.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  #{idx + 1} {trend.title}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Wirusowość: {trend.estimated_virality || "95%"}
                </span>
              </div>

              <p className="text-xs font-mono text-neutral-300">{trend.core_message}</p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    const text = trend.viral_hooks?.[0] || trend.title;
                    const cap = `${trend.title}\n\n${trend.core_message}\n\n#stoicism #discipline #mindset`;
                    if (onSendToPost) onSendToPost(text, cap);
                    else onNavigateToTab(0);
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>📸 Wyrzuć do Posta</span>
                </button>

                <button
                  onClick={() => {
                    const hook = trend.viral_hooks?.[0] || trend.title;
                    if (onSendToReel) onSendToReel(hook);
                    else onOpenVideoStudio?.(hook);
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded bg-[#161616] hover:bg-white hover:text-black border border-[rgba(255,255,255,0.1)] text-white text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>🎬 Wyrzuć do Rolki</span>
                </button>

                <button
                  onClick={() => onCopy(`tr-${idx}`, `${trend.title}\n${trend.core_message}`)}
                  className="p-1.5 rounded bg-[#050505] hover:bg-[#161616] border border-[rgba(255,255,255,0.1)] text-xs font-mono font-bold text-neutral-300 transition-all cursor-pointer"
                  title="Kopiuj treść"
                >
                  {copiedId === `tr-${idx}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
