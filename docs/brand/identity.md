# STARK FOCUS — kierunek wizualny i ROOK

## Rozpoznawalność

Dotychczasowy sygnet — cztery narożne klamry, karmazyn tylko w lewym górnym rogu — pozostaje znakiem materiału. Paleta: obsydian, ciepła kość słoniowa, jeden karmazynowy akcent. Duży, czytelny tekst i dużo wolnego miejsca; bez numerów edycji, emoji, neonów i posągów. Istniejące kroje i pięć formatów kadru pozostają podstawą feedu.

Materiały z bohaterem rozwijają ten język w stronę wyraźnie stylizowanej animacji: geometryczne płaszczyzny, matowe powierzchnie, dwutonowy światłocień. Stałość postaci, palety i pracy kamery ma łączyć kolejne materiały. Nie wymaga identycznego kadru w każdej publikacji.

## Bohater: roboczo ROOK

Dorosły człowiek o kanciastej twarzy, szerokiej szczęce, krótkich czarnych włosach z geometrycznym wycięciem i wyrazistych dłoniach. Asymetryczna grafitowa kurtka, koszulka w kolorze kości słoniowej, luźne grafitowe spodnie, jasne buty. **Jeden karmazynowy mankiet na lewej ręce.** Odkryta twarz; żadnej maski ani stroju superbohatera.

ROOK czuje zmęczenie i opór. Motywacja wynika z decyzji i jej skutku: odłożenie telefonu umożliwia pierwszy zapis w zeszycie. Bohater nie jest ozdobą w rogu ani zastępstwem dowolnego tła. Jedna scena = jedno czytelne działanie; rzeczy i dłonie mają rzeczywisty kontakt.

Karta referencyjna: `public/brand/rook-reference-v1.png`. To koncepcja wyglądu, nie wygenerowany film. Została przygotowana wbudowanym narzędziem ImageGen w Codex; aplikacja nie dostała płatnego API obrazowego.

Pionowy przykład: `public/brand/rook-desk-v1.png` — ROOK odkłada telefon przy otwartym zeszycie. W studio rolki można go wybrać przyciskiem **Wypróbuj kadr: telefon i zeszyt · bez AI**. Nie jest podstawiany automatycznie pod inne tematy. To statyczna grafika. Finalne prompty obu grafik zapisano w `rook-reference-prompt.txt` i `rook-desk-prompt.txt` w tym katalogu.

## Praca w aplikacji

1. Otwórz studio posta lub rolki i wpisz finalne angielskie zdania.
2. Rozwiń **Oprawa marki · opis i plan scen**. Wybierz **Bohater ROOK** albo **Ujęcia filmowe**.
3. Kliknij **Dopasuj opis i sceny · 1 generacja AI**. Jest to jedna generacja logiczna przez istniejącą obsługę Gemini; przy błędach infrastruktury obowiązuje jej dotychczasowy łańcuch prób zapasowych. Bez nowych płatnych usług. Używa limitu skonfigurowanego konta Gemini.
4. Opcja **Zachowaj mój opis** chroni własną wersję. Edycja opisu podczas oczekiwania również zapobiega jego automatycznej zamianie.
5. Sceny są przypisane do aktualnych zdań, w ich kolejności; muszą pokryć wszystkie. Opis dodaje kontekst. Zmiana tekstu, czasu lub oprawy oznacza plan jako poprzednią wersję i wyłącza jego zastosowanie/eksport. Żadne zapytanie AI nie odbywa się podczas pisania.
6. Pobierz kartę postaci i prompty scen. Do generatora obrazów dołącz kartę jako referencję wyglądu. Do generatora ruchu dołącz **gotowy pojedynczy kadr**, a nie całą planszę referencyjną. Sprawdź twarz, lewy mankiet, dłonie i kontakt z przedmiotami przed montażem.
7. W rolce rozwiń montaż ujęć. Do każdego zdania wgraj osobną grafikę lub klip albo przypisz wspólne tło z sejfu. Ustaw początek i koniec fragmentu. Krótszy fragment zatrzymuje ostatnią klatkę; pętla jest opcjonalna. Cięcia następują na granicach faz tekstu. Zmiana zdania wymaga ponownego potwierdzenia przypisania obrazu.
8. Przy ROOKU porównaj plik z referencją i zaznacz cztery pozycje kontroli. To ręczna kontrola tożsamości, lewego mankietu, kontaktu dłoni z przedmiotami i palety. Aplikacja nie analizuje obrazu modelem. Wymiana pliku zeruje zaznaczenia. Kontrola nie blokuje eksportu.
9. Oba studia zapisują szkic automatycznie w IndexedDB tej przeglądarki: treść, opis, plan i lokalne pliki. Status pokazuje wynik zapisu. Plan pozostaje oznaczony jako poprzednia wersja po zmianie briefu, także po ponownym otwarciu. Zmiana tekstu sama nie wywołuje AI ani nie zastępuje własnego opisu.
10. Pobierz paczkę JSON z briefem, opisem, scenami i promptami. Możesz ją ponownie wczytać w panelu oprawy marki; opis stosujesz osobnym przyciskiem, a tekst materiału pozostaje Twój. Paczka nie zawiera plików ujęć. Eksport MP4 składa przypisane obrazy i klipy z tekstem; plik jest bez dźwięku.

