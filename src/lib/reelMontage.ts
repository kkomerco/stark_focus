import { LIMITS } from "./limits";

export interface StudioMedia {
  id: string;
  name: string;
  kind: "image" | "video";
  blob?: Blob;
  /** Wyłącznie lokalny sejf lub grafika aplikacji, nigdy obcy adres. */
  url?: string;
}
export const ROOK_REVIEW = [
  ["identity", "Ta sama twarz, włosy, sylwetka i ubranie"],
  ["cuff", "Jeden karmazynowy mankiet na lewej ręce"],
  ["contact", "Poprawne dłonie i kontakt z przedmiotami"],
  ["palette", "Czerń, kość słoniowa i jeden karmazynowy akcent"],
] as const;
export type RookReview = Partial<Record<(typeof ROOK_REVIEW)[number][0], boolean>>;
export interface ReelShot {
  lineIndex: number;
  sourceLine: string;
  media: StudioMedia;
  trimStart: number;
  trimEnd: number | null;
  loop: boolean;
  review: RookReview;
}
export interface ShotBeat {
  start: number;
  end: number;
}
export const shotLineKey = (line: string): string => line.replace(/\s+/g, " ").trim();
export const shotIsCurrent = (shot: ReelShot, lines: string[]): boolean =>
  shot.lineIndex < lines.length &&
  shotLineKey(shot.sourceLine) === shotLineKey(lines[shot.lineIndex] ?? "");

export function montageShotAt(
  shots: ReelShot[],
  lines: string[],
  timeline: ShotBeat[],
  at: number,
): ReelShot | null {
  const index = timeline.findIndex((beat) => at >= beat.start && at < beat.end);
  return shots.find((shot) => shot.lineIndex === index && shotIsCurrent(shot, lines)) ?? null;
}

/** Jedna miara przycięcia dla przewijania podglądu i klatki eksportu. */
export function shotVideoTime(
  shot: Pick<ReelShot, "trimStart" | "trimEnd" | "loop">,
  localTime: number,
  clipDuration: number,
): number {
  if (!(clipDuration > 0) || !Number.isFinite(clipDuration)) return 0;
  const last = Math.max(0, clipDuration - 1 / 120);
  const start = Math.max(0, Math.min(last, shot.trimStart));
  const end = Math.max(start, Math.min(last, shot.trimEnd ?? last));
  const span = end - start;
  const elapsed = Math.floor(Math.max(0, localTime) * 12) / 12;
  return start + (shot.loop && span > 0 ? elapsed % span : Math.min(span, elapsed));
}

export function isStudioMediaUrl(url: string): boolean {
  return /^\/(?:sejf|brand)\/[a-zA-Z0-9_.-]+\.(?:png|jpe?g|webp|mp4|webm|mov)$/i.test(url);
}

export function mediaFromFile(file: File): StudioMedia {
  const image = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  const video = ["video/mp4", "video/webm", "video/quicktime"].includes(file.type);
  if (!image && !video) throw new Error("Wybierz PNG, JPG, WebP, MP4, WebM lub MOV.");
  if (file.size > LIMITS.maxVaultBytes)
    throw new Error("Plik przekracza 45 MB. Przytnij go przed wgraniem.");
  return { id: crypto.randomUUID(), name: file.name, kind: image ? "image" : "video", blob: file };
}

export function mediaFromUrl(url: string, name: string): StudioMedia {
  if (!isStudioMediaUrl(url))
    throw new Error("Wybierz plik z lokalnego sejfu lub grafikę aplikacji.");
  return {
    id: crypto.randomUUID(),
    name,
    kind: /\.(mp4|webm|mov)$/i.test(url) ? "video" : "image",
    url,
  };
}

export function readStudioMedia(value: unknown): StudioMedia | null {
  if (!value || typeof value !== "object") return null;
  const media = value as StudioMedia;
  if (
    typeof media.id !== "string" ||
    typeof media.name !== "string" ||
    !["image", "video"].includes(media.kind)
  )
    return null;
  if (media.blob instanceof Blob && media.blob.size <= LIMITS.maxVaultBytes) return media;
  if (typeof media.url === "string" && isStudioMediaUrl(media.url))
    return { ...media, blob: undefined };
  return null;
}

export function readReelShots(value: unknown): ReelShot[] {
  if (!Array.isArray(value)) return [];
  const result: ReelShot[] = [];
  for (const entry of value.slice(0, 5)) {
    const shot = entry as ReelShot | null;
    const media = readStudioMedia(shot?.media);
    if (
      !shot ||
      !media ||
      !Number.isInteger(shot.lineIndex) ||
      shot.lineIndex < 0 ||
      shot.lineIndex > 4 ||
      typeof shot.sourceLine !== "string" ||
      result.some((item) => item.lineIndex === shot.lineIndex)
    )
      continue;
    result.push({
      lineIndex: shot.lineIndex,
      sourceLine: shot.sourceLine.slice(0, 300),
      media,
      trimStart: Number.isFinite(shot.trimStart) ? Math.max(0, shot.trimStart) : 0,
      trimEnd: Number.isFinite(shot.trimEnd) ? Math.max(0, shot.trimEnd!) : null,
      loop: shot.loop === true,
      review: Object.fromEntries(ROOK_REVIEW.map(([key]) => [key, shot.review?.[key] === true])),
    });
  }
  return result;
}
