import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stockQueryFromPrompt, VAULT_QUERIES, VAULT_QUERY_GROUPS } from "./vaultQueries";

/**
 * Widełki sejfu są jedynym miejscem, w którym apka podsunięcia człowiekowi
 * słowo. Muszą więc być czytelne po polsku, a dla katalogu angielskie — i nie
 * mogą zamienić się w listę, której nikt już nie sprawdził.
 */

describe("vaultQueries", () => {
  it("każde widełki mają polską etykietę i angielskie hasło", () => {
    assert.ok(VAULT_QUERIES.length >= 12, "lista nie może schudnąć do kilku haseł");
    assert.equal(VAULT_QUERIES.length, VAULT_QUERY_GROUPS.flatMap((g) => g.queries).length);

    for (const item of VAULT_QUERIES) {
      assert.ok(item.label.length > 3, item.query);
      assert.equal(item.query, item.query.toLowerCase().trim());
      assert.ok(!/[ąćęłńóśźż]/.test(item.query), `hasło po polsku nie da wyników: ${item.query}`);
      assert.ok(item.query.split(" ").length >= 2, `pojedyncze słowo to zgadywanka: ${item.query}`);
    }
  });

  it("nie ma dwóch takich samych haseł", () => {
    const queries = VAULT_QUERIES.map((item) => item.query);
    assert.equal(new Set(queries).size, queries.length);
  });
});

describe("stockQueryFromPrompt", () => {
  it("z promptu bierze rzeczowniki, nie przymiotniki obróbki", () => {
    assert.equal(
      stockQueryFromPrompt(
        "lone silhouette walking wet asphalt street at 4:30 am, cinematic vertical 9:16, no watermark",
      ),
      "lone silhouette walking wet",
    );
  });

  it("nie zwraca więcej niż cztery słowa, bo katalog lubi krótkie hasła", () => {
    const query = stockQueryFromPrompt(
      "Monumental ancient Corinthian marble pillars shrouded in dark nocturnal mist, dramatic low-key rim lighting, matte charcoal textures, cinematic editorial vertical 9:16",
    );
    assert.ok(query.split(" ").length <= 4, query);
    assert.ok(!/cinematic|vertical|watermark|8k/.test(query), query);
  });

  it("z pustego promptu nie robi hasła", () => {
    assert.equal(stockQueryFromPrompt(""), "");
    assert.equal(stockQueryFromPrompt("cinematic 9:16 no watermark"), "");
  });
});
