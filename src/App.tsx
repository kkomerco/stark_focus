// App.tsx - SF VOID FINAL - minimalistycznie elegancko - JEDEN PLIK, BEZ ZALEŻNOŚCI
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layers, Box, Brain, Radio, Sparkles, Copy } from 'lucide-react';

const PipelineTab = lazy(() => import('./components/tabs/PipelineTab').then(m => ({ default: m.PipelineTab })));
const AiRadarTab = lazy(() => import('./components/tabs/AiRadarTab').then(m => ({ default: m.AiRadarTab })));
const VaultTab = lazy(() => import('./components/tabs/VaultTab').then(m => ({ default: m.VaultTab })));
const MentorTab = lazy(() => import('./components/tabs/MentorTab').then(m => ({ default: m.MentorTab })));
const QRModal = lazy(() => import('./components/QRModal').then(m => ({ default: m.QRModal })));
const VideoStudioModal = lazy(() => import('./components/VideoStudioModal').then(m => ({ default: m.VideoStudioModal })));
const CarouselStudioModal = lazy(() => import('./components/CarouselStudioModal').then(m => ({ default: m.CarouselStudioModal })));
const InspirationStudio1to1 = lazy(() => import('./components/InspirationStudio1to1').then(m => ({ default: m.InspirationStudio1to1 })));

