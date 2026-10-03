# Visionary Media Lab — Stark Focus

Lokalne studio produkcji materiałów dla @stark_focus. Interfejs jest po polsku, materiał po angielsku. Aplikacja łączy generowanie tekstu, reguły marki, edycję kadru i eksport; decyzję o publikacji podejmuje właściciel konta.

Ocena architektury, porównanie z narzędziami rynkowymi i priorytety rozwoju: [przegląd z 3 października 2026](docs/project-review-2026-10-03.md).

## Uruchomienie

```sh
npm install
```

Skopiuj `.env.example` do `.env`. `GEMINI_API_KEY` jest potrzebny do generacji tekstu. Do katalogu ujęć wystarczy jeden z kluczy: `PIXABAY_API_KEY` lub `PEXELS_API_KEY`. Klucze są używane wyłącznie przez serwer.

```sh
npm run dev
```

Domyślny adres: `http://127.0.0.1:3000`. Jeden proces obsługuje API i frontend Vite. `HOST` i `PORT` można ustawić w `.env`.

```sh
npm run build
npm start
```

Produkcja korzysta z `dist/`; przełącznikiem jest `--prod` w skrypcie startowym.

### Skrót na pulpicie Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-desktop-shortcut.ps1
```

Skrót **Stark Focus** uruchamia aktualny kod projektu w tle, czeka na gotowość serwera i otwiera domyślną przeglądarkę pod `http://localhost:3000`. Kolejne uruchomienie korzysta z działającego serwera. Nie trzeba otwierać terminala. Logi uruchomienia są w `logs/`; błąd startu pokazuje komunikat. Serwer działa do zakończenia procesu lub wyłączenia komputera.

Skrót używa adresu dotychczasowego launchera Windows. Dane przeglądarki dla `localhost` i `127.0.0.1` są osobne — materiały zapisane pod drugim adresem pozostają dostępne właśnie tam. Launcher zawsze wiąże serwer do `127.0.0.1:3000`, niezależnie od `HOST` i `PORT` w `.env`.

### Aktualizacje na GitHubie

