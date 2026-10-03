# Ocena projektu — 3 października 2026

## Decyzja

Rozwijać obecną aplikację jako lokalne studio dla @stark_focus. Priorytet wskazany przez właściciela: lepsza jakość treści. React, TypeScript, lokalny serwer Node i Canvas są adekwatne do tego celu. W przeglądzie nie znalazłem powodu, który uzasadniałby koszt budowy od początku lub migrację frameworka.

Największą wartością projektu są reguły marki: wspólne rzemiosło hooka, dobór CTA, formaty kadru, strefy bezpieczne, korekta człowieka i ten sam renderer w podglądzie oraz eksporcie. Zmiana stosu nie rozwiązuje problemów z argumentacją i powtarzalnością materiału.

## Porównanie z dostępnymi narzędziami

To porównanie zakresu funkcji na podstawie stron producentów, nie test jakości wygenerowanych tekstów ani pełny ranking rynku.

| Rozwiązanie                                               | Mocna strona                                                      | Wniosek dla projektu                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [Canva Brand Kit](https://www.canva.com/pro/brand-kit/)   | Przechowywanie i stosowanie kolorów, fontów oraz materiałów marki | Dobre do szerokiej pracy graficznej. Własne studio ma już wyspecjalizowane reguły składu i eksportu.                            |
| [CapCut](https://www.capcut.com/tools/ai-video-generator) | Generowanie i edycja wideo                                        | Warto użyć przy formacie wymagającym prawdziwych generowanych scen. Obecne rolki typograficzne korzystają z własnego renderera. |
| [Buffer](https://buffer.com/pricing)                      | Planowanie publikacji, analityka, asystent AI i API               | Sensowny kandydat do przyszłej integracji publikacji. Nie ma potrzeby odtwarzać całego schedulera w studio.                     |

Ocena: wyspecjalizowane studio jest uzasadnione przy jednej marce z precyzyjną estetyką. Gdyby celem stała się standardowa produkcja materiałów dla wielu klientów, najpierw należałoby sprawdzić gotowe narzędzia, a dopiero potem budować platformę z kontami, współpracą i hostingiem.

## Co działa dobrze

- API i klucze są po stronie serwera; pobieranie zewnętrznych plików ma wspólne zabezpieczenia.
- Generatory współdzielą reguły hooków i odciski użytej treści. Wybrane przez właściciela wzorce mają własny zapis.
- Treść kadru ma wspólne źródło, a eksport rolek działa klatka po klatce.
- Moduły studia ładowane są na żądanie. Build nie zgłosił przekroczenia progu wielkości chunków.
- Kontrola przed publikacją doradza, a decyzja o eksporcie pozostaje po stronie właściciela.

## Wprowadzone poprawki

Pierwszy etap obejmuje generator rolek `/api/ghostwrite` i jego obsługę w studio.

1. Usunięte sprzeczne instrukcje: prompt pokazywał abstrakt jako dobry przykład, mimo że filtr go odrzucał, wymuszał pompatyczną narrację i sztywny trzypunktowy opis. Teraz model ma rozwijać jedną sytuację i zakończyć ją konkretną konsekwencją lub działaniem.
2. Podłączone wzorce z `exemplarHooksFor(data)`. Opis wzorców nie twierdzi już, że ręcznie wybrane zdanie ma udowodnione najlepsze wyniki.
3. Otwarcie przechodzi przez `publishableLine`, dalsze kroki przez `auditLine`. Krótki krok w sekwencji nie jest mierzony jak samodzielny hook. Liczba fraz jest ścisła; wadliwa sekwencja nie jest skracana, aby pozornie pasowała.
4. Kontrola powtórek obejmuje identyczne frazy w rolce, historię konta, bliskie parafrazy według istniejącej miary i zużyte otwarcia. To heurystyka leksykalna, nie dowód semantycznej oryginalności.
5. Opis kopiujący dowolny wiersz kadru jest pomijany. Post i rolka korzystają ze wspólnej funkcji `repeatsFrame`. Frontend nie formatuje ponownie opisu, który serwer już zakończył markowym CTA.
6. Klient nie przerywa generacji po 25 sekundach, gdy serwer nadal próbuje uzyskać odpowiedź. Limity czasu pozostają w wspólnym module Gemini.
7. Brak odpowiedzi lub odrzucony materiał nie podmienia rolki na bank tekstów. Studio zachowuje materiał i wyświetla komunikat. Dotyczy to tej ścieżki generowania; pozostałe generatory nadal wymagają osobnego przeglądu fallbacków.

Redakcja mieści się w tym samym poleceniu do modelu. Nie dodano dodatkowego wywołania krytyka. Generator rolek zaczyna od głównego modelu skonfigurowanego w `gemini.server.ts`, a dopiero potem korzysta z zapasowych; wcześniej zaczynał od Lite. To wybór zgodny z priorytetem jakości, ale na płatnym koncie koszt odpowiedzi może wzrosnąć. Istniejący fallback dostawcy może nadal wykonać kilka prób.

## Kolejne kroki według priorytetu

1. **Mierzyć jakość na stałym zestawie briefów.** Przygotować przykłady dobrych i odrzuconych materiałów właściciela. Ocenić anonimowo stare i nowe wyniki: zrozumiałość bez kontekstu, jedna argumentacja, konkret, naturalny angielski, świeżość i rozwinięcie w opisie. Porównać odsetek materiałów zaakceptowanych bez przepisywania, czas generacji oraz liczbę prób. Dopiero ten pomiar uzasadni zmianę modelu lub dodatkową płatną redakcję.
2. **Ujednolicić pozostałe generatory.** Sprawdzić stare banki, sprzeczne instrukcje i rozbieżne normalizacje w paczce dnia, radarze oraz A/B. Sam prompt ani sam regex nie dowodzą logicznej spójności tekstu.
3. **Poprawić niezawodność zapisu.** `loadStoredData()` obejmuje odczyt i migracyjny zapis jednym `try`; błąd zapisu może sprawić, że poprawne dane zostaną potraktowane jak uszkodzone. `saveStoredData()` sygnalizuje problemy tylko w konsoli. Potrzebny osobny etap odczytu, widoczny status zapisu i testy limitu pamięci. W większym projekcie rozważyć IndexedDB lub SQLite, zachowując migrację oraz eksport danych.
4. **Dopiero później integrować publikację.** Obecna aplikacja ma produkować dobre materiały. Konta, harmonogram i wieloużytkownikowy backend wymagają osobnego uzasadnienia.

Nie ma podstaw do określenia „najlepszego modelu” bez porównania na treściach tej marki. Aktualne [limity Gemini](https://ai.google.dev/gemini-api/docs/rate-limits) zależą od projektu, modelu i poziomu konta; 429 może oznaczać limit minutowy, tokenów, dzienny albo wydatków. Nie należy traktować każdego 429 jako dowodu wyczerpania dziennego limitu ani zakładać, że cztery modele gwarantują czterokrotną pojemność.

## Weryfikacja i ograniczenia

Przed zmianami: 328 testów przeszło, typecheck przeszedł. Dodano testy regresji walidacji rolek, opisów i endpointu, ze stubem SDK — bez wysyłania materiałów do dostawcy i bez zużywania limitu AI.

Po zmianach: 336 testów przeszło. Typecheck, lint i build produkcyjny przeszły. W przeglądarce sprawdzono też błąd generacji przy wyłączonym kluczu: komunikat pozostaje widoczny, przycisk wraca do stanu gotowości, a tekst w studio nie zostaje podmieniony. Nie wykonano generacji na rzeczywistym kluczu ani testu porównawczego modeli.

Testy automatyczne potwierdzają reguły techniczne. Nie potwierdzają wzrostu zasięgów ani przewagi redakcyjnej nowych wyników; do tego potrzebne są oceny właściciela i późniejsze dane publikacji.
