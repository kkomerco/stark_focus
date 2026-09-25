// ChecklistPanel.tsx — kontrola materiału przed publikacją.
// Panel jest doradczy: pokazuje, co nie gra, i zostawia decyzję właścicielowi.
import React, { useState } from "react";
import { ChevronDown, ChevronRight, ClipboardCheck } from "lucide-react";
import type { ChecklistItem } from "../lib/prepublish";

export function ChecklistPanel({ items, title }: { items: ChecklistItem[]; title: string }) {
  const [open, setOpen] = useState(false);
  const problems = items.filter((item) => !item.ok);

  return (
    <div className="border border-white/10 rounded-lg bg-[#0F121C]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer"
      >
        <ClipboardCheck
          className={`w-3.5 h-3.5 shrink-0 ${problems.length ? "text-rose-400" : "text-neutral-500"}`}
        />
        <span className="flex-1 text-[10px] font-mono uppercase text-neutral-300">{title}</span>
        <span
          className={`text-[10px] font-mono ${problems.length ? "text-rose-400" : "text-neutral-500"}`}
        >
          {problems.length ? `${problems.length} do poprawy` : "czysto"}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
        )}
      </button>

      {open && (
        <ul className="px-3 pb-2 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <span
                className={`mt-0.5 text-[10px] font-mono font-bold ${
                  item.ok ? "text-neutral-500" : "text-rose-400"
                }`}
              >
                {item.ok ? "OK" : "!!"}
              </span>
              <span className="flex-1">
                <span className="block text-[11px] font-mono text-neutral-200">{item.label}</span>
                {!item.ok && (
                  <span className="block text-[10px] font-mono text-neutral-500 leading-snug">
                    {item.hint}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
