import React, { useState, useEffect } from 'react';
import {
  Radio,
  Sparkles,
  Search,
  Copy,
  Check,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  Bookmark,
  Layers,
  Flame,
  RefreshCw,
  ExternalLink,
  Sliders,
  FileText
} from 'lucide-react';
import { StarkFocusData, TrendItem, Post } from '../../types';

interface AiRadarTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenQR: (title: string, payload: string) => void;
  onNavigateToTab: (tabIndex: number) => void;
}

export const AiRadarTab: React.FC<AiRadarTabProps> = ({
  data,
  onUpdateData,
  onOpenQR,
  onNavigateToTab
}) => {
  // Status check
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);

  // Scan trends state
  const [niche, setNiche] = useState<string>('stoicism and dark mental discipline short-form content');
  const [platform, setPlatform] = useState<string>('Instagram Karuzela / TikTok');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [trends, setTrends] = useState<TrendItem[]>(() => data.saved_trends || []);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Wszystkie');

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((res) => res.json())
      .then((data) => {
        setAiStatus(data);
      })
      .catch((err) => {
        console.warn('AI status check:', err);
      });
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inspirationAssets = (data.vault_assets || []).filter((a) => a.type === 'inspiration');

  const handleScanTrends = async () => {
    setIsScanning(true);
    setScanMessage('Skanowanie radarowe sieci i analiza wzorców wirusowości...');
    try {
      const res = await fetch('/api/ai/scan-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          platform,
          inspirations: inspirationAssets.map((insp) => ({
            filename: insp.filename,
            notes: insp.notes || ''
          }))
        })
      });
      const json = await res.json();
      if (json.trends && Array.isArray(json.trends)) {
        setTrends(json.trends);
        onUpdateData((prev) => ({
          ...prev,
          saved_trends: json.trends
        }));
        setScanMessage(json.message || '✓ Zaktualizowano trendy sieciowe i hooki 0-3s.');
      }
    } catch (err: any) {
      console.error(err);
      setScanMessage('Wystąpił problem podczas pobierania trendów sieci.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddTrendToPipeline = (trend: TrendItem) => {
    const hooks = Array.isArray(trend.viral_hooks) && trend.viral_hooks.length > 0
      ? trend.viral_hooks
      : ['Stay ruthless with your standards.'];
    const primaryHook = hooks[0];

    const newPost: Post = {
      id: 'post-' + Date.now(),
      title: trend.title,
      platform: trend.suggested_format?.includes('Reel') ? 'Instagram' : 'Instagram',
      format: trend.suggested_format || '🎬 Rolka 7-Sekundowa (Short Reel)',
      asset: 'AI_RADAR_' + trend.id,
      caption: `${primaryHook}\n\n${trend.core_message || ''}\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #mindset #starkfocus`,
      status: 'draft',
      created_date: new Date().toISOString().split('T')[0],
      published_date: null,
      notes: `Wywiad Trendu: ${trend.source_context || 'Sieć'}. Ból widza: ${trend.audience_pain || 'N/A'}`
    };

    onUpdateData((prev) => ({
      ...prev,
      posts: [newPost, ...prev.posts],
      xp: prev.xp + 25
    }));

    onNavigateToTab(1); // Przełącz do Moich Postów
  };

  const presetNiches = [
    'Bezwzględna Dyscyplina & Asceza',
    'Mroczna Psychologia & Prokrastynacja',
    'Samotność Lidera & Deep Work',
    'Stoicyzm w Świecie Taniej Dopaminy'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Intelligence Banner */}
      <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-sm bg-[#38BDF8]/15 border border-[#38BDF8]/30 text-[#38BDF8]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                TRENDY & POMYSŁY // VIRALOWE INSPIRACJE DLA TWOJEGO PROFILU
              </h2>
              {aiStatus?.configured ? (
                <span className="px-2 py-0.5 rounded-xs bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Silnik AI Aktywny
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-xs bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Tryb Autonomiczny
                </span>
              )}
              <span className="px-2 py-0.5 rounded-xs bg-[#38BDF8]/15 border border-[#38BDF8]/40 text-[#38BDF8] font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> Zapisane: {trends.length}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Wyszukuj chwytliwe tematy i gotowe hooki 0-3s dopasowane do estetyki Stark Focus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanTrends}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#090C14] text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Analiza sieci...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Skanuj Trendy Sieci</span>
              </>
            )}
          </button>
        </div>
      </div>

      {scanMessage && (
        <div className="p-3 bg-[#161D2C] border border-[#1E2638] rounded text-xs font-mono text-slate-300 flex items-center justify-between">
          <span>{scanMessage}</span>
          <span className="text-[10px] text-slate-500 font-mono">Baza wiedzy: STARK_FOCUS</span>
        </div>
      )}

      {/* Kontrolki Nisz i Filtrów */}
      <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1">
              Docelowa Nisza Rynkowa:
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="np. dark stoicism, digital dopamine detox, discipline"
              className="w-full px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#38BDF8]"
            />
          </div>
          <div className="w-full sm:w-64">
            <label className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1">
              Format Docelowy:
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono text-white focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="Instagram Karuzela / TikTok">Instagram Karuzela / TikTok</option>
              <option value="Rolka 7s B-Roll z Basem">Rolka 7s B-Roll z Basem</option>
              <option value="Litery 3D na Ścianie (Wall)">Litery 3D na Ścianie (Wall)</option>
              <option value="Twitter/X Wirusowy Wątek">Twitter/X Wirusowy Wątek</option>
            </select>
          </div>
        </div>

        {/* Szybkie presety nisz */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-slate-500 font-mono uppercase font-bold mr-1">
            Szybkie Presety:
          </span>
          {presetNiches.map((p) => (
            <button
              key={p}
              onClick={() => setNiche(p)}
              className={`text-[10px] px-2.5 py-1 rounded border font-mono transition-all cursor-pointer ${
                niche === p
                  ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                  : 'bg-[#090C14] border-[#1E2638] text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Główny Układ: Lewa Kolumna (Przegląd i Archiwum Trendów), Prawa Kolumna (Podręczna Baza Zbrojowni) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lewa Kolumna: Karty Trendów (8 kolumn) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Zidentyfikowane Wątki Wirusowe ({trends.length})
            </h3>
            <span className="text-[10px] font-mono text-slate-500">
              Analiza struktury uwagi: 0-3s retention
            </span>
          </div>

          <div className="space-y-4">
            {trends.map((trend, idx) => {
              const hooks = Array.isArray(trend.viral_hooks) ? trend.viral_hooks : [];
              return (
                <div
                  key={trend.id || idx}
                  className="p-4 bg-[#111622] border border-[#1E2638] hover:border-[#38BDF8]/40 rounded-lg space-y-3.5 transition-all"
                >
                  {/* Nagłówek Trendu */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1E2638]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        #{idx + 1} {trend.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                        {trend.suggested_format || 'Format Uniwersalny'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Szacowana Wirusowość: {trend.estimated_virality || '95%'}
                      </span>
                    </div>
                  </div>

                  {/* Kontekst & Ból Widza */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2.5 bg-[#090C14] rounded border border-[#1E2638]">
                      <span className="text-[10px] text-slate-500 uppercase block font-bold mb-0.5">
                        Źródło / Kontekst:
                      </span>
                      <span className="text-slate-300">{trend.source_context || 'Algorytmiczny trend sieciowy'}</span>
                    </div>
                    <div className="p-2.5 bg-[#090C14] rounded border border-[#1E2638]">
                      <span className="text-[10px] text-amber-500 uppercase block font-bold mb-0.5">
                        Frustracja Odbiorcy (Ból):
                      </span>
                      <span className="text-amber-200/90">{trend.audience_pain || 'Brak dyscypliny i ucieczka w wymówki'}</span>
                    </div>
                  </div>

                  {/* Hooki 0-3 sekundy */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block">
                      Sprawdzone Hooki Zatrzymujące Scroll (0-3s):
                    </span>
                    {hooks.length > 0 ? (
                      hooks.map((hook, hIdx) => (
                        <div
                          key={hIdx}
                          className="flex items-center justify-between p-2.5 bg-[#090C14] rounded border border-[#1E2638] text-xs font-mono text-slate-200 hover:border-[#38BDF8]/30 transition-colors"
                        >
                          <span className="truncate pr-2 font-medium">"{hook}"</span>
                          <button
                            onClick={() => handleCopy(`hook-${idx}-${hIdx}`, hook)}
                            className="text-[10px] px-2.5 py-1 rounded bg-[#161D2C] hover:bg-[#38BDF8] hover:text-[#090C14] text-slate-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedId === `hook-${idx}-${hIdx}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Skopiowano</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Kopiuj</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 bg-[#090C14] rounded border border-[#1E2638] text-xs font-mono text-slate-400">
                        Brak wygenerowanych hooków dla tego wątku.
                      </div>
                    )}
                  </div>

                  {/* Przesłanie stoickie */}
                  {trend.core_message && (
                    <div className="p-2.5 bg-[#090C14]/70 rounded border border-[#1E2638] text-xs font-mono">
                      <span className="text-[10px] text-slate-500 uppercase block font-bold mb-0.5">
                        Rdzeń Merytoryczny:
                      </span>
                      <span className="text-slate-300">{trend.core_message}</span>
                    </div>
                  )}

                  {/* Bing Prompt if available */}
                  {trend.bingPrompt && (
                    <div className="p-2 bg-[#090C14] rounded border border-[#1E2638] text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2">
                      <div className="truncate">
                        <strong className="text-slate-300">Prompt Wizualny 9:16:</strong> {trend.bingPrompt}
                      </div>
                      <button
                        onClick={() => handleCopy(`bing-${idx}`, trend.bingPrompt!)}
                        className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-[#161D2C] text-slate-300 hover:text-white cursor-pointer"
                      >
                        {copiedId === `bing-${idx}` ? 'Skopiowano!' : 'Kopiuj Prompt'}
                      </button>
                    </div>
                  )}

                  {/* Działania: Czyste przekazanie do Lejka lub Replikatora */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => handleAddTrendToPipeline(trend)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#161D2C] hover:bg-[#38BDF8]/20 border border-[#1E2638] hover:border-[#38BDF8] text-xs font-mono font-bold text-white transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>+ Dodaj do Moich Postów</span>
                    </button>

                    <button
                      onClick={() => onNavigateToTab(0)}
                      className="flex items-center gap-1.5 py-2 px-3 rounded bg-[#090C14] hover:bg-[#161D2C] border border-[#1E2638] text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>✨ Otwórz w Studio</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {trends.length === 0 && (
              <div className="p-12 bg-[#111622] border border-[#1E2638] rounded-lg text-center space-y-3">
                <Radio className="w-10 h-10 text-[#38BDF8] mx-auto opacity-40 animate-pulse" />
                <h4 className="text-sm font-bold text-white font-mono uppercase">
                  Brak przeskanowanych trendów
                </h4>
                <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
                  Uruchom skaner sieciowy, aby algorytm zidentyfikował aktualne wątki wirusowe, punkty frustracji widzów i hooki 0-3s.
                </p>
                <button
                  onClick={handleScanTrends}
                  disabled={isScanning}
                  className="px-5 py-2 bg-[#38BDF8] text-[#090C14] text-xs font-mono font-bold uppercase rounded cursor-pointer transition-all hover:bg-[#38BDF8]/90"
                >
                  Uruchom Skaner
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prawa Kolumna: Podręczne Archiwum Inspiracji i Narzędzia (4 kolumny) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Archiwum Inspiracji ze Zbrojowni */}
          <div className="p-4 bg-[#111622] border border-[#1E2638] rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Twoje Inspiracje ({inspirationAssets.length})
              </h3>
              <button
                onClick={() => onNavigateToTab(3)}
                className="text-[10px] font-mono text-[#38BDF8] hover:underline cursor-pointer"
              >
                Baza Grafik & Prompty →
              </button>
            </div>

            {inspirationAssets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {inspirationAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-2.5 bg-[#090C14] border border-[#1E2638] rounded text-xs font-mono space-y-1 hover:border-[#38BDF8]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold truncate">{asset.filename}</span>
                      <span className="text-[10px] text-slate-500">{asset.created_date}</span>
                    </div>
                    {asset.notes && (
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {asset.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[#090C14] rounded border border-[#1E2638] text-center text-xs font-mono text-slate-500">
                Brak zapisanych inspiracji w Zbrojowni. Wgraj zdjęcia lub notatki w zakładce Zbrojownia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