## Granice obecnej wersji

Panel tworzy opis i plan; **nie generuje klatek ani animacji AI**. Studio składa wiele wgranych ujęć w jeden film, z tym samym przycięciem i wyborem ujęcia w podglądzie oraz eksporcie. Hashtagi rolki aktualizują się lokalnie po zmianie tekstu; opis wymaga redakcji albo jawnego dopasowania AI. Szkice zależą od przeglądarki i jej wolnego miejsca; nie są kopią na dysku ani częścią eksportu danych konta. Plik z sejfu musi nadal istnieć na dysku.

Lokalny komputer ma RTX 2060 z 6 GB VRAM. Nie został zainstalowany ComfyUI ani pobrane modele. Nie obiecujemy wysokiej jakości lokalnego wideo na tej konfiguracji. Kolejne rozszerzenie to generator pojedynczych kadrów z kontrolą tożsamości, potem krótkie ujęcia i montaż scen. Dłuższy YouTube wymaga osobnego scenariusza, narracji i osi montażu; nie wystarczy wydłużyć rolki.

Wspólne źródła: `src/lib/brandIdentity.ts` (wygląd), `src/lib/materialPlan.ts` (pakiet i prompty), `src/lib/ai/routes/material-plan.server.ts` (generacja i kontrola), `src/components/MaterialDirectorPanel.tsx` (oba studia). Reguły opisu i audytu pozostają w istniejących modułach marki.

## Weryfikacja

Testy obejmują przypisania wszystkich zdań, wykrywanie poprzedniej wersji, odrzucanie opisu powtarzającego tekst, sumowanie czasu scen, zapis/odczyt paczki i odpowiedzi endpointu ze stubem SDK. Montaż sprawdzono na granicach faz tekstu, dla przycięcia, pętli i zatrzymania klatki oraz zmiany zdania. W przeglądarce odtworzono szkic z wgraną grafiką, ujęciem z sejfu, przycięciem i kontrolą ROOKA po odświeżeniu. Pobrany MP4 ma 7,00 s, 210 klatek, 30 fps, 1080×1920 i jedną ścieżkę wideo bez audio. Nie uruchamiano generacji na rzeczywistym kluczu ani generatora wideo; jakość rozpisek od modelu wymaga oceny na docelowych materiałach.

Końcowa kontrola: 351 testów, typecheck, lint i build przeszły. W przeglądarce sprawdzono także import planu z JSON, zachowanie planu po przejściu między studiami, ostrzeżenie po zmianie zdania i osobny szkic posta z własnym opisem oraz oprawą. Podgląd montażu: `montage-preview.jpg`.
