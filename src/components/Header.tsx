import React from "react";
import { Film, Layers } from "lucide-react";
import { StarkFocusData } from "../types";
import { StarkLogo } from "./StarkLogo";

interface HeaderProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenVideoStudio?: () => void;
  onOpenCarouselStudio?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  onOpenVideoStudio,
  onOpenCarouselStudio,
}) => {
  const totalPosts = data.posts?.length || 0;

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-4 border-b border-[#1E2638] gap-3">
      {/* Brand & Monogram */}
      <div className="flex items-center gap-3">
        <StarkLogo size={38} showText={true} />
      </div>

      {/* Pigułki statusu i szybkie akcje */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 bg-[#090C14] border border-[#1E2638] px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="text-amber-400">🔥 {data.streak} dni passy</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">{totalPosts} postów</span>
        </div>

        {onOpenVideoStudio && (
          <button
            onClick={onOpenVideoStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#131826] hover:bg-[#1E2638] border border-white/20 text-xs font-mono font-bold text-white hover:border-white/50 transition-colors cursor-pointer"
            title="Otwórz Automontażystę rolek (60 FPS, kinetic typography, zero cyjanu)"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Automontażysta Rolek</span>
          </button>
        )}

        {onOpenCarouselStudio && (
          <button
            onClick={onOpenCarouselStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#131826] hover:bg-[#1E2638] border border-emerald-500/40 text-xs font-mono font-bold text-emerald-400 transition-colors cursor-pointer"
            title="Otwórz studio generowania wieloslajdowych karuzel na Instagram"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Studio Karuzeli (4:5)</span>
          </button>
        )}
      </div>
    </header>
  );
};
