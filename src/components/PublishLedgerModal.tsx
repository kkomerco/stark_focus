// PublishLedgerModal.tsx — dziennik tego, co realnie wyszło na konto.
// Bez niego cała analityka jest zgadywanką: aplikacja wie, co wygenerowała,
// ale nie wie, co zostało opublikowane i ile to uciułało.
import React, { useMemo, useState } from "react";
import { BarChart3, Plus, Trash2, X } from "lucide-react";
import { PublishedItem, StarkFocusData } from "../types";
import {
  HOLD_GOOD_PCT,
  MIN_SAMPLE,
  ledgerVerdict,
  normalizePublished,
  statsByFormat,
} from "../lib/published";
import { guessLedgerFields } from "../lib/ledgerHints";

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

const EMPTY_FORM = {
  postedAt: today(),
  platform: "instagram",
  kind: "reel",
  hook: "",
  format: "viral_loop_6s",
  reach: "",
  hold3s: "",
  watchPct: "",
  shares: "",
  saves: "",
};

export function PublishLedgerModal({
  isOpen,
  onClose,
  data,
  onUpdateData,
}: PublishLedgerModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Hooki przed wczesnym zwrotem: `if (!isOpen) return null` powyżej useMemo
  // łamałoby zasady wywoływania hooków.
  const hookChoices = useMemo(
    () =>
      (data.posts ?? [])
        .slice(-12)
        .reverse()
        .map((post) => (post.title || "").trim())
        .filter(Boolean),
    [data.posts],
  );

  if (!isOpen) return null;

  const items = data.published ?? [];
  const stats = statsByFormat(items);
  const verdict = ledgerVerdict(items);

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addEntry = () => {
    const hook = form.hook.trim();
    if (!hook) return;

    const entry: PublishedItem = {
      id: `pub-${Date.now()}`,
      postedAt: /^\d{4}-\d{2}-\d{2}$/.test(form.postedAt) ? form.postedAt : today(),
      platform: form.platform as PublishedItem["platform"],
      kind: form.kind as PublishedItem["kind"],
      hook,
      format: form.format.trim() || "unknown",
      metrics: {
        reach: numberOrUndefined(form.reach),
        hold3s: numberOrUndefined(form.hold3s),
        watchPct: numberOrUndefined(form.watchPct),
        shares: numberOrUndefined(form.shares),
        saves: numberOrUndefined(form.saves),
      },
      loggedAt: new Date().toISOString(),
    };

    onUpdateData((prev) => ({
      ...prev,
      published: normalizePublished([entry, ...(prev.published ?? [])]),
    }));
    setForm({ ...EMPTY_FORM, postedAt: form.postedAt, platform: form.platform, kind: form.kind });
  };

  // Zadanie z planera wie o sobie więcej niż pusty formularz: gatunek, format
  // i treść kadru da się przeczytać z jego payloadu.
  const prefillFromTask = (taskId: string) => {
    const task = (data.planner_tasks ?? []).find((item) => item.id === taskId);
    if (!task) return;
    const guess = guessLedgerFields({
      task,
      text: task.payload?.post?.text ?? task.payload?.reel?.hook,
      format: task.format,
    });

    setForm((prev) => ({
      ...prev,
      kind: guess.kind,
      format: guess.formatLabel,
      hook: guess.hook,
      postedAt: task.date || prev.postedAt,
    }));
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
                    <th className="text-left py-1">Format</th>
                    <th className="text-right">Prób</th>
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
                        {stat.key}
                        {!stat.enough && (
                          <span className="text-neutral-600"> (za mało: {MIN_SAMPLE})</span>
                        )}
                      </td>
                      <td className="text-right">{stat.count}</td>
                      <td className="text-right">{stat.medianReach ?? "—"}</td>
                      <td
                        className={`text-right ${
                          (stat.medianHold ?? 100) < HOLD_GOOD_PCT ? "text-rose-400" : ""
                        }`}
                      >
                        {stat.medianHold ?? "—"}
                      </td>
                      <td className="text-right">{stat.medianWatch ?? "—"}</td>
                      <td className="text-right">{stat.medianSharesPerK ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {(data.planner_tasks ?? []).length > 0 && (
            <div className={`${PANEL} p-3 space-y-2`}>
              <p className="text-[10px] font-mono uppercase text-neutral-400">
                Zadania z planera — wstaw treść do formularza
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(data.planner_tasks ?? [])
                  .slice(-10)
                  .reverse()
                  .map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => prefillFromTask(task.id)}
                      className="px-2 py-1 bg-[#080808] border border-white/10 rounded text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer truncate max-w-[260px]"
                      title={`${task.date} · ${task.title}`}
                    >
                      {task.date} · {task.title}
                    </button>
                  ))}
              </div>
            </div>
          )}

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
                  onChange={(e) => set("kind", e.target.value)}
                  className={FIELD}
                >
                  <option value="reel">Rolka</option>
                  <option value="post">Post 1:1</option>
                  <option value="carousel">Karuzela</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className={LABEL}>Format / układ</span>
                <input
                  type="text"
                  value={form.format}
                  onChange={(e) => set("format", e.target.value)}
                  className={FIELD}
                  placeholder="viral_loop_6s"
                />
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
                    {item.postedAt} · {item.platform} · {item.kind}:{item.format}
                    {item.metrics?.reach !== undefined && ` · ${item.metrics.reach} odbiorców`}
                    {item.metrics?.hold3s !== undefined && ` · ${item.metrics.hold3s}% w 3 s`}
                    {item.metrics?.shares !== undefined && ` · ${item.metrics.shares} wysyłek`}
                  </p>
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

function numberOrUndefined(value: string): number | undefined {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}
