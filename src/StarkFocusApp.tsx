// StarkFocusApp.tsx - FIXED bez AuditTab / Wyniki Konta
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layers, Box, Brain, Radio, Sparkles } from 'lucide-react';
import { StarkFocusData, Post } from './types';
import { loadStoredData, saveStoredData } from './utils/storage';
import { Header } from './components/Header';

// Lazy - ciężkie moduły
const InspirationStudio1to1 = lazy(() => import('./components/InspirationStudio1to1').then(m => ({ default: m.InspirationStudio1to1 })));
const PipelineTab = lazy(() => import('./components/tabs/PipelineTab').then(m => ({ default: m.PipelineTab })));
const AiRadarTab = lazy(() => import('./components/tabs/AiRadarTab').then(m => ({ default: m.AiRadarTab })));
const VaultTab = lazy(() => import('./components/tabs/VaultTab').then(m => ({ default: m.VaultTab })));
const MentorTab = lazy(() => import('./components/tabs/MentorTab').then(m => ({ default: m.MentorTab })));
const QRModal = lazy(() => import('./components/QRModal').then(m => ({ default: m.QRModal })));
const VideoStudioModal = lazy(() => import('./components/VideoStudioModal').then(m => ({ default: m.VideoStudioModal })));
const CarouselStudioModal = lazy(() => import('./components/CarouselStudioModal').then(m => ({ default: m.CarouselStudioModal })));

// USUNIĘTE: const AuditTab = lazy(() => import("./components/tabs/AuditTab")) <- to powodowało błąd

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#1E2638] border-t-[#38BDF8] rounded-full animate-spin" />
        <div className="text-[11px] font-mono text-slate-400 animate-pulse">Ładowanie modułu...</div>
      </div>
    </div>
  );
}

export default function StarkFocusApp({ onOpenVoidStudio }: { onOpenVoidStudio?: () => void } = {}) {
  const [data, setData] = useState<StarkFocusData>(() => loadStoredData());
  const [activeTab, setActiveTab] = useState<number>(0);

  const [qrModal, setQrModal] = useState<{ isOpen: boolean; title: string; data: string }>({ isOpen: false, title: '', data: '' });
  const [videoStudioModal, setVideoStudioModal] = useState<{ isOpen: boolean; hookText: string; bgUrl?: string }>({ isOpen: false, hookText: '', bgUrl: '' });
  const [carouselStudioModal, setCarouselStudioModal] = useState<{ isOpen: boolean; title?: string; slides?: any[] }>({ isOpen: false, title: '', slides: undefined });

  useEffect(() => { saveStoredData(data); }, [data]);

  const handleUpdateData = (updater: (prev: StarkFocusData) => StarkFocusData) => {
    setData(prev => updater(prev));
  };

  const handleSavePostFrom1to1 = (post: any) => {
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
    handleUpdateData(prev => ({ ...prev, posts: [newPost, ...prev.posts], xp: prev.xp + 50 }));
    setActiveTab(1);
  };

  const readyPostsCount = (data.posts || []).filter((p) => p.status !== 'published').length;

  // 5 ZAKŁADEK - BEZ WYNIKI KONTA
  const tabs = [
    { id: 'tab-studio', label: '✨ Nowy Post', subtitle: 'Generator 1:1', icon: Sparkles },
    { id: 'tab-pipeline', label: '📋 Moje Posty', subtitle: `${readyPostsCount} szkiców`, badge: readyPostsCount > 0 ? readyPostsCount : undefined, icon: Layers },
    { id: 'tab-radar', label: '🔥 Trendy & Pomysły', subtitle: 'Viral AI', icon: Radio },
    { id: 'tab-vault', label: '🎨 Grafiki & Prompty', subtitle: 'Bing DALL-E', icon: Box },
    { id: 'tab-mentor', label: '⚔️ Test Hooków (AI)', subtitle: 'Retencja 3s', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-[#090C14] text-[#E2E8F0] font-sans antialiased selection:bg-[#38BDF8]/30 selection:text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4">
        <Header
          data={data}
          onUpdateData={handleUpdateData}
          onOpenVideoStudio={() => setVideoStudioModal({ isOpen: true, hookText: '' })}
          onOpenCarouselStudio={() => setCarouselStudioModal({ isOpen: true, title: '' })}
          onOpenVoidStudio={onOpenVoidStudio}
        />

        <nav className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#1E2638] mb-5 select-none">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button key={tab.id} onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${isActive ? 'bg-[#38BDF8] text-[#090C14] shadow-md scale-[1.02]' : 'bg-[#111622] text-slate-300 border border-[#1E2638] hover:border-[#38BDF8]/60 hover:text-white'}`}>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#090C14]' : 'text-[#38BDF8]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (<span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-[#090C14] text-[#38BDF8]' : 'bg-[#38BDF8]/20 text-[#38BDF8]'}`}>{tab.badge}</span>)}
              </button>
            );
          })}
        </nav>

        <main>
          <Suspense fallback={<TabFallback />}>
            {activeTab === 0 && (<InspirationStudio1to1 onSaveToPipeline={handleSavePostFrom1to1} userHandle={data.social_handles?.instagram || 'stark_focus'} />)}
            {activeTab === 1 && (<PipelineTab data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={(hookText, bgUrl) => setVideoStudioModal({ isOpen: true, hookText, bgUrl: bgUrl || '' })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} />)}
            {activeTab === 2 && (<AiRadarTab data={data} onUpdateData={handleUpdateData} onOpenQR={(title, payload) => setQrModal({ isOpen: true, title, data: payload })} onNavigateToTab={(tabIdx) => setActiveTab(tabIdx)} />)}
            {activeTab === 3 && (<VaultTab data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={(hookText, bgUrl) => setVideoStudioModal({ isOpen: true, hookText: hookText || '', bgUrl: bgUrl || '' })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} onSwitchToMentor={() => setActiveTab(4)} onSwitchToPipeline={() => setActiveTab(1)} />)}
            {activeTab === 4 && (<MentorTab data={data} onUpdateData={handleUpdateData} onSwitchTab={(idx) => setActiveTab(idx)} onOpenVideoStudio={(hookText) => setVideoStudioModal({ isOpen: true, hookText })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} />)}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        <QRModal isOpen={qrModal.isOpen} onClose={() => setQrModal(prev => ({ ...prev, isOpen: false }))} title={qrModal.title} data={qrModal.data} />
        {videoStudioModal.isOpen && (<VideoStudioModal onClose={() => setVideoStudioModal(prev => ({ ...prev, isOpen: false }))} initialHook={videoStudioModal.hookText} initialBgUrl={videoStudioModal.bgUrl} availablePosts={data.posts} vaultAssets={data.vault_assets} />)}
        {carouselStudioModal.isOpen && (<CarouselStudioModal isOpen={carouselStudioModal.isOpen} onClose={() => setCarouselStudioModal(prev => ({ ...prev, isOpen: false }))} initialTitle={carouselStudioModal.title} initialSlides={carouselStudioModal.slides} handle={data.social_handles?.instagram || 'stark_focus'} vaultAssets={data.vault_assets} />)}
      </Suspense>
    </div>
  );
}
