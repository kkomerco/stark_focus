import { PlannerTask, PlannerTaskPayload, ReelHandoff, StarkFocusData } from "../types";
import { normalizePublished } from "../lib/published";
import { INITIAL_DATA } from "../data/initialData";

const STORAGE_KEY = "stark_focus_os_v31_data";

const LEGACY_KEYS = [
  "stark_focus_os_v31_data",
  "stark_focus_os_v30_data",
  "stark_focus_os_v29_data",
  "stark_focus_os_v28_data",
  "stark_focus_os_data",
];

// Nieczytelny blob trafia tutaj zamiast zostać nadpisany domyślnymi danymi
const CORRUPT_BACKUP_KEY = "stark_focus_corrupt_backup";

// Ile wpisów historii zostawiamy przy walce o limit miejsca
const HISTORY_KEEP = 20;

export function calculateStreakFromStartDate(startDateStr: string = "2026-08-29"): number {
  try {
    const [year, month, day] = startDateStr.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const now = new Date();
    const diffDays = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  } catch {
    return 1;
  }
}

export function loadStoredData(): StarkFocusData {
  let raw: string | null = null;
  try {
    for (const key of LEGACY_KEYS) {
      const candidate = localStorage.getItem(key);
      if (candidate) {
        raw = candidate;
        break;
      }
    }

    // Głęboka kopia – wywołujący nie mutują współdzielonych tablic modułu
    const base = structuredClone(INITIAL_DATA);

    if (!raw) {
      return {
        ...base,
        streak: calculateStreakFromStartDate(),
      };
    }

    const parsed = JSON.parse(raw);
    const safeData = normalizeParsedData(parsed, base);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    return safeData;
  } catch (e) {
    console.error("Błąd ładowania danych:", e);
    try {
      if (raw) localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch (backupErr) {
      console.warn("Nie udało się zachować kopii uszkodzonych danych:", backupErr);
    }
    return structuredClone(INITIAL_DATA);
  }
}

// Jedyny normalizator kształtu danych — używany przy starcie i przy imporcie kopii.
// Import z pliku jest niezaufany, więc musi przejść dokładnie tę samą walidację co odczyt
// z localStorage; nadmiarowe pola ze starych wersji (np. account_stats) po prostu odpadają.
function normalizeParsedData(parsed: any, base: StarkFocusData): StarkFocusData {
  // Filtracja starych sztywnych teł .webp i posągów z galerii na życzenie użytkownika
  const rawAssets = Array.isArray(parsed?.vault_assets) ? parsed.vault_assets : [];
  const cleanedAssets = rawAssets.filter((a: any) => {
    if (!a) return false;
    const fn = String(a.filename || a.name || "").toLowerCase();
    const u = String(a.url || "").toLowerCase();
    if (fn.includes(".webp") || u.includes(".webp")) return false;
    if (fn.includes("seneca") || u.includes("seneca")) return false;
    if (fn.includes("marcus_aurelius") || u.includes("marcus_aurelius")) return false;
    if (fn.includes("brutalist_concrete") || u.includes("brutalist_concrete")) return false;
    if (fn.includes("solitary_shadow") || u.includes("solitary_shadow")) return false;
    if (fn.includes("obsidian_basalt") || u.includes("obsidian_basalt")) return false;
    return true;
  });

  // Bezpieczne wartości domyślne – nic nie rzuci błędem .filter()
  return {
    ...base,
    ...parsed,
    posts: Array.isArray(parsed?.posts) ? parsed.posts : [],
    vault_assets: cleanedAssets,
    planner_tasks: normalizePlannerTasks(parsed?.planner_tasks),
    // Fallback polami: starszy blob może mieć tylko część dynamic_db
    dynamic_db: {
      formats: Array.isArray(parsed?.dynamic_db?.formats)
        ? parsed.dynamic_db.formats
        : base.dynamic_db.formats,
      cta_presets: Array.isArray(parsed?.dynamic_db?.cta_presets)
        ? parsed.dynamic_db.cta_presets
        : base.dynamic_db.cta_presets,
    },
    // Dziennik publikacji: bez tego aplikacja nie wie, co naprawdę wyszło.
    published: normalizePublished(parsed?.published),
    // Streak z zapisanej wartości, inaczej liczony od daty utworzenia konta
    streak: readStreak(parsed),
  };
}

function readStreak(parsed: any): number {
  const stored = Number(parsed?.streak);
  if (Number.isFinite(stored) && stored > 0) return Math.floor(stored);
  const rawDate = typeof parsed?.created_at === "string" ? parsed.created_at : "";
  const createdAt = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
  const fromDate = createdAt
    ? calculateStreakFromStartDate(createdAt)
    : calculateStreakFromStartDate();
  return Number.isFinite(fromDate) && fromDate > 0 ? fromDate : 1;
}

// ===== planner_tasks =====
// Zadania trafiają do UI bezpośrednio (mapowanie wierszy), a ich źródłem jest
// localStorage albo zaimportowany plik — walidujemy cały kształt, nie tylko tablicę.
const textOf = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";

const strList = (value: unknown, max: number): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, max) : [];

