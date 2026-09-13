import React from 'react';
import {
  ExternalLink,
  Instagram,
  Video,
  Youtube,
  Scissors,
  Volume2,
  Image,
  Sparkles,
  Palette,
  Swords,
  Settings,
  Flame,
  LayoutDashboard,
  Film
} from 'lucide-react';
import { SocialHandles } from '../types';

interface LaunchpadBarProps {
  handles: SocialHandles;
  onOpenProfileSettings: () => void;
  onOpenCarouselStudio: () => void;
  onOpenHookBattle: () => void;
  onOpenVideoStudio: () => void;
  onOpenBrandStyle: () => void;
}

export const LaunchpadBar: React.FC<LaunchpadBarProps> = ({
  handles,
  onOpenProfileSettings,
  onOpenCarouselStudio,
  onOpenHookBattle,
  onOpenVideoStudio,
  onOpenBrandStyle
}) => {
  const igHandle = handles.instagram.replace('@', '') === 'stark.focus' || !handles.instagram
    ? 'stark_focus'
    : handles.instagram.replace('@', '');
  const ttHandle = handles.tiktok.replace('@', '') || 'starkfocus.os';
  const ytHandle = handles.youtube.startsWith('@') ? handles.youtube : `@${handles.youtube || 'starkfocus'}`;

  return (
    <div
      id="stark-launchpad-bar"
      className="bg-[#1D2333] border border-[#2C354B] rounded-lg p-3 mb-5 shadow-sm space-y-2.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C354B] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-mono font-black text-[#38BDF8] uppercase tracking-widest flex items-center gap-1.5">
            <LayoutDashboard className="w-3.5 h-3.5" />
            CENTRUM DOWODZENIA // ONE-CLICK PLATFORM HUB (100% BEZPŁATNE & BEZPIECZNE)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <button
            onClick={onOpenBrandStyle}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#141824] hover:bg-[#242B3F] text-[#38BDF8] hover:text-white border border-[#2C354B] transition-colors cursor-pointer"
            title="Księga stylu i wytyczne wizualne"
          >
            <Palette className="w-3 h-3 text-[#38BDF8]" />
            <span>Księga Stylu</span>
          </button>

          <button
            onClick={onOpenProfileSettings}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#141824] hover:bg-[#141824]/80 text-slate-300 hover:text-white border border-[#2C354B] transition-colors cursor-pointer"
            title="Skonfiguruj swoje nazwy profili"
          >
            <Settings className="w-3 h-3 text-[#38BDF8]" />
            <span>Profile: @{igHandle}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Instagram Profile - Fixed Direct Link & Quick Create */}
        <div className="bg-[#141824] p-2 rounded border border-[#2C354B] flex flex-col justify-between space-y-1.5 hover:border-[#E1306C]/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#E1306C] flex items-center gap-1 uppercase tracking-wider">
              <Instagram className="w-3 h-3" /> Instagram
            </span>
            <span className="text-[9px] font-mono text-slate-400">@{igHandle}</span>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`https://www.instagram.com/${igHandle}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1 rounded bg-[#1D2333] hover:bg-[#E1306C]/20 text-[10px] font-bold text-white border border-[#2C354B] transition-colors flex items-center justify-center gap-1"
              title={`Otwórz oficjalny profil @${igHandle} na Instagramie`}
            >
              Profil <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
            <a
              href="https://business.facebook.com/latest/posts/published_posts/?business_id=1039822805509351&asset_id=1357138857472560"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 px-2.5 rounded bg-[#1D2333] hover:bg-[#E1306C]/20 text-[10px] font-bold text-[#E1306C] border border-[#2C354B] transition-colors cursor-pointer"
              title="Kreator Postów i Opublikowane Posty Instagram (Meta Business Suite)"
            >
              +
            </a>
          </div>
        </div>

        {/* TikTok Profile & Studio */}
        <div className="bg-[#141824] p-2 rounded border border-[#2C354B] flex flex-col justify-between space-y-1.5 hover:border-[#00F2FE]/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#00F2FE] flex items-center gap-1 uppercase tracking-wider">
              <Video className="w-3 h-3" /> TikTok
            </span>
            <span className="text-[9px] font-mono text-slate-400">Studio</span>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`https://www.tiktok.com/@${ttHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1 rounded bg-[#1D2333] hover:bg-[#00F2FE]/20 text-[10px] font-bold text-white border border-[#2C354B] transition-colors flex items-center justify-center gap-1"
            >
              Konto <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
            <a
              href="https://www.tiktok.com/creator-center/upload"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 px-2 rounded bg-[#1D2333] hover:bg-[#00F2FE]/20 text-[10px] font-bold text-[#00F2FE] border border-[#2C354B] transition-colors"
              title="Wrzucanie wideo na TikTok"
            >
              +
            </a>
          </div>
        </div>

        {/* YouTube Studio & Upload */}
        <div className="bg-[#141824] p-2 rounded border border-[#2C354B] flex flex-col justify-between space-y-1.5 hover:border-[#FF0000]/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#FF0000] flex items-center gap-1 uppercase tracking-wider">
              <Youtube className="w-3 h-3" /> YouTube
            </span>
            <span className="text-[9px] font-mono text-slate-400">Shorts</span>
          </div>

          <div className="flex items-center gap-1">
            <a
              href="https://studio.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center py-1 rounded bg-[#1D2333] hover:bg-[#FF0000]/20 text-[10px] font-bold text-white border border-[#2C354B] transition-colors flex items-center justify-center gap-1"
            >
              Studio <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
            <a
              href="https://www.youtube.com/upload"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 px-2 rounded bg-[#1D2333] hover:bg-[#FF0000]/20 text-[10px] font-bold text-[#FF0000] border border-[#2C354B] transition-colors cursor-pointer"
              title="Prześlij film lub Short na YouTube"
            >
              +
            </a>
          </div>
        </div>

        {/* Wbudowane Wideo Studio & Automontażysta (Zastępuje CapCut) */}
        <button
          onClick={onOpenVideoStudio}
          className="bg-[#141824] p-2 rounded border border-[#38BDF8]/60 hover:border-[#38BDF8] flex flex-col justify-between space-y-1.5 text-left group transition-all cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#38BDF8] flex items-center gap-1 uppercase tracking-wider">
              <Film className="w-3 h-3 text-[#38BDF8]" /> Wideo Studio
            </span>
            <span className="text-[9px] font-mono text-[#10B981]">0 PLN</span>
          </div>

          <div className="py-1 px-2 rounded bg-[#38BDF8]/10 text-[10px] font-bold text-[#38BDF8] text-center border border-[#38BDF8]/30 group-hover:bg-[#38BDF8] group-hover:text-[#141824] transition-colors">
            Montaż 9:16 & Napisy
          </div>
        </button>

        {/* Studio Grafik Modal Trigger */}
        <button
          onClick={onOpenCarouselStudio}
          className="bg-[#141824] p-2 rounded border border-[#38BDF8]/40 hover:border-[#38BDF8] flex flex-col justify-between space-y-1.5 text-left group transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white flex items-center gap-1 uppercase tracking-wider">
              <Palette className="w-3 h-3 text-[#38BDF8]" /> Karuzele
            </span>
            <span className="text-[9px] font-mono text-slate-400">Posty</span>
          </div>

          <div className="py-1 px-2 rounded bg-[#1D2333] text-[10px] font-bold text-slate-300 text-center border border-[#2C354B] group-hover:bg-[#38BDF8] group-hover:text-[#141824] transition-colors">
            Generuj PNG / ZIP
          </div>
        </button>

        {/* Bitwa Hooków A/B Trigger */}
        <button
          onClick={onOpenHookBattle}
          className="bg-[#141824] p-2 rounded border border-[#F59E0B]/40 hover:border-[#F59E0B] flex flex-col justify-between space-y-1.5 text-left group transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#F59E0B] flex items-center gap-1 uppercase tracking-wider">
              <Swords className="w-3 h-3" /> Bitwa Hooków
            </span>
            <span className="text-[9px] font-mono text-[#F59E0B]">A/B</span>
          </div>

          <div className="py-1 px-2 rounded bg-[#F59E0B]/10 text-[10px] font-bold text-[#F59E0B] text-center border border-[#F59E0B]/30 group-hover:bg-[#F59E0B] group-hover:text-[#141824] transition-colors">
            Test 5 Kątów
          </div>
        </button>
      </div>
    </div>
  );
};
