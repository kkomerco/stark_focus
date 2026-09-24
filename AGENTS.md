# Konwencje pracy nad projektem

## Historia gita

- Nie przepisujemy opublikowanej historii (force push, rebase/squash już wypchniętych commitów).
- Commity w konwencji conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

## Jakość kodu

- Przed pushem muszą przechodzić: `npm run typecheck`, `npm run lint` i `npm run build`.
- Formatowanie: prettier (`npx prettier --write .`), końcówki linii LF w repo (patrz `.gitattributes`).

## Architektura

- Model Gemini konfigurujemy **wyłącznie** w `src/lib/ai/gemini.server.ts` (`GEMINI_MODEL` / `GEMINI_LITE_MODEL` / `GEMINI_IMAGE_MODEL`).
- Klucz API (`GEMINI_API_KEY`) tylko server-side — nigdy w kodzie frontendu ani w repo.
- Nowe trasy AI dodajemy jako moduł w `src/lib/ai/routes/` i rejestrujemy w `src/lib/ai/router.server.ts`.
- Do generowania treści używamy `generateContent()` / `generateJson()` z `gemini.server.ts` — nie tworzymy własnych klientów ani własnych pętli retry (fallback modeli + backoff 503/429 + limit czasu są już w `gemini.server.ts`).
- Ochrona SSRF: `isSafeUrl()` z `src/lib/safe-url.ts` dla każdego adresu od klienta; pobieranie obrazków wyłącznie przez `fetchSafeImage()` z `src/lib/fetch-image.server.ts` (odrzuca przekierowania, SVG i pliki >8 MB). Adres z odpowiedzi strony trzeciej (np. `thumbnail_url` z oEmbed) też jest niezaufany.
- Cache: `createTtlCache()` z `src/lib/cache.ts` — nie piszemy własnych map z TTL. Odpowiedzi zapasowe (z banku treści, nie od modelu) wysyłamy przez `sendDegraded()` z `src/lib/ai/normalize.server.ts`, inaczej wejdą do cache i będą udawać wygenerowane.
- Każdy parametr z `req.body` przechodzi przez `clampCount/clampInt/clampOffset/clampText` z `src/lib/limits.ts` — nieklampowana liczba trafia do pętli generującej wynik albo do promptu (za każdy znak płacimy).
- Każde pole z odpowiedzi modelu, które UI mapuje, normalizujemy w trasie (`src/lib/ai/normalize.server.ts`: `asArray/asString/asStringArray/oneOf`). UI nie sprawdza kształtu danych; jedyny `ErrorBoundary` jest na cały app, więc zły payload = pusty ekran.
- Losowość: `shuffle/pick/pickN/pickForDay` z `src/lib/random.ts` — `sort(() => Math.random() - 0.5)` jest stronnicze i nie tasuje.
- Odcisk hooka liczymy przez `hookFingerprint()` z `src/lib/similarity.ts` po obu stronach; klient i serwer muszą używać tej samej funkcji.
- Opisy marki: `formatStarkCaption()` / `starkCaption()` z `src/lib/caption.ts`; CTA tylko z `STARK_CTA`, a hashtagi z `starkHashtags(tresc)` — nigdy ze stałej listy. Meta od grudnia 2025 ucina listę do pięciu tagów, więc dawnych sześciu stopka i tak nie wysyłała w całości; `starkHashtags` dobiera dwa tematyczne do treści posta i dokłada `#starkfocus`. Każdy własny ogon w trasie rozjeżdża estetykę feedu.
- Identyfikacja wizualna materiału: czerń obsydianu + kościelna biel + **jeden** akcent karmazyn (`BRAND_ACCENT`). Cyjan/sky/neon są zakazane i w UI, i w promptach tłów — to one robiły „aplikację technologiczną", a nie markę dyscypliny. Motywy rolek schodzą do motywów marki przez `REEL_THEME_ALIASES`.
- Tło kadru generujemy w aplikacji (`POST /api/ai/generate-background`), nie kazemy użytkownikowi wklejać promptu w obcy tool. Trasa jest poza cache'em i zwraca 503 bez klucza — obrazu nie da się udawać z banku treści.
- Canvas używa wyłącznie fontów już pobranych — kroje markowe (Cinzel, Cormorant Garamond, Plus Jakarta Sans, Space Grotesk) muszą być załadowane przez `ensureBrandFonts()` z `src/utils/fonts.ts`, inaczej eksport wychodzi w Arialu. Nowy krój dodajemy w `BRAND_FONT_SPECS` i w `index.html`.
- Treść kadru mieszka **wyłącznie** w `spec.textLayers` z rolą w id (`t1`, `sub1`, `stepN`, `costN`, `forfeitN`, `closing` — patrz `src/utils/canvas/layerRoles.ts`). `layoutData` to tylko dekoracja (nadtytuł, cyfra). Dopóki render czytał kopię z `layoutData`, edycja w studio nie była widoczna na kadrze.
- Anty-powtórka jest jedna: każdy silnik treści (pomysły, paczka dnia, seria postów) dostaje `usedHookFingerprints(data)` z `src/lib/usedContent.ts` jako `excludeHooks`. Własny, jednosesyjny zestaw wykluczeń = powtórki po odświeżeniu karty.
- Języki: aplikacja jest po polsku, materiał po angielsku. W renderowanym kadrze nie może być ani jednego polskiego napisu. Emoji nie ma ani w etykietach UI, ani w materiale — markę broni treść, nie ikonka.

## Uruchamianie

- `npm run dev` → `tsx server.ts`: API + middleware Vite na `HOST:PORT` (domyślnie `127.0.0.1:3000`).
- `npm start` → `node dist/server.cjs --prod`: ten sam proces, ale serwuje `dist/`. Flaga `--prod` jest jedynym przełącznikiem — `NODE_ENV` nic tu nie znaczy. Import `vite` jest leniwy, więc build produkcyjny nie wymaga tej zależności.
- `HOST=0.0.0.0` wystawia API bez uwierzytelnienia na całą sieć lokalną. Świadomie nie ma tokenu API, dopóki UI nie ma wspólnego wrapperka `fetch`.
