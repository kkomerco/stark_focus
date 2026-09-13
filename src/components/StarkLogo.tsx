import React from 'react';
import { Download } from 'lucide-react';

interface StarkLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  showDownload?: boolean;
}

export const StarkLogo: React.FC<StarkLogoProps> = ({
  className = '',
  size = 40,
  showText = false,
  showDownload = false
}) => {
  const logoSrc = '/stark_seal_logo.png';

  const handleDownloadPng = () => {
    const a = document.createElement('a');
    a.href = logoSrc;
    a.download = 'stark_focus_official_seal_1080.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative group flex items-center justify-center">
        {/* Oficjalne logo pieczęci STARK FOCUS */}
        <div
          className="rounded-full overflow-hidden border-2 border-[#38BDF8]/40 shadow-[0_0_20px_rgba(56,189,248,0.25)] bg-[#080B11] flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
          style={{ width: size, height: size }}
        >
          <img
            src={logoSrc}
            alt="STARK FOCUS SEAL"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {showDownload && (
          <button
            onClick={handleDownloadPng}
            className="absolute -bottom-2 -right-2 p-1 rounded-full bg-[#141824] hover:bg-[#38BDF8] text-[#38BDF8] hover:text-[#141824] border border-[#2C354B] transition-all shadow cursor-pointer"
            title="Pobierz oficjalne logo"
          >
            <Download className="w-3 h-3" />
          </button>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black tracking-widest text-white uppercase font-mono">
              STARK FOCUS
            </h1>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 font-bold">
              SEAL
            </span>
          </div>
          <span className="font-mono text-[9px] text-slate-400 tracking-wider uppercase">
            MEMENTO MORI // CONTENT OS
          </span>
        </div>
      )}
    </div>
  );
};

