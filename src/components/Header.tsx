import React from "react";

/**
 * Nagłówek jest tylko pieczęcią marki. Gdzie jesteś i co możesz zrobić mówi
 * przełącznik powierzchni roboczej, a nie pasek pod spodem.
 */
export const Header: React.FC = () => {
  return (
    <header className="flex items-center gap-3 pb-3 mb-4 border-b border-white/10">
      <div className="w-7 h-7 rounded-lg bg-white text-black font-mono font-black text-xs flex items-center justify-center tracking-tighter">
        SF
      </div>
      <div>
        <h1 className="text-sm font-mono font-black text-white uppercase tracking-wider">
          Stark Focus
        </h1>
        <p className="text-[10px] font-mono text-neutral-500 mt-0.5">System produkcji treści</p>
      </div>
    </header>
  );
};
