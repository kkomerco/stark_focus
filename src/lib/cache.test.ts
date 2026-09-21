import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTtlCache } from "./cache";

describe("cache.ts - In-Memory TTL & LRU Cache", () => {
  it("stores and retrieves cached values", () => {
    const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 10 });
    cache.set("key1", "value1");
    assert.equal(cache.get("key1"), "value1");
    assert.equal(cache.size, 1);
  });

  it("returns null for non-existent keys", () => {
    const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 10 });
    assert.equal(cache.get("non-existent"), null);
  });

  it("evicts items when TTL has expired", async () => {
    const cache = createTtlCache<string>({ ttlMs: 30, maxEntries: 10 });
    cache.set("ephemeral", "hello");
    assert.equal(cache.get("ephemeral"), "hello");

    await new Promise((resolve) => setTimeout(resolve, 45));
    assert.equal(cache.get("ephemeral"), null);
    assert.equal(cache.size, 0);
  });

  it("enforces maxEntries limit by dropping the oldest entries (LRU)", () => {
    const cache = createTtlCache<string>({ ttlMs: 5000, maxEntries: 2 });
    cache.set("a", "1");
    cache.set("b", "2");
    assert.equal(cache.size, 2);

    // Adding 3rd item should drop 'a'
    cache.set("c", "3");
    assert.equal(cache.size, 2);
    assert.equal(cache.get("a"), null);
    assert.equal(cache.get("b"), "2");
    assert.equal(cache.get("c"), "3");
  });

  it("clears all stored entries on clear()", () => {
    const cache = createTtlCache<string>({ ttlMs: 5000, maxEntries: 5 });
    cache.set("k1", "v1");
    cache.set("k2", "v2");
    assert.equal(cache.size, 2);

    cache.clear();
    assert.equal(cache.size, 0);
    assert.equal(cache.get("k1"), null);
  });
});
