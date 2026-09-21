// Modal multi-wariantów rolek (A/B testing) — przeniesiony 1:1 z VideoStudioModal.tsx.
import React from "react";
import { Split, X } from "lucide-react";

export interface ReelVariantItem {
  variantName: string;
  duration: number;
  theme: string;
  hook: string;
  phrases?: string[];
}

interface VariantPickerModalProps {
  isOpen: boolean;
  variants: ReelVariantItem[];
  onClose: () => void;
  onApplyVariant: (variant: any) => void;
}

export const VariantPickerModal: React.FC<VariantPickerModalProps> = ({
  isOpen,
  variants,
  onClose,
  onApplyVariant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/20 rounded-xl p-5 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Split className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              1-CLICK MULTI-VARIANT TEST FACTORY (A/B/C)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          {variants.map((varItem, vIdx) => (
            <div
              key={vIdx}
              className="p-3.5 bg-[#161616] border border-white/10 hover:border-white/30 rounded-lg space-y-2 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  {varItem.variantName}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {varItem.duration}s • {varItem.theme}
                </span>
              </div>

              <div className="p-2 bg-black/60 rounded border border-white/5">
                <span className="text-[9px] font-mono text-neutral-500 uppercase block">
                  Hook 0-3s:
                </span>
                <p className="text-xs font-mono font-bold text-white">"{varItem.hook}"</p>
              </div>

              <div className="space-y-0.5 text-[11px] font-mono text-neutral-400">
                <span className="text-[9px] text-neutral-500 uppercase block">
                  3 Fazy narracji:
                </span>
                {varItem.phrases?.map((ph: string, pIdx: number) => (
                  <div key={pIdx}>• {ph}</div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onApplyVariant(varItem)}
                  className="px-4 py-1.5 rounded bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                >
                  Wybierz ten wariant →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
