import React, { useState, useRef, useEffect } from 'react';
import {
  Link2,
  Sparkles,
  RefreshCw,
  Film,
  Download,
  CheckCircle2,
  Copy,
  Check,
  Music,
  Upload,
  Layers
} from 'lucide-react';
import { UniversalLayoutSpec } from '../types';
import { renderUniversalLayout } from '../utils/canvasRenderer';

interface InspirationStudioProps {
  onSaveToPipeline: (post: any) => void;
  userHandle?: string;
}

// Domyślny format: Litery 3D na ścianie z lampą (1:1 ze zdjęcia)
const SPEC_3D_WALL: UniversalLayoutSpec = {
  layoutName: 'Litery 3D na Ścianie z Lampą',
  gridType: 'studio_wall_3d',
  backgroundColor: '#686F7C',
  dividerWidth: 0,
  dividerColor: '#000000',
  slotCount: 1,
  slotLabels: ['Opcjonalne tło ściany (zostaw puste dla domyślnego)'],
  textEffect: '3d_wall',
  textLayers: [
    { id: 't1', text: 'Stay ruthless', fontFamily: 'sans', fontSize: 72, fontWeight: 'black', fontStyle: 'normal', casing: 'preserve', color: '#161920', align: 'left', posY: 0.28, posX: 0.14 },
    { id: 't2', text: 'through all', fontFamily: 'sans', fontSize: 72, fontWeight: 'black', fontStyle: 'normal', casing: 'preserve', color: '#161920', align: 'left', posY: 0.36, posX: 0.14 },
    { id: 't3', text: 'phases of life.', fontFamily: 'sans', fontSize: 72, fontWeight: 'black', fontStyle: 'normal', casing: 'preserve', color: '#161920', align: 'left', posY: 0.44, posX: 0.14 },
    { id: 't4', text: 'Never stop', fontFamily: 'sans', fontSize: 72, fontWeight: 'black', fontStyle: 'normal', casing: 'preserve', color: '#161920', align: 'left', posY: 0.52, posX: 0.14 },
    { id: 't5', text: 'learning and', fontFamily: 'sans', fontSize: 72, fontWeight: 'black', fontStyle: 'normal', casing: 'preserve', color: '#161920', align: 'left', posY: 0.60, posX: 0.14 },
    { id: 't6', text: 'listening.', fontFamily: 'sans', fontSize: 72, fontWeight: 'black', fontStyle: 'normal', casing: 'preserve', color: '#161920', align: 'left', posY: 0.68, posX: 0.14 }
  ],
  caption: 'Stay ruthless with your standards through every phase of life. Never stop learning, never stop listening.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #mindset #focus #starkfocus',
  detectedAudio: 'Ciemny ambient ze skrzypcami'
};

