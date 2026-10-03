import type { MaterialPlan } from "../lib/materialPlan";
import { ROOK_REFERENCE } from "../lib/brandIdentity";
import { ROOK_REVIEW, shotIsCurrent, type ReelShot, type StudioMedia } from "../lib/reelMontage";
import type { LoadedStudioMedia } from "./useStudioMedia";

interface Props {
  lines: string[];
  shots: ReelShot[];
  timeline: { start: number; end: number }[];
  media: Map<string, LoadedStudioMedia>;
  plan: MaterialPlan | null;
  rook: boolean;
  background: StudioMedia | null;
  disabled: boolean;
  onFile: (index: number, file: File) => void;
  onUpdate: (index: number, patch: Partial<ReelShot>) => void;
  onRemove: (index: number) => void;
  onUseBackground: (index: number) => void;
  onSeek: (time: number) => void;
}
export function ReelMontagePanel({
  lines,
  shots,
  timeline,
  media,
  plan,
  rook,
  background,
  disabled,
  onFile,
  onUpdate,
  onRemove,
  onUseBackground,
  onSeek,
}: Props) {
  return (
    <section className="bg-[#111111] p-4 rounded-xl border border-white/15 space-y-3">
      <h3 className="text-xs font-mono font-bold text-white">
        Montaż ujęć · obraz do każdego zdania
      </h3>
      <p className="text-xs text-neutral-400">
        Cięcia podążają za fazami tekstu. Pusta pozycja używa wspólnego tła. Krótszy klip zatrzymuje
        ostatnią klatkę; możesz włączyć pętlę. Pliki zapisują się ze szkicem, bez zapytań AI.
      </p>
      {lines.map((line, index) => {
        const shot = shots.find((item) => item.lineIndex === index);
        const loaded = shot ? media.get(shot.media.id) : undefined;
        const scene =
          plan?.brief.lines[index] === line
            ? plan.scenes.find((item) => item.lineIndexes.includes(index))
            : undefined;
        const checked = ROOK_REVIEW.filter(([key]) => shot?.review[key]).length;
        return (
          <div key={index} className="rounded-lg border border-white/10 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono text-neutral-400">
                Ujęcie {index + 1} · {timeline[index]?.start.toFixed(1)}–
                {timeline[index]?.end.toFixed(1)} s
              </p>
              <button
                type="button"
                onClick={() => onSeek(timeline[index]?.start ?? 0)}
                className="text-xs text-white underline"
              >
                Podgląd ujęcia
              </button>
            </div>
            <p className="text-xs font-bold text-white">{line || "Puste zdanie"}</p>
            {scene && (
              <p className="text-xs text-neutral-400">
                {scene.reason} {scene.action}
              </p>
            )}
            <div className="flex flex-wrap gap-3 items-center">
              <label
                className={`text-xs text-white underline cursor-pointer ${disabled ? "opacity-40 pointer-events-none" : ""}`}
              >
                {shot ? "Zmień plik" : "Wgraj grafikę lub klip"}
                <input
                  type="file"
                  aria-label={`Plik ujęcia ${index + 1}`}
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
                  disabled={disabled}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onFile(index, file);
                    event.target.value = "";
                  }}
                />
              </label>
              {background && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onUseBackground(index)}
                  className="text-xs text-white underline disabled:opacity-30"
                >
                  Przypisz wspólne tło
                </button>
              )}
              {shot && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(index)}
                  className="text-xs text-neutral-400 underline"
                >
                  Usuń przypisanie
                </button>
              )}
            </div>
            {shot && (
              <>
                <p className="text-xs text-neutral-300">
                  {shot.media.name}
                  {loaded
                    ? ` · ${loaded.width}×${loaded.height}`
                    : " · wczytywanie lub niedostępny plik"}
                </p>
                {loaded && Math.min(loaded.width, (loaded.height * 9) / 16) < 720 && (
                  <p className="text-xs text-neutral-400">
                    Po pionowym wykadrowaniu obraz może być miękki. Do eksportu Full HD najlepiej
                    użyć większego ujęcia.
                  </p>
                )}
                {!shotIsCurrent(shot, lines) && (
                  <div className="text-xs text-rose-300 space-y-1">
                    <p>Zdanie zmieniło się. Do sprawdzenia przypisania używamy wspólnego tła.</p>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onUpdate(index, { sourceLine: line })}
                      className="underline"
                    >
                      To ujęcie pasuje do nowego zdania
                    </button>
                  </div>
                )}
                {loaded && (
                  <img
                    src={shot.media.kind === "image" ? loaded.url : undefined}
                    hidden={shot.media.kind !== "image"}
                    alt={`Grafika ujęcia ${index + 1}`}
                    className="max-h-40 max-w-full rounded"
                  />
                )}
                {shot.media.kind === "video" && (
                  <div className="flex flex-wrap gap-3 items-end text-xs text-neutral-300">
                    <label>
                      Od (s)
                      <input
                        type="number"
                        aria-label={`Początek ujęcia ${index + 1}`}
                        min="0"
                        max={loaded?.duration}
                        step="0.1"
                        value={shot.trimStart}
                        disabled={disabled}
                        onChange={(event) => {
                          const start = Math.min(
                            Math.max(0, Number(event.target.value) || 0),
                            Math.max(0, (loaded?.duration ?? Infinity) - 1 / 120),
                          );
                          onUpdate(index, {
                            trimStart: start,
                            trimEnd: shot.trimEnd === null ? null : Math.max(start, shot.trimEnd),
                          });
                        }}
                        className="block w-20 rounded bg-black border border-white/15 p-1"
                      />
                    </label>
                    <label>
                      Do (s)
                      <input
                        type="number"
                        aria-label={`Koniec ujęcia ${index + 1}`}
                        min={shot.trimStart}
                        max={loaded?.duration}
                        step="0.1"
                        placeholder={loaded?.duration.toFixed(1)}
                        value={shot.trimEnd ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          onUpdate(index, {
                            trimEnd:
                              event.target.value === ""
                                ? null
                                : Math.max(
                                    shot.trimStart,
                                    Math.min(
                                      loaded?.duration ?? Infinity,
                                      Number(event.target.value) || 0,
                                    ),
                                  ),
                          })
                        }
                        className="block w-20 rounded bg-black border border-white/15 p-1"
                      />
                    </label>
                    <label className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={shot.loop}
                        disabled={disabled}
                        onChange={(event) => onUpdate(index, { loop: event.target.checked })}
                      />
                      Zapętlaj fragment
                    </label>
                  </div>
                )}
                {rook && (
                  <details className="space-y-2">
                    <summary className="text-xs text-neutral-300 cursor-pointer">
                      Spójność ROOKA · sprawdzono {checked}/4
                    </summary>
                    <p className="text-[11px] text-neutral-500">
                      Kontrola ręczna: porównaj plik z kartą postaci. Aplikacja nie rozpoznaje
                      automatycznie tożsamości bohatera.
                    </p>
                    <a
                      href={ROOK_REFERENCE}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-white underline"
                    >
                      Otwórz kartę referencyjną
                    </a>
                    {ROOK_REVIEW.map(([key, label]) => (
                      <label key={key} className="flex gap-2 text-xs text-neutral-300">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={shot.review[key] === true}
                          onChange={(event) =>
                            onUpdate(index, {
                              review: { ...shot.review, [key]: event.target.checked },
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </details>
                )}
              </>
            )}
          </div>
        );
      })}
      {shots
        .filter((shot) => shot.lineIndex >= lines.length)
        .map((shot) => (
          <div key={shot.lineIndex} className="text-xs text-rose-300">
            Nieprzypisany plik po usunięciu zdania: {shot.media.name}{" "}
            <button type="button" onClick={() => onRemove(shot.lineIndex)} className="underline">
              Usuń z montażu
            </button>
          </div>
        ))}
    </section>
  );
}
