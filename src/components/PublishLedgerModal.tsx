// PublishLedgerModal.tsx — dziennik tego, co realnie wyszło na konto.
// Bez niego cała analityka jest zgadywanką: aplikacja wie, co wygenerowała,
// ale nie wie, co zostało opublikowane i ile to uciułało.
import React, { useMemo, useState } from "react";
import { BarChart3, Plus, Trash2, X } from "lucide-react";
import { PublishedItem, PublishKind, StarkFocusData } from "../types";
import {
  HOLD_GOOD_PCT,
  MIN_SAMPLE,
  UNKNOWN_FORMAT,
  type ComparedMetric,
  type FormatStat,
  enoughFor,
  formatLabel,
  formatsForKind,
  ledgerVerdict,
  normalizeFormat,
  normalizePublished,
  publicationKey,
  statsByFormat,
  suspectedDuplicates,
} from "../lib/published";

interface PublishLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const FIELD =
  "w-full px-2.5 py-1.5 bg-[#080808] border border-white/10 rounded text-[11px] font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-white/40";
const LABEL = "text-[9px] font-mono uppercase text-neutral-500";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formularz liczony przy otwarciu i przy każdym zmianie gatunku, nie przy
 * załadowaniu modułu: stała z `today()` zestarzała się razem z kartą
 * przeglądarki, więc wpis szedł z datą sprzed kilku dni.
 */
function emptyForm(kind: PublishKind = "reel") {
  return {
    postedAt: today(),
    platform: "instagram",
    kind,
    // Domyślnie pierwszy układ słownika tego gatunku — nigdy id rolki dla karuzeli.
    format: formatsForKind(kind)[0],
    hook: "",
    reach: "",
    hold3s: "",
    watchPct: "",
    shares: "",
    saves: "",
  };
}

type FormState = ReturnType<typeof emptyForm>;

