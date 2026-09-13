import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Upload,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Clock,
  Film,
  Sun,
  Moon,
  AlertTriangle
} from 'lucide-react';
import {
  generateThematicBingPrompts,
  ThematicBingPrompt,
  BING_PROMPT_MAX_LENGTH,
  clampBingPrompt
} from '../utils/thematicBingPrompter';

interface ThematicBingPrompterProps {
  initialTheme?: string;
  onSaveToVault?: (asset: { filename: string; url: string }) => void;
  onSelectBackground?: (url: string) => void;
  onOpenVideoStudioWithHook?: (hookText: string) => void;
  compact?: boolean;
}

const QUICK_THEME_CHIPS = [
  { label: '🌅 Poranek 06:00 (Świt & Dyscyplina)', query: 'morning dawn 06:00 wake up discipline first win' },
  { label: '⏰ Lunch 13:00 (Czas Ucieka)', query: '13:00 midday lunch break time wasted half the day' },
  { label: '🌙 Wieczór 21:00 (Nocna Warta & Wyciszenie)', query: 'night evening 21:00 solitude midnight work mirror' },
  { label: '🤫 Cisza i Zniknięcie (Solitude)', query: 'silence solitude disappear noise opinions results' },
  { label: '⚠️ Wygoda to Trucizna (Dyscyplina)', query: 'comfort poison mediocrity excuses burnout standards' },
  { label: '🛡️ Pancerz Psychiczny (Ból & Ogień)', query: 'mental armor pain resilience titan warrior forge' }
];

