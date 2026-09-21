import React from "react";
import { StarkFocusData } from "../types";

interface HeaderProps {
  data: StarkFocusData;
  onUpdateData?: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  activeTab?: number;
  onOpenVideoStudio?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab = 0 }) => {
  const currentTabName =
    activeTab === 0
      ? "STUDIO POSTA 1:1 (JPG / PNG)"
      : activeTab === 1
        ? "AUTOMONTAŻYSTA ROLEK (9S WIDEO)"
        : "RADAR TRENDÓW & POMYSŁÓW";

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-white text-black font-mono font-black text-xs flex items-center justify-center tracking-tighter">
          SF
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-mono font-black text-white uppercase tracking-wider">
              STARK FOCUS
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-neutral-300 font-bold">
              v3.0
            </span>
          </div>
          <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
            Minimalistyczny system tworzenia treści
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#111111] border border-white/10 text-[10px] font-mono text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-neutral-400 uppercase tracking-wider">{currentTabName}</span>
        </div>
      </div>
    </header>
  );
};
