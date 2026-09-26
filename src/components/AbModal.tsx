// AbModal.tsx — Eksperymenty A/B: 2 warianty TEJ SAMEJ rolki.
// Publikujesz oba, wpisujesz wyniki, AI wyciąga zwycięski wzorzec (pętla uczenia).
import React, { useState } from "react";
import { Film, Loader2, Repeat, TrendingUp, X } from "lucide-react";
import {
  AbVariant,
  AbExperiment,
  PublishedItem,
  PublishPlatform,
  ReelHandoff,
  StarkFocusData,
} from "../types";
import {
  MIN_AB_VIEWS,
  UNKNOWN_FORMAT,
  normalizePublished,
  publishedHookFingerprints,
} from "../lib/published";
import { hookFingerprint } from "../lib/similarity";

export interface AbResultRow {
  label: "A" | "B";
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/**
 * Odpowiedź trasy `ab-conclusion`. Kształt normalizuje serwer (`status`,
 * `winner: null`, `missing[]`), więc UI nie musi zgadywać, czy dostał wniosek,
 * czy odmowę — i nie złoży odmowy na linijkę „wygrał wariant".
 */
export interface AbConclusion {
  status?: string;
  winner?: string | null;
  lesson?: string;
  minViews?: number;
  missing?: Array<{ label?: string; views?: number; needs?: number }>;
}

/**
 * Przebieg eksperymentu trzyma rodzic: modal jest renderowany warunkowo, a bez tego
 * wysłanie zwycięzcy do studia kasowało warianty i wpisane wyniki.
 */
export interface AbDraft {
  topic: string;
  variants: AbVariant[];
  experimentId: string;
  results: AbResultRow[];
  conclusion: AbConclusion | null;
  /** Konto, na którym warianty realnie poszły — trzeba je wskazać przy zapisie do dziennika. */
  platform?: PublishPlatform;
}

interface AbModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  draft: AbDraft;
  // Aktualizacja przez funkcję, nie przez wartość: dwa zapisy w jednym handlerze
  // nadpisaliby się nawzajem na starym domknięciu.
  onDraftChange: (update: (prev: AbDraft) => AbDraft) => void;
  onSendToReel?: (reel: ReelHandoff) => void;
}

const PANEL = "bg-[#0F121C] border border-[#2C354B] rounded-xl";
const FIELD =
  "bg-[#0F121C] border border-[#2C354B] px-2 py-1 font-mono text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-500";
const LABEL = "text-[9px] font-mono uppercase text-slate-500";

