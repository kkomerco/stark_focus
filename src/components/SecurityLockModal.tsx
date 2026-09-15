import React, { useState } from "react";
import { Lock, Unlock, ShieldAlert, KeyRound, Check, X } from "lucide-react";

interface SecurityLockModalProps {
  currentPin: string;
  isLocked: boolean;
  onUnlock: () => void;
  onUpdatePin: (newPin: string | undefined) => void;
  onCloseSettings?: () => void;
  mode: "lockscreen" | "settings";
}

export const SecurityLockModal: React.FC<SecurityLockModalProps> = ({
  currentPin,
  isLocked,
  onUnlock,
  onUpdatePin,
  onCloseSettings,
  mode,
}) => {
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [confirmDisable, setConfirmDisable] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (enteredPin.length < 6) {
      const next = enteredPin + digit;
      setEnteredPin(next);
      setErrorMsg("");

      if (next === currentPin) {
        setTimeout(() => {
          onUnlock();
          setEnteredPin("");
        }, 150);
      } else if (next.length >= currentPin.length) {
        setErrorMsg("Błędny kod PIN");
        setTimeout(() => setEnteredPin(""), 600);
      }
    }
  };

  const handleDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  };

  if (mode === "lockscreen" && isLocked) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0F121C] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 bg-[#1D2333] border border-[#2C354B] rounded-xl shadow-2xl text-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="p-3 bg-[#38BDF8]/10 border border-[#38BDF8]/30 rounded-full text-[#38BDF8]">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-widest">
              SYSTEM ZABLOKOWANY // STARK_FOCUS
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Wprowadź swój prywatny kod PIN, aby uzyskać dostęp
            </p>
          </div>

          {/* PIN Indicators */}
          <div className="flex justify-center gap-3 my-4">
            {Array.from({ length: Math.max(4, currentPin.length) }).map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border transition-all ${
                  i < enteredPin.length
                    ? "bg-[#38BDF8] border-[#38BDF8] shadow-[0_0_8px_#38BDF8]"
                    : "border-[#2C354B] bg-[#141824]"
                }`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-mono font-bold animate-shake">{errorMsg}</p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                onClick={() => handleDigit(d)}
                className="h-12 rounded bg-[#141824] hover:bg-[#242B3F] active:bg-[#38BDF8] active:text-[#141824] border border-[#2C354B] text-white font-mono text-base font-bold transition-all"
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setEnteredPin("")}
              className="h-12 rounded bg-[#141824] hover:bg-[#242B3F] border border-[#2C354B] text-slate-400 font-mono text-xs uppercase"
            >
              C
            </button>
            <button
              onClick={() => handleDigit("0")}
              className="h-12 rounded bg-[#141824] hover:bg-[#242B3F] active:bg-[#38BDF8] active:text-[#141824] border border-[#2C354B] text-white font-mono text-base font-bold transition-all"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-12 rounded bg-[#141824] hover:bg-[#242B3F] border border-[#2C354B] text-slate-400 font-mono text-xs uppercase"
            >
              ⌫
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Settings Mode (to set or remove PIN)
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#1D2333] border border-[#2C354B] rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4 relative">
        <button
          onClick={onCloseSettings}
          className="absolute top-4 right-4 p-1 rounded hover:bg-[#242B3F] text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-[#2C354B] pb-3">
          <div className="p-2.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
              PRYWATNOŚĆ I BLOKADA PIN
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Zabezpiecz system przed dostępem osób trzecich
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <div className="p-3 bg-[#141824] border border-[#2C354B] rounded">
            <span className="text-slate-400 block mb-1">Status Blokady:</span>
            <span className={`font-bold ${currentPin ? "text-emerald-400" : "text-amber-400"}`}>
              {currentPin ? "🔒 Aktywna (wymaga kodu PIN)" : "🔓 Wyłączona (dostęp bezpośredni)"}
            </span>
          </div>

          <div>
            <label className="text-slate-400 uppercase text-[10px] font-bold block mb-1">
              Ustaw Nowy 4-6 Cyfrowy Kod PIN:
            </label>
            <input
              type="password"
              maxLength={6}
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ""))}
              placeholder="np. 1234"
              className="w-full px-3 py-2 bg-[#141824] border border-[#2C354B] rounded text-white text-sm font-mono tracking-widest placeholder-slate-600 focus:outline-none focus:border-[#38BDF8]"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newPinInput.length >= 4) {
                    onUpdatePin(newPinInput);
                    onCloseSettings?.();
                  }
                }}
                disabled={newPinInput.length < 4}
                className="flex-1 py-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] font-bold uppercase rounded text-xs transition-all disabled:opacity-40 cursor-pointer"
              >
                Zapisz Kod PIN
              </button>

              {currentPin && !confirmDisable && (
                <button
                  type="button"
                  onClick={() => setConfirmDisable(true)}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs transition-all cursor-pointer"
                >
                  Wyłącz PIN
                </button>
              )}
            </div>

            {confirmDisable && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded flex items-center justify-between text-xs font-mono">
                <span className="text-rose-300 text-[11px]">Potwierdzasz wyłączenie PIN?</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePin(undefined);
                      onCloseSettings?.();
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    Tak, wyłącz
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDisable(false)}
                    className="px-2 py-1 bg-[#141824] hover:bg-[#1D2333] text-slate-300 rounded text-[10px] cursor-pointer"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