export const InspirationStudio1to1: React.FC<InspirationStudioProps> = ({
  onSaveToPipeline,
  userHandle = 'stark_focus'
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Aktywna specyfikacja układu
  const [spec, setSpec] = useState<UniversalLayoutSpec>(SPEC_3D_WALL);

  // Tablica zdjęć wgranych do slotów
  const [slotImages, setSlotImages] = useState<(string | null)[]>([null]);
  const [activeSlotToUpload, setActiveSlotToUpload] = useState<number>(0);

  const [copiedCaption, setCopiedCaption] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // State for loaded images to prevent reload flickering and memory leak on keystrokes
  const [loadedImages, setLoadedImages] = useState<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const nextLoaded: (HTMLImageElement | null)[] = slotImages.map(() => null);
    setLoadedImages(nextLoaded);

    let active = true;
    let loadedCount = 0;
    const totalToLoad = slotImages.filter(Boolean).length;

    if (totalToLoad === 0) {
      return;
    }

    slotImages.forEach((src, idx) => {
      if (!src) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => {
        if (!active) return;
        nextLoaded[idx] = img;
        loadedCount++;
        if (loadedCount === totalToLoad) {
          setLoadedImages([...nextLoaded]);
        }
      };
      img.onerror = () => {
        if (!active) return;
        loadedCount++;
        if (loadedCount === totalToLoad) {
          setLoadedImages([...nextLoaded]);
        }
      };
    });

    return () => {
      active = false;
    };
  }, [slotImages]);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderUniversalLayout(canvasRef.current, spec, loadedImages);
  }, [spec, loadedImages]);

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSlotImages((prev) => {
          const next = [...prev];
          next[activeSlotToUpload] = dataUrl;
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Analiza DOWOLNEGO linku
  const handleAnalyzeLink = async () => {
    if (!videoUrl.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await fetch('/api/ai/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() })
      });
      const data = await res.json();

      if (data.layoutSpec) {
        setSpec(data.layoutSpec);
        setSlotImages(Array(data.layoutSpec.slotCount || 1).fill(null));
      } else if (data.error) {
        setAnalysisError(data.error);
      }
    } catch (e) {
      console.error(e);
      setAnalysisError('Błąd analizy linku. Upewnij się, że URL jest publicznie dostępny.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTextLayer = (id: string, newText: string) => {
    setSpec((prev) => ({
      ...prev,
      textLayers: prev.textLayers.map((l) => (l.id === id ? { ...l, text: newText } : l))
    }));
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = `stark_${spec.gridType}_${Date.now()}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  const handleSaveToPipeline = () => {
    onSaveToPipeline({
      id: 'post-' + Date.now(),
      title: spec.textLayers[0]?.text || spec.layoutName,
      format: spec.layoutName,
      asset: spec.gridType,
      caption: spec.caption,
      status: 'draft',
      created_date: new Date().toISOString().split('T')[0]
    });
    
    // Automatyczne kopiowanie opisu do schowka przy zapisie
    if (spec.caption) {
      navigator.clipboard.writeText(spec.caption);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-[#0B0D14] border border-[#1E2638] rounded-xl p-5 shadow-2xl space-y-6">
      {/* Pasek linku */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold uppercase text-[#38BDF8] flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> GENERATOR POSTA 1:1 (ZE ZDJĘCIA LUB LINKU)
          </label>
          <span className="text-[10px] font-mono text-slate-400">
            Aktywny styl: <strong className="text-white">{spec.layoutName}</strong>
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Wklej link do DOWOLNEGO posta (TikTok, Instagram Reels, Shorts)..."
              className="w-full bg-[#111622] border border-[#1E2638] focus:border-[#38BDF8] rounded-lg py-2.5 pl-9 pr-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none"
            />
          </div>
          <button
            onClick={handleAnalyzeLink}
            disabled={isAnalyzing || !videoUrl.trim()}
            className="px-5 py-2.5 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#090C14] font-mono font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-md"
          >
            {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            <span>Odwzoruj Format</span>
          </button>
        </div>

        {analysisError && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded text-xs font-mono text-rose-300">
            {analysisError}
          </div>
        )}
      </div>

      {/* Wybór formatu */}
      <div className="flex items-center gap-2 border-b border-[#1E2638] pb-3 overflow-x-auto">
        <span className="text-[10px] font-mono text-slate-400 uppercase mr-2 shrink-0">Wybierz styl:</span>
        <button
          type="button"
          onClick={() => {
            setSpec(SPEC_3D_WALL);
            setSlotImages([null]);
          }}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
            spec.gridType === 'studio_wall_3d'
              ? 'bg-[#38BDF8] text-[#090C14]'
              : 'bg-[#111622] text-slate-400 border border-[#1E2638] hover:text-white'
          }`}
        >
          🧱 Litery 3D na Ścianie z Lampą (1:1 ze zdjęcia)
        </button>

        <button
          type="button"
          onClick={() => {
            setSpec({
              layoutName: 'Kolaż 4 Kadrów',
              gridType: 'grid_2x2',
              backgroundColor: '#000000',
              dividerWidth: 10,
              dividerColor: '#000000',
              slotCount: 4,
              slotLabels: ['Kadr 1', 'Kadr 2', 'Kadr 3', 'Kadr 4'],
              textEffect: 'outline',
              textLayers: [
                { id: 't1', text: 'This winter', fontFamily: 'serif', fontSize: 76, fontWeight: 'bold', fontStyle: 'italic', casing: 'preserve', color: '#FFFFFF', strokeColor: '#000000', strokeWidth: 14, align: 'center', posY: 0.5 }
              ],
              caption: 'This winter, disappear into obsession.\n\nSave this reminder.\n\n#winterarc #discipline',
              detectedAudio: 'Oryginalny dźwięk'
            });
            setSlotImages([null, null, null, null]);
          }}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
            spec.gridType === 'grid_2x2'
              ? 'bg-[#38BDF8] text-[#090C14]'
              : 'bg-[#111622] text-slate-400 border border-[#1E2638] hover:text-white'
          }`}
        >
          🖼️ Kolaż 4 Kadrów (Winter Arc)
        </button>

        <button
          type="button"
          onClick={() => {
            setSpec({
              layoutName: 'Cytat na Czerni',
              gridType: 'none_solid',
              backgroundColor: '#000000',
              dividerWidth: 0,
              dividerColor: '#000000',
              slotCount: 0,
              slotLabels: [],
              textEffect: 'flat',
              textLayers: [
                { id: 't1', text: 'Focus on yourself.', fontFamily: 'sans', fontSize: 54, fontWeight: 'bold', fontStyle: 'normal', casing: 'preserve', color: '#FFFFFF', align: 'left', posY: 0.44, posX: 0.14 },
                { id: 't2', text: 'people come & go.', fontFamily: 'sans', fontSize: 38, fontWeight: 'normal', fontStyle: 'normal', casing: 'lowercase', color: 'rgba(255, 255, 255, 0.72)', align: 'left', posY: 0.51, posX: 0.14 }
              ],
              caption: 'Focus on yourself. People come and go.\n\nSave this reminder.\n\n#stoicism #focus',
              detectedAudio: 'Czysty dźwięk'
            });
            setSlotImages([]);
          }}
          className={`px-3 py-1.5 rounded text-xs font-mono font-bold cursor-pointer transition-colors ${
            spec.gridType === 'none_solid'
              ? 'bg-[#38BDF8] text-[#090C14]'
              : 'bg-[#111622] text-slate-400 border border-[#1E2638] hover:text-white'
          }`}
        >
          ⬛ Czysty Cytat na Czerni
        </button>
      </div>

      {/* Podgląd 9:16 + Edycja */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lewa: Podgląd 9:16 */}
        <div className="lg:col-span-5 flex flex-col items-center bg-[#05070B] p-4 rounded-xl border border-[#1E2638] space-y-3">
          <div className="flex items-center justify-between w-full text-[10px] font-mono text-slate-400">
            <span className="text-[#38BDF8] font-bold uppercase">PODGLĄD 9:16</span>
            <span>1080 × 1920 HD</span>
          </div>

          <div className="relative w-full max-w-[270px] aspect-[9/16] rounded-md overflow-hidden border border-[#1E2638] shadow-2xl bg-black">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>

          <button
            onClick={handleDownloadPNG}
            className="w-full max-w-[270px] py-2.5 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#090C14] font-mono text-xs font-bold uppercase rounded flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Download className="w-4 h-4" /> Pobierz Gotowy PNG (1080×1920)
          </button>
        </div>

        {/* Prawa: Edycja Tekstów i Parametrów */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111622] p-4 rounded-xl border border-[#1E2638] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-white uppercase">
                Edycja Treści ({spec.layoutName})
              </span>
              {spec.detectedAudio && (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Music className="w-3 h-3" /> {spec.detectedAudio}
                </span>
              )}
            </div>

            {/* Opcjonalne wgranie własnego tła ściany */}
            {spec.slotCount > 0 && (
              <div className="space-y-2 border-b border-[#1E2638] pb-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono text-slate-400 uppercase block">
                    {spec.gridType === 'studio_wall_3d' ? 'Własne tło ściany (opcjonalnie):' : 'Wgraj zdjęcia dla siatki:'}
                  </label>
                  {spec.gridType === 'studio_wall_3d' && (
                    <button
                      type="button"
                      onClick={() => setSlotImages([null])}
                      className="text-[10px] font-mono text-[#38BDF8] hover:underline cursor-pointer"
                    >
                      Użyj domyślnej ściany studyjnej
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleUploadPhoto}
                  className="hidden"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {spec.slotLabels.map((label, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveSlotToUpload(idx);
                        fileInputRef.current?.click();
                      }}
                      className="p-2 rounded bg-[#0B0D14] hover:bg-[#1A2234] border border-[#1E2638] hover:border-[#38BDF8] text-left transition-colors cursor-pointer group"
                    >
                      <div className="aspect-video rounded overflow-hidden mb-1.5 bg-[#05070B] border border-[#1E2638] flex items-center justify-center">
                        {slotImages[idx] ? (
                          <img src={slotImages[idx]!} alt={label} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Domyślna</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-300 block truncate">{label}</span>
                      <span className="text-[9px] font-mono text-[#38BDF8] flex items-center gap-1 mt-0.5">
                        <Upload className="w-2.5 h-2.5" /> Wgraj plik
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Warstwy tekstu */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase block">
                {spec.gridType === 'studio_wall_3d' ? 'Linijki Napisu na Ścianie 3D:' : 'Napisy na Kadrze:'}
              </label>

              {spec.textLayers.map((layer, idx) => (
                <div key={layer.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Wers {idx + 1}:</span>
                  </div>
                  <input
                    type="text"
                    value={layer.text}
                    onChange={(e) => handleUpdateTextLayer(layer.id, e.target.value)}
                    className="w-full bg-[#0B0D14] border border-[#1E2638] focus:border-[#38BDF8] rounded p-2 text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Opis posta z hashtagami */}
          <div className="bg-[#111622] p-4 rounded-xl border border-[#1E2638] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-slate-400 uppercase">
                Opis posta pod rolkę:
              </label>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(spec.caption);
                  setCopiedCaption(true);
                  setTimeout(() => setCopiedCaption(false), 2000);
                }}
                className="text-[10px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedCaption ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedCaption ? 'Skopiowano!' : 'Kopiuj Opis'}
              </button>
            </div>

            <textarea
              rows={4}
              value={spec.caption}
              onChange={(e) => setSpec((prev) => ({ ...prev, caption: e.target.value }))}
              className="w-full bg-[#0B0D14] border border-[#1E2638] focus:border-[#38BDF8] rounded p-2.5 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {savedSuccess ? (
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Zapisano w "Moich Postach"!
              </span>
            ) : <div />}

            <button
              onClick={handleSaveToPipeline}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#090C14] font-mono font-black text-xs uppercase tracking-wider rounded transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" /> Zapisz do Moich Postów
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};