Repozytorium: [kkomerco/stark_focus](https://github.com/kkomerco/stark_focus). Przed wysłaniem zmian uruchamiamy kontrole z sekcji „Weryfikacja”, zapisujemy commit i wykonujemy zwykły push. GitHub Actions ponawia kontrole po pushu i dla pull requestów. `package-lock.json` jest wersjonowany, aby `npm ci` instalowało ustalone wersje zależności. `.env`, logi i pliki sejfu pozostają lokalne. Dane konta i szkice przeglądarki nie są częścią repozytorium.

## Zakres aplikacji

- Kadr: cytat, protokół, koszt, kolaż i wymówka kontra fakt; edycja tekstu, kroju i położenia; PNG/JPG i pakiety materiałów.
- Rolka: osobna grafika lub klip do każdego zdania, przycinanie i opcjonalna pętla ujęcia, animacja tekstu oraz eksport bez dźwięku przez WebCodecs z zapasowym MediaRecorder. Muzykę dodaje właściciel na platformie społecznościowej.
- Szkice: automatyczny lokalny zapis studiów posta, rolki i karuzeli oraz tematów i wyników radaru. Powrót do tego samego materiału przywraca ostatnią edycję.
- Karuzela: ręczne studio 4:5 dostępne z radaru, edytowalny opis, ostrzeżenie po zmianie slajdów, minimum 48 px dla treści oraz wskazówka przy przepełnieniu. ZIP przygotowuje się przed pobraniem; zmiana materiału unieważnia link do poprzedniej wersji.
- Radar: propozycje tematów, różne spojrzenia, kontrast i rozwijanie własnego tekstu. Nie mierzy bieżących trendów ani zasięgu. Zmiana zakładki nie wywołuje AI.
- Narzędzia: pomysły, paczka dnia na własny temat (jedna rolka, karuzela i post), serie postów, analiza materiału, A/B, cytaty z transkryptu i ręczne archiwum promptów. Autopilot, masowe rolki oraz matryca „sprawdzonych wirali” zostały usunięte z interfejsu. [Decyzje i sprawdzenie formatów](docs/format-review-2026-10-03.md).
- Sejf: ręczny wybór ujęć z katalogów, przechowywanie plików na dysku w `sejf/`.
- Oprawa marki: wspólny panel opisu i planu scen w studiu posta i rolki. Stylizowany bohater ROOK, karta referencyjna i pionowy kadr do wypróbowania. Plan przypisuje działania do aktualnych zdań i pozwala pobrać prompty. Nie generuje obrazów ani animacji w aplikacji. [Kierunek wizualny i instrukcja](docs/brand/identity.md).
- Wzorce: właściciel wskazuje przykłady dla generatorów. Historia publikacji pochodzi z kliknięcia „Poszło na konto” i testów A/B; nie ma osobnej zakładki publikacji ani automatycznego publikowania.

Generator rolek i paczka dnia nie zastępują materiału bankiem tekstów. Radar, generator A/B i analiza materiału odrzucają starsze odpowiedzi zapasowe, zachowując poprzedni wynik. Starsze endpointy pozostają dla zgodności, ale ich obecność nie oznacza dostępności usuniętych narzędzi w interfejsie. Brak klucza nie oznacza pełnej funkcjonalności offline.

## Architektura

| Obszar                                         | Źródło                                                          |
| ---------------------------------------------- | --------------------------------------------------------------- |
| Serwer API i frontend                          | `server.ts`                                                     |
| Klient Gemini, modele, limity czasu i fallback | `src/lib/ai/gemini.server.ts`                                   |
| Trasy treści i rejestracja                     | `src/lib/ai/routes/`, `src/lib/ai/router.server.ts`             |
| Rzemiosło hooka i wspólny prompt               | `src/lib/hookCraft.ts`                                          |
| Formaty kadru                                  | `src/lib/formats.ts`                                            |
| Wzorce i dziennik publikacji                   | `src/lib/published.ts`                                          |
| Historia użytej treści                         | `src/lib/usedContent.ts`, `src/lib/similarity.ts`               |
| CTA, hashtagi i opisy                          | `src/lib/caption.ts`                                            |
| Render posta                                   | `src/utils/canvasRenderer.ts`                                   |
| Układ i eksport rolki                          | `src/components/video/reelLayout.ts`, `src/utils/reelExport.ts` |
| Pobieranie obcych plików                       | `src/lib/fetch-image.server.ts`                                 |
| Dane i kopie JSON                              | `src/utils/storage.ts`                                          |

Stack: React, TypeScript, Vite, Tailwind, Node/Express, Google GenAI SDK, Canvas, WebCodecs i JSZip. Konkretne modele są definiowane wyłącznie w `gemini.server.ts`.

Dane konta mieszkają w localStorage tej przeglądarki. Szkice studiów i wgrane pliki są w IndexedDB, poza limitem localStorage. Status w studio pokazuje powodzenie lub błąd zapisu. Czyszczenie danych strony usuwa szkice. Pliki sejfu mieszkają na dysku; eksport danych konta i paczka JSON scen nie są kopią plików ani szkiców. Paczkę scen można ponownie wczytać w panelu oprawy marki. API nie ma kont ani uwierzytelnienia — ustawienie `HOST=0.0.0.0` udostępnia je w sieci lokalnej.

## Weryfikacja

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Testy regresji generatora rolek używają stubu SDK i nie zużywają limitu modelu. `npm run smoke` uruchamia integracyjne sprawdzenie starszych endpointów; przy skonfigurowanym kluczu może wywołać zewnętrzne API.

Konwencje architektury, marki i gita: [AGENTS.md](AGENTS.md). Formatowanie Prettier, końcówki linii LF; bez przepisywania opublikowanej historii.
