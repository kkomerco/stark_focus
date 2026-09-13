import React, { useState } from 'react';
import { Link2, Film, Image as ImageIcon, Clock, Zap, Copy, Check, Sparkles } from 'lucide-react';

interface ReplicatorTabProps {
  onCreateFromTemplate: (template: any) => void;
}

// Analiza struktury z TikToków które podałeś
const REPLICATOR_PRESETS = [
  {
    id: "alpha_4photos",
    name: "@alphascript06 - 4 zdjęcia + tekst",
    url: "https://www.tiktok.com/@alphascript06/video/7670042595485125908",
    structure: [
      { time: "0.0-0.8s", type: "photo", content: "EMPTY BED • 11AM", transition: "hard cut" },
      { time: "0.8-1.9s", type: "photo", content: "EMPTY WALLET", transition: "hard cut" },
      { time: "1.9-3.0s", type: "photo", content: "MIRROR", transition: "hard cut" },
      { time: "3.0-5.2s", type: "photo", content: "FUTURE SELF", transition: "hold + zoom" },
    ],
    timing: "0.8s / 1.1s / 1.1s / 2.2s",
    textStyle: "Biały serif centered, uppercase, czerwony akcent na 1 słowo",
  },
  {
    id: "saint_quote",
    name: "@saint.men - cytat na czarnym",
    url: "https://www.tiktok.com/@saint.men/video/7683972982431075616",
    structure: [
      { time: "0.0-2.5s", type: "black_bg", content: "QUOTE centered", transition: "fade in" },
      { time: "2.5-5.0s", type: "black_bg", content: "QUOTE 2nd part", transition: "typewriter" },
    ],
    timing: "2.5s / 2.5s",
    textStyle: "Cormorant Garamond, biały, tracking -2%, czerwona linia",
  },
  {
    id: "alfinaro_changing",
    name: "@alfinaro22 - zmieniające się tło",
    url: "https://www.tiktok.com/@alfinaro22/video/7675365354696101138",
    structure: [
      { time: "0.0-0.9s", type: "video_clip", content: "motywacyjny klip 1", transition: "beat sync" },
      { time: "0.9-1.8s", type: "video_clip", content: "motywacyjny klip 2", transition: "beat sync" },
      { time: "1.8-2.7s", type: "video_clip", content: "motywacyjny klip 3", transition: "beat sync" },
    ],
    timing: "0.9s beat sync",
    textStyle: "Ten sam tekst na każdym tle, biały + shadow",
  },
];

