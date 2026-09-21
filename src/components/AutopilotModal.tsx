// AutopilotModal.tsx — Tygodniowy autopilot: 7 paczek (po jednej kategorii na dzień),
// pakowane do ZIP z folderami PON/WT/... i slotami 12-00/14-00/15-00/18-00.
import React, { useState } from "react";
import { Check, Download, Loader2, Rocket, X } from "lucide-react";
import { StarkFocusData, PlannerTask } from "../types";
import { pickBroll } from "../utils/brollPicker";

interface AutopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
}
interface DayPack extends DayPlan {
  reels: Array<{
    hook: string;
    phrases: string[];
    theme: string;
    duration: number;
    captionShort: string;
    hashtags: string[];
  }>;
  carousel: {
    title: string;
    slides: Array<{ headline: string; bodyText: string }>;
  };
  post: { headline: string; body: string; bingPrompt: string };
  source: "ai" | "offline";
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const DAY_PL = ["PON", "WT", "SR", "CZW", "PT", "SB", "ND"];

interface DayPlan {
  day: string;
  dayIndex: number;
  category: string;
  topic: string;
  hookOfDay?: string;
  plan?: string;
}

export const AutopilotModal: React.FC<AutopilotModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
}) => {
  const [planning, setPlanning] = useState(false);
  const [packing, setPacking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [week, setWeek] = useState<DayPlan[] | null>(null);
  const [packs, setPacks] = useState<DayPack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [addToPlanner, setAddToPlanner] = useState(true);

  const fetchDayPlan = async (): Promise<DayPlan[] | null> => {
    const res = await fetch("/api/ai/weekly-autopilot", {
      method: "POST",
      body: "{}",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.week || null;
  };

  const fetchPackForDay = async (
    day: DayPlan,
    index: number,
    taken: string[],
  ): Promise<DayPack> => {
    const res = await fetch("/api/ai/daily-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: day.topic,
        reelsCount: 2,
        excludeHooks: taken,
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    return {
      ...day,
      dayIndex: index,
      reels: json.reels || [],
      carousel: json.carousel,
      post: json.post,
      source: json.source,
    };
  };

  const buildZip = async (allPacks: DayPack[]) => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    const readme = [
      "STARK FOCUS // WEEKLY AUTOPILOT",
      `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`,
      "",
      "SCHEMAT TYGODNIA:",
      ...allPacks.map(
        (p) =>
          `${p.day} (${DAY_PL[p.dayIndex]}) — ${p.category}\n  ${p.plan || ""}\n  Hook dnia: ${p.hookOfDay || p.reels[0]?.hook || ""}`,
      ),
      "",
      "STRUKTURA: <DZIEN>/<GODZINA_TRESC>/  ->  12-00_ROLKA-1 | 14-00_KARUZELA | 15-00_ROLKA-2 | 18-00_POST-1-1",
      "Każdy folder: HOOK.txt, FRAZY.txt, OPIS.txt, HASHTAGI.txt, TLO-PROMPT.txt, B-ROLL.txt",
      "Wgraj do odpowiedniego studia (Post / Rolka / Karuzela).",
    ].join("\n");
    zip.file("README-TYGODNIEN.txt", readme);

    for (const pack of allPacks) {
      const dayFolder = zip.folder(DAY_PL[pack.dayIndex])!;
      const reelSlots = ["12-00_ROLKA-1", "15-00_ROLKA-2"];

      pack.reels.slice(0, 2).forEach((reel, idx) => {
        const slot = dayFolder.folder(reelSlots[idx])!;
        const broll = pickBroll(reel.hook, reel.theme);
        slot.file("HOOK.txt", reel.hook);
        slot.file("FRAZY.txt", reel.phrases.join("\n"));
        slot.file("OPIS.txt", reel.captionShort || "");
        slot.file("HASHTAGI.txt", Array.isArray(reel.hashtags) ? reel.hashtags.join(" ") : "");
        slot.file("TLO-PROMPT.txt", `Motyw: ${reel.theme}`);
        slot.file(
          "B-ROLL.txt",
          `${broll.scene.name}\n${broll.scene.description}\nAtmosfera: ${broll.scene.ambientVibe}`,
        );
      });

      if (pack.carousel) {
        const slot = dayFolder.folder("14-00_KARUZELE")!;
        slot.file("TYTUL.txt", pack.carousel.title);
        slot.file(
          "SLAJDY.txt",
          pack.carousel.slides
            .map((s, i) => `SLAJD ${i + 1}\n${s.headline}\n${s.bodyText}`)
            .join("\n\n"),
        );
      }

      if (pack.post) {
        const slot = dayFolder.folder("18-00_POST-1-1")!;
        slot.file("HEADLINE.txt", pack.post.headline);
        slot.file("BODY.txt", pack.post.body);
        slot.file("TLO-PROMPT.txt", pack.post.bingPrompt);
      }
    }

    return zip.generateAsync({ type: "blob" });
  };

  const run = async () => {
    setPlanning(true);
    setPacking(false);
    setProgress(0);
    setError(null);
    setDone(false);
    setPacks([]);
    try {
      setStage("Planuję tydzień...");
      const plan = await fetchDayPlan();
      if (!plan || plan.length !== 7) throw new Error("Nie udało się zaplanować tygodnia.");
      setWeek(plan);

      const all: DayPack[] = [];
      const takenHooks: string[] = [];
      for (let i = 0; i < plan.length; i++) {
        setStage(`Generuję paczkę na ${DAY_PL[plan[i].dayIndex]} (${i + 1}/7)...`);
        const pack = await fetchPackForDay(plan[i], i, takenHooks);
        pack.reels.forEach((r) => takenHooks.push(r.hook));
        all.push(pack);
        setPacks([...all]);
        setProgress(Math.round(((i + 1) / 8) * 100));
      }

      setStage("Pakuję ZIP...");
      setPacking(true);
      const blob = await buildZip(all);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STARK_WEEKLY_AUTOPILOT_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (addToPlanner) {
        const tasks: PlannerTask[] = [];
        for (const pack of all) {
          const day = new Date();
          day.setDate(day.getDate() + pack.dayIndex);
          const date = day.toISOString().split("T")[0];
          pack.reels.slice(0, 2).forEach((reel, idx) => {
            tasks.push({
              id: `ap-${Date.now()}-${pack.dayIndex}-${idx}`,
              time: idx === 0 ? "12:00" : "15:00",
              title: `${DAY_PL[pack.dayIndex]} Rolka ${idx + 1}: ${reel.hook.slice(0, 42)}...`,
              category: "post",
              targetTab: 1,
              completed: false,
              date,
              actionLabel: "Otwórz Studio Rolek",
            });
          });
          tasks.push({
            id: `ap-${Date.now()}-${pack.dayIndex}-car`,
            time: "14:00",
            title: `${DAY_PL[pack.dayIndex]} Karuzela: ${pack.carousel.title.slice(0, 40)}...`,
            category: "post",
            targetTab: 2,
            completed: false,
            date,
            actionLabel: "Otwórz Studio Karuzeli",
          });
          tasks.push({
            id: `ap-${Date.now()}-${pack.dayIndex}-post`,
            time: "18:00",
            title: `${DAY_PL[pack.dayIndex]} Post 1:1: ${pack.post.headline.slice(0, 40)}...`,
            category: "post",
            targetTab: 0,
            completed: false,
            date,
            actionLabel: "Otwórz Studio Posta",
          });
        }
        onUpdateData((prev) => ({
          ...prev,
          planner_tasks: [...(prev.planner_tasks || []), ...tasks],
        }));
      }

      setStage("Gotowe!");
      setDone(true);
    } catch (err) {
      setError("Autopilot nie dokończył pracy: " + (err as Error).message);
    } finally {
      setPlanning(false);
      setPacking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Tygodniowy Autopilot
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] font-mono text-slate-400">
          Generuje 7 paczek treści (po jednej kategorii na dzień z rotacji), pakuje je do ZIP z
          folderami <span className="text-slate-200">PON / WT / SR / CZW / PT / SB / ND</span>{" "}
          (sloty 12-00, 14-00, 15-00, 18-00) i opcjonalnie dodaje zadania do plannera.
        </p>

        <label className="flex items-center gap-2 text-[11px] font-mono text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={addToPlanner}
            onChange={(e) => setAddToPlanner(e.target.checked)}
            className="accent-emerald-500"
          />
          Dodaj wszystkie sloty do plannera (harmonogram na 7 dni)
        </label>

        {(planning || packing) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              {stage}
            </div>
            <div className="h-1.5 bg-[#141824] rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {done && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
            <p className="text-xs font-mono text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" /> ZIP pobrany
              {addToPlanner && " + zadania w plannerze"}!
            </p>
            <div className="grid grid-cols-7 gap-1">
              {packs.map((p) => (
                <div
                  key={p.day}
                  className="text-center p-1.5 bg-[#141824] rounded border border-[#2C354B]"
                >
                  <div className="text-[10px] font-mono font-bold text-white">
                    {DAY_PL[p.dayIndex]}
                  </div>
                  <div className="text-[8px] font-mono text-slate-500 truncate">
                    {p.category.split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={run}
            disabled={planning || packing}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500/25 to-orange-500/25 hover:from-rose-500/35 hover:to-orange-500/35 border border-rose-500/40 text-xs font-mono font-bold text-rose-200 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {planning || packing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {planning || packing ? "Autopilot pracuje..." : "Wygeneruj tydzień + ZIP"}
          </button>
        </div>
      </div>
    </div>
  );
};
