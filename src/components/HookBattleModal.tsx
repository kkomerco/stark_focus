import React, { useState } from "react";
import {
  X,
  Swords,
  Sparkles,
  Copy,
  Check,
  QrCode,
  TrendingUp,
  Award,
  Film,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { HookBattleItem } from "../types";

interface HookBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQR: (title: string, payload: string) => void;
  onOpenVideoStudio?: (hookText: string) => void;
  onGeneratePost?: (hookText: string, angle: string) => Promise<void> | void;
  initialTopic?: string;
}

export const HookBattleModal: React.FC<HookBattleModalProps> = ({
  isOpen,
  onClose,
  onOpenQR,
  onOpenVideoStudio,
  onGeneratePost,
  initialTopic = "Dyscyplina i walka z oporem",
}) => {
  const [topic, setTopic] = useState<string>(initialTopic);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatingPostId, setGeneratingPostId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [battles, setBattles] = useState<HookBattleItem[]>([
    {
      id: "hb-1",
      angle: "Negatywny Pattern Interrupt",
      hook: "Your lack of discipline isn't burnout. You're simply comfortable being mediocre.",
      estimatedRetention: 96,
      psychologicalTrigger: "Uderzenie w dumę i negacja wymówki",
      reason: "Zatrzymuje scroll w pierwszych 800ms poprzez zakwestionowanie kłamstwa widza.",
    },
    {
      id: "hb-2",
      angle: "Stoicki Paradoks",
      hook: "The more freedom you chase, the heavier your invisible chains become.",
      estimatedRetention: 93,
      psychologicalTrigger: "Pozorna sprzeczność zmuszająca do myślenia",
      reason: "Zmusza mózg do zwolnienia, by zrozumieć pojęcie pozornej wolności.",
    },
    {
      id: "hb-3",
      angle: "Prowokacyjne Pytanie",
      hook: "If someone filmed your last 48 hours, would it look like an empire or an embarrassment?",
      estimatedRetention: 94,
      psychologicalTrigger: "Wizualizacja zewnętrznego osądu",
      reason: "Audyt własnego wstydu w głowie widza generuje natychmiastowe zaangażowanie.",
    },
    {
      id: "hb-4",
      angle: "Brutalne Liczby & Dane",
      hook: "99% of men will lose their war today before 7:00 AM. Here is why.",
      estimatedRetention: 89,
      psychologicalTrigger: "Strach przed przynależnością do przegranej większości",
      reason:
        "Konkretna godzina i statystyka uruchamiają lęk przed popełnieniem tego samego błędu.",
    },
    {
      id: "hb-5",
      angle: "Zagadka / Enigma",
      hook: "Marcus Aurelius had one private rule that modern men are too weak to adopt.",
      estimatedRetention: 91,
      psychologicalTrigger: "Ciekawość historyczna i autorytet",
      reason: "Odbiorca musi obejrzeć co najmniej 5-7 sekund, by poznać tę sekretną zasadę.",
    },
  ]);

  if (!isOpen) return null;

  const handleRunBattle = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/hook-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.battle && Array.isArray(data.battle)) {
          setBattles(data.battle);
        }
      }
    } catch (err) {
      console.error("Błąd podczas generowania bitwy hooków:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Always sort battles by thumb-stop retention score descending (highest to lowest)
  const sortedBattles = [...battles].sort((a, b) => b.estimatedRetention - a.estimatedRetention);
  const maxRetention = sortedBattles.length > 0 ? sortedBattles[0].estimatedRetention : 0;

  return (
    <div
      id="hook-battle-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#141824] border border-[#2C354B] rounded-xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C354B] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-sm bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
              <Swords className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                LABORATORIUM BITWY HOOKÓW // TESTY A/B (0-3 SEKUNDY)
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                System generuje 5 odmiennych psychologicznie wersji hooka i wylicza szansę
                zatrzymania kciuka (Thumb-stop rate).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-[#1D2333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="bg-[#1D2333] p-3 rounded-lg border border-[#2C354B] flex flex-col sm:flex-row items-center gap-2.5">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRunBattle()}
            placeholder="Wpisz temat np. 'Poranne lenistwo', 'Strach przed opiniami', 'Dlaczego 99% odpada'..."
            className="flex-1 w-full text-xs font-medium py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
          />

          <button
            onClick={handleRunBattle}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 rounded-sm bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-[#141824] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isLoading ? "Symulacja Algorytmu..." : "Rozpocznij Bitwę Hooków"}
          </button>
        </div>

        {/* Battle Cards Grid (Sorted Descending by Thumb-Stop Retention Score) */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {sortedBattles.map((b) => {
            const isWinner = b.estimatedRetention === maxRetention;
            return (
              <div
                key={b.id}
                className={`p-3.5 sm:p-4 rounded-lg border transition-all ${
                  isWinner
                    ? "bg-[#1D2333] border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "bg-[#141824] border-[#2C354B] hover:border-slate-600"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C354B] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-[#141824] text-[#38BDF8] border border-[#2C354B]">
                      {b.angle}
                    </span>
                    {isWinner && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-sm bg-[#F59E0B] text-[#141824] flex items-center gap-1">
                        <Award className="w-3 h-3" /> ZWYCIĘZCA ALGORYTMU
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Thumb-Stop Score:
                    </span>
                    <span
                      className={`text-sm font-mono font-black ${
                        b.estimatedRetention >= 94
                          ? "text-[#10B981]"
                          : b.estimatedRetention >= 90
                            ? "text-[#38BDF8]"
                            : "text-[#F59E0B]"
                      }`}
                    >
                      {b.estimatedRetention}%
                    </span>
                  </div>
                </div>

                {/* Hook Text Display */}
                <div className="my-2.5">
                  <p className="text-sm sm:text-base font-black text-white italic tracking-wide leading-snug">
                    "{b.hook}"
                  </p>
                </div>

                {/* Tactical explanation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-[#0B0D14] p-2.5 rounded border border-[#2C354B]/60 mb-3">
                  <div>
                    <strong className="text-slate-300">Wyzwalacz:</strong> {b.psychologicalTrigger}
                  </div>
                  <div>
                    <strong className="text-slate-300">Algorytm:</strong> {b.reason}
                  </div>
                </div>

                {/* Primary Action: Generate Complete Post from this Hook */}
                {onGeneratePost && (
                  <div className="mb-2">
                    <button
                      onClick={async () => {
                        setGeneratingPostId(b.id);
                        try {
                          await onGeneratePost(b.hook, b.angle);
                        } finally {
                          setGeneratingPostId(null);
                        }
                      }}
                      disabled={generatingPostId !== null}
                      className="w-full py-2 px-3 rounded-sm bg-[#10B981] hover:bg-[#059669] text-[#141824] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {generatingPostId === b.id
                        ? "Generowanie kompletnego posta..."
                        : "⚡ WYGENERUJ PEŁNY POST Z TYM HOOKIEM"}
                    </button>
                  </div>
                )}

                {/* Secondary Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleCopy(b.id, b.hook)}
                    className="flex-1 py-1.5 px-2.5 rounded-sm bg-[#141824] hover:bg-[#1D2333] border border-[#2C354B] text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedId === b.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#10B981]" /> Skopiowano
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" /> Kopiuj Hook
                      </>
                    )}
                  </button>

                  {onOpenVideoStudio && (
                    <button
                      onClick={() => {
                        onOpenVideoStudio(b.hook);
                        onClose();
                      }}
                      className="py-1.5 px-3 rounded-sm bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/50 text-[11px] font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                      title="Przekaż do Wideo Studio i zmontuj rolkę"
                    >
                      <Film className="w-3 h-3" /> Montuj Rolkę
                    </button>
                  )}

                  <button
                    onClick={() => onOpenQR(`Hook: ${b.angle}`, b.hook)}
                    className="py-1.5 px-3 rounded-sm bg-transparent border border-[#10B981] hover:bg-[#10B981]/10 text-[11px] font-bold text-[#10B981] uppercase tracking-wider flex items-center gap-1 transition-colors"
                    title="Prześlij do telefonu"
                  >
                    <QrCode className="w-3 h-3" /> QR Telefon
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