/** Odpowiedź trasy to kształt od modelu — nie mapujemy bez sprawdzenia pola. */
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const AbModal: React.FC<AbModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateData,
  draft,
  onDraftChange,
  onSendToReel,
}) => {
  const { topic, variants, experimentId, results, conclusion } = draft;
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [concluding, setConcluding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const patch = (next: Partial<AbDraft>) => onDraftChange((prev) => ({ ...prev, ...next }));

  const startExperiment = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    patch({ conclusion: null });
    setSaved(false);
    try {
      // Pętla uczenia: przekazujemy historię zakończonych eksperymentów do generatora,
      // aby nowe warianty uczyły się na zwycięskich wzorcach.
      const history = (data.ab_experiments || [])
        .filter((e) => e.winner && e.concludedAt)
        .map((e) => {
          const w = e.variants.find((v) => v.label === e.winner);
          return {
            winner: e.winner,
            lesson: e.lesson || "",
            winningHook: w?.hook || "",
            angle: w?.angle || "",
          };
        });

      const res = await fetch("/api/ai/ab-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, history }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const vs: AbVariant[] = Array.isArray(json.variants) ? json.variants : [];
      patch({
        variants: vs,
        experimentId: String(json.experimentId || `ab-${Date.now()}`),
        results: vs.map((v) => ({
          label: v.label,
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
        })),
      });
    } catch {
      setError("Nie udało się wygenerować wariantów A/B.");
    } finally {
      setLoading(false);
    }
  };

  const setMetric = (idx: number, field: keyof AbResultRow, value: string) => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    patch({ results: results.map((r, i) => (i === idx ? { ...r, [field]: n } : r)) });
  };

  // Co realnie poszło w każdym wariancie. Bez tego różnicę przypisujemy hookowi,
  // choć równie dobrze mogła ją zrobić muzyka.
  const setProduction = (idx: number, field: "music" | "background", value: string) =>
    patch({ variants: variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v)) });

  /**
   * Data publikacji wariantu wpisuje właściciel konta. Bez niej wynik A/B nie
   * ma się do czego przypiąć w dzienniku i pozostaje drugą rzeczywistością.
   */
  const setPublishedAt = (idx: number, value: string) =>
    patch({
      variants: variants.map((v, i) => (i === idx ? { ...v, publishedAt: value || null } : v)),
    });

  // Próg próby liczy tu ten sam `MIN_AB_VIEWS` co w trasie: przycisk nie może
  // obiecywać rozstrzygnięcia, którego serwer i tak odmówi.
  const short = results.filter((r) => r.views < MIN_AB_VIEWS);
  const canConclude = results.length >= 2 && short.length === 0;

  const conclude = async () => {
    if (!canConclude) return;
    setConcluding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ai/ab-conclusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId,
          results: results.map((r, i) => ({
            label: r.label,
            views: r.views,
            likes: r.likes,
            comments: r.comments,
            shares: r.shares,
            saves: r.saves,
            hook: variants[i]?.hook || "",
            music: variants[i]?.music || "",
            background: variants[i]?.background || "",
            publishedAt: variants[i]?.publishedAt || "",
          })),
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      patch({ conclusion: json });

      const winnerLabel = json.winner === "A" || json.winner === "B" ? json.winner : null;
      // Odmowa nie jest eksperymentem do zapamiętania: zapisalibyśmy ją z
      // `concludedAt` jak rozstrzygniętą, a potem opowiadali o niej generatorowi.
      if (!winnerLabel) {
        setSaved(false);
        return;
      }

      // ===== PĘTLA UCZENIA: zapisujemy eksperyment, aby wzorzec wracał do generatora =====
      const experiment: AbExperiment = {
        id: experimentId || `ab-${Date.now()}`,
        topic,
        createdAt: new Date().toISOString(),
        variants: variants.map((v) => {
          const r = results.find((x) => x.label === v.label);
          return {
            ...v,
            // Data publikacji jest jego, nie licznika: `now()` sprawiał, że każdy
            // eksperyment wyglądał jak opublikowany w chwili zamknięcia.
            publishedAt: isDate(v.publishedAt) ? v.publishedAt : null,
            metrics: {
              views: r?.views || 0,
              likes: r?.likes || 0,
              comments: r?.comments || 0,
              shares: r?.shares || 0,
              saves: r?.saves || 0,
            },
          };
        }),
        winner: winnerLabel,
        lesson: String(json.lesson || ""),
        concludedAt: new Date().toISOString(),
      };
      onUpdateData((prev) => ({
        ...prev,
        ab_experiments: [experiment, ...(prev.ab_experiments || [])].slice(0, 50),
      }));
      setSaved(true);
    } catch {
      setError("Nie udało się policzyć zwycięzcy.");
    } finally {
      setConcluding(false);
    }
  };

  const winnerVariant = conclusion?.winner
    ? variants.find((v) => v.label === conclusion.winner)
    : undefined;

  const published = data.published ?? [];
  const ledgerFingerprints = new Set(publishedHookFingerprints(published));

  /** Wariant jest w dzienniku, jeśli jego myśl już tam poszła lub wpisał go ten eksperyment. */
  const inLedger = (v: AbVariant) =>
    published.some(
      (item) =>
        item.sourceId === experimentId || hookFingerprint(item.hook) === hookFingerprint(v.hook),
    );

  /**
   * Wynik A/B staje się liczbą z konta dopiero w dzienniku (`data.published`).
   * Stąd zapis obu wariantów: ten sam `sourceId`, ta sama data publikacji, bez
   * wymyślonego układu kadru — eksperyment o układ nie pyta.
   */
  const saveBothToLedger = () => {
    const entries: PublishedItem[] = [];
    for (const v of variants) {
      if (!isDate(v.publishedAt) || !v.hook) continue;
      const r = results.find((x) => x.label === v.label);
      entries.push({
        id: `${experimentId}-${v.label}`,
        postedAt: v.publishedAt,
        // A/B to zawsze dwie wersje tej samej rolki; konto wskazuje w polu wyżej.
        platform: draft.platform ?? "instagram",
        kind: "reel",
        hook: v.hook,
        format: UNKNOWN_FORMAT,
        music: v.music || undefined,
        sourceId: experimentId,
        metrics: {
          reach: r?.views ?? 0,
          likes: r?.likes ?? 0,
          comments: r?.comments ?? 0,
          shares: r?.shares ?? 0,
          saves: r?.saves ?? 0,
        },
        loggedAt: new Date().toISOString(),
      });
    }
    if (entries.length === 0) {
      setNotice("Podaj datę publikacji obu wariantów — bez niej wpis nie ma czym być w dzienniku.");
      return;
    }
    onUpdateData((prev) => ({
      ...prev,
      // Ten sam normalizator co reszta dziennika: dedupe po (data, myśl) i słownik
      // układów, więc podwójne kliknięcie nie doda drugiej takiej samej próby.
      published: normalizePublished([...entries, ...(prev.published ?? [])]),
    }));
    setNotice(
      `Zapisano ${entries.length} wariantów w dzienniku publikacji. Od tej chwili liczby z A/B liczą się we wszystkich statykach marki.`,
    );
  };

  /** Wariant A/B nie ma opisu — składamy go z hooka i firmowego CTA tego wariantu. */
  const reelFromVariant = (v: AbVariant): ReelHandoff => {
    const hook = textOf(v.hook);
    const phrases = textList(v.phrases);
    const caption = [hook, textOf(v.cta)].filter(Boolean).join("\n\n");
    return {
      hook: hook || phrases[0] || "",
      phrases,
      theme: textOf(v.theme) || undefined,
      caption: caption || undefined,
    };
  };

  if (!isOpen) return null;

  // Odmowa to odmowa: bez linijki o zwycięzcy i bez „wzorzec zapisany".
  const refused = !conclusion?.winner || conclusion?.status === "insufficient_data";
  const pastExperiments = data.ab_experiments ?? [];
  const ledgerFilled = variants.length >= 2 && variants.every(inLedger);

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[88vh] flex flex-col ${PANEL} p-5 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-[#2C354B]">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-mono font-black uppercase tracking-wider text-white">
              Eksperyment A/B
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

        <label className="text-[11px] font-mono text-slate-400">
          Temat eksperymentu:
          <input
            type="text"
            value={topic}
            onChange={(e) => patch({ topic: e.target.value })}
            className="ml-2 w-full max-w-xs px-2 py-1 rounded bg-[#141824] border border-[#2C354B] text-xs font-mono text-white"
          />
        </label>
        <button
          type="button"
          onClick={startExperiment}
          disabled={loading}
          className="w-full py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
          Generuj warianty A i B
        </button>

        {error && (
          <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {variants.map((v, vIdx) => {
            const hook = textOf(v.hook);
            const phrases = textList(v.phrases);
            return (
              <div
                key={textOf(v.label) || phrases.join("-")}
                className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-black text-white">
                    WARIANT {textOf(v.label)}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{textOf(v.theme)}</span>
                </div>
                <p className="text-sm font-mono font-bold text-white">{hook}</p>
                <p className="text-[10px] font-mono text-zinc-200">{textOf(v.angle)}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="text"
                    value={v.music || ""}
                    onChange={(e) => setProduction(vIdx, "music", e.target.value)}
                    placeholder="Muzyka (tytuł)"
                    className={FIELD}
                  />
                  <input
                    type="text"
                    value={v.background || ""}
                    onChange={(e) => setProduction(vIdx, "background", e.target.value)}
                    placeholder="Tło (scena)"
                    className={FIELD}
                  />
                </div>
                <div className="space-y-0.5 pl-2 border-l border-[#2C354B]">
                  {phrases.map((p, i) => (
                    <p key={i} className="text-[10px] font-mono text-slate-400">
                      {i + 1}. {p}
                    </p>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => onSendToReel?.(reelFromVariant(v))}
                    className="py-1 px-2 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    <Film className="w-3 h-3" />
                    Do studia rolek
                  </button>
                </div>
              </div>
            );
          })}

          {pastExperiments.length > 0 && (
            <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
                Poprzednie eksperymenty ({pastExperiments.length})
              </h4>
              {pastExperiments.map((experiment) => {
                const ledgerRows = (data.published ?? []).filter(
                  (item) => item.sourceId === experiment.id,
                ).length;
                return (
                  <div key={experiment.id} className="border-t border-white/5 pt-2 space-y-1">
                    <p className="text-[10px] font-mono text-white truncate">
                      {experiment.topic || experiment.id}
                    </p>
                    <p className="text-[9px] font-mono text-slate-500">
                      {(experiment.createdAt || "").slice(0, 10)} ·{" "}
                      {experiment.winner
                        ? `wygrana: wariant ${experiment.winner}`
                        : "bez rozstrzygnięcia"}{" "}
                      · w dzienniku: {ledgerRows}
                    </p>
                    {experiment.lesson && (
                      <p className="text-[10px] font-mono text-slate-400">{experiment.lesson}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {variants.length >= 2 && (
          <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
            <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
              Wyniki (wpisz po publikacji obu wariantów)
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <span className={LABEL}>Konto</span>
              <select
                value={draft.platform ?? "instagram"}
                onChange={(e) => patch({ platform: e.target.value as PublishPlatform })}
                className={FIELD}
              >
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>
            <div className="space-y-1.5 text-[10px] font-mono">
              {results.map((r, idx) => (
                <div key={r.label} className="space-y-1">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-rose-300 font-bold w-4">{r.label}</span>
                    <span className="text-slate-400">Wyśw.:</span>
                    <input
                      type="number"
                      min="0"
                      value={r.views}
                      onChange={(e) => setMetric(idx, "views", e.target.value)}
                      className="w-16 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                    />
                    <span className="text-slate-400">Lajki:</span>
                    <input
                      type="number"
                      min="0"
                      value={r.likes}
                      onChange={(e) => setMetric(idx, "likes", e.target.value)}
                      className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                    />
                    <span className="text-slate-400">Koment.:</span>
                    <input
                      type="number"
                      min="0"
                      value={r.comments}
                      onChange={(e) => setMetric(idx, "comments", e.target.value)}
                      className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                    />
                    <span className="text-slate-400">Udost.:</span>
                    <input
                      type="number"
                      min="0"
                      value={r.shares}
                      onChange={(e) => setMetric(idx, "shares", e.target.value)}
                      className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                    />
                    <span className="text-slate-400">Zapisy:</span>
                    <input
                      type="number"
                      min="0"
                      value={r.saves}
                      onChange={(e) => setMetric(idx, "saves", e.target.value)}
                      className="w-14 bg-[#0F121C] border border-[#2C354B] py-1 text-center font-mono text-white text-[10px]"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-5">
                    <span className={LABEL}>Data publikacji wariantu</span>
                    <input
                      type="date"
                      value={isDate(variants[idx]?.publishedAt) ? variants[idx].publishedAt : ""}
                      onChange={(e) => setPublishedAt(idx, e.target.value)}
                      className={FIELD}
                    />
                    <span className="text-[9px] font-mono text-slate-500">
                      {ledgerFingerprints.has(hookFingerprint(textOf(variants[idx]?.hook)))
                        ? "ta myśl już jest w dzienniku"
                        : isDate(variants[idx]?.publishedAt)
                          ? "gotowe do zapisu w dzienniku"
                          : "bez daty nie ma wpisu w dzienniku"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={conclude}
              disabled={concluding || !canConclude}
              className="w-full py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {concluding ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              Wyciągnij zwycięski wzorzec
            </button>
            {!canConclude && (
              <p className="text-[9px] font-mono text-slate-500">
                {short.length > 0
                  ? `Każdy wariant potrzebuje co najmniej ${MIN_AB_VIEWS} wyświetleń — brakuje: ${short
                      .map((r) => `${r.label}: ${MIN_AB_VIEWS - r.views}`)
                      .join(", ")}. Poniżej tego progu nie ma zwycięzcy, jest zgadywanka.`
                  : `Eksperyment ma dwie strony: wpisz wyniki obu wariantów, co najmniej ${MIN_AB_VIEWS} wyświetleń na każdy.`}
              </p>
            )}
          </div>
        )}

        {notice && (
          <div className="p-2 bg-[#141824] border border-[#2C354B] rounded-lg text-[10px] font-mono text-slate-400">
            {notice}
          </div>
        )}

        {conclusion && refused && (
          <div className="p-3 bg-[#141824] border border-[#2C354B] rounded-lg space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
              Bez rozstrzygnięcia
            </p>
            <p className="text-[11px] font-mono text-slate-300">{conclusion.lesson}</p>
            {(conclusion.missing ?? []).map((row) => (
              <p key={textOf(row.label)} className="text-[10px] font-mono text-slate-400">
                Wariant {textOf(row.label)}: {row.views ?? 0} wyświetleń, brakuje {row.needs ?? 0}.
              </p>
            ))}
            <p className="text-[9px] font-mono text-slate-500">
              Nic nie poszło do pętli uczenia — wzorzec z jednego pomiaru wracałby potem do
              generatora jako dowód.
            </p>
          </div>
        )}

        {conclusion && !refused && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2">
            <p className="text-[10px] font-mono text-rose-300 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Wygrał wariant <strong>{conclusion.winner}</strong>
            </p>
            <p className="text-[11px] font-mono text-slate-300">{conclusion.lesson}</p>
            <p className="text-[9px] font-mono text-slate-500">
              W kolejnych generacjach stosuj więcej tego typu hooków.
              {saved && " Wzorzec zapisany do pętli uczenia."}
            </p>
            <div className="flex flex-wrap gap-1">
              {onSendToReel && winnerVariant && (
                <button
                  type="button"
                  onClick={() => onSendToReel(reelFromVariant(winnerVariant))}
                  className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3 h-3" />
                  Wyślij zwycięzcę do studia rolek
                </button>
              )}
              <button
                type="button"
                onClick={saveBothToLedger}
                disabled={ledgerFilled}
                className="py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] font-mono font-bold text-white cursor-pointer disabled:opacity-40"
              >
                {ledgerFilled
                  ? "Warianty są już w dzienniku"
                  : "Zapisz oba warianty w dzienniku publikacji"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
