# Przegląd formatów i narzędzi — 3 października 2026

Celem jest jakość materiału dla jednego konta, spójność marki i mniej dublujących się opcji. Przegląd dotyczy kodu oraz lokalnego interfejsu, bez zapytań do płatnych API i bez publikowania na koncie.

## Decyzje

| Format lub opcja                                | Decyzja i powód                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cytat                                           | Zachowany: samodzielna teza na jednym kadrze.                                                                                                                                              |
| Protokół                                        | Zachowany: konkretne czynności w kolejności.                                                                                                                                               |
| Koszt                                           | Zachowany: powiązane pary ceny i utraty.                                                                                                                                                   |
| Kolaż                                           | Zachowany: treść oparta na kilku obrazach.                                                                                                                                                 |
| Wymówka kontra fakt                             | Zachowany: kontrast dwóch powiązanych wypowiedzi.                                                                                                                                          |
| Karuzela                                        | Zachowana i poprawiona: większe pismo, własny opis, szkic, ostrzeżenie o przepełnieniu, otwieranie bez wcześniejszej generacji.                                                            |
| Seria postów                                    | Zachowana: niesie pełne struktury kadrów do edycji i eksportu.                                                                                                                             |
| Paczka dnia                                     | Własny temat, jedna rolka zamiast trzech domyślnych; kontrola kolejności fraz i slajdów oraz opisu. Bez zastępczej paczki z banku.                                                         |
| Radar                                           | Cztery funkcje uruchamiane przyciskiem. Uczciwe propozycje od modelu zamiast twierdzeń o popularności.                                                                                     |
| Autopilot                                       | Usunięty z interfejsu: dublował paczki i serie, a produkował głównie tekstowe archiwa oraz arbitralne godziny publikacji.                                                                  |
| Masowe rolki                                    | Usunięte z radaru: powielały produkcję serii i gubiły strukturę treści.                                                                                                                    |
| Matryca sprawdzonych wirali                     | Usunięta: obietnice retencji nie wynikały z pomiarów konta.                                                                                                                                |
| Generowanie nowego promptu na podstawie starego | Usunięte z biblioteki: plan oprawy powstaje teraz przy konkretnym materiale w studiu. Ręczne archiwum i stare wpisy pozostają.                                                             |
| Analiza linku / kadru                           | Zachowana. Nieudane generowanie zachowuje poprzednią analizę; zastępcze warianty z banku nie trafiają do wyniku.                                                                           |
| Test A/B                                        | Zachowany dla rzeczywistych wyników. Wadliwa lub zastępcza para nie kasuje istniejących wariantów i metryk. Warunek czasu opisany jako ograniczenie różnicy, bez gwarancji przyczynowości. |
| Cytaty z transkryptu                            | Zachowane z kontrolą dosłowności i podpisem. Błąd nie usuwa poprzednich cytatów.                                                                                                           |
| QR przy radarze                                 | Usunięte niewykorzystywane połączenie w aplikacji.                                                                                                                                         |

## Zmiany w przepływie pracy

- Radar nie skleja trzech alternatywnych hooków w jedną rolkę. Do studia przekazuje wybrany hook i jego rozwinięcie, razem z opisem.
- „Rozwiń własną myśl” przyjmuje tekst. Nie udaje analizy zawartości linku, którego ta trasa nie pobiera; do linków służy osobne narzędzie.
- Tematy, spojrzenia, kontrasty i rozwinięcie tekstu zapisują się w IndexedDB. Zmiana zakładki i odświeżenie nie kasują pracy.
- Karuzela zapisuje slajdy, krój, motyw i opis. Zmiana tekstu przypomina o sprawdzeniu podpisu; hashtagi wynikają z aktualnych slajdów.
- Motywy karuzeli ograniczono do obsydianu i karmazynu; nagłówek do marki lub pustej góry.
- Podgląd, PNG i ZIP korzystają z tego samego renderera. Zbyt długi tekst pozostaje w materiale, a studio zgłasza przepełnienie zamiast zmniejszać go poniżej 48 px.
- Gotowy ZIP ma stały link „Pobierz ZIP”. Po zmianie treści, opisu lub stylu trzeba przygotować nową wersję. Ponowne przygotowanie identycznego materiału tego samego dnia nie dopisuje duplikatu do historii postów.

## Sprawdzenie i ograniczenia

360 testów przechodzi, w tym testy odrzucania wadliwych sekwencji paczki, przekazywania materiału z radaru, dopasowania opisu oraz kolejności plików i tekstu podpisu w ZIP-ie. Test ZIP-a używa atrapy płótna; rzeczywisty wygląd został sprawdzony osobno w przeglądarce.

W lokalnym interfejsie bez kluczy API potwierdzono cztery zakładki radaru, zachowanie tematu po przejściu do studia, przywrócenie trzech slajdów i własnego opisu po zamknięciu oraz odświeżeniu strony, ostrzeżenie o starym opisie i powstanie linku do gotowego ZIP-a. Testy odpowiedzi modelu używają stubu SDK; nie oceniają jakości konkretnej nowej generacji na żywym modelu.

Automatyzacja przeglądarki Codex nie zgłosiła pobrania ZIP/PNG ani przez zdarzenie pobierania, ani przez `downloadMedia`, więc zapisu tych plików z interfejsu na dysk nie potwierdzono. Budowa archiwum i jego zawartość mają osobny test; sam link do przygotowanego ZIP-a jest widoczny w UI. Podgląd: [karuzela](brand/carousel-preview.jpg).

Szkice pozostają lokalne dla przeglądarki i adresu aplikacji. Nie stanowią części eksportu danych konta. Starsze trasy API i dane użytkownika zachowano dla zgodności; usunięcie opcji z interfejsu nie kasuje historii ani archiwum promptów.
