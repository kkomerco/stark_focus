# AI Post Pro

Użytkownik przesłał swój projekt "Stark Focus OS" (Folder.zip – aplikacja React + Vite + Express do generowania postów, karuzel i wideo 9:16 z AI Gemini). Rozpakuj załącznik i odtwórz ten projekt jako działającą aplikację, a następnie wdroż w nim następujące optymalizacje: (1) Code splitting w src/App.tsx – zamień synchroniczne importy ciężkich komponentów (VideoStudioModal, CarouselStudioModal, QRModal, wszystkie zakładki z components/tabs oraz InspirationStudio1to1) na React.lazy z Suspense i fallbackiem ładowania; (2) zabezpieczenie endpointu /api/proxy-image w server.ts przed SSRF – dodaj funkcję isSafeUrl walidującą protokół http/https i blokującą localhost, 127.0.0.1, 0.0.0.0, ::1, 169.254.169.254 oraz sieci prywatne RFC 1918; (3) dodaj w server.ts prosty cache w pamięci RAM (Map z TTL i limitem ok. 200 wpisów) dla powtarzających się zapytań AI; (4) napraw błąd typowania w src/components/tabs/AuditTab.tsx w linii z uniqueDates – Array.from(new Set(stats.map((s) => s.date as string))).

Poinformuj użytkownika po zakończeniu, z jarym podsumowaniem wprowadzonych zmian.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d672dd22-1d06-4816-84ab-6afec04676db).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