export const ReplicatorTab: React.FC<ReplicatorTabProps> = ({ onCreateFromTemplate }) => {
  const [inputUrl, setInputUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedStructure, setAnalyzedStructure] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!inputUrl.trim()) return;
    setIsAnalyzing(true);
    
    // Symulacja analizy - w realu tu będzie yt-dlp + ffprobe
    await new Promise(r => setTimeout(r, 2000));
    
    // Dla demo bierzemy najbliższy preset
    const mock = {
      url: inputUrl,
      detected: {
        photos: 4,
        blackScreens: 1,
        changingBg: true,
        timing: "0.8s / 1.1s / 0.8s / 2.2s",
        textPositions: ["center", "center", "center", "bottom"],
        hasQuoteOnBlack: true,
      },
      template: {
        type: "4_photos_void",
        slides: [
          { id: 1, type: "photo_slot", prompt: "Twoje zdjęcie 1: symbol lenistwa", placeholder: "EMPTY BED • 11AM" },
          { id: 2, type: "photo_slot", prompt: "Twoje zdjęcie 2: konsekwencja", placeholder: "EMPTY WALLET" },
          { id: 3, type: "photo_slot", prompt: "Twoje zdjęcie 3: konfrontacja", placeholder: "MIRROR" },
          { id: 4, type: "photo_slot", prompt: "Twoje zdjęcie 4: przyszłość", placeholder: "FUTURE SELF" },
          { id: 5, type: "text_slot", content: "DISCIPLINE → SACRIFICE → REFLECTION → EVOLUTION", style: "SF VOID, biały serif, czerwony akcent" },
        ],
        timing: "0.8 / 1.1 / 0.8 / 2.2s",
        export: "9:16, 1080x1920, 30fps",
      }
    };
    
    setAnalyzedStructure(mock);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header VOID SF */}
      <div className="p-5 bg-[#000000] border border-[#1E1E20] rounded-xl flex items-center gap-4">
        <img src="/logo.png" alt="SF" className="w-12 h-12 rounded-full border border-[#1E1E20]" />
        <div>
          <h2 className="text-sm font-bold text-[#F5F5F3] tracking-widest">REPLIKATOR STRUKTURY // SF VOID</h2>
          <p className="text-xs text-[#8A8A8E] font-mono">Wklej link do rolki → dostajesz szablon 1:1 w Twoim stylu. Muzykę dobierasz sam.</p>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 bg-[#111113] border border-[#1E1E20] rounded-xl space-y-3">
        <label className="text-[11px] font-mono font-bold text-[#8A8A8E] uppercase">Link do rolki TikTok / IG do replikacji:</label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8E]" />
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@.../video/..."
              className="w-full pl-10 pr-3 py-2.5 bg-[#000000] border border-[#1E1E20] rounded-lg text-sm text-white focus:border-[#00D9FF] focus:outline-none font-mono"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputUrl.trim()}
            className="px-6 py-2.5 bg-[#F5F5F3] text-black text-xs font-bold uppercase rounded-lg hover:bg-white disabled:opacity-40 flex items-center gap-2"
          >
            {isAnalyzing ? <><Clock className="w-4 h-4 animate-spin" /> Analizuję...</> : <><Zap className="w-4 h-4" /> Analizuj strukturę</>}
          </button>
        </div>
        <p className="text-[10px] font-mono text-[#8A8A8E]">Wykryje: ile zdjęć, ile cytatów na czarnym, tempo cięć, gdzie tekst, zmieniające się tło.</p>
      </div>

      {/* Presety z Twoich inspiracji */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {REPLICATOR_PRESETS.map(preset => (
          <div key={preset.id} className="p-4 bg-[#111113] border border-[#1E1E20] rounded-xl hover:border-[#00D9FF]/40 transition-colors">
            <div className="text-[10px] font-mono text-[#00D9FF] mb-1">{preset.name}</div>
            <div className="text-xs font-bold text-white mb-2">{preset.timing}</div>
            <div className="space-y-1">
              {preset.structure.map((s, i) => (
                <div key={i} className="text-[11px] font-mono text-[#8A8A8E] flex justify-between">
                  <span>{s.time}</span><span className="text-[#F5F5F3]">{s.type}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => onCreateFromTemplate(preset)}
              className="mt-3 w-full py-1.5 bg-[#1E1E20] hover:bg-[#00D9FF]/20 border border-[#1E1E20] text-[11px] font-bold text-white rounded-lg"
            >
              Użyj tego szablonu
            </button>
          </div>
        ))}
      </div>

      {/* Wynik analizy */}
      {analyzedStructure && (
        <div className="p-5 bg-[#000000] border border-[#00D9FF]/50 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#00D9FF] rounded-full animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase">Struktura wykryta: {analyzedStructure.template.type}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 bg-[#111113] rounded">Zdjęcia: <span className="text-white">{analyzedStructure.detected.photos}</span></div>
            <div className="p-2 bg-[#111113] rounded">Cytat na czarnym: <span className="text-white">{analyzedStructure.detected.hasQuoteOnBlack ? "TAK" : "NIE"}</span></div>
            <div className="p-2 bg-[#111113] rounded">Zmienne tło: <span className="text-white">{analyzedStructure.detected.changingBg ? "TAK" : "NIE"}</span></div>
            <div className="p-2 bg-[#111113] rounded">Tempo: <span className="text-white">{analyzedStructure.detected.timing}</span></div>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-mono text-[#8A8A8E] uppercase">Szablon SF VOID gotowy do edycji:</div>
            {analyzedStructure.template.slides.map((slide: any) => (
              <div key={slide.id} className="p-3 bg-[#111113] border border-[#1E1E20] rounded-lg flex justify-between items-center">
                <div>
                  <div className="text-xs font-bold text-white">{slide.placeholder || slide.content}</div>
                  <div className="text-[10px] font-mono text-[#8A8A8E]">{slide.prompt || slide.style}</div>
                </div>
                <div className="text-[10px] font-mono px-2 py-1 bg-[#1E1E20] rounded text-white">{slide.type}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onCreateFromTemplate(analyzedStructure.template)}
            className="w-full py-3 bg-[#F5F5F3] text-black font-bold uppercase text-xs rounded-lg hover:bg-white flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Otwórz w Studio (podmień grafiki i tekst)
          </button>
        </div>
      )}
    </div>
  );
};
