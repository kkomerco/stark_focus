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
- Opisy marki: `formatStarkCaption()` / `starkCaption()` z `src/lib/caption.ts`; CTA tylko z puli `STARK_CTAS` (wybiera `starkCta(tresc)`), a hashtagi z `starkHashtags(tresc)` — nigdy ze stałej listy ani z głowy modelu. Meta od grudnia 2025 ucina listę do pięciu tagów, więc dawnych sześciu stopka i tak nie wysyłała w całości; `starkHashtags` dobiera dwa tematyczne do treści posta i dokłada `#starkfocus`. Każdy własny ogon w trasie rozjeżdża estetykę feedu.
- Identyfikacja wizualna materiału: czerń obsydianu + kościelna biel + **jeden** akcent karmazyn (`BRAND_ACCENT`). Cyjan/sky/neon są zakazane i w UI, i w promptach tłów — to one robiły „aplikację technologiczną", a nie markę dyscypliny. Motywy rolek schodzą do motywów marki przez `REEL_THEME_ALIASES`.
- Tło kadru generujemy w aplikacji (`POST /api/ai/generate-background`), nie kazemy użytkownikowi wklejać promptu w obcy tool. Trasa jest poza cache'em i zwraca 503 bez klucza — obrazu nie da się udawać z banku treści.
- Canvas używa wyłącznie fontów już pobranych — kroje markowe (Cinzel, Cormorant Garamond, Plus Jakarta Sans, Space Grotesk) muszą być załadowane przez `ensureBrandFonts()` z `src/utils/fonts.ts`, inaczej eksport wychodzi w Arialu. Nowy krój dodajemy w `BRAND_FONT_SPECS` i w `index.html`.
- Treść kadru mieszka **wyłącznie** w `spec.textLayers` z rolą w id (`t1`, `sub1`, `stepN`, `costN`, `forfeitN`, `closing` — patrz `src/utils/canvas/layerRoles.ts`). `layoutData` to tylko dekoracja (nadtytuł, cyfra). Dopóki render czytał kopię z `layoutData`, edycja w studio nie była widoczna na kadrze.
- Anty-powtórka jest jedna: każdy silnik treści (pomysły, paczka dnia, seria postów) dostaje `usedHookFingerprints(data)` z `src/lib/usedContent.ts` jako `excludeHooks`. Własny, jednosesyjny zestaw wykluczeń = powtórki po odświeżeniu karty.
- Języki: aplikacja jest po polsku, materiał po angielsku. W renderowanym kadrze nie może być ani jednego polskiego napisu. Emoji nie ma ani w etykietach UI, ani w materiale — markę broni treść, nie ikonka.
- Rzemiosło hooka ma jedno źródło: `src/lib/hookCraft.ts` (katalog figur, rejestr, `SLOP_BAN_LIST`, `auditHook()`, limity słów). Prompty tras treści wklejają `HOOK_CRAFT_PROMPT`, a nie własną listę zakazów, a każda trasa **filtrowuje odpowiedź modelu** przez `auditHook()` — klisza nie może dojść do UI nawet gdy model zignoruje instrukcję. Nie dodajemy osobnych „limiterów długości" w trasach: dawniej sześć tras miało sześć różnych miar i żadna nie działała.
- Treść ryzykowna dla platformy („you could die right now") jest zmiękczana w jednym miejscu — na wyjściu odpowiedzi modelu w `src/lib/ai/gemini.server.ts` przez `softenForPlatform()`. Nie powtarzamy tego filtru w trasach ani w UI.
- Geometria kadru ma jedno źródło: `src/utils/safeZones.ts`. Rolka ustępuje 250 px góry i 480 px dołu (interfejs TikToka/Reels), kadr feedowy zostaje wyśrodkowany. `MIN_TEXT_PX` to 48 — podłogi pisma w rendererach liczymy przez `floorFor()`, żeby świadomie małe stopki mogły zostać małe. Przewodnik po podglądzie **musi** rysować te same liczby, które trzymają tekst.
- Dźwięk w rolce jest proceduralny (`src/utils/reelAudio.ts`: dron, riser, uderzenia na grzbietach fraz), muxowany do eksportu przez `MediaStreamAudioDestinationNode`. Do repo nie wrzucamy plików audio ani cudzych podkładów — konto firmowe nie ma do nich praw, a aplikacja jest lokalna i bez kont.
- Rzeczywistość jest jedna: `data.published` (dziennik publikacji, `src/lib/published.ts`). Cokolwiek rankinguje, uczy się albo doradza, czyta z niego i **odmawia wniosku poniżej `MIN_SAMPLE` prób**. Wzorce do promptu (`topPublishedHooks()`) też stamtąd — bez metryk nie ma „najlepszego zdania".
- Kontrola przed publikacją (`src/lib/prepublish.ts`) jest doradcza: pokazuje, co nie gra, ale nigdy nie blokuje eksportu. Decyzję o publikacji podejmuje właściciel marki, nie aplikacja. Te same reguły są **filtrem po stronie tras** (`publishableLine/publishableLines`) — klisza i polszczyzna nie mogą dojść do UI. Przy układach strukturalnych miara jest podzielona: teza przez `auditHook`, wiersze przez `auditLine`; mierzenie całego kadru miarą hooka daje wieczne „za długie na kadr".
- Formaty kadru mają jedno źródło: `src/lib/formats.ts` (`FRAME_FORMATS`). Stamtąd prompt serwera bierze pola i limity wierszy, studio poste bierze kształt wypełnienia, a studio rolek — rozkład na takty (`frameToBeats`). Dodanie formatu bez tego wpisu znaczy, że generator znowu napisze cytat.
- Treść wchodzi do układu przez `src/utils/frameFit.ts` (`fitFrame`), nie przez domyślny cytat: radar, paczka dnia i strumień pomysłów oddają studio to, co model już napisał (fazy, kroki, kontrast, liczba), a figura wynika z kształtu tej treści.
- Tło kadru liczy `src/utils/backgroundPicker.ts`: treść → scena semantyczna (`pickBroll`) → pula kategorii → ujęcie po odcisku tekstu. Nigdy nie bierz tła z bazy szablonu ani z `CINEMATIC_BROLL_LIBRARY[0]` — to dawало „jedno sugerowane ujęcie dla wszystkiego".
- Bank treści na wyjściu jest zakazany także w stopce: `formatStarkCaption(hook, lines)` dostaje zdania z materiału, a bez nich wypisuje tylko tezę, wezwanie i hashtagi. Dawniej domyślnym body był stały trójwers „zasad" i każdy post bez opisu od modelu miał identyczny opis.
- Maska (@stark_focus) mieszka w `src/utils/character/`: `rig.ts` to szkielet z kątami stawowymi (pozy to NIE osobne rysunki), `poses.ts` to pozy i scenki. Poza i scenka są liczona z treści (`pickPose`, `pickScene`) — tak jak układ kadru i tło. Rysunek stosuje zasadę „fill then stroke" (kształt zamalowany tłem przed obrysem) i kotwiczy się od NAJNIŻSZEGO punktu rysu (`figureBounds`), bo sztywna reguła „stopy na dole" wypycha siedzącego za kadr.
- Kadry liczbowe (`life_grid`, `time_audit`) biorą liczbę z `layoutData` (geometria siatki), a zdania z `textLayers`. Krok siatki liczy się ze SZEROKOŚCI kadru, duża liczba przechodzi przez `fitLines` — inaczej albo siatka zwęża się do słupeczka, albo „41 HOURS" wychodzi za krawędzie.
- Animacja rolki to czyste funkcje w `video/reelLayout.ts` (`wordStagger`, `wordRise`, `easedReveal`, `quantizeToFps`) — malarski słupek je tylko zużywa. Tło kwantujemy do 12 fps, TEKST nigdy: klatkowanie litery przenosi ją z linii bazowej.
- Karuzela: cel to 12+ slajdów (Eden: 11-20 slajdów = 23,5% przebić vs 18% dla 2-4 slajdów u kont <10k). `MAX_SLIDES` w studiu i liczba w prompcie chodzą w parze.
- Numer edycji liczy `src/lib/series.ts` z tego, co realnie powstało (posty + dziennik). Stopka kadru i opis biorą `seriesLine`/`seriesCaption`, nie własny napis.
- Cudzy cytat: `src/lib/quotes.ts`. Zdanie trafia do UI tylko jeśli występuje w transkrypcie słowo w słowo (`isVerbatim`) i ma podpis (`attributionLine`). Nie pobieramy ani nie publikujemy cudzego audio/wideo — recykling materiału jest od 30.04.2026 karany w rekomendacjach, a sfałszowany cytat przypisany żywej osobie kosztuje więcej niż cały zasięg posta.
- Komentarz przypięty to osobny artefakt (`starkPinned`, plik `komentarz-przypieity.txt` w pakiecie, przycisk w studiu posta), nie dopisek do opisu.

## Uruchamianie



- `npm run dev` → `tsx server.ts`: API + middleware Vite na `HOST:PORT` (domyślnie `127.0.0.1:3000`).

- `npm start` → `node dist/server.cjs --prod`: ten sam proces, ale serwuje `dist/`. Flaga `--prod` jest jedynym przełącznikiem — `NODE_ENV` nic tu nie znaczy. Import `vite` jest leniwy, więc build produkcyjny nie wymaga tej zależności.

- `HOST=0.0.0.0` wystawia API bez uwierzytelnienia na całą sieć lokalną. Świadomie nie ma tokenu API, dopóki UI nie ma wspólnego wrapperka `fetch`.