const TASK_CATEGORIES = ["rutyna", "post", "montaz", "analiza", "inne"] as const;
type TaskCategory = (typeof TASK_CATEGORIES)[number];

function normalizeTaskPayload(value: unknown): PlannerTaskPayload | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const src = value as Record<string, unknown>;
  const out: PlannerTaskPayload = {};

  const reel = src.reel;
  if (reel && typeof reel === "object") {
    const r = reel as Record<string, unknown>;
    const hook = textOf(r.hook, 300);
    const phrases = strList(r.phrases, 24);
    if (hook || phrases.length > 0) {
      const handoff: ReelHandoff = { hook: hook || phrases[0], phrases };
      const theme = textOf(r.theme, 120);
      const caption = textOf(r.caption, 2000);
      const hashtags = strList(r.hashtags, 40);
      if (theme) handoff.theme = theme;
      if (typeof r.duration === "number" && Number.isFinite(r.duration)) {
        handoff.duration = r.duration;
      }
      if (caption) handoff.caption = caption;
      if (hashtags.length > 0) handoff.hashtags = hashtags;
      out.reel = handoff;
    }
  }

  const carousel = src.carousel;
  if (carousel && typeof carousel === "object") {
    const c = carousel as Record<string, unknown>;
    const slides = Array.isArray(c.slides)
      ? c.slides.slice(0, 12).map((s) => ({
          headline: textOf((s as Record<string, unknown>)?.headline, 200),
          bodyText: textOf((s as Record<string, unknown>)?.bodyText, 800),
        }))
      : [];
    const title = textOf(c.title, 200);
    if (title || slides.length > 0) out.carousel = { title, slides };
  }

  const post = src.post;
  if (post && typeof post === "object") {
    const p = post as Record<string, unknown>;
    const text = textOf(p.text, 2000);
    if (text) out.post = { text, caption: textOf(p.caption, 4000) };
  }

  return out.reel || out.carousel || out.post ? out : undefined;
}

export function normalizePlannerTasks(raw: unknown): PlannerTask[] {
  if (!Array.isArray(raw)) return [];
  const tasks: PlannerTask[] = [];
  for (const item of raw.slice(0, 300)) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const id = textOf(t.id, 64);
    const title = textOf(t.title, 300);
    if (!id || !title) continue;
    const date = typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : "";
    const category = (TASK_CATEGORIES as readonly string[]).includes(String(t.category))
      ? (t.category as TaskCategory)
      : "inne";
    const targetTab =
      typeof t.targetTab === "number" &&
      Number.isInteger(t.targetTab) &&
      t.targetTab >= 0 &&
      t.targetTab <= 3
        ? t.targetTab
        : undefined;
    tasks.push({
      id,
      title,
      time: textOf(t.time, 5),
      category,
      targetTab,
      completed: t.completed === true,
      date,
      actionLabel: textOf(t.actionLabel, 80) || undefined,
      format: textOf(t.format, 80) || undefined,
      payload: normalizeTaskPayload(t.payload),
    });
  }
  return tasks;
}

// Etapy odzyskiwania miejsca: 1 = tylko ciężar odtwarzalny, 2 = + skrócona historia
function shrinkForQuota(data: StarkFocusData, step: number): StarkFocusData {
  const trimmed: StarkFocusData = { ...data, vault_assets: [] };
  if (step >= 2) {
    trimmed.used_idea_fingerprints = (data.used_idea_fingerprints || []).slice(-HISTORY_KEEP);
  }
  return trimmed;
}

function serialize(data: StarkFocusData, space = 0): string {
  return JSON.stringify(data, null, space);
}

