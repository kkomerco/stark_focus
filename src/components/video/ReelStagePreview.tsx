// Prezentacyjny podgląd 9:16 (canvas, HUD, kontrolki odtwarzania).
// Przeniesione 1:1 z VideoStudioModal.tsx (logika bez zmian).
import React from "react";
import { Clock, Pause, Play, Smartphone, Volume2, VolumeX } from "lucide-react";
import { PhraseTimeInterval } from "./reel-helpers";

interface ReelStagePreviewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  duration: number;
  currentTime: number;
  phrases: string[];
  activeTimeline: PhraseTimeInterval[];
  currentPhraseIndex: number;
  pacingMode: string;
  format: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  showTikTokGuides: boolean;
  onToggleTikTokGuides: () => void;
  enableTts: boolean;
  onToggleTts: () => void;
  onSeek: (t: number) => void;
}

export const ReelStagePreview: React.FC<ReelStagePreviewProps> = ({
  canvasRef,
  duration,
  currentTime,
  phrases,
  activeTimeline,
  currentPhraseIndex,
  pacingMode,
  format,
  isPlaying,
  onTogglePlay,
  showTikTokGuides,
  onToggleTikTokGuides,
  enableTts,
  onToggleTts,
  onSeek,
}) => {
  return (
    <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#050505] border border-white/10 rounded-xl p-3 sm:p-4">
      <div className="relative w-full max-w-[270px] sm:max-w-[290px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/15 bg-black">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        <StageHud
          currentTime={currentTime}
          duration={duration}
          phrases={phrases}
          activeTimeline={activeTimeline}
          currentPhraseIndex={currentPhraseIndex}
          pacingMode={pacingMode}
          format={format}
        />
      </div>
      <StageControls
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        showTikTokGuides={showTikTokGuides}
        onToggleTikTokGuides={onToggleTikTokGuides}
        enableTts={enableTts}
        onToggleTts={onToggleTts}
        duration={duration}
        currentTime={currentTime}
        phrases={phrases}
        activeTimeline={activeTimeline}
        currentPhraseIndex={currentPhraseIndex}
        pacingMode={pacingMode}
        onSeek={onSeek}
      />
    </div>
  );
};

function StageHud({
  currentTime,
  duration,
  phrases,
  activeTimeline,
  currentPhraseIndex,
  pacingMode,
  format,
}: Pick<
  ReelStagePreviewProps,
  | "currentTime"
  | "duration"
  | "phrases"
  | "activeTimeline"
  | "currentPhraseIndex"
  | "pacingMode"
  | "format"
>) {
  return (
    <>
      {/* Stopwatch & Phrase HUD */}
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/80 border border-white/20 font-mono text-[10px] text-white font-bold backdrop-blur-sm flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-neutral-300" />
        <span>{currentTime.toFixed(2)}s</span>
        <span className="text-neutral-500">/ {duration}.00s</span>
        {phrases.length > 1 && (
          <span
            className={`ml-0.5 pl-1.5 border-l border-white/20 text-[9px] ${
              activeTimeline[currentPhraseIndex]?.isClimax && pacingMode === "climax_hold"
                ? "text-amber-300 font-black"
                : "text-neutral-300"
            }`}
          >
            F{currentPhraseIndex + 1}/{phrases.length}
            {activeTimeline[currentPhraseIndex]?.isClimax && pacingMode === "climax_hold" && " ⭐"}
          </span>
        )}
      </div>

      {/* Format Badge */}

function StageControls({
  isPlaying,
  onTogglePlay,
  showTikTokGuides,
  onToggleTikTokGuides,
  enableTts,
  onToggleTts,
  duration,
  currentTime,
  phrases,
  activeTimeline,
  currentPhraseIndex,
  pacingMode,
  onSeek,
}: Pick<
  ReelStagePreviewProps,
  | "isPlaying"
  | "onTogglePlay"
  | "showTikTokGuides"
  | "onToggleTikTokGuides"
  | "enableTts"
  | "onToggleTts"
  | "duration"
  | "currentTime"
  | "phrases"
  | "activeTimeline"
  | "currentPhraseIndex"
  | "pacingMode"
  | "onSeek"
>) {
  return (
    <div className="w-full max-w-[290px] mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className="px-3 py-1.5 rounded bg-white hover:bg-neutral-200 text-black font-black text-xs font-mono uppercase tracking-wider transition-all flex-1 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" /> Pauza
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" /> Odtwórz
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleTikTokGuides}
          className={`px-2.5 py-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
            showTikTokGuides
              ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
              : "bg-[#141414] border-white/10 text-neutral-400 hover:text-white"
          }`}
          title="Włącz siatkę bezpiecznych stref TikToka / Reels"
        >
          <Smartphone className="w-3.5 h-3.5" />
          TikTok UI
        </button>

        <button
          type="button"
          onClick={onToggleTts}
          className={`px-2.5 py-1.5 rounded border text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
            enableTts
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              : "bg-[#141414] border-white/10 text-neutral-400 hover:text-white"
          }`}
          title="Automatyczny lektor czytający frazy synchronicznie z klatkami"
        >
          {enableTts ? (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <span>TTS</span>
        </button>
      </div>

      {/* Scrub Slider */}
      <div className="space-y-1.5 pt-1">
        <input
          type="range"
          min="0"
          max={duration}
          step="0.05"
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-white"
        />

        {/* Multi-segment Pacing Track */}
        {phrases.length > 1 && (
          <div className="w-full flex items-center gap-1 h-1.5 rounded-full overflow-hidden bg-[#161616] p-0.5 border border-white/10">
            {activeTimeline.map((seg, sIdx) => {
              const isCurrentSeg = currentPhraseIndex === sIdx;
              const widthPct = (seg.duration / duration) * 100;
              return (
                <div
                  key={sIdx}
                  style={{ width: `${widthPct}%` }}
                  title={`Fraza ${sIdx + 1}: ${seg.duration.toFixed(1)}s (${seg.start.toFixed(1)}s – ${seg.end.toFixed(1)}s)`}
                  className={`h-full rounded-sm transition-all ${
                    isCurrentSeg
                      ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      : seg.isClimax && pacingMode === "climax_hold"
                        ? "bg-amber-400/40"
                        : "bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

      <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[9px] text-white font-bold backdrop-blur-sm uppercase">
        {format === "three_phases"
          ? "3 Fazy"
          : format === "single_quote"
            ? "1 Cytat"
            : format === "two_phases"
              ? "2 Fazy"
              : "4 Frazy"}
      </div>
    </>
  );
}
