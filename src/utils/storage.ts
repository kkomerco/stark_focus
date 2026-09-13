import { StarkFocusData } from '../types';
import { INITIAL_DATA } from '../data/initialData';

const STORAGE_KEY = 'stark_focus_os_v31_data';

const LEGACY_KEYS = [
  'stark_focus_os_v31_data',
  'stark_focus_os_v30_data',
  'stark_focus_os_v29_data',
  'stark_focus_os_v28_data',
  'stark_focus_os_data'
];

export function calculateStreakFromStartDate(startDateStr: string = '2026-08-29'): number {
  try {
    const [year, month, day] = startDateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const now = new Date();
    const diffDays = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  } catch {
    return 1;
  }
}

export function loadStoredData(): StarkFocusData {
  try {
    let raw: string | null = null;
    for (const key of LEGACY_KEYS) {
      const candidate = localStorage.getItem(key);
      if (candidate) {
        raw = candidate;
        break;
      }
    }

    let backupStats: any[] = [];
    try {
      const bRaw = localStorage.getItem('stark_focus_account_stats_backup');
      if (bRaw) backupStats = JSON.parse(bRaw);
    } catch {}

    if (!raw) {
      return {
        ...INITIAL_DATA,
        account_stats: backupStats.length > 0 ? backupStats : (INITIAL_DATA.account_stats || []),
        streak: calculateStreakFromStartDate()
      };
    }

    const parsed = JSON.parse(raw);
    let finalStats = Array.isArray(parsed?.account_stats) && parsed.account_stats.length > 0 ? parsed.account_stats : backupStats;
    if (!Array.isArray(finalStats) || finalStats.length === 0) {
      finalStats = INITIAL_DATA.account_stats || [];
    }

    // Filtracja starych sztywnych teł .webp i posągów z galerii na życzenie użytkownika
    const rawAssets = Array.isArray(parsed?.vault_assets) ? parsed.vault_assets : [];
    const cleanedAssets = rawAssets.filter((a: any) => {
      if (!a) return false;
      const fn = String(a.filename || a.name || '').toLowerCase();
      const u = String(a.url || '').toLowerCase();
      if (fn.includes('.webp') || u.includes('.webp')) return false;
      if (fn.includes('seneca') || u.includes('seneca')) return false;
      if (fn.includes('marcus_aurelius') || u.includes('marcus_aurelius')) return false;
      if (fn.includes('brutalist_concrete') || u.includes('brutalist_concrete')) return false;
      if (fn.includes('solitary_shadow') || u.includes('solitary_shadow')) return false;
      if (fn.includes('obsidian_basalt') || u.includes('obsidian_basalt')) return false;
      return true;
    });

    // Bezpieczne wartości domyślne – nic nie rzuci błędem .filter()
    const safeData: StarkFocusData = {
      ...INITIAL_DATA,
      ...parsed,
      posts: Array.isArray(parsed?.posts) ? parsed.posts : [],
      account_stats: finalStats,
      vault_assets: cleanedAssets,
      carousel_packages: Array.isArray(parsed?.carousel_packages) ? parsed.carousel_packages : [],
      used_assets: Array.isArray(parsed?.used_assets) ? parsed.used_assets : [],
      daily_logs: parsed?.daily_logs && typeof parsed.daily_logs === 'object' ? parsed.daily_logs : {},
      dynamic_db: parsed?.dynamic_db || INITIAL_DATA.dynamic_db,
      streak: calculateStreakFromStartDate()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    return safeData;
  } catch (e) {
    console.error('Błąd ładowania danych:', e);
    return INITIAL_DATA;
  }
}

export function saveStoredData(data: StarkFocusData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (Array.isArray(data.account_stats) && data.account_stats.length > 0) {
      localStorage.setItem('stark_focus_account_stats_backup', JSON.stringify(data.account_stats));
    }
  } catch (e: any) {
    console.warn('Przekroczono limit LocalStorage, uruchamiam kompresję i czyszczenie buforów:', e);
    try {
      // Usunięcie starych kluczy legacy w celu zwolnienia miejsca
      for (const legacyKey of LEGACY_KEYS) {
        if (legacyKey !== STORAGE_KEY) {
          localStorage.removeItem(legacyKey);
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (criticalErr) {
      console.error('Krytyczny błąd zapisu po czyszczeniu bufora:', criticalErr);
    }
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
  level: 'Krytyczny' | 'Przeciętny' | 'Dobry' | 'Wiralowy';
  feedback: string;
} {
  const clean = hook.trim();
  if (!clean) return { score: 0, level: 'Krytyczny', feedback: 'Wpisz treść hooka.' };

  let score = 50;
  const words = clean.split(/\s+/).length;
  if (words >= 5 && words <= 12) score += 25;
  if (/\d+/.test(clean)) score += 10;
  if (clean.endsWith('?') || clean.endsWith('.')) score += 5;

  const triggerWords = ['truth', 'nobody', 'stop', 'destroy', 'discipline', 'silence', 'comfort', 'habits', 'cost'];
  triggerWords.forEach(w => {
    if (clean.toLowerCase().includes(w)) score += 5;
  });

  score = Math.min(99, Math.max(20, score));
  const level = score >= 85 ? 'Wiralowy' : score >= 70 ? 'Dobry' : score >= 50 ? 'Przeciętny' : 'Krytyczny';
  const feedback = score >= 85 ? 'Wysoki potencjał zatrzymania scrolla w pierwszych 800ms.' : 'Zwiększ kontrast i usuń zbędne słowa.';
  return { score, level, feedback };
}