export function saveStoredData(data: StarkFocusData): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(data));
  } catch (e: any) {
    console.warn("Przekroczono limit LocalStorage, zwalniam miejsce odtwarzalnymi danymi:", e);
    // Kluczy legacy nie usuwamy – to jedyne źródło danych ze starszych wersji.
    // Zwalniamy miejsce najcięższymi payloadami zapisywanego obiektu (zapis best-effort).
    let written = false;
    for (const step of [1, 2]) {
      try {
        localStorage.setItem(STORAGE_KEY, serialize(shrinkForQuota(data, step)));
        console.warn(
          step === 1
            ? "Zapis bez vault_assets (tła doczytają się ponownie)."
            : "Zapis ze skróconą historią odtwarzalnych danych.",
        );
        written = true;
        break;
      } catch (retryErr) {
        console.warn(`Nie udało się zapisać danych (etap ${step}):`, retryErr);
      }
    }
    if (!written) {
      console.error("Krytyczny błąd zapisu danych aplikacji mimo czyszczenia bufora.");
    }
  }
}

// ===== Kopia bezpieczeństwa (JSON) =====
// Ten sam serializator co zapis do localStorage — plik musi wrócić przez loadStoredData
// bez żadnego specjalnego traktowania.
export function serializeBackup(data: StarkFocusData): string {
  return serialize(data, 2);
}

// Nie usuwamy klucz localStorage przy imporcie – nadpisujemy tylko główny klucz,
// a stan sprzed importu odkładamy obok, żeby dało się cofnąć wypadek.
const PRE_IMPORT_BACKUP_KEY = "stark_focus_pre_import_backup";

export type ImportResult = { ok: true } | { ok: false; error: string };

export function importStoredData(rawJson: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Plik nie jest poprawnym JSON-em." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Plik nie zawiera obiektu danych Stark Focus." };
  }
  const source = parsed as Record<string, unknown>;
  // Co najmniej jedna rozpoznawalna sekcja — inaczej import skasowałby stan
  // przypadkowym plikiem JSON z innej aplikacji.
  const recognizable =
    Array.isArray(source.posts) ||
    Array.isArray(source.vault_assets) ||
    Array.isArray(source.planner_tasks) ||
    typeof source.xp === "number";
  if (!recognizable) {
    return {
      ok: false,
      error: "To nie wygląda na kopię danych Stark Focus (brak znanych sekcji).",
    };
  }
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) localStorage.setItem(PRE_IMPORT_BACKUP_KEY, current);
  } catch {
    // Brak miejsca na podgląd sprzed importu nie blokuje samego importu
  }
  // Walidacja pełnego kształtu dopiero przy odczycie (normalizeParsedData);
  // tu zapisujemy surowy obiekt, żeby nie pisać drugiego normalizatora.
  saveStoredData(source as unknown as StarkFocusData);
  return { ok: true };
}

export function getNextSaturday20(): { date: Date; hoursLeft: number; isSaturdayToday: boolean } {
  const now = new Date();
  const day = now.getDay();
  const isSaturdayToday = day === 6;
  const daysUntilSaturday = (6 - day + 7) % 7;

  const target = new Date(now);
  if (isSaturdayToday && now.getHours() >= 20) {
    target.setDate(target.getDate() + 7);
  } else {
    target.setDate(target.getDate() + daysUntilSaturday);
  }
  target.setHours(20, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const hoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  return { date: target, hoursLeft, isSaturdayToday };
}

export function analyzeHookStrength(hook: string): {
  score: number;
  level: "Krytyczny" | "Przeciętny" | "Dobry" | "Wiralowy";
  feedback: string;
} {
  const clean = hook.trim();
  if (!clean) return { score: 0, level: "Krytyczny", feedback: "Wpisz treść hooka." };

  let score = 50;
  const words = clean.split(/\s+/).length;
  if (words >= 5 && words <= 12) score += 25;
  if (/\d+/.test(clean)) score += 10;
  if (clean.endsWith("?") || clean.endsWith(".")) score += 5;

  const triggerWords = [
    "truth",
    "nobody",
    "stop",
    "destroy",
    "discipline",
    "silence",
    "comfort",
    "habits",
    "cost",
  ];
  triggerWords.forEach((w) => {
    if (clean.toLowerCase().includes(w)) score += 5;
  });

  score = Math.min(99, Math.max(20, score));
  const level =
    score >= 85 ? "Wiralowy" : score >= 70 ? "Dobry" : score >= 50 ? "Przeciętny" : "Krytyczny";
  const feedback =
    score >= 85
      ? "Wysoki potencjał zatrzymania scrolla w pierwszych 800ms."
      : "Zwiększ kontrast i usuń zbędne słowa.";
  return { score, level, feedback };
}
