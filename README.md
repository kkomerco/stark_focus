# Visionary Media Lab — AI Post Pro

Platforma kreatywna do generowania treści social media (posty 1:1, karuzele 4:5, rolki 9:16, prompty do generatorów grafik) napędzana przez Google Gemini.

## 🚀 Stack technologiczny

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, lucide-react
- **Backend:** Node.js, Express 5 (`server.ts`) + moduły tras w `src/lib/ai/`
- **Silnik AI:** Google Gemini (`gemini-3.8-flash`, zapasowo `gemini-3.5-flash-lite`)
- **Renderowanie:** Canvas API (klatki rolek, slajdy karuzel), JSZip (pakiety eksportu)
- **Stan aplikacji:** localStorage (bez bazy danych) — narzędzie jednoosobowe

## 📁 Struktura projektu

```
server.ts                        # serwer Express: /api/health, /api/proxy-image + montaz tras AI
src/lib/ai/gemini.server.ts      # JEDYNE miejsce z klientem Gemini, modelami i parsowaniem JSON
src/lib/ai/router.server.ts      # spina moduly tras + cache odpowiedzi AI
src/lib/ai/routes/               # trasy AI podzielone domenowo:
  analyze.server.ts              #   analiza linkow/hookow, hook battle
  deconstruct.server.ts          #   dekonstrukcja viralowych postow + warianty @stark_focus
  generate.server.ts             #   posty, prompty tla, slajdy, ghostwriting
  trends.server.ts               #   skaner trendow, matryca katow, cognitive friction, evergreen
  carousel.server.ts             #   szablony karuzel
  mentor.server.ts               #   warianty mentora
  reels.server.ts                #   multi-warianty rolek (A/B/C)
  growth.server.ts               #   eksperymenty A/B, autopilot tygodniowy, reroll promptow, pick-broll
  batch.server.ts                #   generator masowy cytatow 9:16
  daily-pack.server.ts           #   paczka dnia (rolki + karuzela + post)
  idea-stream.server.ts          #   nieskonczony generator pomyslow z anty-powtorka
  status.server.ts               #   status klucza API
src/lib/safe-url.ts              # ochrona SSRF (jedna implementacja dla calego projektu)
src/lib/cache.ts                 # cache TTL + LRU (jedna implementacja)
src/lib/caption.ts               # format opisow marki @stark_focus
src/lib/mini-express.server.ts   # lekki adapter Web Request -> handlery tras
src/lib/*.test.ts                # testy jednostkowe (node:test przez tsx)
src/components/StarkFocusApp.tsx # powloka aplikacji (zakladki + modale)
src/components/tabs/             # AiRadarTab
src/components/                  # VideoStudioModal, InspirationStudio1to1,
                                 # AbModal, AutopilotModal, PromptLibraryModal,
                                 # DailyPackModal, IdeaStreamModal, DeconstructViralModal,
                                 # QRModal, Header, StarkLogo
src/components/video/            # silnik rolek (useReelDirector, useTTS, useVideoExporter, ...)
src/components/carousel/         # dane startowe studia karuzeli
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
npm install
npm run dev       # -> http://localhost:3000
```

Repozytorium zawiera `package-lock.json` — instaluj przez **npm** (bun może wygenerować inną wersję zależności niż zablokowana).

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
| `npm test`          | uruchomienie testów jednostkowych (`node:test` przez `tsx`)         |
| `npm run smoke`     | smoke test endpointów AI (startuje serwer, sprawdza idea-stream, deconstruct-viral, daily-pack) |

## 🧠 Silnik treści (fazy 1–2)

- **Paczka dnia** (`POST /api/ai/daily-pack`) — 3 rolki + karuzela 4:5 + post 1:1 z auto-rotacją 8 kategorii dark motivation. Klik „Zaplanuj publikację” tworzy zadania w plannerze (12:00 / 14:00 / 15:00 / 18:00).
- **Nieskończone pomysły** (`POST /api/ai/idea-stream`) — generator bez limitu z **anty-powtórką**: każdy hook trafia do historii fingerprintów w `localStorage` (`used_idea_fingerprints`), a kolejne paczki dostają listę wykluczeń. Dodatkowo macierz kombinatoryczna: 10 kategorii × 10 archetypów × 8 celów emocjonalnych × 5 formatów.
- **Analiza virala** (`POST /api/ai/deconstruct-viral`) — wklejasz link (TikTok/IG/Shorts), AI rozbiera post na hook, strukturę, wyzwalacze psychologiczne i generuje 3 własne warianty w stylu @stark_focus.

> **Architektura tras AI:** Wszystkie endpointy AI są w pełni modularne w `src/lib/ai/routes/*.server.ts` i rejestrowane w `src/lib/ai/router.server.ts`. Wspólne treści offline i banki zapasowe znajdują się w `src/lib/ai/offline-content.ts`, a obsługa modeli Gemini, retry oraz fallbacki są scentralizowane w `src/lib/ai/gemini.server.ts`.

## 🧭 Roadmapa automatyzacji (docelowo 1–2–3 kliknięcia)

1. **Klik 1 — „Wygeneruj paczkę dnia”:** jeden endpoint orkiestrujący zwracający komplet (rolki + karuzela + post 1:1) z auto-doborem teł i opisów.
2. **Klik 2 — „Renderuj wszystko”:** render canvasem + ZIP + auto-zapis do Pipeline i schowka.
3. **Klik 3 — „Eksport/Schedule”:** pobranie pakietu, QR lub webhook do zewnętrznego schedulera.

## 📝 Konwencje pracy

- Nie przepisujemy opublikowanej historii git (force push / rebase opublikowanych commitów) — patrz `AGENTS.md`.
- Końcówki linii: LF w repozytorium (`.gitattributes`), formatowanie przez prettier.
