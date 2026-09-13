import React, { useState } from 'react';
import { X, Check, Copy, Palette, ShieldCheck, Sparkles, Sliders, Layout, Eye, Download } from 'lucide-react';
import { StarkLogo } from './StarkLogo';

interface BrandStyleModalProps {
  onClose: () => void;
  onApplyToCreator?: (styleName: string) => void;
}

export const BrandStyleModal: React.FC<BrandStyleModalProps> = ({ onClose, onApplyToCreator }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activePreviewSlide, setActivePreviewSlide] = useState<number>(1);

  const brandRules = [
    {
      title: '1. Mroczny Monochromatyzm (Obsidian & Platinum)',
      description:
        'Żadnych pstrokatej tęczy i krzykliwych neonów. Podstawą jest głęboka czerń (#09090B), tytanowy grafit (#141824) oraz czysta, zimna platyna (#F4F4F5) w tekście. Pojedynczy akcent: chłodna stal (#38BDF8) lub patynowane złoto (#F59E0B).'
    },
    {
      title: '2. Chiaroscuro & Posągi Stoików',
      description:
        'Każda grafika wykorzystuje rzeźby z czarnego/białego marmuru (Marek Aureliusz, Seneka) z dramatycznym, jednokierunkowym oświetleniem i głębokim cieniem. Tło jest zamglone lub subtelnie teksturowane dymem.'
    },
    {
      title: '3. Zasada Jednej Myśli (Zero Przeładowania)',
      description:
        'Maksymalnie 1 mocna myśl na slajd (maksymalnie 10-15 słów). Dużo przestrzeni oddechowej. Jeśli odbiorca musi mrużyć oczy – post jest spalony.'
    },
    {
      title: '4. Posągowa Typografia i Rzymskie Cyfry',
      description:
        'Tytuły pisane są wielkimi literami w stylu rzymskich inskrypcji. Kolejne zasady oznaczamy rzymską numeracją (I, II, III, IV, V), co buduje powagę i prestiż profilu.'
    },
    {
      title: '5. Podpis Marki i Wezwanie do Działania',
      description:
        'Na dole każdego slajdu lub na klatce końcowej umieszczamy minimalistyczny podpis: @stark_focus z dyskretnym wezwaniem: "Save & Execute in silence".'
    }
  ];

  const handleCopyGuide = () => {
    const text = `STARK FOCUS // KSIĘGA STYLU WIZUALNEGO (BRAND IDENTITY)
======================================================
1. KOLORYSTYKA:
- Tło bazowe: Głęboka czerń #09090B / Czysta czerń #000000
- Warstwy/Karty: Mroczny grafit #141824
- Tekst główny: Zimna platyna #F4F4F5 (100% kontrastu)
- Tekst drugorzędny: Chłodna stal #94A3B8
- Akcent: Stalowy błękit #38BDF8 lub antyczne złoto #F59E0B (max 5% powierzchni)
- BŁĄD KRYTYCZNY: Żadnych jaskrawych kolorów (czerwienie, fiolety, neony są zakazane).

2. GRAFIKA I KOMPOZYCJA:
- Motyw wiodący: Rzeźby filozofów (Aureliusz, Seneka), czarny marmur, dym, geometryczny minimalizm.
- Kadr: Centralny obiekt, dramatyczny światłocień (Chiaroscuro).
- Tekst: Duży, czytelny na telefonie w 0.5 sekundy.

3. STRUKTURA POSTU KARUZELOWEGO (5 SLAJDÓW):
- Slajd 1: Hook (Wstrząsający fakt / Kontrowersja / Zatrzymanie kciuka)
- Slajd 2: I. Diagnoza błędu większości ludzi
- Slajd 3: II. Bezlitosna zasada stoicka
- Slajd 4: III. Konkretna zasada wdrożenia na dziś
- Slajd 5: Podpis @stark_focus + "Save this reminder. Execute in silence."`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="brand-style-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#141824] border border-[#2C354B] rounded-xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C354B] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-sm bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
              <Palette className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                KSIĘGA STYLU WIZUALNEGO // STARK MONOLITH BRAND GUIDE
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Jednolita, surowa szata graficzna dla Twoich postów, karuzel i rolek. Ograniczona paleta barw, maksymalna elegancja.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-sm hover:bg-[#1D2333] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto flex-1 pr-1">
          {/* Left Column: Visual Rules */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="bg-[#1D2333] p-3.5 rounded-lg border border-[#2C354B] space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> KANON PROJEKTOWY PROFILU
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Aby Twoje konto wyglądało jak profesjonalne medium o dyscyplinie i sile psychicznej, każdy post musi wyglądać jak wycięty z jednego monolitu. Odbiorca musi od razu rozpoznawać Twój styl w ułamku sekundy na feedzie.
              </p>
            </div>

            {/* Color Swatches */}
            <div className="bg-[#1D2333] p-3.5 rounded-lg border border-[#2C354B] space-y-2.5">
              <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                OFICJALNA PALETA BARW (MAX 3 KOLORY)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded bg-[#09090B] border border-slate-700 text-center">
                  <div className="w-full h-6 rounded bg-[#09090B] border border-slate-800 mb-1.5" />
                  <span className="text-[10px] font-mono font-bold text-white block">Obsidian Black</span>
                  <span className="text-[9px] font-mono text-slate-400">#09090B (Tło 75%)</span>
                </div>

                <div className="p-2.5 rounded bg-[#141824] border border-slate-700 text-center">
                  <div className="w-full h-6 rounded bg-[#141824] border border-slate-800 mb-1.5" />
                  <span className="text-[10px] font-mono font-bold text-white block">Titan Slate</span>
                  <span className="text-[9px] font-mono text-slate-400">#141824 (Karty 20%)</span>
                </div>

                <div className="p-2.5 rounded bg-[#1D2333] border border-slate-700 text-center">
                  <div className="w-full h-6 rounded bg-[#F4F4F5] mb-1.5" />
                  <span className="text-[10px] font-mono font-bold text-white block">Cold Platinum</span>
                  <span className="text-[9px] font-mono text-slate-400">#F4F4F5 (Tekst)</span>
                </div>

                <div className="p-2.5 rounded bg-[#1D2333] border border-slate-700 text-center">
                  <div className="w-full h-6 rounded bg-[#38BDF8] mb-1.5" />
                  <span className="text-[10px] font-mono font-bold text-white block">Steel Cyan</span>
                  <span className="text-[9px] font-mono text-slate-400">#38BDF8 (Akcent 5%)</span>
                </div>
              </div>
            </div>

            {/* Official Channel Logo (Avatar 1080x1080) */}
            <div className="bg-[#1D2333] p-3.5 rounded-lg border border-[#38BDF8]/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                  NOWE OFICJALNE LOGO KANAŁU // MONOLITH SHIELD
                </span>
                <span className="text-[9px] font-mono text-slate-400 bg-[#141824] px-1.5 py-0.5 rounded border border-[#2C354B]">
                  1080 × 1080 HD
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#141824] p-3 rounded-lg border border-[#2C354B]">
                <div className="bg-[#05070A] p-2 rounded-xl border border-[#2C354B] flex items-center justify-center">
                  <StarkLogo size={96} showDownload={true} />
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1">
                  <h4 className="text-xs font-bold text-white uppercase font-mono">
                    Brutalistyczna Tarcza Stoicka (Obsidian, Platyna, Stal)
                  </h4>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Geometria nie do zniszczenia: monolityczny heksagon z połączonym monogramem <strong>S</strong> (Stark) i <strong>F</strong> (Focus) oraz centralnym celownikiem żelaznej dyscypliny. Idealny na awatar na Instagram (@stark_focus), TikTok i YouTube!
                  </p>
                  <p className="text-[10px] text-[#38BDF8] font-mono pt-1">
                    ✓ Kliknij ikonę pobierania przy logo, aby zapisać plik PNG 1080x1080 na dysk.
                  </p>
                </div>
              </div>
            </div>

            {/* List of Rules */}
            <div className="space-y-2">
              {brandRules.map((rule, idx) => (
                <div key={idx} className="p-3 bg-[#1D2333] border border-[#2C354B] rounded-lg">
                  <h5 className="text-xs font-bold text-white font-mono uppercase mb-1">
                    {rule.title}
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {rule.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Live Interactive Preview */}
          <div className="lg:col-span-5 space-y-3.5 flex flex-col">
            <div className="bg-[#1D2333] p-3 rounded-lg border border-[#2C354B] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> WZORZEC POSTA NA ŻYWO (4:5 / 9:16)
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => setActivePreviewSlide(num)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                      activePreviewSlide === num
                        ? 'bg-[#38BDF8] text-[#141824] font-bold'
                        : 'bg-[#141824] text-slate-400 hover:text-white'
                    }`}
                  >
                    Slajd {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Mock Post Frame */}
            <div className="flex-1 bg-[#09090B] border-2 border-[#2C354B] rounded-xl p-5 shadow-2xl flex flex-col justify-between aspect-[4/5] relative overflow-hidden">
              {/* Subtle background glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#38BDF8]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Slide Top Banner */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 z-10">
                <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  STARK FOCUS // PROTOKÓŁ
                </span>
                <span className="text-[9px] font-mono text-[#38BDF8] font-bold">
                  {activePreviewSlide === 1 ? 'OKŁADKA' : `ZASADA ${activePreviewSlide === 2 ? 'I' : 'II'}`}
                </span>
              </div>

              {/* Slide Center Content */}
              <div className="my-auto py-4 z-10 text-center space-y-3">
                {activePreviewSlide === 1 && (
                  <>
                    <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-slate-300 uppercase tracking-widest">
                      PRAWO DYSCYPLINY
                    </div>
                    <h4 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight leading-snug font-serif">
                      NIGDY NIE NEGOCJUJ Z WŁASNĄ SŁABOŚCIĄ.
                    </h4>
                    <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto leading-relaxed">
                      Moment, w którym zaczynasz ze sobą dyskutować o 6:00 rano, jest momentem Twojej porażki.
                    </p>
                  </>
                )}

                {activePreviewSlide === 2 && (
                  <>
                    <span className="text-2xl font-serif text-[#38BDF8] block font-bold">I.</span>
                    <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug font-serif">
                      ZASADA PIERWSZEJ MINUTY
                    </h4>
                    <p className="text-xs text-slate-300 font-sans max-w-xs mx-auto leading-relaxed">
                      Pierwsze 60 sekund po przebudzeniu decyduje o całym dniu. Nie dotykaj telefonu. Wstań natychmiast bez myślenia.
                    </p>
                  </>
                )}

                {activePreviewSlide === 3 && (
                  <>
                    <span className="text-2xl font-serif text-[#38BDF8] block font-bold">II.</span>
                    <h4 className="text-base font-black text-white uppercase tracking-tight leading-snug font-serif">
                      DOWÓD PRZEZ DZIAŁANIE
                    </h4>
                    <p className="text-xs text-slate-300 font-sans max-w-xs mx-auto leading-relaxed">
                      Świat nie nagradza Twoich intencji ani planów. Liczy się tylko to, co zostało wykonane w ciszy.
                    </p>
                  </>
                )}
              </div>

              {/* Slide Bottom Footer */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2 z-10">
                <span className="text-[10px] font-mono text-[#38BDF8] font-black tracking-wider flex items-center gap-1">
                  @stark_focus
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  Save & Execute
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCopyGuide}
                className="flex-1 py-2 px-3 rounded bg-[#1D2333] hover:bg-[#242B3F] border border-[#2C354B] text-xs font-bold text-slate-200 uppercase font-mono flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" /> Skopiowano Wytyczne
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" /> Kopiuj Księgę Stylu
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (onApplyToCreator) onApplyToCreator('STARK_MONOLITH');
                  onClose();
                }}
                className="py-2 px-4 rounded bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] text-xs font-black uppercase font-mono transition-colors"
              >
                Zastosuj Styl
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
