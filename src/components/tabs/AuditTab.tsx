// FIX dla src/components/tabs/AuditTab.tsx
// BŁĄD: Array.from(new Set(stats.map(s => s.date))) może dać Set<unknown> / błąd typowania
// POPRAWKA: rzutuj explicite na string

// PRZED (błędne typowanie):
// const uniqueDates = Array.from(new Set(stats.map((s) => s.date)));

// PO (poprawione):
// Wersja 1 - prosta z as string (tak jak w zadaniu)
const uniqueDates_v1 = Array.from(new Set(stats.map((s) => s.date as string)));

// Wersja 2 - bezpieczniejsza, z filtrem i typem
// Jeśli stats ma typ { date: string | Date | undefined }
const uniqueDates_v2 = Array.from(
  new Set(
    stats
      .map((s) => s.date)
      .filter((d): d is string => typeof d === 'string' && d.length > 0)
  )
);

// Wersja 3 - w pełni typowana, jeśli data może być Date
type Stat = { date: string | Date };
declare const stats: Stat[];
const uniqueDates_v3 = Array.from(
  new Set(
    stats.map((s) => (typeof s.date === 'string' ? s.date : s.date.toISOString().split('T')[0]))
  )
);

export { uniqueDates_v1, uniqueDates_v2, uniqueDates_v3 };
