// AutopilotModal.tsx — Tygodniowy autopilot: plan na 7 dni (1 zapytanie) plus paczki treści
// (1 zapytanie na dzień, który sam wybierzesz), pakowane do ZIP z folderami PON/WT/....
// W folderze dnia leży tylko to, co plan tego dnia przydzielił — reszta paczki jedzie
// do REZERWA. Koszt kliknięcia stoi w UI, bo na darmowym tierze limitem jest liczba
// zapytań na dobę, nie tokeny.
import React, { useEffect, useRef, useState } from "react";
import { Check, Download, Loader2, Rocket, X } from "lucide-react";
import { DailyPackCarousel, DailyPackPost, DailyPackReel, StarkFocusData } from "../types";
import { usedHookFingerprints } from "../lib/usedContent";
import { pickBroll } from "../utils/brollPicker";
import { pickBackground } from "../utils/backgroundPicker";

interface AutopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
}
interface DayPack extends DayPlan {
  reels: DailyPackReel[];
  carousel?: DailyPackCarousel;
  post?: DailyPackPost;
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

type PlannedKind = NonNullable<DayPlan["format"]>;

/**
 * Nazwy folderów. Slot z godziną należy się tylko temu, co plan przypisał
 * danemu dniowi — materiału spoza planu nie udajemy publikacją, bo paczka
 * dnia zawsze zwraca rolkę, karuzelę i kadr naraz, a kalendarz mówi „JEDNA
 * publikacja dziennie".
 */
const SLOTS: Record<PlannedKind, { day: string; reserve: string }> = {
  reel: { day: "12-00_ROLKA", reserve: "ROLKA" },
  carousel: { day: "14-00_KARUZELA", reserve: "KARUZELA" },
  post: { day: "18-00_POST-1-1", reserve: "POST-1-1" },
};

const KIND_LABEL: Record<PlannedKind, string> = {
  reel: "rolka",
  carousel: "karuzela",
  post: "kadr 1:1",
};

/** Route przydziela dzieńowi jeden z trzech formatów; brak to najczęstszy slot rotacji. */
function plannedKind(plan: DayPlan): PlannedKind {
  return plan.format === "carousel" || plan.format === "post" ? plan.format : "reel";
}

/** Jeden artefakt z paczki dnia: co to jest, który to z kolei, i pliki do zapisu. */
interface Block {
  kind: PlannedKind;
  index: number;
  files: Record<string, string>;
}

function slotName(block: Block, isPlanned: boolean): string {
  const slot = isPlanned ? SLOTS[block.kind].day : SLOTS[block.kind].reserve;
  // Rolek w paczce są dwie; tylko pierwsza jest tym, co nazywamy rolką dnia.
  return isPlanned || block.index === 0 ? slot : `${slot}-${block.index + 1}`;
}

/** Co realnie weszło do archiwum — UI nie może obiecywać innej liczby niż README w ZIP-ie. */
interface ZipSummary {
  publications: number;
  reserve: number;
  gaps: string[];
}

export const AutopilotModal: React.FC<AutopilotModalProps> = ({ isOpen, onClose, data }) => {
  const [planning, setPlanning] = useState(false);
  const [packing, setPacking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [packs, setPacks] = useState<DayPack[]>([]);
  const [summary, setSummary] = useState<ZipSummary | null>(null);
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

  const buildZip = async (allPacks: DayPack[]): Promise<ZipSummary & { blob: Blob }> => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();

    // Rotacja klipów w obrębie całego tygodnia: pickBroll to funkcja tekstu,
    // więc bez wykluczeń każda rolka z tym samym słowem-kluczem dostawała
    // identyczny B-roll w siedmiu paczkach.
    const usedBroll = new Set<string>();
    const usedBackgrounds = new Set<string>();
    const targets: { path: string[]; files: Record<string, string> }[] = [];
    const weekLines: string[] = [];
    const gaps: string[] = [];
    let publications = 0;
    let reserve = 0;

    for (const pack of allPacks) {
      const label = DAY_PL[pack.dayIndex];
      const kind = plannedKind(pack);
      const blocks: Block[] = [];

      pack.reels.slice(0, 2).forEach((reel, index) => {
        const broll = pickBroll(reel.hook, reel.theme, [...usedBroll]);
        usedBroll.add(broll.scene.id);
        // Prompt tła ma być gotowy do wklejenia, nie havełem „Motyw: xyz".
        const background = pickBackground(reel.phrases?.join(" ") || reel.hook, reel.theme, [
          ...usedBackgrounds,
        ]);
        usedBackgrounds.add(background.scene.id);
        blocks.push({
          kind: "reel",
          index,
          files: {
            "HOOK.txt": reel.hook,
            "FRAZY.txt": (reel.phrases || []).join("\n"),
            "OPIS.txt": reel.captionShort || "",
            "HASHTAGI.txt": Array.isArray(reel.hashtags) ? reel.hashtags.join(" ") : "",
            "TLO-PROMPT.txt": `Ujęcie: ${background.scene.name}\nMotyw: ${background.scene.theme}\n${background.scene.bingPrompt}`,
            "B-ROLL.txt": `${broll.scene.name}\n${broll.scene.description}\nAtmosfera: ${broll.scene.ambientVibe}`,
          },
        });
      });

      if (pack.carousel) {
        blocks.push({
          kind: "carousel",
          index: 0,
          files: {
            "TYTUL.txt": pack.carousel.title,
            "SLAJDY.txt": pack.carousel.slides
              .map((slide, i) => `SLAJD ${i + 1}\n${slide.headline}\n${slide.bodyText}`)
              .join("\n\n"),
          },
        });
      }

      if (pack.post) {
        blocks.push({
          kind: "post",
          index: 0,
          files: {
            "HEADLINE.txt": pack.post.headline,
            "BODY.txt": pack.post.body,
            "TLO-PROMPT.txt": pack.post.bingPrompt,
          },
        });
      }

      const planned = blocks.find((block) => block.kind === kind && block.index === 0);

      if (planned) {
        targets.push({ path: [label, slotName(planned, true)], files: planned.files });
        publications++;
        weekLines.push(
          `${label} — ${SLOTS[kind].day} · ${pack.formatLabel || KIND_LABEL[kind]}\n  ${pack.plan || ""}\n  Hook dnia: ${pack.hookOfDay || planned.files["HOOK.txt"] || ""}`,
        );
      } else {
        gaps.push(label);
        weekLines.push(
          `${label} — BRAK MATERIAŁU na ${KIND_LABEL[kind]} · ${pack.formatLabel || ""}\n  ${pack.plan || ""}\n  Hook dnia: ${pack.hookOfDay || ""}`,
        );
      }

      // Wszystko, czego plan nie przewidział na ten dzień, nie wchodzi do
      // kalendarza: leży w REZERWA i czeka na własny slot.
      for (const block of blocks) {
        if (block === planned) continue;
        targets.push({ path: ["REZERWA", label, slotName(block, false)], files: block.files });
        reserve++;
      }
    }

    for (const target of targets) {
      let node = zip;
      for (const part of target.path) node = node.folder(part)!;
      for (const [name, content] of Object.entries(target.files)) node.file(name, content);
    }

    const readme = [
      "STARK FOCUS // WEEKLY AUTOPILOT",
      `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`,
      "",
      `PLAN: ${publications} publikacji na ${allPacks.length} dni — jedna na dzień, w formacie`,
      "przypisanym dniowi przez plan tygodnia. Paczka dnia zwraca jednak zawsze",
      "rolkę, karuzelę i kadr naraz, więc to, czego plan nie przewidział, nie idzie",
      `do kalendarza, tylko do REZERWA/ (${reserve} folderów) i czeka na własny slot.`,
      gaps.length > 0
        ? `Dni bez materiału na zaplanowany format: ${gaps.join(", ")} — ich folderów nie ma.`
        : "Każdy dzień ma swój materiał.",
      "",
      "SCHEMAT TYGODNIA:",
      ...weekLines,
      "",
      "STRUKTURA: <DZIEN>/<SLT_DNIA>/  oraz  REZERWA/<DZIEN>/<NAZWA>/",
      "  12-00_ROLKA     -> HOOK.txt, FRAZY.txt, OPIS.txt, HASHTAGI.txt, TLO-PROMPT.txt, B-ROLL.txt",
      "  14-00_KARUZELA  -> TYTUL.txt, SLAJDY.txt",
      "  18-00_POST-1-1  -> HEADLINE.txt, BODY.txt, TLO-PROMPT.txt",
      "Wgraj do odpowiedniego studia (Post / Rolka / Karuzela).",
    ].join("\n");
    zip.file("README-TYGODNIOWY.txt", readme);

    const blob = await zip.generateAsync({ type: "blob" });
    return { blob, publications, reserve, gaps };
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
    setSummary(null);
    try {
      setStage("Planuję tydzień...");
      const plan = await fetchDayPlan(controller.signal);
      if (cancelledRef.current) return;
      if (!plan || plan.length < days) throw new Error("Nie udało się zaplanować tygodnia.");
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
      const { blob, publications, reserve, gaps } = await buildZip(all);
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
      setSummary({ publications, reserve, gaps });
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
          schodzą tylko na tyle dni, ile wybierzesz niżej. W folderze dnia leży JEDNA publikacja —
          ta, którą przypisał plan:{" "}
          <span className="text-slate-200">12-00_ROLKA / 14-00_KARUZELA / 18-00_POST-1-1</span>.
          Paczka dnia zwraca zawsze wszystkie trzy formaty, więc reszta jedzie do{" "}
          <span className="text-slate-200">REZERWA/</span> i nie wchodzi w ten tydzień. Zip to
          gotowy materiał do studiów — aplikacja niczego nie trzyma w kolejce za ciebie.
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
          <div className="space-y-2">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-1">
              <p className="text-xs font-mono text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4" />
                ZIP pobrany: {summary?.publications ?? 0} publikacji — jedna na dzień.
              </p>
              {(summary?.reserve ?? 0) > 0 && (
                <p className="text-[10px] font-mono text-slate-400">
                  Reszta paczek ({summary?.reserve} folderów) leży w REZERWA/ — ten tydzień ma
                  trzymać plan, nie wolumen.
                </p>
              )}
              {summary && summary.gaps.length > 0 && (
                <p className="text-[10px] font-mono text-amber-300/90">
                  Dni bez materiału na zaplanowany format: {summary.gaps.join(", ")}.
                </p>
              )}
            </div>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {packs.map((p) => (
                <li
                  key={p.day}
                  className="p-1.5 bg-[#141824] rounded border border-[#2C354B] space-y-0.5"
                >
                  <div className="flex items-baseline gap-2 text-[10px] font-mono">
                    <span className="font-bold text-white">{DAY_PL[p.dayIndex]}</span>
                    <span className="text-rose-300/80 truncate">
                      {p.formatLabel || KIND_LABEL[plannedKind(p)]}
                    </span>
                    <span className="text-slate-500 ml-auto shrink-0">
                      {SLOTS[plannedKind(p)].day}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {p.plan || p.hookOfDay || p.topic}
                  </div>
                </li>
              ))}
            </ul>
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
