// Modal Kodeksu STARK (10 zasad) — przeniesiony 1:1 z VideoStudioModal.tsx.
import React from "react";
import { BookOpen, X } from "lucide-react";
import { CodexRule, STARK_CODEX_RULES } from "../../data/starkCodex";

interface CodexRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRule: (rule: CodexRule) => void;
}

export const CodexRulesModal: React.FC<CodexRulesModalProps> = ({
  isOpen,
  onClose,
  onApplyRule,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/20 rounded-xl p-5 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              STARK CODEX // 10 ŻELAZNYCH ZASAD
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {STARK_CODEX_RULES.map((rule) => (
            <div
              key={rule.id}
              className="p-3 bg-[#161616] border border-white/10 hover:border-white/30 rounded-lg space-y-1.5 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase">
                  #{rule.ruleNumber} {rule.title}
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                  {rule.suggestedTheme}
                </span>
              </div>

              <p className="text-xs font-mono font-bold text-amber-300">"{rule.hook0to3s}"</p>
              <p className="text-[11px] font-mono text-neutral-400">{rule.corePrinciple}</p>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500">
                  Puenta: {rule.actionDirective}
                </span>
                <button
                  type="button"
                  onClick={() => onApplyRule(rule)}
                  className="px-3 py-1 rounded bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                >
                  Załaduj do Rolki →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
