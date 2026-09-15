# Konwencje pracy nad projektem

## Historia gita

- Nie przepisujemy opublikowanej historii (force push, rebase/squash już wypchniętych commitów).
- Commity w konwencji conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

## Jakość kodu

- Przed pushem muszą przechodzić: `npm run typecheck`, `npm run lint` i `npm run build`.
- Formatowanie: prettier (`npx prettier --write .`), końcówki linii LF w repo (patrz `.gitattributes`).

## Architektura

- Model Gemini konfigurujemy **wyłącznie** w `src/lib/ai/gemini.server.ts` (`GEMINI_MODEL` / `GEMINI_LITE_MODEL`).
- Klucz API (`GEMINI_API_KEY`) tylko server-side — nigdy w kodzie frontendu ani w repo.
- Nowe trasy AI dodajemy jako moduł w `src/lib/ai/routes/` i rejestrujemy w `src/lib/ai/router.server.ts`.
- Do generowania treści używamy `generateContent()` / `generateJson()` z `gemini.server.ts` — nie tworzymy własnych klientów.
- Ochrona SSRF: zawsze przez `isSafeUrl()` z `src/lib/safe-url.ts`.
- Cache: `createTtlCache()` z `src/lib/cache.ts` — nie piszemy własnych map z TTL.
- Opisy marki: `formatStarkCaption()` z `src/lib/caption.ts`.

