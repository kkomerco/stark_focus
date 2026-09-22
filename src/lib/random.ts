/**
 * Losowość bez zaskoczeń statystycznych.
 *
 * `sort(() => Math.random() - 0.5)` NIE jest tasowaniem: porównanie
 * nieregularne daje rozkład stronniczy, a na 10-20 elementach większość
 * pozostaje na swoich miejscach — przez to "rotacja kategorii" wybierała
 * zawsze te same początkowe wpisy.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** `n` różnych elementów w losowej kolejności (bez powtórzeń). */
export function pickN<T>(items: readonly T[], n: number): T[] {
  return shuffle(items).slice(0, Math.max(1, Math.min(n, items.length)));
}

/**
 * Wybór przywiązany do dnia kalendarzowego — "rzecz dnia" musi być jedna dla
 * całego dnia, inaczej każdy mount komponentu losuje nową wartość i pyta AI
 * od nowa.
 */
export function pickForDay<T>(items: readonly T[], date: Date = new Date()): T {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return items[Math.abs(dayIndex) % items.length];
}
