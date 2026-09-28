// src/utils/storage.test.ts
// Granica importu kopii. Plik z dysku jest niezaufany tak samo jak odpowiedź
// modelu: to, co wejdzie do localStorage, zostaje tam na lata — a przy limicie
// 5 MB walka o miejsce kończyła się wycięciem galerii, żeby ratować pole po
// wersji aplikacji, której już nie ma.
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

// Moduł readszuje localStorage przy każdym wywołaniu, więc podstawiamy mapę
// ZANIM go zaimportujemy.
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => void store.set(key, String(value)),
  removeItem: (key: string) => void store.delete(key),
  clear: () => store.clear(),
};

const { importStoredData, loadStoredData, serializeBackup } = await import("./storage");
const { INITIAL_DATA } = await import("../data/initialData");

const KEY = "stark_focus_os_v31_data";

describe("import kopii — tylko znane pola", () => {
  beforeEach(() => store.clear());

  it("pole po starej wersji nie zostaje w stanie i nie wraca do pliku", () => {
    const result = importStoredData(
      JSON.stringify({
        posts: [{ id: "p1", title: "Rust works while you sleep." }],
        xp: 120,
        account_stats: { followers: 999999, stale: "x".repeat(2000) },
        dynamic_db: { cokolwiek: true },
      }),
    );

    assert.equal(result.ok, true);
    const stored = store.get(KEY) ?? "";
    assert.ok(!stored.includes("account_stats"), "śmieci wylądowały w localStorage");
    assert.ok(!stored.includes("dynamic_db"));

    const data = loadStoredData() as unknown as Record<string, unknown>;
    assert.equal(data.account_stats, undefined);
    assert.equal(data.dynamic_db, undefined);
    assert.equal(data.xp, 120);
    assert.equal((data.posts as unknown[]).length, 1);
  });

  it("historia anty-powtórki i dziennik publikacji przechodzą przez import", () => {
    importStoredData(
      JSON.stringify({
        used_idea_fingerprints: ["rust works while you sleep"],
        published: [
          {
            id: "pub1",
            kind: "post",
            hook: "Rust works while you sleep",
            postedAt: "2026-09-20",
            likes: 40,
          },
        ],
        prompt_library: [{ id: "pl1", prompt: "Zima", uses: 2 }],
        saved_trends: [{ id: "st1", topic: "monk mode" }],
        ab_experiments: [{ id: "ab1", topic: "poranek" }],
      }),
    );

    const data = loadStoredData();
    assert.deepEqual(data.used_idea_fingerprints, ["rust works while you sleep"]);
    assert.equal(data.published?.length, 1);
    assert.equal(data.prompt_library?.length, 1);
    assert.equal(data.saved_trends?.length, 1);
    assert.equal(data.ab_experiments?.length, 1);
  });

  it("przestarzałe tła .webp i posągi odpadają już przy imporcie, nie przy odczycie", () => {
    importStoredData(
      JSON.stringify({
        vault_assets: [
          { id: "a1", filename: "marcus_aurelius.webp", url: "/x.webp" },
          { id: "a2", filename: "monolit.png", url: "/monolit.png" },
        ],
      }),
    );

    const stored = JSON.parse(store.get(KEY) ?? "{}") as { vault_assets: unknown[] };
    assert.equal(stored.vault_assets.length, 1);
  });

  it("plik z innej aplikacji nie nadpisuje stanu", () => {
    const result = importStoredData(JSON.stringify({ recipe: "bigos", steps: 4 }));
    assert.equal(result.ok, false);
    assert.equal(store.has(KEY), false);
  });

  it("kopia zapisana przez aplikację wraca przez import bez utraty pól", () => {
    const before = loadStoredData();
    const backup = serializeBackup({ ...before, xp: 300, posts: [{ ...before.posts[0]! }] } as any);
    assert.equal(importStoredData(backup).ok, true);
    const after = loadStoredData();
    assert.equal(after.xp, 300);
    assert.deepEqual(Object.keys(after).sort(), Object.keys({ ...INITIAL_DATA, ...after }).sort());
  });

  it("wzorce ręczne przeżywają eksport/import, a śmieci z listy odpadają", () => {
    const before = loadStoredData();
    const backup = serializeBackup({
      ...before,
      exemplars: [
        "Rust works while you sleep.",
        "  The rent is due every morning.  ",
        "rust works while you sleep", // duplikat odciskiem — ma odpaść
        "", // puste — ma odpaść
        42, // nie-tekst — ma odpaść
        "x".repeat(400), // za długie — ma być ucięte do 300
      ] as any,
    });

    assert.equal(importStoredData(backup).ok, true);
    const after = loadStoredData();
    assert.deepEqual(after.exemplars, [
      "Rust works while you sleep.",
      "The rent is due every morning.",
      "x".repeat(300),
    ]);
  });
});
