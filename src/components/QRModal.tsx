import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Smartphone } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle = 'Zeskanuj aparatem telefonu, aby przenieść tekst natychmiast do schowka:',
  data
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="qr-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="qr-modal-card"
        className="relative w-full max-w-md bg-[#1D2333] border border-[#2C354B] rounded-xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="qr-modal-close-btn"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-sm hover:bg-[#242B3F] transition-colors"
          aria-label="Zamknij"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-sm bg-[#141824] text-[#38BDF8] border border-[#2C354B]">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">{title}</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="my-3.5 flex flex-col items-center justify-center p-4 bg-[#141824] rounded-sm border border-[#2C354B]">
          <div className="p-2.5 bg-white rounded-xs shadow-inner">
            <QRCodeSVG
              value={data || 'STARK_FOCUS_EMPTY'}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="mt-2.5 text-center text-[10px] text-[#38BDF8] font-mono tracking-wider font-bold uppercase">
            MOST MOBILNY SCHOWKA // QR READY
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="max-h-24 overflow-y-auto p-2 bg-[#141824] border border-[#2C354B] rounded text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
            {data}
          </div>

          <div className="flex gap-2">
            <button
              id="qr-modal-copy-btn"
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-xs font-bold text-[#141824] uppercase tracking-wider transition-all font-mono"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#141824]" />
                  <span>Skopiowano!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#141824]" />
                  <span>Kopiuj na PC</span>
                </>
              )}
            </button>
            <button
              id="qr-modal-done-btn"
              onClick={onClose}
              className="py-1.5 px-3 rounded-sm bg-[#141824] hover:bg-[#242B3F] border border-[#2C354B] text-xs font-bold text-slate-300 uppercase tracking-wider font-mono"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
