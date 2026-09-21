// SUB-MODUŁ 5: Generator Masowy / Batch (widok) — wydzielony z AiRadarTab.tsx w etapie 2 refaktoryzacji.
// Stan (batchCount / isGeneratingBatch / batchPosts / addedBatchIds) pozostaje w rodzicu.
import React from "react";
import { Check, CheckCircle2, Copy, Film, Layers, PlusCircle, RefreshCw } from "lucide-react";
import type { BatchPostItem } from "./shared";

interface BatchPanelProps {
  niche: string;
  onNicheChange: (value: string) => void;
  batchCount: number;
  onBatchCountChange: (value: number) => void;
  isGeneratingBatch: boolean;
  batchPosts: BatchPostItem[];
  addedBatchIds: Set<string>;
  onGenerateBatch: () => void;
  onAddToPipeline: (post: BatchPostItem) => void;
  onAddAllToPipeline: () => void;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSendToReel?: (hookText: string) => void;
}

export const BatchPanel: React.FC<BatchPanelProps> = ({
  niche,
  onNicheChange,
  batchCount,
  onBatchCountChange,
  isGeneratingBatch,
  batchPosts,
  addedBatchIds,
  onGenerateBatch,
  onAddToPipeline,
  onAddAllToPipeline,
  copiedId,
  onCopy,
  onOpenVideoStudio,
  onSendToReel,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Panel Sterowania Masowego */}
      <div className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
              Nisza Psychologiczna & Tematyka:
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => onNicheChange(e.target.value)}
              placeholder="np. dark psychology, ruthless discipline, monk mode"
              className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
            />
          </div>

          <div className="w-full sm:w-48">
            <label className="text-[10px] text-neutral-400 font-mono uppercase font-bold block mb-1">
              Liczba Rolek w Serii:
            </label>
            <select
              value={batchCount}
              onChange={(e) => onBatchCountChange(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[#050505] border border-[rgba(255,255,255,0.1)] rounded text-xs font-mono text-white focus:outline-none focus:border-white"
            >
              <option value={3}>3 Rolki (Szybki pakiet)</option>
              <option value={6}>6 Rolek (Standardowy tydzień)</option>
              <option value={10}>10 Rolek (Mocna kampania)</option>
            </select>
          </div>

          <button
            onClick={onGenerateBatch}
            disabled={isGeneratingBatch}
            className="w-full sm:w-auto px-5 py-2 rounded bg-white hover:bg-neutral-200 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isGeneratingBatch ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Generuję Serię...</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Generuj Masowo AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Lista Wygenerowanych Rolek Masowych */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Wygenerowane Rolki Masowe ({batchPosts.length})</span>
          </h3>

          {batchPosts.length > 0 && (
            <button
              onClick={onAddAllToPipeline}
              disabled={batchPosts.every((p) => addedBatchIds.has(p.id))}
              className="px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {batchPosts.every((p) => addedBatchIds.has(p.id))
                  ? "Wszystkie Dodane"
                  : "Dodaj Wszystkie do Harmonogramu"}
              </span>
            </button>
          )}
        </div>

        {batchPosts.length === 0 ? (
          <div className="p-8 text-center bg-[#0E0E0E] border border-[rgba(255,255,255,0.05)] rounded-lg">
            <Layers className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-xs font-mono text-neutral-400">
              Brak wygenerowanych rolek. Kliknij "Generuj Masowo AI", aby stworzyć spójną serię
              publikacji z życiowym uderzeniem.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchPosts.map((post, idx) => {
              const isAdded = addedBatchIds.has(post.id);
              return (
                <div
                  key={post.id || idx}
                  className="p-4 bg-[#0E0E0E] border border-[rgba(255,255,255,0.1)] rounded-lg flex flex-col justify-between space-y-3 hover:border-white/20 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-white/10 text-neutral-300 uppercase font-bold">
                        {post.pillar}
                      </span>
                      <span className="text-neutral-500">#{idx + 1}</span>
                    </div>

                    {/* Główny Hook */}
                    <div className="p-3 bg-[#050505] border border-white/5 rounded">
                      <p className="text-xs font-serif font-bold text-white leading-relaxed">
                        "{post.sayingMain}"
                      </p>
                      {post.sayingSub && (
                        <p className="text-[11px] font-mono text-neutral-400 mt-1.5 border-t border-white/5 pt-1.5">
                          {post.sayingSub}
                        </p>
                      )}
                    </div>

                    {/* Skrót Opisu */}
                    <div className="text-[10px] font-mono text-neutral-400 line-clamp-3 bg-[#080808] p-2 rounded border border-white/5 whitespace-pre-wrap">
                      {post.caption}
                    </div>
                  </div>

                  {/* Akcje dla Rolki */}
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          const fullText = post.sayingSub
                            ? `${post.sayingMain}\n${post.sayingSub}`
                            : post.sayingMain;
                          if (onOpenVideoStudio) {
                            onOpenVideoStudio(fullText);
                          } else if (onSendToReel) {
                            onSendToReel(fullText);
                          }
                        }}
                        className="flex-1 py-1.5 px-2 rounded bg-white hover:bg-neutral-200 text-black text-[11px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Film className="w-3 h-3" />
                        <span>Otwórz w Studio</span>
                      </button>

                      <button
                        onClick={() => onCopy(`batch-${post.id}`, post.caption)}
                        className="p-1.5 rounded bg-[#161616] hover:bg-white hover:text-black border border-white/10 text-neutral-400 hover:text-black transition-all cursor-pointer"
                        title="Kopiuj opis"
                      >
                        {copiedId === `batch-${post.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => onAddToPipeline(post)}
                      disabled={isAdded}
                      className={`w-full py-1.5 px-2 rounded text-[10px] font-mono uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isAdded
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                          : "bg-[#161616] hover:bg-white/10 text-neutral-300 border border-white/10"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>W harmonogramie</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3 h-3" />
                          <span>Dodaj do postów</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
