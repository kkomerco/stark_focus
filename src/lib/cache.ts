export interface TtlCacheOptions {
  ttlMs: number;
  maxEntries: number;
}

/**
 * Minimalny cache w pamięci RAM: TTL + ewolucja LRU.
 * Używany do zapamiętywania powtarzających się zapytań AI oraz odpowiedzi HTTP.
 */
export function createTtlCache<T>({ ttlMs, maxEntries }: TtlCacheOptions) {
  const store = new Map<string, { value: T; expiresAt: number }>();

  return {
    get(key: string): T | null {
      const hit = store.get(key);
      if (!hit) return null;
      if (hit.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      // odświeżenie pozycji (LRU)
      store.delete(key);
      store.set(key, hit);
      return hit.value;
    },

    set(key: string, value: T): void {
      if (store.size >= maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },

    clear(): void {
      store.clear();
    },

    get size(): number {
      return store.size;
    },
  };
}