export const ThematicBingPrompter: React.FC<ThematicBingPrompterProps> = ({
  initialTheme = '',
  onSaveToVault,
  onSelectBackground,
  onOpenVideoStudioWithHook,
  compact = false
}) => {
  const [themeInput, setThemeInput] = useState<string>(
    initialTheme || 'Half the day is gone. Stop scrolling on your lunch break.'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadSuccessName, setUploadSuccessName] = useState<string | null>(null);

  const prompts = useMemo<ThematicBingPrompt[]>(() => {
    return generateThematicBingPrompts(themeInput);
  }, [themeInput]);

  const handleCopyPrompt = (p: ThematicBingPrompt) => {
    const textToCopy = clampBingPrompt(p.promptText, BING_PROMPT_MAX_LENGTH);
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(p.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const cleanName = 'STARK_Bing_' + file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_') + '.jpg';
        if (onSaveToVault) {
          onSaveToVault({ filename: cleanName, url: dataUrl });
        }
        if (onSelectBackground) {
          onSelectBackground(dataUrl);
        }
        setUploadSuccessName(cleanName);
        setTimeout(() => setUploadSuccessName(null), 4000);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-[#141824] border border-[#2C354B] rounded-xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C354B] pb-3.5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
              Silnik Tematycznych Promptów Bing (DALL-E 3)
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> LIMIT BING: MAKS. 480 ZNAKÓW
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8] text-[9px] font-mono font-bold">
              FORMAT 9:16
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Wszystkie wygenerowane prompty są rygorystycznie zoptymalizowane pod limit 480 znaków w Bing Image Creator. Zostawiają puste centrum pod kinezję tekstu w rolce.
          </p>
        </div>

        <a
          href="https://www.bing.com/images/create"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] text-xs font-mono font-black uppercase flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Otwórz Bing Image Creator ↗
        </a>
      </div>

      {/* Input theme / topic */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center justify-between">
          <span>Temat / Pomysł / Hook na Treść:</span>
          <span className="text-slate-500 font-normal">Wpisz porę dnia (rano / lunch / wieczór) lub motyw</span>
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            value={themeInput}
            onChange={(e) => setThemeInput(e.target.value)}
            placeholder="np. 21:00 wieczorna praca w ciszy, 06:00 świt, połowa dnia przepadła..."
            className="flex-1 text-xs py-2 px-3 bg-[#1D2333] border border-[#2C354B] rounded text-white font-mono focus:border-[#38BDF8] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setThemeInput('')}
            className="px-2.5 py-2 text-xs font-mono text-slate-400 hover:text-white bg-[#1D2333] border border-[#2C354B] rounded"
          >
            Wyczyść
          </button>
        </div>

        {/* Quick theme pills including Day-Parts */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[9px] font-mono text-slate-400 self-center mr-1">Pory dnia i motywy:</span>
          {QUICK_THEME_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setThemeInput(chip.query)}
              className="px-2 py-0.5 rounded-xs bg-[#1D2333] hover:bg-[#2A3449] border border-[#2C354B] text-[9px] font-mono text-slate-300 hover:text-[#38BDF8] transition-colors cursor-pointer flex items-center gap-1"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload zone for downloaded Bing images */}
      <div className="bg-[#111420] border border-dashed border-[#38BDF8]/40 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-[#38BDF8]/10 text-[#38BDF8]">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-mono">
              Masz już pobrane tło z Binga na dysku?
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Wgraj plik tutaj – zostanie automatycznie dodany do Twojego Skarbca i natychmiast użyty w Rolkach/Karuzelach!
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded bg-[#1D2333] hover:bg-[#283247] border border-[#38BDF8] text-xs font-mono font-bold text-[#38BDF8] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            📁 Wybierz plik z Binga (PNG/JPG)
          </button>
          {uploadSuccessName && (
            <span className="text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" /> Dodano do bazy!
            </span>
          )}
        </div>
      </div>

      {/* Prompts Cards Grid */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Dopasowane Koncepcje Wizualne STARK ({prompts.length})
          </span>
          <span className="text-[9px] font-mono text-[#10B981] flex items-center gap-1">
            <Check className="w-3 h-3" /> Każdy prompt mieści się w limicie 480 znaków
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {prompts.map((p) => {
            const isCopied = copiedId === p.id;
            const isUnderLimit = p.promptText.length <= BING_PROMPT_MAX_LENGTH;

            return (
              <div
                key={p.id}
                className="bg-[#1D2333] border border-[#2C354B] hover:border-[#38BDF8]/60 rounded-lg p-3.5 flex flex-col justify-between space-y-2.5 transition-all shadow-sm group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono group-hover:text-[#38BDF8] transition-colors">
                      {p.title}
                    </span>
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40 border border-[#2C354B] text-[#38BDF8]">
                      {p.archetype}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-[10px] text-slate-300 font-mono bg-[#141824] p-2 rounded border border-[#2C354B]">
                    <Info className="w-3 h-3 text-[#38BDF8] shrink-0 mt-0.5" />
                    <span><strong>Dlaczego to działa:</strong> {p.metaphorExplanation}</span>
                  </div>

                  {p.recommendedHook && (
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1">
                      <span>Rekomendowany Hook:</span>
                      <span className="text-white font-bold">{p.recommendedHook}</span>
                    </div>
                  )}

                  {/* Prompt Container with live Character Counter */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-mono text-slate-400">Prompt do wklejenia w Bing:</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          isUnderLimit
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {p.promptText.length} / {BING_PROMPT_MAX_LENGTH} znaków
                      </span>
                    </div>

                    <div className="relative bg-black/60 p-2.5 rounded border border-[#2C354B] font-mono text-[10px] text-slate-200 leading-relaxed select-all">
                      {p.promptText}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#2C354B]">
                  <button
                    type="button"
                    onClick={() => handleCopyPrompt(p)}
                    className={`flex-1 py-1.5 px-2.5 rounded text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#141824] hover:bg-[#242B3F] border border-[#2C354B] text-slate-200 hover:text-white'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Skopiowano ({p.promptText.length} zn.)!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />
                        Kopiuj ({p.promptText.length} zn.)
                      </>
                    )}
                  </button>

                  <a
                    href="https://www.bing.com/images/create"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-3 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-[#38BDF8] text-xs font-mono font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title="Otwórz Bing Image Creator w nowej karcie"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Generuj w Bing ↗
                  </a>

                  {onOpenVideoStudioWithHook && p.recommendedHook && (
                    <button
                      type="button"
                      onClick={() => onOpenVideoStudioWithHook(p.recommendedHook!)}
                      className="py-1.5 px-2 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-[#10B981] text-xs font-mono font-bold flex items-center gap-1 cursor-pointer"
                      title="Otwórz Wideo Studio 9:16 z tym hookiem"
                    >
                      <Film className="w-3 h-3" />
                      Do Rolki
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
