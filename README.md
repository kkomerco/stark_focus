# Visionary Media Lab – AI Post Pro

Zaawansowana platforma kreatywna do generowania treści social media (posty, karuzele, wideo w formacie 9:16 oraz grafiki 1:1) napędzana przez Google Gemini AI.

## 🚀 Stack technologiczny

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI
- **Backend:** Node.js / Bun, Express (`server.ts`)
- **Silnik AI:** Google Gemini API
- **Narzędzia:** Lucide Icons, Canvas API / HTML-to-Image

## 📁 Kluczowe moduły

- `src/components/modals/VideoStudioModal.tsx` – Generator i edytor krótkich form wideo (9:16 / Reels / TikTok)
- `src/components/modals/CarouselStudioModal.tsx` – Generator karuzel na platformy społecznościowe
- `src/components/InspirationStudio1to1.tsx` – Generator grafik w formacie kwadratowym (1:1)
- `src/components/tabs/AuditTab.tsx` – Panel audytu i analityki treści
- `server.ts` – Backend Express: obsługa proxy mediów (`/api/proxy-image`) oraz komunikacja z AI

## 🛠️ Uruchomienie lokalne

1. **Instalacja zależności:**
   ```bash
   bun install
   # lub: npm install