// Modal odtwarzacza: pasek postępu podczas nagrywania MP4 oraz pasek Toast bez logiki.
// Przeniesione 1:1 z VideoStudioModal.tsx (logika bez zmian).
import React from "react";
import { Check } from "lucide-react";

export const ReelExportOverlays: React.FC<{
  isExporting: boolean;
  exportProgress: number;
  toastMessage: string | null;
}> = ({ isExporting, exportProgress, toastMessage }) => {
  return (
    <>
      {isExporting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-white text-black font-mono text-xs font-black tracking-wider shadow-2xl flex items-center gap-2 border border-neutral-300">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
