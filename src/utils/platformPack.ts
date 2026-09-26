import { renderUniversalLayout } from "./canvasRenderer";
import { UniversalLayoutSpec, Post } from "../types";
import { STARK_CTAS, starkHashtags, starkPinned } from "../lib/caption";
import { structuredSpec } from "./ideaLayout";
import { layerById, PRIMARY_LAYER_ID } from "./canvas/layerRoles";
import { ensureBrandFonts } from "./fonts";

/**
 * PAKIET NA PLATFORMY.
 *
 * Właściciel wrzuca ten sam materiał na IG Reels, TikToka i Shorts, a do
 * tej pory musiał dla każdej platformy pobierać grafikę osobno i ręcznie
 * przycinać opis. Jedna operacja -> jeden ZIP z gotowymi kadrami 1:1 (feed),
 * 4:5 (karuzela) i 9:16 (rolka/post) plus opisami zmieszczonymi w limity.
 *
 * Kadr bierze się ze `spec` zapisanego razem z postem i jest rysowany tym
 * samym `renderUniversalLayout` co podgląd w studiu. Dawniej pakiet wołał
 * własny `drawMinimalBlackQuoteSlide` z sztywnym „cinzel", lewym wyrównaniem i
 * dwiema liniami, więc protokół, koszt i kolaż wychodziły z ZIP-a jako cytat
 * na czerni — czyli inny kadr niż ten zatwierdzony sekundę wcześniej.
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
 * Kadr, który realnie eksportujemy: zapisany `spec` ze studia albo — dla
 * postów starszych niż ten zapis — cytat złożony z tekstu.
 *
 * `rebuilt` idzie do README: bez `spec` nie odtworzymy geometrii, więc w ZIP-ie
 * taki kadr nie może udawać zatwierdzonego kadru ze studia.
 */
function frameFor(post: Post): { spec: UniversalLayoutSpec; rebuilt: boolean } {
  if (post.spec) return { spec: post.spec, rebuilt: false };
  return { spec: rebuiltQuote(post), rebuilt: true };
}

/**
 * Teza wpisu: pierwsza linia opisu, która nie jest ogonem marki. Hashtagi
 * odfiltrowujemy PRZED zjadaniem znaków, bo po `replace("#")` „#stoicism"
 * udawało treść kadru, a `formatStarkCaption` numeruje wiersze struktury —
 * bez `spec` nie wiemy, które z nich były warstwami kadru, a które prozą.
 * Dlatego na kadr wchodzi sama teza: pustego kadru nie wypełniamy zdaniem,
 * którego nikt nie zatwierdził.
 */
