# Plan podziału monolitów frontendowych

> Data: 2026-09-21. Rozmiary i numery linii z chwili powstania — po każdym etapie mogą się przesunąć.

## STATUS WYKONANIA (aktualizowany)

| Etap | Status | Efekt |
| --- | --- | --- |
| 1. `canvasRenderer.ts` (57 KB) | ✅ DONE | `src/utils/canvas/` (10 modułów) + fasada `canvasRenderer.ts` zachowująca stare API |
| 2. `AiRadarTab.tsx` (60 KB) | ✅ DONE | `tabs/radar/` (5 paneli + shared) — rodzic 18,6 KB |
| 3. `VideoStudioModal.tsx` (84 KB) | 🔶 W TOKU | Zrobione: `video/reel-render/` (background/typography/overlays), `video/useAiReelGeneration.ts`, `video/useReelExports.ts` → rodzic 59,5 KB. Zostało: `video/useCustomBackground.ts` (upload/tło) i podział JSX (`studioBody`) na podkomponenty |
| 4. `InspirationStudio1to1.tsx` (69 KB) | ⬜ TODO | najpierw inwentaryzacja sekcji (brak znaczników `// SECTION:`) |

### Martwy kod do decyzji (odkryte w etapie 3)

Poniższe moduły w `src/components/video/` **nie mają żadnego importera** (zweryfikowane grepem po `src/`):

`useVideoExporter.ts`, `ReelStagePreview.tsx`, `useReelDirector.ts`, `useTTS.ts`,
`useVariantGenerator.ts`, `VariantPickerModal.tsx`, `ReelExportOverlays.tsx`, `CodexRulesModal.tsx`

(~35 KB). To prawdopodobnie planowana „nowa architektura" studia rolek, której modal nigdy nie
podłączył (ma własną implementację inline — część właśnie wyciągnięto do `useReelExports`/`reel-render`).
Do decyzji właściciela: **podłączyć** (np. `ReelStagePreview` zamiast inline canvasu) albo **usunąć**
(`git rm`) i odtworzyć z historii, gdy będą potrzebne.


Do podziału: `VideoStudioModal.tsx` (~84 KB), `InspirationStudio1to1.tsx` (~69 KB),
`AiRadarTab.tsx` (~60 KB), `canvasRenderer.ts` (~57 KB). Wzorzec, który już dobrze
działa w tym repo: `src/components/video/` i `src/components/carousel/`.

## Zasady wspólne (każdy krok)

1. Jeden krok = jeden commit **czysto przenoszący kod** (pure move, zero zmian zachowania).
2. Po każdym kroku zielone: `npm run typecheck && npm run lint && npm test && npm run build`.
3. Chunki: komponenty modal/tab są już lazy (`React.lazy`) — nowe moduły nie mogą
   wpaść do krytycznego `index-*.js`.
4. Zacznij od **liści** (czyste funkcje, stałe), kończ na komponentach-szkieletach.

## 1. `src/utils/canvasRenderer.ts` — najłatwiejszy, granice już istnieją

Wszystkie elementy to funkcje top-level. Docelowo katalog `src/utils/canvas/`
(numery linii wg stanu wyjściowego):

| Nowy moduł | Przenosimy | Linie |
| --- | --- | --- |
| `tokens.ts` | `stripHighlightSyntax`, `parseLineTokens`, `wrapTextLines` | 47–144 |
| `wall.ts` | `drawImageCover`, `drawProceduralWall`, `getFontFamilySpec` | 145–453 |
| `slides/three-d-wall-quote.ts` | `draw3DWallQuoteSlide` | 454–744 |
| `slides/grid-collage.ts` | `draw4GridCollageSlide` | 745–834 |
| `slides/black-quote.ts` | `drawMinimalBlackQuoteSlide` | 835–950 |
| `slides/monolith-ledger.ts` | `drawMonolithLedgerSlide` | 951–1079 |
| `slides/universal.ts` | `renderUniversalLayout` | 1080–1139 |
| `carousel.ts` | `drawPill`, `drawCornerCrosshair`, `getCarouselFontFamilyCSS`, `computeFittedSlideLayout` | 1140–1315 |
| `slide-entry.ts` | `drawSlideToCanvas` | 1316–1802 |
| `export.ts` | `exportSlideToBlob`, `exportAllSlidesAsZip` | 1803–koniec |
| `index.ts` | re-eksporty **starych nazw** — istniejące importy (`renderUniversalLayout`, `drawMinimalBlackQuoteSlide`, …) działają bez zmian u konsumentów | — |

