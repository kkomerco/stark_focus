import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layers, Box, Brain, TrendingUp, Radio, Sparkles } from 'lucide-react';
import { StarkFocusData, Post } from './types';
import { loadStoredData, saveStoredData } from './utils/storage';
import { Header } from './components/Header';
import { InspirationStudio1to1 } from './components/InspirationStudio1to1';
import { PipelineTab } from './components/tabs/PipelineTab';
import { AiRadarTab } from './components/tabs/AiRadarTab';
import { VaultTab } from './components/tabs/VaultTab';
import { MentorTab } from './components/tabs/MentorTab';
import { AuditTab } from './components/tabs/AuditTab';
import { QRModal } from './components/QRModal';
import { VideoStudioModal } from './components/VideoStudioModal';
import { CarouselStudioModal } from './components/CarouselStudioModal';

export default function App() {
  const [data, setData] = useState<StarkFocusData>(() => {
    try {
      const d = loadStoredData();
      return d && d.posts ? d : { ...d, posts: [], vault_assets: d?.vault_assets || [], xp: d?.xp || 0, social_handles: d?.social_handles || {} } as any;
    } catch { return loadStoredData(); }
  });
  const [activeTab, setActiveTab] = useState<number>(0);
  const [lastSaved, setLastSaved] = useState<string>('');

  const [qrModal, setQrModal] = useState<{ isOpen: boolean; title: string; data: string }>({ isOpen: false, title: '', data: '' });
  const [videoStudioModal, setVideoStudioModal] = useState<{ isOpen: boolean; hookText: string; bgUrl?: string }>({ isOpen: false, hookText: '', bgUrl: '' });
  const [carouselStudioModal, setCarouselStudioModal] = useState<{ isOpen: boolean; title?: string; slides?: any[] }>({ isOpen: false, title: '', slides: undefined });

  // BEZPIECZNY debounced save - nie wywala apki
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        saveStoredData(data);
        setLastSaved(new Date().toLocaleTimeString());
      } catch {}
    }, 800);
    return () => clearTimeout(id);
  }, [data]);

  const handleUpdateData = useCallback((updater: (prev: StarkFocusData) => StarkFocusData) => {
    setData(prev => updater(prev));
  }, []);

  const handleSavePostFrom1to1 = useCallback((post: any) => {
    const newPost: Post = {
      id: post.id || 'post-' + Date.now(),
      title: post.title,
      platform: 'Instagram',
      format: post.format,
      asset: post.asset || 'Monolith_Ledger',
      caption: post.caption,
      status: 'draft',
      created_date: new Date().toISOString().split('T')[0],
      published_date: null
    };
    handleUpdateData(prev => ({ ...prev, posts: [newPost, ...prev.posts], xp: (prev.xp || 0) + 50 }));
    setActiveTab(1);
  }, [handleUpdateData]);

  const readyPostsCount = useMemo(() => (data?.posts || []).filter((p: any) => p.status !== 'published').length, [data.posts]);

  // Minimalne skróty - tylko cyfry i N - nie kolidują z inputami
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setActiveTab(Number(e.key) - 1);
      }
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        setActiveTab(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tabs = [
    { id: 'tab-studio', label: '✨ Nowy Post', subtitle: 'Generator 1:1', icon: Sparkles },
    { id: 'tab-pipeline', label: '📋 Moje Posty', subtitle: `${readyPostsCount} szkiców`, badge: readyPostsCount > 0 ? readyPostsCount : undefined, icon: Layers },
    { id: 'tab-radar', label: '🔥 Trendy & Pomysły', subtitle: 'Viral AI', icon: Radio },
    { id: 'tab-vault', label: '🎨 Grafiki & Prompty', subtitle: 'Bing DALL-E', icon: Box },
    { id: 'tab-mentor', label: '⚔️ Test Hooków (AI)', subtitle: 'Retencja 3s', icon: Brain },
    { id: 'tab-audit', label: '📈 Wyniki Konta', subtitle: 'Statystyki', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-[#090C14] text-[#E2E8F0] font-sans antialiased selection:bg-[#38BDF8]/30 selection:text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4">
        <div className="mb-1 text-[10px] font-mono text-slate-500">
          {lastSaved ? `zapisano ${lastSaved}` : 'auto-zapis aktywny'} • naciśnij 1-6 lub N aby przełączyć • produktywność: ON
        </div>
        <Header data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={() => setVideoStudioModal({ isOpen: true, hookText: '' })} onOpenCarouselStudio={() => setCarouselStudioModal({ isOpen: true, title: '' })} />
        <nav className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#1E2638] mb-5 select-none">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button key={tab.id} onClick={() => setActiveTab(idx)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${isActive ? 'bg-[#38BDF8] text-[#090C14] shadow-md scale-[1.02]' : 'bg-[#111622] text-slate-300 border border-[#1E2638] hover:border-[#38BDF8]/60 hover:text-white'}`}>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#090C14]' : 'text-[#38BDF8]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-[#090C14] text-[#38BDF8]' : 'bg-[#38BDF8]/20 text-[#38BDF8]'}`}>{tab.badge}</span>}
              </button>
            );
          })}
        </nav>
        <main>
          {activeTab === 0 && <div className="space-y-6"><InspirationStudio1to1 onSaveToPipeline={handleSavePostFrom1to1} userHandle={data.social_handles?.instagram || 'stark_focus'} /></div>}
          {activeTab === 1 && <PipelineTab data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={(hookText, bgUrl) => setVideoStudioModal({ isOpen: true, hookText, bgUrl: bgUrl || '' })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} />}
          {activeTab === 2 && <AiRadarTab data={data} onUpdateData={handleUpdateData} onOpenQR={(title, payload) => setQrModal({ isOpen: true, title, data: payload })} onNavigateToTab={(tabIdx) => setActiveTab(tabIdx)} />}
          {activeTab === 3 && <VaultTab data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={(hookText, bgUrl) => setVideoStudioModal({ isOpen: true, hookText: hookText || '', bgUrl: bgUrl || '' })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} onSwitchToMentor={() => setActiveTab(4)} onSwitchToPipeline={() => setActiveTab(1)} />}
          {activeTab === 4 && <MentorTab data={data} onUpdateData={handleUpdateData} onSwitchTab={(idx) => setActiveTab(idx)} onOpenVideoStudio={(hookText) => setVideoStudioModal({ isOpen: true, hookText })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} />}
          {activeTab === 5 && <AuditTab data={data} onUpdateData={handleUpdateData} />}
        </main>
      </div>
      <QRModal isOpen={qrModal.isOpen} onClose={() => setQrModal(prev => ({ ...prev, isOpen: false }))} title={qrModal.title} data={qrModal.data} />
      {videoStudioModal.isOpen && <VideoStudioModal onClose={() => setVideoStudioModal(prev => ({ ...prev, isOpen: false }))} initialHook={videoStudioModal.hookText} initialBgUrl={videoStudioModal.bgUrl} availablePosts={data.posts} vaultAssets={data.vault_assets} />}
      {carouselStudioModal.isOpen && <CarouselStudioModal isOpen={carouselStudioModal.isOpen} onClose={() => setCarouselStudioModal(prev => ({ ...prev, isOpen: false }))} initialTitle={carouselStudioModal.title} initialSlides={carouselStudioModal.slides} handle={data.social_handles?.instagram || 'stark_focus'} vaultAssets={data.vault_assets} />}
    </div>
  );
}
