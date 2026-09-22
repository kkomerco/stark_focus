import { StarkFocusData } from "../types";
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

    let backupStats: any[] = [];
    try {
      const bRaw = localStorage.getItem("stark_focus_account_stats_backup");
      if (bRaw) backupStats = JSON.parse(bRaw);
    } catch {
      // ignore parsing errors from backup
    }

    // Głęboka kopia – wywołujący nie mutują współdzielonych tablic modułu
    const base = structuredClone(INITIAL_DATA);

    if (!raw) {
      return {
        ...base,
        account_stats: backupStats.length > 0 ? backupStats : base.account_stats,
        streak: calculateStreakFromStartDate(),
      };
    }

    const parsed = JSON.parse(raw);
    let finalStats =
      Array.isArray(parsed?.account_stats) && parsed.account_stats.length > 0
        ? parsed.account_stats
        : backupStats;
    if (!Array.isArray(finalStats) || finalStats.length === 0) {
      finalStats = base.account_stats;
    }

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
    const safeData: StarkFocusData = {
      ...base,
      ...parsed,
      posts: Array.isArray(parsed?.posts) ? parsed.posts : [],
      account_stats: finalStats,
      vault_assets: cleanedAssets,
      carousel_packages: Array.isArray(parsed?.carousel_packages) ? parsed.carousel_packages : [],
      used_assets: Array.isArray(parsed?.used_assets) ? parsed.used_assets : [],
      daily_logs:
        parsed?.daily_logs && typeof parsed.daily_logs === "object" ? parsed.daily_logs : {},
      // Fallback polami: starszy blob może mieć tylko część dynamic_db
      dynamic_db: {
        formats: Array.isArray(parsed?.dynamic_db?.formats)
          ? parsed.dynamic_db.formats
          : base.dynamic_db.formats,
        cta_presets: Array.isArray(parsed?.dynamic_db?.cta_presets)
          ? parsed.dynamic_db.cta_presets
          : base.dynamic_db.cta_presets,
      },
      // Streak z zapisanej wartości, inaczej liczony od daty utworzenia konta
      streak: readStreak(parsed),
    };

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

// Etapy odzyskiwania miejsca: 1 = tylko ciężar odtwarzalny, 2 = + skrócona historia
function shrinkForQuota(data: StarkFocusData, step: number): StarkFocusData {
  const trimmed: StarkFocusData = { ...data, vault_assets: [] };
  if (step >= 2) {
    trimmed.used_assets = (data.used_assets || []).slice(-HISTORY_KEEP);
    trimmed.used_idea_fingerprints = (data.used_idea_fingerprints || []).slice(-HISTORY_KEEP);
  }
  return trimmed;
}

export function saveStoredData(data: StarkFocusData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e: any) {
    console.warn("Przekroczono limit LocalStorage, zwalniam miejsce odtwarzalnymi danymi:", e);
    // Kluczy legacy nie usuwamy – to jedyne źródło danych ze starszych wersji.
    // Zwalniamy miejsce najcięższymi payloadami zapisywanego obiektu (zapis best-effort).
    let written = false;
    for (const step of [1, 2]) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shrinkForQuota(data, step)));
        console.warn(
          step === 1
            ? "Zapis bez vault_assets (tła doczytają się ponownie)."
            : "Zapis ze skróconą historią użytych assetów i pomysłów.",
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

  try {
    if (Array.isArray(data.account_stats) && data.account_stats.length > 0) {
      localStorage.setItem("stark_focus_account_stats_backup", JSON.stringify(data.account_stats));
    }
  } catch (e) {
    console.warn("Nie udało się zapisać kopii statystyk:", e);
  }
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
