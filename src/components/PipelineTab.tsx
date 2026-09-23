// PipelineTab.tsx — Krok 3 obiecanego flow „1-2-3": przejrzysty harmonogram
// zaplanowanych publikacji. Zadania z Paczki Dnia i Autopilota przestają być
// ślepym licznikiem — można je otworzyć w studio, oznaczyć i usunąć, a kopia
// JSON zabezpiecza dane przed ulotnością samego localStorage.
import React, { useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  ListChecks,
  Package,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { PlannerTask, StarkFocusData } from "../types";
import { importStoredData, serializeBackup } from "../utils/storage";
import { buildPlatformPack } from "../utils/platformPack";

interface PipelineTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  /** Właściwe przekazanie treści: rodzic wie, które studio przyjmuje jaki payload. */
  onOpenInStudio: (task: PlannerTask) => void;
  onOpenDailyPack: () => void;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 1000 * 60 * 60 * 24;

function localTodayISO(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function dayHeading(date: string, today: string): string {
  if (!ISO_DATE.test(date)) return "Bez terminu";
  const [y, m, d] = date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const date0 = new Date(y, m - 1, d);
  const diff = Math.round((date0.getTime() - new Date(ty, tm - 1, td).getTime()) / DAY_MS);
  const label = date0.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  if (diff === 0) return `Dziś — ${label}`;
  if (diff === 1) return `Jutro — ${label}`;
  if (diff === -1) return `Wczoraj — ${label}`;
  return label;
}

// Format liczymy z zapisanego pola, a dla starszych zadań z etykietki akcji —
//Autopilot i Paczka Dnia dodawały tylko title/czas.
function formatLabel(task: PlannerTask): string {
  if (typeof task.format === "string" && task.format) return task.format;
  const label = typeof task.actionLabel === "string" ? task.actionLabel : "";
  if (label.includes("Rolek")) return "Rolka";
  if (label.includes("Karuzeli")) return "Karuzela";
  if (label.includes("Posta")) return "Post 1:1";
  return "Zadanie";
}

export const PipelineTab: React.FC<PipelineTabProps> = ({
  data,
  onUpdateData,
  onOpenInStudio,
  onOpenDailyPack,
}) => {
  const [hidePublished, setHidePublished] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = localTodayISO();

  // planner_tasks mogą dojrzeć w localStorage w każdym kształcie — filtr defensywny
  // przed pierwszym .map(), bo jedyny ErrorBoundary jest na cały app.
  const tasks = useMemo(() => {
    const raw = Array.isArray(data.planner_tasks) ? data.planner_tasks : [];
    return raw.filter(
      (t): t is PlannerTask => !!t && typeof t.id === "string" && typeof t.title === "string",
    );
  }, [data.planner_tasks]);

  const groups = useMemo(() => {
    const visible = hidePublished ? tasks.filter((t) => !t.completed) : tasks;
    const byDate = new Map<string, PlannerTask[]>();
    for (const task of visible) {
      const date = typeof task.date === "string" && ISO_DATE.test(task.date) ? task.date : "";
      const list = byDate.get(date) || [];
      list.push(task);
      byDate.set(date, list);
    }
    // Daty rosnąco — zaległe dni same wchodzą na górę; bez terminu na końcu.
    return [...byDate.entries()]
      .sort(([a], [b]) => (a === b ? 0 : a === "" ? 1 : b === "" ? -1 : a < b ? -1 : 1))
      .map(([date, items]) => ({
        date,
        items: [...items].sort(
          (x, y) =>
            Number(x.completed) - Number(y.completed) ||
            (x.time || "99:99").localeCompare(y.time || "99:99"),
        ),
      }));
  }, [tasks, hidePublished]);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const publishedCount = tasks.length - pendingCount;

  const togglePublished = (task: PlannerTask) => {
    const nowPublished = !task.completed;
    onUpdateData((prev) => ({
      ...prev,
      // Nagroda za publikację jak w reszcie aplikacji (post +50, trend +25)
      xp: prev.xp + (nowPublished ? 25 : 0),
      planner_tasks: (Array.isArray(prev.planner_tasks) ? prev.planner_tasks : []).map((t) =>
        t && t.id === task.id ? { ...t, completed: nowPublished } : t,
      ),
    }));
  };

  const deleteTask = (task: PlannerTask) => {
    onUpdateData((prev) => ({
      ...prev,
      planner_tasks: (Array.isArray(prev.planner_tasks) ? prev.planner_tasks : []).filter(
        (t) => !t || t.id !== task.id,
      ),
    }));
  };

  const [packing, setPacking] = useState(false);

  /**
   * Jeden klik -> gotowy zestaw kadrów i opisów na wszystkie trzy platformy.
   * Bez tego trzeba pobierać grafikę osobno dla każdego formatu i ręcznie
   * przycinać opis pod limit platformy.
   */
  const handlePlatformPack = async () => {
    const queued = tasks.filter((t) => !t.completed);
    if (queued.length === 0) {
      setNotice({ kind: "err", text: "Brak zaplanowanych zadań do spakowania." });
      return;
    }
    setPacking(true);
    setNotice(null);
    try {
      const { blob, files, skipped } = await buildPlatformPack(queued);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `STARK_PAKIET_PLATFORMY_${today}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice({
        kind: "ok",
        text: `Pakiet pobrany: ${files} plików dla ${queued.length} zadań${
          skipped.length > 0 ? ` (pominięto ${skipped.length} bez treści)` : ""
        }.`,
      });
    } catch (e: any) {
      setNotice({ kind: "err", text: `Pakiet nie powstał: ${e?.message || "nieznany błąd"}` });
    } finally {
      setPacking(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([serializeBackup(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `STARK_FOCUS_DANE_${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Natychmiastowe revokeObjectURL ucina pobierany plik w Firefox i Safari
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setNotice({ kind: "ok", text: "Kopia danych pobrana jako plik JSON." });
  };

  const handleImportClick = () => {
    setNotice(null);
    const proceed = window.confirm(
      "Uwaga: import NADPISZE wszystkie dane Stark Focus w tej przeglądarce treścią z pliku.\n" +
        'Operacji nie da się cofnąć — jeśli nie masz świeżej kopii, najpierw kliknij „Eksport danych".\n\n' +
        "Kontynuować?",
    );
    if (proceed) fileRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // ten sam plik wybrany dwukrotnie musi ponownie odpalić onChange
    if (!file) return;
    try {
      const text = await file.text();
      const result = importStoredData(text);
      if (!result.ok) {
        setNotice({ kind: "err", text: `Import odrzucony: ${result.error}` });
        return;
      }
      // Przeładowanie przechodzi przez loadStoredData — pełna normalizacja kształtu
      window.location.reload();
    } catch {
      setNotice({ kind: "err", text: "Import odrzucony: nie udało się odczytać pliku." });
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-mono font-black uppercase tracking-wider text-white">
            <ListChecks className="w-4 h-4 inline-block mr-2 -mt-0.5 text-rose-500" />
            Pipeline publikacji
          </h2>
          <p className="text-[10px] font-mono text-neutral-500 mt-1">
            {pendingCount} zaplanowane • {publishedCount} opublikowane
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tasks.length > 0 && (
            <button
              type="button"
              onClick={() => setHidePublished((v) => !v)}
              className="px-3 py-1.5 rounded-lg bg-[#0C0C0C] border border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            >
              {hidePublished ? "Pokaż opublikowane" : "Ukryj opublikowane"}
            </button>
          )}
          <button
            type="button"
            onClick={handlePlatformPack}
            disabled={packing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-600/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Kadry 1:1, 4:5 i 9:16 plus opis miesciacy sie w limit Instagram / TikToka / Shorts, wszystko w jednym ZIP"
          >
            <Package className={`w-3.5 h-3.5 ${packing ? "animate-pulse" : ""}`} />
            {packing ? "Pakuje…" : "Pakiet na platformy"}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C0C0C] border border-white/10 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-300 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
            title="Pobierz cały stan aplikacji jako plik JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Eksport danych
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/10 border border-rose-500/40 text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-600/20 transition-colors cursor-pointer"
            title="Przywróć stan z pliku JSON (nadpisuje bieżące dane)"
          >
            <Upload className="w-3.5 h-3.5" />
            Import danych
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => void handleImportFile(e)}
          />
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-lg text-[11px] font-mono border ${
            notice.kind === "ok"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {notice.text}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="border border-dashed border-white/15 rounded-xl p-10 text-center space-y-3">
          <ListChecks className="w-8 h-8 mx-auto text-neutral-600" />
          <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
            Pipeline jest pusty
          </h3>
          <p className="text-[11px] font-mono text-neutral-400 max-w-md mx-auto leading-relaxed">
            Klik 1: wygeneruj Paczkę Dnia i naciśnij „Zaplanuj publikację". Zadania z godzinami
            pojawią się tutaj. Klik 3: stąd otwierasz każde studio z gotową treścią i oznaczasz
            publikację po wystawieniu posta.
          </p>
          <button
            type="button"
            onClick={onOpenDailyPack}
            className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-mono font-black uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <ChevronDown className="w-3 h-3 inline mr-1.5 -mt-0.5" />
            Otwórz Paczkę Dnia
          </button>
        </div>
      )}

      {tasks.length > 0 && groups.length === 0 && (
        <div className="border border-white/10 rounded-xl p-8 text-center">
          <p className="text-[11px] font-mono text-neutral-400">
            Wszystko opublikowane — świetna robota. Włącz „Pokaż opublikowane", żeby zobaczyć
            historię.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.date || "none"} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-white">
              {dayHeading(group.date, today)}
            </span>
            {group.date === today && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-600/15 border border-rose-500/40 text-rose-400 uppercase">
                na dziś
              </span>
            )}
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[9px] font-mono text-neutral-500">
              {group.items.filter((t) => !t.completed).length} do publikacji
            </span>
          </div>

          <div className="space-y-2">
            {group.items.map((task) => {
              const published = task.completed === true;
              return (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 p-3 rounded-xl border transition-colors ${
                    published
                      ? "bg-[#0A0A0A] border-white/5"
                      : "bg-[#0C0C0C] border-white/10 hover:border-white/25"
                  }`}
                >
                  <div className="w-16 shrink-0 text-left sm:text-center">
                    <span
                      className={`text-sm font-mono font-black ${
                        published ? "text-neutral-600" : "text-white"
                      }`}
                    >
                      {task.time || "--:--"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[11px] font-mono font-bold truncate ${
                        published ? "text-neutral-500 line-through" : "text-neutral-200"
                      }`}
                      title={task.title}
                    >
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-neutral-400">
                        {formatLabel(task)}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          published
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-600/10 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        {published ? "Opublikowane" : "Zaplanowane"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenInStudio(task)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[10px] font-mono font-black uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Otwórz w studio
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(task)}
                      title={
                        published
                          ? "Cofnij oznaczenie publikacji"
                          : "Oznacz jako opublikowane (+25 XP)"
                      }
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        published
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-400/60"
                          : "bg-[#0C0C0C] border-white/10 text-neutral-500 hover:text-emerald-400 hover:border-emerald-500/40"
                      }`}
                    >
                      {published ? (
                        <Undo2 className="w-3.5 h-3.5" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task)}
                      title="Usuń zadanie"
                      className="p-2 rounded-lg border bg-[#0C0C0C] border-white/10 text-neutral-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
};