export function PublishLedgerModal({
  isOpen,
  onClose,
  data,
  onUpdateData,
}: PublishLedgerModalProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [notice, setNotice] = useState<string | null>(null);

  const items = useMemo(() => data.published ?? [], [data.published]);
  const hookChoices = useMemo(
    () =>
      (data.posts ?? [])
        .slice(-12)
        .reverse()
        .map((post) => (post.title || "").trim())
        .filter(Boolean),
    [data.posts],
  );
  // Wpis wygląda na powtórzenie innego — normalizator tnie exact duplice, tu
  // widać te same myśli w dwóch różnych dniach.
  const duplicates = useMemo(() => suspectedDuplicates(items), [items]);
  const abExperiments = useMemo(
    () => new Set((data.ab_experiments ?? []).map((experiment) => experiment.id)),
    [data.ab_experiments],
  );

  if (!isOpen) return null;

  const stats = statsByFormat(items);
  const verdict = ledgerVerdict(items);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setKind = (kind: PublishKind) =>
    setForm((prev) => {
      // Układ, którego w nowym gatunku nie ma, nie zostaje jako „nieprzypisany":
      // wskakuje pierwszy układ tego gatunku, bo on zaraz będzie wybrany.
      const kept = normalizeFormat(kind, prev.format);
      return { ...prev, kind, format: kept === UNKNOWN_FORMAT ? formatsForKind(kind)[0] : kept };
    });

  const addEntry = () => {
    const hook = form.hook.trim();
    if (!hook) return;

    const entry: PublishedItem = {
      id: `pub-${Date.now()}`,
      postedAt: /^\d{4}-\d{2}-\d{2}$/.test(form.postedAt) ? form.postedAt : today(),
      platform: form.platform as PublishedItem["platform"],
      kind: form.kind as PublishKind,
      hook,
      format: normalizeFormat(form.kind as PublishKind, form.format),
      metrics: {
        reach: numberOrUndefined(form.reach),
        hold3s: numberOrUndefined(form.hold3s),
        watchPct: numberOrUndefined(form.watchPct),
        shares: numberOrUndefined(form.shares),
        saves: numberOrUndefined(form.saves),
      },
      loggedAt: new Date().toISOString(),
    };

    // Ten sam dzień i ta sama myśl to TA SAMA publikacja. Normalizator i tak ją
    // wyrzuci, ale bez tego komunikatu zostałby cicho usunięty wpis, a przy
    // trzech próbach jeden duplikat wystarczy, żeby sfabrykować wniosek.
    const key = publicationKey(entry);
    if (items.some((item) => publicationKey(item) === key)) {
      setNotice(
        `Wpis z ${entry.postedAt} i tą myślą już jest w dzienniku. Powtórka liczyłaby się jako druga próba w każdej statyce i w każdym prompcie.`,
      );
      return;
    }

    onUpdateData((prev) => ({
      ...prev,
      published: normalizePublished([entry, ...(prev.published ?? [])]),
    }));
    setNotice(
      entry.metrics?.reach === undefined
        ? "Dodany wpis nie ma ani jednej liczby — nie wejdzie do żadnej mediany."
        : null,
    );
    setForm({ ...emptyForm(form.kind), postedAt: form.postedAt, platform: form.platform });
  };

  const removeEntry = (id: string) =>
    onUpdateData((prev) => ({
      ...prev,
      published: (prev.published ?? []).filter((item) => item.id !== id),
    }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 overflow-y-auto">
      <div className={`${PANEL} w-full max-w-4xl my-8`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold font-mono uppercase">Dziennik publikacji</h2>
            <span className="text-[10px] font-mono text-neutral-500">{items.length} pozycji</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className={`${PANEL} p-3 space-y-2`}>
            <p className="text-[11px] font-mono font-bold uppercase">{verdict.headline}</p>
            <p className="text-[11px] font-mono text-neutral-400 leading-relaxed">
              {verdict.detail}
            </p>
            {stats.length > 0 && (
              <table className="w-full text-[10px] font-mono mt-1">
                <thead className="text-neutral-500 uppercase">
                  <tr>
                    <th className="text-left py-1">Układ</th>
                    <th className="text-right">Prób</th>
                    <th className="text-right">Zmierzonych</th>
                    <th className="text-right">Zasięg</th>
                    <th className="text-right">3 s</th>
                    <th className="text-right">Obejrzenie</th>
                    <th className="text-right">Wysyłki/1k</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={stat.key} className="border-t border-white/5">
                      <td className="py-1">
                        {stat.kind} · {formatLabel(stat.kind, stat.format)}
                        {!stat.enough && (
                          <span className="text-neutral-600">
                            {" "}
                            (za mało zmierzonych: {stat.measured.sharesPerK}/{MIN_SAMPLE})
                          </span>
                        )}
                      </td>
                      <td className="text-right">{stat.count}</td>
                      <td className="text-right">
                        {stat.unmeasured > 0 && (
                          <span className="text-neutral-600">{stat.unmeasured} bez liczb · </span>
                        )}
                        {stat.measured.reach}
                      </td>
                      {/* Mediana bez pomiaru to nie zero — puste pole mówi „nie mierzono". */}
                      <td className="text-right">{cell(stat, "reach", stat.medianReach)}</td>
                      <td
                        className={`text-right ${
                          (stat.medianHold ?? 100) < HOLD_GOOD_PCT && enoughFor(stat, "hold3s")
                            ? "text-rose-400"
                            : ""
                        }`}
                      >
                        {cell(stat, "hold3s", stat.medianHold)}
                      </td>
                      <td className="text-right">{cell(stat, "watchPct", stat.medianWatch)}</td>
                      <td className="text-right">
                        {cell(stat, "sharesPerK", stat.medianSharesPerK)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={`${PANEL} p-3 space-y-2`}>
            <p className="text-[10px] font-mono uppercase text-neutral-400">Nowy wpis</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="space-y-1">
                <span className={LABEL}>Data publikacji</span>
                <input
                  type="date"
                  value={form.postedAt}
                  onChange={(e) => set("postedAt", e.target.value)}
                  className={FIELD}
                />
              </label>
              <label className="space-y-1">
                <span className={LABEL}>Platforma</span>
                <select
                  value={form.platform}
                  onChange={(e) => set("platform", e.target.value)}
                  className={FIELD}
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className={LABEL}>Gatunek</span>
                <select
                  value={form.kind}
                  onChange={(e) => setKind(e.target.value as PublishKind)}
                  className={FIELD}
                >
                  <option value="reel">Rolka</option>
                  <option value="post">Post 1:1</option>
                  <option value="carousel">Karuzela</option>
                </select>
              </label>
              {/* Wolny tekst o układzie rozbijał grupę na jednoelementowe próbki. */}
              <label className="space-y-1">
                <span className={LABEL}>Układ</span>
                <select
                  value={form.format}
                  onChange={(e) => set("format", e.target.value)}
                  className={FIELD}
                >
                  {formatsForKind(form.kind).map((format) => (
                    <option key={format} value={format}>
                      {formatLabel(form.kind, format)}
                    </option>
                  ))}
                  <option value={UNKNOWN_FORMAT}>{formatLabel(form.kind, UNKNOWN_FORMAT)}</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1">
              <span className={LABEL}>Myśl z kadru (ta, którą widz zobaczył)</span>
              <input
                type="text"
                value={form.hook}
                onChange={(e) => set("hook", e.target.value)}
                className={FIELD}
                placeholder="Rust works while you sleep."
              />
            </label>
            {hookChoices.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hookChoices.slice(0, 6).map((hook) => (
                  <button
                    key={hook}
                    type="button"
                    onClick={() => set("hook", hook)}
                    className="px-2 py-1 bg-[#080808] border border-white/10 rounded text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer truncate max-w-[220px]"
                  >
                    {hook}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  ["reach", "Zasięg"],
                  ["hold3s", "Przytrzymanie 3 s %"],
                  ["watchPct", "Obejrzenie %"],
                  ["shares", "Wysyłki"],
                  ["saves", "Zapisy"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className={LABEL}>{label}</span>
                  <input
                    type="number"
                    min="0"
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className={FIELD}
                  />
                </label>
              ))}
            </div>

            {notice && <p className="text-[10px] font-mono text-rose-300">{notice}</p>}

            <button
              type="button"
              onClick={addEntry}
              disabled={!form.hook.trim()}
              className="px-3 py-1.5 bg-white text-black rounded text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              Dodaj do dziennika
            </button>
          </div>

          <div className={`${PANEL} divide-y divide-white/5`}>
            {items.length === 0 && (
              <p className="p-3 text-[11px] font-mono text-neutral-500">
                Pusto. Dopóki nie wpiszesz, co poszło i ile uciułało, aplikacja nie ma czego uczyć —
                formaty będą dobierane na wyczucie.
              </p>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono text-white truncate">{item.hook}</p>
                  <p className="text-[10px] font-mono text-neutral-500">
                    {item.postedAt} · {item.platform} · {item.kind}:
                    {formatLabel(item.kind, item.format)}
                    {item.metrics?.reach !== undefined && ` · ${item.metrics.reach} odbiorców`}
                    {item.metrics?.hold3s !== undefined && ` · ${item.metrics.hold3s}% w 3 s`}
                    {item.metrics?.shares !== undefined && ` · ${item.metrics.shares} wysyłek`}
                    {item.metrics === undefined && " · nie zmierzono"}
                    {item.sourceId && abExperiments.has(item.sourceId) && " · z eksperymentu A/B"}
                  </p>
                  {duplicates.has(item.id) && (
                    <p className="text-[10px] font-mono text-rose-300">{duplicates.get(item.id)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(item.id)}
                  className="p-1 text-neutral-600 hover:text-rose-400 cursor-pointer"
                  title="Usuń wpis"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Komórka tabeli: liczba tylko wtedy, gdy była zmierzona dość licznym
 * próbkowaniem. `0` i „nie mierzono" to dwie różne prawdy.
 */
function cell(stat: FormatStat, metric: ComparedMetric, value: number | null): React.ReactNode {
  if (value === null) return <span className="text-neutral-600">nie mierzono</span>;
  if (!enoughFor(stat, metric))
    return (
      <span className="text-neutral-500" title={`za mało pomiarów: min. ${MIN_SAMPLE}`}>
        {value}
      </span>
    );
  return <span className="text-white">{value}</span>;
}

function numberOrUndefined(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}
