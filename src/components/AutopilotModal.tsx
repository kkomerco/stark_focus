// AutopilotModal.tsx — Tygodniowy autopilot: plan na 7 dni (1 zapytanie) plus paczki treści
// (1 zapytanie na dzień, który sam wybierzesz), pakowane do ZIP z folderami PON/WT/...
// i slotami 12-00/14-00/15-00/18-00. Koszt kliknięcia stoi w UI, bo na darmowym
// tierze limitem jest liczba zapytań na dobę, nie tokeny.
import React, { useEffect, useRef, useState } from "react";
import { Check, Download, Loader2, Rocket, X } from "lucide-react";
import { StarkFocusData } from "../types";
import { usedHookFingerprints } from "../lib/usedContent";
import { pickBroll } from "../utils/brollPicker";
import { pickBackground } from "../utils/backgroundPicker";

interface AutopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
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
  carousel: { title: string; slides: Array<{ headline: string; bodyText: string }> };
  post: { headline: string; body: string; bingPrompt: string };
  source: "ai" | "offline";
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const DAY_PL = ["PON", "WT", "SR", "CZW", "PT", "SB", "ND"];
/** Dni do wypełnienia: każde paczka dnia to jedno płatne zapytanie, więc nie zakładamy 7. */
const DAY_CHOICES = [1, 2, 3, 5, 7];

function pluralDays(n: number): string {
  return n === 1 ? "1 dzień" : `${n} dni`;
}

/** "1 zapytanie" / "2 zapytania" / "8 zapytań" — UI jest po polsku, odmiana musi się zgadzać. */
function pluralRequests(n: number): string {
  if (n === 1) return "1 zapytanie";
  const tail = n % 10;
  const tens = n % 100;
  const few = tail >= 2 && tail <= 4 && (tens < 12 || tens > 14);
  return few ? `${n} zapytania` : `${n} zapytań`;
}

interface DayPlan {
  day: string;
  dayIndex: number;
  category: string;
  /** Format przydzielony dniu przez route — tydzień to nie siedem rolek. */
  format?: "reel" | "carousel" | "post";
  formatLabel?: string;
  topic: string;
  hookOfDay?: string;
  plan?: string;
}

