# Visionary Media Lab — AI Post Pro

Platforma kreatywna do generowania treści social media (posty 1:1, karuzele 4:5, rolki 9:16, prompty do generatorów grafik) napędzana przez Google Gemini.

## 🚀 Stack technologiczny

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, lucide-react
- **Backend:** Node.js, Express 5 (`server.ts`) + moduły tras w `src/lib/ai/`
- **Silnik AI:** Google Gemini (`gemini-3.8-flash`, zapasowo `gemini-3.1-flash-lite`)
- **Renderowanie:** Canvas API (klatki rolek, slajdy karuzel), JSZip (pakiety eksportu)
- **Stan aplikacji:** localStorage (bez bazy danych) — narzędzie jednoosobowe

## 📁 Struktura projektu

```
server.ts                        # serwer Express: /api/health, /api/generate + montaz tras AI
src/lib/ai/gemini.server.ts      # JEDYNE miejsce z klientem Gemini, modelami, retry i parsowaniem JSON
src/lib/ai/normalize.server.ts   # normalizacja odpowiedzi modelu + znakowanie treści zapasowych
src/lib/limits.ts                # clamp każdego parametru liczbowego i tekstowego z req.body
src/lib/fetch-image.server.ts    # pobieranie zewnętrznych obrazków z ochroną SSRF (jedyna droga)
src/lib/random.ts                # Fisher-Yates, pick, pickN, pickForDay
src/lib/ai/router.server.ts      # spina moduly tras
src/lib/ai/routes/               # trasy AI podzielone domenowo:
  deconstruct.server.ts          #   dekonstrukcja viralowych postow + warianty @stark_focus
  generate.server.ts             #   ghostwriting rolki
  trends.server.ts               #   skaner trendow, matryca katow, cognitive friction, evergreen
  daily-pack.server.ts           #   paczka dnia (rolki + karuzela + post)
  idea-stream.server.ts          #   nieskonczony generator pomyslow z anty-powtorka
  status.server.ts               #   status klucza API
src/lib/safe-url.ts              # ochrona SSRF (jedna implementacja dla calego projektu)
src/lib/cache.ts                 # cache TTL + LRU (jedna implementacja)
src/lib/caption.ts               # format opisow marki @stark_focus
src/lib/mini-express.server.ts   # lekki adapter Web Request -> handlery tras
src/components/StarkFocusApp.tsx # powloka aplikacji (zakladki + modale)
src/components/tabs/             # AiRadarTab, PipelineTab, VaultTab, MentorTab
src/components/                  # VideoStudioModal, CarouselStudioModal, HookBattleModal,
                                 # InspirationStudio1to1, QRModal, Header,
                                 # DailyPackModal, IdeaStreamModal, DeconstructViralModal
src/hooks/useIdeaStream.ts       # anty-powtorka: fingerprinty pomyslow w localStorage
src/data/                        # banki tresci i motywow (ideaMatrix, reelTemplates, starkCodex, ...)
src/utils/canvasRenderer.ts      # renderer klatek i slajdow
scripts/smoke-ai.mjs             # smoke test endpointow AI (npm run smoke)
```

## 🔑 Zmienne środowiskowe

Skopiuj `.env.example` do `.env` i uzupełnij klucz (używany **wyłącznie po stronie serwera**):

```bash
GEMINI_API_KEY="twoj-klucz"
```

Bez klucza aplikacja działa w trybie offline (endpointy zwracają treści zapasowe), a `/api/ai/status` zwraca `configured: false`.

## 🛠️ Uruchomienie lokalne

```bash
bun install        # lub: npm install
bun run dev        # lub: npm run dev   -> http://localhost:3000
```

Serwer dev (`tsx server.ts`) uruchamia jednocześnie API i Vite w trybie middleware — jeden port (3000), jeden proces.

## 📜 Skrypty

| Skrypt              | Działanie                                                           |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | serwer dev (API + frontend na porcie 3000)                          |
| `npm run client`    | sam frontend przez Vite                                             |
| `npm run build`     | typecheck + build frontendu + bundling serwera do `dist/server.cjs` |
| `npm start`         | uruchomienie builda produkcyjnego                                   |
| `npm run lint`      | ESLint (z regułą prettier)                                          |
| `npm run typecheck` | `tsc --noEmit`                                                      |
| `npm run smoke`     | smoke test endpointów AI (startuje serwer, sprawdza 3 endpointy)    |

## 🧠 Silnik treści (fazy 1–2)

- **Paczka dnia** (`POST /api/ai/daily-pack`) — 3 rolki + karuzela 4:5 + post 1:1 z auto-rotacją 8 kategorii dark motivation. Klik „Zaplanuj publikację” tworzy zadania w plannerze (12:00 / 14:00 / 15:00 / 18:00).
- **Nieskończone pomysły** (`POST /api/ai/idea-stream`) — generator bez limitu z **anty-powtórką**: każdy hook trafia do historii fingerprintów w `localStorage` (`used_idea_fingerprints`), a kolejne paczki dostają listę wykluczeń. Dodatkowo macierz kombinatoryczna: 10 kategorii × 10 archetypów × 8 celów emocjonalnych × 5 formatów.
- **Analiza virala** (`POST /api/ai/deconstruct-viral`) — wklejasz link (TikTok/IG/Shorts), AI rozbiera post na hook, strukturę, wyzwalacze psychologiczne i generuje 3 własne warianty w stylu @stark_focus.
- **Silnik wzrostu** (`POST /api/ai/ab-variants`, `/api/ai/ab-conclusion`, `/api/ai/weekly-autopilot`, `/api/ai/reroll-prompt`) — eksperymenty A/B z pętlą uczenia, tygodniowy autopilot i reroll promptów tła w tym samym stylu.
- **Generator masowy** (`POST /api/ai/batch-generator`) — paczka N unikalnych cytatów 9:16 (hook + podpis + caption).

> **Architektura:** runtime używa wyłącznie modularnych tras z `src/lib/ai/routes/*` spiętych przez `src/lib/ai/router.server.ts`. Jedyne źródło prawdy dla klienta Gemini, modeli (`GEMINI_MODEL` / `GEMINI_LITE_MODEL`) i retry/fallbacku (503/429) to `src/lib/ai/gemini.server.ts`. Każda trasa ma własny bank treści zapasowych (oznaczany nagłówkiem `x-stark-degraded`).

## 🧭 Roadmapa automatyzacji (docelowo 1–2–3 kliknięcia)

1. **Klik 1 — „Wygeneruj paczkę dnia”:** jeden endpoint orkiestrujący zwracający komplet (rolki + karuzela + post 1:1) z auto-doborem teł i opisów.
2. **Klik 2 — „Renderuj wszystko”:** render canvasem + ZIP + auto-zapis do Pipeline i schowka.
3. **Klik 3 — „Eksport/Schedule”:** pobranie pakietu, QR lub webhook do zewnętrznego schedulera.

## 📝 Konwencje pracy

- Nie przepisujemy opublikowanej historii git (force push / rebase opublikowanych commitów) — patrz `AGENTS.md`.
- Końcówki linii: LF w repozytorium (`.gitattributes`), formatowanie przez prettier.