Uwaga: najpierw wypisać stałe i współdzielony stan modułowy do `theme.ts`/`shared.ts`,
bo moduły canvasu mają domknięcia po stałych z głowy pliku.

## 2. `src/components/tabs/AiRadarTab.tsx` — 5 podmodułów już nazwanych komentarzami

Komponent renderuje podmoduły wg `activeSubModule`, a bloki stanu są oznaczone
`// 1..5`. Docelowo `src/components/tabs/radar/`:

| Nowy moduł | Zakres (stan od linii) |
| --- | --- |
| `RadarTrends.tsx` | sekcja „1. Radar Trendów & Formatów Wirali" (stan L87–97) |
| `AngleMatrix.tsx` | „2. Matryca Kątów Psychologicznych" (L96–102) |
| `ParadoxGenerator.tsx` | „3. Generator Sprzeczności i Paradoksów" (L103–107) |
| `EvergreenRecycler.tsx` | „4. Evergreen Recycler (Klonowanie i Remiks)" (L108–114) |
| `BatchRadar.tsx` | „5. Generator Masowy (Batch Generation w Radarze)" (L115+) |
| `shared.ts` | typ `SubModule`, wspólne helpery fetch/formatowania |

Kolejność: zacznij od sekcji 4 (Evergreen) — wydziel z propsami `(data, onUpdateData)`,
podpinając jako dziecko; potem pozostałe, na końcu `shared.ts`.

## 3. `src/components/VideoStudioModal.tsx` — najtrudniejszy, jeden wielki FC

Render pipeline canvasu ma już opisane sekcje (komentarze 1–7 przy L568–876).
Docelowo rozbudowujemy istniejący `src/components/video/`:

| Nowy moduł | Zakres |
| --- | --- |
| `video/reel-render/background.ts` | sekcje 1–2 renderu: tło (upload/temat + slow zoom), vignette — czyste funkcje `(ctx, state) => void` |
| `video/reel-render/typography.ts` | sekcje 3–6: kinetic phrase calculation, typografia, handle, loop bar |
| `video/useReelPlayback.ts` | stan `isPlaying` / `currentTime` / `showTikTokGuides` + pętla rAF |
| `video/useAiGeneration.ts` | stan `isGeneratingAi`, `seenTitlesRef`, wywołania `/api/ai/generate-multi-variant-reels` |
| `video/ReelToolbar.tsx`, `video/ReelPhaseList.tsx` | fragmenty JSX z szkieletu |

Kolejność: funkcje rysowania (zero Reacta, najniższe ryzyko) → hooki → JSX.
Szkielet zostaje w `VideoStudioModal.tsx` (główny `useEffect`-loop montujący).

## 4. `src/components/InspirationStudio1to1.tsx` — najmniej przejrzysty

Brak komentarzy-sekcji, więc **najpierw inwentaryzacja**:
1. Przejdź plik i dodaj tymczasowe znaczniki sekcji (`// SECTION:`) przy blokach `useState` i handlerach.
2. Typy `StoicSaying`, `BatchPostItem` → `src/components/studio1to1/types.ts` (albo `src/types.ts`).
3. Banki cytowań/stałe → `src/data/`.
4. Podwidoki (edytor slajdu, lista batch, modal eksportu) → `src/components/studio1to1/`.

## Metryki sukcesu

- Żaden plik `.ts(x)` nie przekracza ~25 KB (kontrola: `git ls-files | …` albo prosty skrypt).
- Po każdym etapie `canvasRenderer` ręczny test renderu: rolka + karuzela + post 1:1 (render canvasem nie ma testów jednostkowych — to najszybsza regresja).
- `vite build` wypisuje rozmiary chunków: chunk `VideoStudioModal` nie może rosnąć w wyniku refaktoru.