export const AutopilotModal: React.FC<AutopilotModalProps> = ({ isOpen, onClose, data }) => {
  const [planning, setPlanning] = useState(false);
  const [packing, setPacking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [week, setWeek] = useState<DayPlan[] | null>(null);
  const [packs, setPacks] = useState<DayPack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [days, setDays] = useState(7);
  // Plan tygodnia to jedno zapytanie, każda paczka dnia to kolejne jedno.
  const requestCount = 1 + days;

  // Zamknięcie modala odmontowuje komponent - przerwaj zapytania w locie i nie wstawiaj wyników "w pustkę"
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, [isOpen]);

  const fetchDayPlan = async (signal: AbortSignal): Promise<DayPlan[] | null> => {
    const res = await fetch("/api/ai/weekly-autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludeHooks: usedHookFingerprints(data) }),
      signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.week || null;
  };

  const fetchPackForDay = async (
    day: DayPlan,
    index: number,
    taken: string[],
    signal: AbortSignal,
  ): Promise<DayPack> => {
    const res = await fetch("/api/ai/daily-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: day.topic, reelsCount: 2, excludeHooks: taken }),
      signal,
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
          `${p.day} (${DAY_PL[p.dayIndex]}) — ${p.category} · ${p.formatLabel || "rolka"}\n  ${p.plan || ""}\n  Hook dnia: ${p.hookOfDay || p.reels[0]?.hook || ""}`,
      ),
      "",
      "STRUKTURA: <DZIEN>/<GODZINA_TRESC>/  ->12-00_ROLKA-1 | 14-00_KARUZELA | 15-00_ROLKA-2 | 18-00_POST-1-1",
      "Każdy folder: HOOK.txt, FRAZY.txt, OPIS.txt, HASHTAGI.txt, TLO-PROMPT.txt, B-ROLL.txt",
      "Wgraj do odpowiedniego studia (Post / Rolka / Karuzela).",
    ].join("\n");
    zip.file("README-TYGODNIEN.txt", readme);

    // Rotacja klipów w obrębie całego tygodnia: pickBroll to funkcja tekstu,
    // więc bez wykluczeń każda rolka z tym samym słowem-kluczem dostawała
    // identyczny B-roll w siedmiu paczkach.
    const usedBroll = new Set<string>();
    const usedBackgrounds = new Set<string>();

    for (const pack of allPacks) {
      const dayFolder = zip.folder(DAY_PL[pack.dayIndex])!;
      const reelSlots = ["12-00_ROLKA-1", "15-00_ROLKA-2"];

      pack.reels.slice(0, 2).forEach((reel, idx) => {
        const slot = dayFolder.folder(reelSlots[idx])!;
        const broll = pickBroll(reel.hook, reel.theme, [...usedBroll]);
        usedBroll.add(broll.scene.id);
        // Prompt tła ma być gotowy do wklejenia, nie havełem „Motyw: xyz".
        const background = pickBackground(reel.phrases?.join(" ") || reel.hook, reel.theme, [
          ...usedBackgrounds,
        ]);
        usedBackgrounds.add(background.scene.id);
        slot.file("HOOK.txt", reel.hook);
        slot.file("FRAZY.txt", reel.phrases.join("\n"));
        slot.file("OPIS.txt", reel.captionShort || "");
        slot.file("HASHTAGI.txt", Array.isArray(reel.hashtags) ? reel.hashtags.join(" ") : "");
        slot.file(
          "TLO-PROMPT.txt",
          `Ujęcie: ${background.scene.name}\nMotyw: ${background.scene.theme}\n${background.scene.bingPrompt}`,
        );
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
    const controller = new AbortController();
    abortRef.current = controller;
    setPlanning(true);
    setPacking(false);
    setProgress(0);
    setError(null);
    setDone(false);
    setPacks([]);
    try {
      setStage("Planuję tydzień...");
      const plan = await fetchDayPlan(controller.signal);
      if (cancelledRef.current) return;
      if (!plan || plan.length < days) throw new Error("Nie udało się zaplanować tygodnia.");
      setWeek(plan);
      setProgress(Math.round((1 / (1 + days)) * 100));

      const selected = plan.slice(0, days);
      const all: DayPack[] = [];
      // Tydzień nie może powtórzyć tego, co poszło w poprzednich — startujemy
      // od pełnej historii, a nie od pustej listy.
      const takenHooks: string[] = [...usedHookFingerprints(data)];
      for (let i = 0; i < selected.length; i++) {
        setStage(
          `Generuję paczkę na ${DAY_PL[selected[i].dayIndex]} (${i + 1}/${selected.length})...`,
        );
        const pack = await fetchPackForDay(selected[i], i, takenHooks, controller.signal);
        if (cancelledRef.current) return;
        pack.reels.forEach((r) => takenHooks.push(r.hook));
        all.push(pack);
        setPacks([...all]);
        // Postęp liczymy z liczby zapytań (plan + paczki), nie z liczby dni.
        setProgress(Math.round(((i + 2) / (1 + days)) * 100));
      }

      setStage("Pakuję ZIP...");
      setPacking(true);
      const blob = await buildZip(all);
      if (cancelledRef.current) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STARK_WEEKLY_AUTOPILOT_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Natychmiastowe revokeObjectURL ucina pobierany ZIP w Firefox i Safari
      setTimeout(() => URL.revokeObjectURL(url), 60000);

      if (cancelledRef.current) return;
      setStage("Gotowe!");
      setDone(true);
    } catch (err) {
      if (cancelledRef.current) return;
      setError("Autopilot nie dokończył pracy: " + (err as Error).message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!cancelledRef.current) {
        setPlanning(false);
        setPacking(false);
      }
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
          Plan przydziela dniom kategorie i formaty (rotacja, nie siedem rolek), a paczki treści
          schodzą tylko na tyle dni, ile wybierzesz niżej. ZIP ma foldery{" "}
          <span className="text-slate-200">PON / WT / SR / CZW / PT / SB / ND</span> (sloty 12-00,
          14-00, 15-00, 18-00). Zip to gotowy materiał do studiów — aplikacja niczego nie trzyma w
          kolejce za ciebie.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-full sm:w-52 shrink-0">
            <label
              htmlFor="autopilot-days"
              className="text-[10px] font-mono uppercase font-bold text-slate-500 block mb-1"
            >
              Dni do wypełnienia:
            </label>
            <select
              id="autopilot-days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={planning || packing}
              className="w-full px-3 py-2 bg-[#141824] border border-[#2C354B] rounded text-xs font-mono text-white focus:outline-none focus:border-rose-500/60 disabled:opacity-50"
            >
              {DAY_CHOICES.map((d) => (
                <option key={d} value={d}>
                  {pluralDays(d)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] font-mono text-amber-300/90 sm:flex-1">
            Kliknięcie zużyje {pluralRequests(requestCount)} do modelu: 1 na plan tygodnia i jedno
            na każdą paczkę dnia. Darmowy tier to około 20 zapytań tekstu na dobę.
          </p>
        </div>

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
              <Check className="w-4 h-4" />
              ZIP pobrany!
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
                  <div className="text-[8px] font-mono text-rose-300/80 truncate">
                    {p.format === "carousel" ? "karuzela" : p.format === "post" ? "kadr" : "rolka"}
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
            {planning || packing
              ? "Autopilot pracuje..."
              : `Wygeneruj ${days === 7 ? "tydzień" : pluralDays(days)} + ZIP (${pluralRequests(requestCount)})`}
          </button>
        </div>
      </div>
    </div>
  );
};