function thesisOf(post: Post): string {
  const isCta = (line: string) =>
    STARK_CTAS.some((cta) => cta.toLowerCase() === line.toLowerCase());
  const clean = (value: string) => value.replace(/[*"#]/g, "").trim();
  const body = (post.caption || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !isCta(line))
    .map(clean)
    .filter(Boolean);
  return body[0] || clean(post.title);
}

/** Krój i tryb koloru bierze markowa geometria warstw (`ideaLayout`/`layerRoles`), nie literał z tego pliku. */
function rebuiltQuote(post: Post): UniversalLayoutSpec {
  return structuredSpec("Cytat", "none_solid", { primary: thesisOf(post) });
}

/** Wszystkie napisy kadru — do alt textu, który platformy czytają jak treść grafiki. */
function frameTexts(spec: UniversalLayoutSpec): string[] {
  return spec.textLayers.map((layer) => (layer.text || "").trim()).filter(Boolean);
}

/**
 * Kształt pytania pod postem liczymy z kadru, który wyjeżdża z ZIP-a — ta sama
 * reguła co przy komentarzu przypiętym w studiu. `post.format` trzyma
 * `spec.layoutName` („Cytat na Czerni"), więc porównanie go z „Cytat" nie było
 * prawdziwe nigdy i pojedyncze zdanie dostawało pytanie z listy.
 */
function frameShape(spec: UniversalLayoutSpec): "list" | "single" {
  return spec.gridType === "none_solid" || spec.gridType === "studio_wall_3d" ? "single" : "list";
}

/**
 * Opis ma JEDEN ogon. `post.caption` buduje `caption.ts`, które samo dokłada
 * CTA i hashtagi — pakiet dopisywał drugi zestaw `starkHashtags(...)`, więc pod
 * każdym postem stały dwie linie tagów.
 */
function captionFor(post: Post, limit: number, platformLabel: string): string {
  const raw = (post.caption || post.title || "").trim();
  const lines = raw.split("\n").map((line) => line.trim());
  const last = [...lines].reverse().find(Boolean) || "";
  const hasTail = last.startsWith("#");
  const tail = hasTail ? last : starkHashtags(raw).join(" ");
  const body = (hasTail ? lines.slice(0, -1).join("\n") : raw).trim();

  const suffix = `\n\n(dopisano dla ${platformLabel})`;
  const text = `${body}\n\n${tail}`;
  if (text.length <= limit) return text;

  // Przycięcie NIGDY nie zjada ogona: to on niesie zasięg, a opis i tak
  // został ucięty przez limit platformy.
  const room = Math.max(0, limit - tail.length - suffix.length - 4);
  return `${body.slice(0, room).trimEnd()}\n…\n${tail}${suffix}`;
}

/**
 * Alt text do wklejenia przy wrzucaniu. Platformy czytają go jako tekst, więc
 * to jedyne miejsce obok opisu, gdzie treść grafiki trafia do wyszukiwania.
 * Nie opisujemy kroju ani tła — kadr bywa protokołem na czerni i kostką czterech
 * ujęć, a alt ma mówić to, co widać.
 */
function altTextFor(lines: string[]): string {
  const text = lines.join(" — ").replace(/[*"#]/g, "").trim().slice(0, 160);
  return `Stark Focus typography frame, @stark_focus: ${text}`;
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
  /** Wpisy bez zapisanego kadru — README mówi o nich wprost, zamiast udawać eksport ze studia. */
  const rebuilt: string[] = [];
  let files = 0;

  const working = document.createElement("canvas");
  // Canvas nie pobiera krojów sam, tylko używa tych już obecnych w
  // `document.fonts`; bez tego każdy kadr z ZIP-a wychodzi w Arialu.
  await ensureBrandFonts();

  for (const post of posts) {
    const { spec, rebuilt: fromText } = frameFor(post);
    const texts = frameTexts(spec);
    const thesis = layerById(spec, PRIMARY_LAYER_ID) || texts[0] || "";
    const label = post.title || post.id;
    if (!thesis) {
      skipped.push(label);
      continue;
    }
    if (fromText) rebuilt.push(label);

    const slug = sanitizeFileName(post.title || post.id);
    const folder = zip.folder(`${post.created_date || "bez-daty"}_${slug}`)!;

    for (const size of FRAME_SIZES) {
      renderUniversalLayout(working, spec, [], { width: size.width, height: size.height });
      folder.file(`kadr-${size.key}-${size.width}x${size.height}.png`, await canvasToBlob(working));
      files++;
    }

    const alt = altTextFor(texts);
    for (const platform of PLATFORMS) {
      folder.file(
        `opis-${platform.id}.txt`,
        `${platform.label} — ${post.created_date || ""}

${captionFor(post, platform.captionLimit, platform.label)}

--- ALT TEXT (wklej przy publikacji) ---
${alt}
`,
      );
      files++;
    }

    // Komentarz przypięty to osobny plik, nie dopisek do opisu: wkleja się go
    // po publikacji, a bez niego dyskusja pod postem zaczyna się od zera.
    folder.file("komentarz-przypieity.txt", starkPinned(thesis, texts, "", frameShape(spec)));
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
    "Każdy kadr rysuje ten sam kod co podgląd studia: `spec` zapisany razem z",
    "postem, więc PNG z archiwum to kadr zatwierdzony sekundę wcześniej,",
    "a nie zgadywanka z linii opisu.",
    ...(rebuilt.length === 0
      ? ["W tym pakiecie każdy wpis ma zapisany kadr."]
      : [
          "Te wpisy zapisano przed wprowadzeniem zapisu kadru, więc ich PNG to cytat",
          "odtworzony z tekstu, a nie kadr ze studia:",
          ...rebuilt.map((title) => `  - ${title}`),
        ]),
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
