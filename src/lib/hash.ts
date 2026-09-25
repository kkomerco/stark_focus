// src/lib/hash.ts
/**
 * Odcisk do decyzji „ten sam tekst → ten sam wybór". Używamy tam, gdzie
 * losowość psuje zaufanie: użytkownik musi dostać to samo tło i te same tagi
 * dla tej samej treści, a mimo to różne treści mają ić różnie.
 */
export function hashKey(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
