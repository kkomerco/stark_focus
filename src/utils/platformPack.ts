import { drawMinimalBlackQuoteSlide } from "./canvasRenderer";
import { Post } from "../types";
import { STARK_CTA, starkHashtags, starkPinned } from "../lib/caption";

/**
 * PAKIET NA PLATFORMY.
 *
 * Właściciel wrzuca ten sam materiał na IG Reels, TikToka i Shorts, a do
 * tej pory musiał dla każdej platformy pobierać grafikę osobno i ręcznie
 * przycinać opis. Jedna operacja -> jeden ZIP z gotowymi kadrami 1:1 (feed),
 * 4:5 (karuzela) i 9:16 (rolka/post) plus opisami zmieszczonymi w limity.
 *
 * Limity opisów to liczby z dokumentacji platform; przycinamy je przed
 * zapisem pliku, inaczej wrzut na Instagram uśnie na walidacji.
 */
const PLATFORMS = [
  { id: "instagram", label: "Instagram", captionLimit: 2200 },
  { id: "tiktok", label: "TikTok", captionLimit: 4000 },
  { id: "youtube", label: "YouTube Shorts", captionLimit: 5000 },
] as const;

export type PlatformId = (typeof PLATFORMS)[number]["id"];

const FRAME_SIZES = [
  { key: "1x1", width: 1080, height: 1080, note: "kwadrat feedowy" },
  { key: "4x5", width: 1080, height: 1350, note: "pionowy 4:5" },
  { key: "9x16", width: 1080, height: 1920, note: "relacja 9:16 (rolka)" },
] as const;

/**
 * Tekst na grafikę bierzemy z pierwszego wiersza opisu, nie z tytułu: to on
 * jest materiałem, a tytuł to etykieta porządkowa w aplikacji.
 */
function frameText(post: Post): { main: string; sub: string } {
  const clean = (value: string) => (value || "").replace(/[*"#]/g, "").trim();
  const lines = (post.caption || "")
    .split("\n")
    .map(clean)
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length === 0) return { main: clean(post.title), sub: "" };
  return { main: lines[0], sub: lines[1] || "" };
}

function captionFor(post: Post, limit: number, platformLabel: string): string {
  const raw = (post.caption || post.title || "").trim();
  const hashtags = starkHashtags(raw).join(" ");
  const body = raw || STARK_CTA;
  const text = `${body}\n\n${hashtags}`;

  if (text.length <= limit) return text;
  // Przycięcie NIGDY nie zjada hashtagów: to one niosą zasięg, a opis i tak
  // został ucięty przez limit platformy.
  const room = Math.max(0, limit - hashtags.length - 4);
  return `${text.slice(0, room).trimEnd()}\n…\n${hashtags}\n\n(dopisano dla ${platformLabel})`;
}

/**
 * Alt text do wklejenia przy wrzucaniu. Platformy czytają go jako tekst, więc
 * dla kadru, który jest tylko typografią na czerni, to jedyne miejsce obok
 * opisu, gdzie treść grafiki trafia do wyszukiwania.
 */
function altTextFor(main: string): string {
  const line = main.replace(/[*"#]/g, "").trim().slice(0, 160);
  return `White serif line "${line}" on a solid black background, @stark_focus handle bottom left`;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas.toBlob zwrócił pustkę (prawdopodobnie za duży kadr)"));
    }, "image/png");
  });
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();
}

export interface PlatformPackResult {
  blob: Blob;
  files: number;
  skipped: string[];
}

/**
 * Buduje ZIP. `jszip` ładowany leniwie, bo pakiet jest opcjonalną ścieżką —
 * nie po to, żeby powiększał główny bundel każdemu, kto nigdy go nie użyje.
 */
export async function buildPlatformPack(posts: Post[]): Promise<PlatformPackResult> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const skipped: string[] = [];
  let files = 0;

  const working = document.createElement("canvas");

  for (const post of posts) {
    const { main, sub } = frameText(post);
    if (!main) {
      skipped.push(post.title || post.id);
      continue;
    }

    const slug = sanitizeFileName(post.title || post.id);
    const folder = zip.folder(`${post.created_date || "bez-daty"}_${slug}`)!;

    for (const size of FRAME_SIZES) {
      drawMinimalBlackQuoteSlide(working, {
        width: size.width,
        height: size.height,
        mainText: main,
        subText: size.key === "9x16" ? sub : "",
        align: "left",
        fontFamily: "cinzel",
        fontColor: "white",
      });
      folder.file(`kadr-${size.key}-${size.width}x${size.height}.png`, await canvasToBlob(working));
      files++;
    }

    for (const platform of PLATFORMS) {
      folder.file(
        `opis-${platform.id}.txt`,
        `${platform.label} — ${post.created_date || ""}

${captionFor(post, platform.captionLimit, platform.label)}

--- ALT TEXT (wklej przy publikacji) ---
${altTextFor(main)}
`,
      );
      files++;
    }

    // Komentarz przypięty to osobny plik, nie dopisek do opisu: wkleja się go
    // po publikacji, a bez niego dyskusja pod postem zaczyna się od zera.
    folder.file(
      "komentarz-przypieity.txt",
      starkPinned(post.title, [main, sub], "", post.format === "Cytat" ? "single" : "list"),
    );
    files++;
  }

  const readme = [
    "STARK FOCUS // PAKIET NA PLATFORMY",
    `Wygenerowano: ${new Date().toLocaleString("pl-PL")}`,
    "",
    "Struktura: <DATA>_<TYTUL>/",
    ...FRAME_SIZES.map((s) => `  kadr-${s.key}-*.png  — ${s.note}`),
    ...PLATFORMS.map(
      (p) => `  opis-${p.id}.txt      — opis zmieszczony w limicie ${p.captionLimit} znaków`,
    ),
    "  komentarz-przypieity.txt — wklej i przypnij zaraz po publikacji;",
    "  to jedyny komentarz, który i tak przeczyta każdy, kto otworzy wątek.",
    "",
    "Kadr 9:16 to grafik do rolek; rolkę wideo pobierasz osobno ze studia.",
    "Każdy opis ma sekcję ALT TEXT — wklej ją przy publikacji; platformy",
    "traktują ją jako tekst i to ona niesie treść kadru w wyszukiwaniu.",
    "Pakiety NIE zawierają wideo — patrz przycisk pobierania w Studio Rolki.",
  ].join("\n");
  zip.file("README.txt", readme);
  files++;

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, files, skipped };
}

export const PLATFORM_LABELS = PLATFORMS.map((p) => `${p.label} (${p.captionLimit})`).join(", ");
