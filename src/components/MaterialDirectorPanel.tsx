import { useEffect, useRef, useState } from "react";
import { ROOK_REFERENCE, ROOK_DESK_FRAME } from "../lib/brandIdentity";
import { fetchJson } from "../lib/fetchJson";
import {
  materialBrief,
  materialCaption,
  materialPackage,
  materialPlanIsCurrent,
  materialSourceKey,
  sceneImagePrompt,
  sceneMotionPrompt,
  type MaterialPlan,
  type MaterialTreatment,
  type MaterialDirectorState,
  readMaterialPlan,
  directorStateFor,
} from "../lib/materialPlan";

interface Props {
  lines: string[];
  medium: "post" | "reel";
  caption: string;
  duration?: number;
  onApplyCaption: (caption: string, plan: MaterialPlan) => void;
  onStockSearch?: (query: string) => void;
  onUseBackground?: (url: string, label: string) => void;
  state?: MaterialDirectorState | null;
  onStateChange?: (state: MaterialDirectorState) => void;
}

export function MaterialDirectorPanel({
  lines,
  medium,
  caption,
  duration = 12,
  onApplyCaption,
  onStockSearch,
  onUseBackground,
  state: savedState,
  onStateChange,
}: Props) {
  const [localState, setLocalState] = useState<MaterialDirectorState>(() =>
    directorStateFor({ lines, medium, duration, treatment: "rook", ratio: "9:16" }),
  );
  const state = savedState ?? localState;
  const { treatment, plan, keepCaption, captionKey } = state;
  const updateState = onStateChange ?? setLocalState;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const brief = materialBrief({ lines, medium, treatment, duration, ratio: "9:16" });
  const sourceKey = materialSourceKey(brief);
  const latest = useRef({ sourceKey, caption, state });
  const alive = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    latest.current = { sourceKey, caption, state };
  }, [sourceKey, caption, state]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const current = !!plan && materialPlanIsCurrent(plan, brief);

  const applyCaption = (next: MaterialPlan) => {
    onApplyCaption(materialCaption(next), next);
    updateState({ ...latest.current.state, plan: next, captionKey: next.sourceKey });
  };

  const generate = async () => {
    if (pending.current || !brief.lines.length) return;
    pending.current = true;
    setBusy(true);
    setNotice("");
    const captionAtStart = caption;
    try {
      const reply = await fetchJson("/api/ai/material-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });
      if (!alive.current) return;
      if (reply.status !== 200 || reply.degraded || !reply.data.plan) {
        setNotice(
          typeof reply.data.notice === "string"
            ? reply.data.notice
            : "Nie udało się dopasować materiału. Opis i plan pozostają bez zmian.",
        );
        return;
      }
      const next = reply.data.plan as MaterialPlan;
      if (latest.current.sourceKey !== next.sourceKey) {
        updateState({ ...latest.current.state, plan: next });
        setNotice(
          "Tekst lub tempo zmieniły się w trakcie generacji. Ten plan dotyczy poprzedniej wersji; dopasuj go ponownie.",
        );
      } else if (!keepCaption && latest.current.caption === captionAtStart) {
        applyCaption(next);
        setNotice(
          "Opis i sceny dopasowane do bieżącego tekstu. Wybierz grafikę lub klip i wgraj je do studia.",
        );
      } else {
        updateState({ ...latest.current.state, plan: next });
        setNotice(
          "Plan gotowy. Twój opis został zachowany; możesz zastosować nowy opis przyciskiem poniżej.",
        );
      }
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Skopiowano prompt. Do generatora dołącz kartę postaci, aby zachować jej wygląd.");
    } catch {
      setNotice("Schowek jest niedostępny. Pobierz paczkę JSON z promptami.");
    }
  };
  const download = () => {
    if (!plan || !current) return;
    const url = URL.createObjectURL(
      new Blob([materialPackage(plan)], { type: "application/json;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "stark-pakiet-materialu.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <details className="rounded-xl border border-white/15 bg-[#111111] p-4 space-y-3">
      <summary className="text-xs font-mono font-bold text-white cursor-pointer">
        Oprawa marki · opis i plan scen
        {(captionKey !== sourceKey || (plan && !current)) && (
          <span className="ml-2 text-rose-300 font-normal">Sprawdź opis</span>
        )}
      </summary>
      <p className="text-xs text-neutral-400 leading-relaxed">
        Czerń, kość słoniowa i jeden karmazynowy detal. Sceny wynikają z Twojego tekstu. Tutaj
        przygotujesz opis i prompty; gotową grafikę lub animację wgrasz jako własne tło.
      </p>
      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["rook", "Bohater ROOK"],
            ["live", "Ujęcia filmowe"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={treatment === value}
            onClick={() => updateState({ ...state, treatment: value as MaterialTreatment })}
            className={`rounded-lg border px-3 py-2 text-xs ${treatment === value ? "border-rose-800 bg-rose-950/40 text-white" : "border-white/10 text-neutral-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {treatment === "rook" && (
        <div className="space-y-2">
          <img
            src={ROOK_REFERENCE}
            alt="Karta postaci ROOK: sylwetka oraz odkładanie telefonu, pisanie i wiązanie butów"
            className="w-full rounded-lg"
            loading="lazy"
          />
          <p className="text-xs text-neutral-400">
            Robocza koncepcja: dorosły bohater animacji, geometryczna twarz, karmazynowy lewy
            mankiet. Powraca w opowieści jako jej uczestnik.
          </p>
          <a
            href={ROOK_REFERENCE}
            download="rook-reference-v1.png"
            className="text-xs text-white underline"
          >
            Pobierz kartę postaci do generatora
          </a>
          {onUseBackground && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => onUseBackground(ROOK_DESK_FRAME, "ROOK · telefon i zeszyt")}
                className="block text-xs text-white underline"
              >
                Wypróbuj kadr: telefon i zeszyt · bez AI
              </button>
              <p className="text-[11px] text-neutral-500">
                Przykładowy kadr jest statyczną grafiką o skupieniu. Użyj go, jeśli pasuje do
                Twojego tekstu.
              </p>
            </div>
          )}
        </div>
      )}
      {(captionKey !== sourceKey || (plan && !current)) && (
        <p role="status" className="text-xs text-rose-300">
          Zmieniono tekst, tempo lub oprawę. Sprawdź opis
          {plan ? " i dopasuj sceny ponownie" : " i dopasuj go ponownie"}. Ręczne poprawki pozostają
          zachowane.
        </p>
      )}
      <label className="flex items-center gap-2 text-xs text-neutral-300">
        <input
          type="checkbox"
          disabled={busy}
          checked={keepCaption}
          onChange={(event) => updateState({ ...state, keepCaption: event.target.checked })}
        />{" "}
        Zachowaj mój opis przy generowaniu scen
      </label>
      <button
        type="button"
        disabled={busy || !brief.lines.length}
        onClick={generate}
        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
      >
        {busy ? "Dopasowuję materiał…" : "Dopasuj opis i sceny · 1 generacja AI"}
      </button>
      <p className="text-[11px] text-neutral-500">
        Korzysta z obecnego Gemini i jego limitu. Nie generuje obrazów ani wideo, nie dodaje
        płatnego API. Zmiany tekstu nie uruchamiają AI. Próby zapasowe przy błędach również mogą
        korzystać z limitu.
      </p>
      {notice && (
        <p role="status" className="text-xs text-neutral-300">
          {notice}
        </p>
      )}
      {plan && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-neutral-400">
            {current ? "Plan bieżącej wersji" : "Plan poprzedniej wersji"}
          </p>
          <p className="text-xs text-neutral-300 whitespace-pre-wrap">{plan.captionBody}</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={!current}
              onClick={() => applyCaption(plan)}
              className="text-xs text-white underline disabled:opacity-30"
            >
              Zastosuj opis
            </button>
            <button
              type="button"
              disabled={!current}
              onClick={download}
              className="text-xs text-white underline disabled:opacity-30"
            >
              Pobierz paczkę scen i promptów
            </button>
          </div>
          {plan.scenes.map((scene, index) => (
            <div key={index} className="rounded-lg border border-white/10 p-3 space-y-2">
              <p className="text-[10px] font-mono uppercase text-neutral-400">
                Scena {index + 1} · {scene.seconds.toFixed(1)} s
              </p>
              <p className="text-xs font-bold text-white">
                {scene.lineIndexes.map((lineIndex) => plan.brief.lines[lineIndex]).join(" / ")}
              </p>
              <p className="text-xs text-neutral-300">{scene.reason}</p>
              <p className="text-xs text-neutral-400">{scene.action}</p>
              <p className="text-[11px] text-neutral-500">
                {scene.setting} · {scene.framing}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!current}
                  onClick={() => copy(sceneImagePrompt(plan, scene))}
                  className="text-xs text-white underline disabled:opacity-30"
                >
                  Kopiuj prompt grafiki
                </button>
                <button
                  type="button"
                  disabled={!current}
                  onClick={() => copy(sceneMotionPrompt(plan, scene))}
                  className="text-xs text-white underline disabled:opacity-30"
                >
                  Kopiuj prompt ruchu
                </button>
                {scene.stockQuery && onStockSearch && (
                  <button
                    type="button"
                    disabled={!current}
                    onClick={() => onStockSearch(scene.stockQuery)}
                    className="text-xs text-white underline disabled:opacity-30"
                  >
                    Szukaj ujęcia · bez AI
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <label className="block text-xs text-neutral-300 underline cursor-pointer">
        Wczytaj paczkę scen z pliku
        <input
          type="file"
          accept="application/json,.json"
          aria-label="Paczkę scen JSON"
          className="sr-only"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (file.size > 256 * 1024) {
              setNotice("Paczka scen może mieć najwyżej 256 KB.");
              return;
            }
            try {
              const imported = readMaterialPlan(JSON.parse(await file.text()));
              if (!imported || imported.brief.medium !== medium || imported.brief.ratio !== "9:16")
                throw new Error("Ten plik nie zawiera poprawnego planu dla tego studia.");
              updateState({
                ...latest.current.state,
                plan: imported,
                treatment: imported.brief.treatment,
              });
              setNotice(
                "Wczytano plan z pliku. Sprawdź zgodność z bieżącym tekstem przed zastosowaniem opisu.",
              );
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Nie udało się wczytać planu.");
            }
          }}
        />
      </label>
    </details>
  );
}
