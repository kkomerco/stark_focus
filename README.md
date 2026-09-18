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
server.ts                        # serwer Express: /api/health, /api/proxy-image + montaz tras AI
src/lib/ai/gemini.server.ts      # JEDYNE miejsce z klientem Gemini, modelami i parsowaniem JSON
src/lib/ai/router.server.ts      # spina moduly tras + cache odpowiedzi AI
src/lib/ai/routes/               # trasy AI podzielone domenowo:
  analyze.server.ts              #   analiza linkow/hookow, hook battle
  generate.server.ts             #   posty, prompty tla, slajdy, ghostwriting
  trends.server.ts               #   skaner trendow, matryca katow, cognitive friction, evergreen
  carousel.server.ts             #   szablony karuzel
  mentor.server.ts               #   warianty mentora
  reels.server.ts                #   multi-warianty rolek (A/B/C)
  status.server.ts               #   status klucza API
src/lib/safe-url.ts              # ochrona SSRF (jedna implementacja dla calego projektu)
src/lib/cache.ts                 # cache TTL + LRU (jedna implementacja)
src/lib/caption.ts               # format opisow marki @stark_focus
src/lib/mini-express.server.ts   # lekki adapter Web Request -> handlery tras
src/components/StarkFocusApp.tsx # powloka aplikacji (zakladki + modale)
src/components/tabs/             # AiRadarTab, PipelineTab, VaultTab, MentorTab
src/components/                  # VideoStudioModal, CarouselStudioModal, HookBattleModal,
                                 # InspirationStudio1to1, QRModal, Header
src/data/                        # banki tresci i motywow (ideaMatrix, reelTemplates, starkCodex, ...)
src/utils/canvasRenderer.ts      # renderer klatek i slajdow
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

## 🧭 Roadmapa automatyzacji (docelowo 1–2–3 kliknięcia)

1. **Klik 1 — „Wygeneruj paczkę dnia”:** jeden endpoint orkiestrujący zwracający komplet (rolki + karuzela + post 1:1) z auto-doborem teł i opisów.
2. **Klik 2 — „Renderuj wszystko”:** render canvasem + ZIP + auto-zapis do Pipeline i schowka.
3. **Klik 3 — „Eksport/Schedule”:** pobranie pakietu, QR lub webhook do zewnętrznego schedulera.

## 📝 Konwencje pracy

- Nie przepisujemy opublikowanej historii git (force push / rebase opublikowanych commitów) — patrz `AGENTS.md`.
- Końcówki linii: LF w repozytorium (`.gitattributes`), formatowanie przez prettier.
