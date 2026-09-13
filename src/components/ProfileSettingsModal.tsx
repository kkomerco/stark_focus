import React, { useState } from 'react';
import { X, Save, Share2, Globe, Video, Mic, Instagram } from 'lucide-react';
import { SocialHandles } from '../types';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  handles: SocialHandles;
  onSave: (handles: SocialHandles) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  handles,
  onSave
}) => {
  const [formData, setFormData] = useState<SocialHandles>(handles);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div
      id="profile-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#141824] border border-[#2C354B] rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2C354B] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              KONFIGURACJA PROFILI & PLATFORM
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-[#1D2333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-300 font-mono leading-relaxed">
          Wpisz swoje nazwy użytkownika lub linki. Centrum dowodzenia natychmiast przekieruje Cię jednym kliknięciem do Twoich profili i narzędzi.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Instagram Handle (np. stark_focus)
            </label>
            <div className="flex items-center bg-[#1D2333] border border-[#2C354B] rounded px-3 py-1.5">
              <span className="text-xs font-mono text-slate-400 mr-1.5">@</span>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace('@', '') })}
                className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                placeholder="twoj.instagram"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TikTok Handle (np. starkfocus.os)
            </label>
            <div className="flex items-center bg-[#1D2333] border border-[#2C354B] rounded px-3 py-1.5">
              <span className="text-xs font-mono text-slate-400 mr-1.5">@</span>
              <input
                type="text"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value.replace('@', '') })}
                className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                placeholder="twoj.tiktok"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              YouTube Handle / Channel (np. @starkfocus_mind)
            </label>
            <div className="flex items-center bg-[#1D2333] border border-[#2C354B] rounded px-3 py-1.5">
              <input
                type="text"
                value={formData.youtube}
                onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                className="bg-transparent text-xs font-mono text-white focus:outline-none flex-1"
                placeholder="@twoj_kanal"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#2C354B]">
            <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-wider block mb-2">
              Narzędzia Twórcy STARK_FOCUS:
            </span>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between bg-[#1D2333] p-2 rounded border border-[#2C354B]">
                <span className="text-slate-300">Lektor AI STARK_FOCUS</span>
                <span className="text-[10px] text-[#10B981] font-bold">100% In-App Synteza</span>
              </div>
              <div className="flex items-center justify-between bg-[#1D2333] p-2 rounded border border-[#2C354B]">
                <span className="text-slate-300">Meta Business Suite (Instagram Composer)</span>
                <span className="text-[10px] text-slate-400">business.facebook.com</span>
              </div>
              <div className="flex items-center justify-between bg-[#1D2333] p-2 rounded border border-[#2C354B]">
                <span className="text-slate-300">CapCut Web Editor</span>
                <span className="text-[10px] text-slate-400">capcut.com</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2C354B]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-transparent text-xs font-bold text-slate-400 hover:text-white"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Zapisz Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