function ReplicatorInline({ onUse }: { onUse: (tpl: any) => void }) {
  const [url, setUrl] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  return (
    <div className="space-y-5 animate-in fade-in">
      <div className="p-5 bg-[#000000] border border-[#1E1E20] rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#111113] border border-[#1E1E20] flex items-center justify-center font-bold text-[#F5F5F3]">SF</div>
          <div>
            <h2 className="text-[13px] font-bold tracking-[0.2em] text-[#F5F5F3]">REPLIKATOR STRUKTURY // VOID v2.0</h2>
            <p className="text-[11px] font-mono text-[#8A8A8E]">Wklej link do rolki z TikToka → dostajesz szablon 1:1 w Twoim mrocznym stylu</p>
          </div>
        </div>
      </div>
      <div className="p-4 bg-[#111113] border border-[#1E1E20] rounded-xl space-y-3">
        <div className="flex gap-2">
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@alphascript06/video/..." className="flex-1 px-3 py-2.5 bg-black border border-[#1E1E20] rounded-lg text-sm text-white focus:border-[#00D9FF] outline-none font-mono" />
          <button onClick={() => setAnalyzed(true)} className="px-6 py-2.5 bg-[#F5F5F3] text-black text-xs font-bold uppercase rounded-lg">Analizuj strukturę</button>
        </div>
      </div>
      {analyzed && (
        <div className="p-5 bg-black border border-[#00D9FF]/50 rounded-xl space-y-3">
          <div className="text-xs font-bold text-white">WYKRYTO: 4-fazowa struktura jak @alphascript06</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#111113] rounded border border-[#1E1E20] text-[11px] font-mono"><span className="text-[#8A8A8E]">01</span> <span className="text-white ml-2">EMPTY BED • 11AM</span></div>
            <div className="p-3 bg-[#111113] rounded border border-[#1E1E20] text-[11px] font-mono"><span className="text-[#8A8A8E]">02</span> <span className="text-white ml-2">EMPTY WALLET</span></div>
            <div className="p-3 bg-[#111113] rounded border border-[#1E1E20] text-[11px] font-mono"><span className="text-[#8A8A8E]">03</span> <span className="text-white ml-2">MIRROR</span></div>
            <div className="p-3 bg-[#111113] rounded border border-[#1E1E20] text-[11px] font-mono"><span className="text-[#8A8A8E]">04</span> <span className="text-white ml-2">FUTURE SELF</span></div>
          </div>
          <button onClick={() => onUse({})} className="w-full py-3 bg-white text-black font-bold uppercase text-xs rounded-lg">Otwórz w Studio (podmień foty i tekst)</button>
        </div>
      )}
    </div>
  );
}

function TabFallback() {
  return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-[#1E1E20] border-t-[#00D9FF] rounded-full animate-spin" /></div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [qrModal, setQrModal] = useState<any>({ isOpen: false });
  const [videoModal, setVideoModal] = useState<any>({ isOpen: false });
  const [carouselModal, setCarouselModal] = useState<any>({ isOpen: false });
  const [data, setData] = useState<any>({ posts: [], vault_assets: [], carousel_packages: [], xp: 0, social_handles: { instagram: 'sf_void' }, saved_trends: [] });

  useEffect(() => {
    const stored = localStorage.getItem('stark_focus_data');
    if (stored) { try { setData(JSON.parse(stored)); } catch {} }
  }, []);

  const tabs = [
    { label: 'REPLIKATOR', icon: Copy },
    { label: 'NOWY POST', icon: Sparkles },
    { label: 'MOJE POSTY', icon: Layers },
    { label: 'TRENDY & IDEE', icon: Radio },
    { label: 'GRAFIKI', icon: Box },
    { label: 'HOOK LAB', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F3]">
      <div className="border-b border-[#1E1E20] bg-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#111113] border border-[#1E1E20] flex items-center justify-center font-bold tracking-widest">SF</div>
            <div>
              <div className="text-[13px] font-bold tracking-[0.3em]">SF • VOID • v2.0 DZIALA</div>
              <div className="text-[9px] font-mono text-[#8A8A8E] tracking-widest">TIME IS RUNNING • VOID PROTOCOL</div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#00D9FF] border border-[#00D9FF]/30 px-2 py-1 rounded">OFFLINE • MINIMAL • FIXED</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-4">
        <nav className="flex flex-wrap gap-2 pb-4 border-b border-[#1E1E20] mb-6">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button key={idx} onClick={() => setActiveTab(idx)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-mono font-bold tracking-wider ${isActive ? 'bg-[#F5F5F3] text-black' : 'bg-[#111113] text-[#8A8A8E] border border-[#1E1E20]'}`}>
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </nav>

        <main>
          <Suspense fallback={<TabFallback />}>
            {activeTab === 0 && <ReplicatorInline onUse={() => setActiveTab(1)} />}
            {activeTab === 1 && <InspirationStudio1to1 onSaveToPipeline={(p: any) => setData((d: any) => ({ ...d, posts: [p, ...d.posts] }))} userHandle="sf_void" />}
            {activeTab === 2 && <PipelineTab data={data} onUpdateData={(fn: any) => setData((d: any) => fn(d))} onOpenVideoStudio={(h: any, bg: any) => setVideoModal({ isOpen: true, hookText: h, bgUrl: bg })} onOpenCarouselStudio={(t: any, s: any) => setCarouselModal({ isOpen: true, title: t, slides: s })} />}
            {activeTab === 3 && <AiRadarTab data={data} onUpdateData={(fn: any) => setData((d: any) => fn(d))} onOpenQR={(t: any, d: any) => setQrModal({ isOpen: true, title: t, data: d })} onNavigateToTab={(i: number) => setActiveTab(i)} />}
            {activeTab === 4 && <VaultTab data={data} onUpdateData={(fn: any) => setData((d: any) => fn(d))} onOpenVideoStudio={(h: any, bg: any) => setVideoModal({ isOpen: true, hookText: h, bgUrl: bg })} onOpenCarouselStudio={(t: any, s: any) => setCarouselModal({ isOpen: true, title: t, slides: s })} onSwitchToMentor={() => setActiveTab(5)} onSwitchToPipeline={() => setActiveTab(2)} />}
            {activeTab === 5 && <MentorTab data={data} onUpdateData={(fn: any) => setData((d: any) => fn(d))} onSwitchTab={(i: number) => setActiveTab(i)} onOpenVideoStudio={(h: any) => setVideoModal({ isOpen: true, hookText: h })} onOpenCarouselStudio={(t: any, s: any) => setCarouselModal({ isOpen: true, title: t, slides: s })} />}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        <QRModal isOpen={qrModal.isOpen} onClose={() => setQrModal({ isOpen: false })} title={qrModal.title} data={qrModal.data} />
        {videoModal.isOpen && <VideoStudioModal onClose={() => setVideoModal({ isOpen: false })} initialHook={videoModal.hookText} initialBgUrl={videoModal.bgUrl} availablePosts={data.posts} vaultAssets={data.vault_assets} />}
        {carouselModal.isOpen && <CarouselStudioModal isOpen={carouselModal.isOpen} onClose={() => setCarouselModal({ isOpen: false })} initialTitle={carouselModal.title} initialSlides={carouselModal.slides} handle="sf_void" vaultAssets={data.vault_assets} />}
      </Suspense>
    </div>
  );
}
