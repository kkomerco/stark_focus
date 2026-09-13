// App.tsx - FINAL VOID SF - minimalistycznie elegancko pod logo
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Layers, Box, Brain, Radio, Sparkles, Copy } from 'lucide-react';
import { StarkFocusData, Post } from './types';
import { loadStoredData, saveStoredData } from './utils/storage';
import { Header } from './components/Header';

const InspirationStudio1to1 = lazy(() => import('./components/InspirationStudio1to1').then(m => ({ default: m.InspirationStudio1to1 })));
const PipelineTab = lazy(() => import('./components/tabs/PipelineTab').then(m => ({ default: m.PipelineTab })));
const AiRadarTab = lazy(() => import('./components/tabs/AiRadarTab').then(m => ({ default: m.AiRadarTab })));
const VaultTab = lazy(() => import('./components/tabs/VaultTab').then(m => ({ default: m.VaultTab })));
const MentorTab = lazy(() => import('./components/tabs/MentorTab').then(m => ({ default: m.MentorTab })));
const ReplicatorTab = lazy(() => import('./components/tabs/ReplicatorTab').then(m => ({ default: m.ReplicatorTab })));
const QRModal = lazy(() => import('./components/QRModal').then(m => ({ default: m.QRModal })));
const VideoStudioModal = lazy(() => import('./components/VideoStudioModal').then(m => ({ default: m.VideoStudioModal })));
const CarouselStudioModal = lazy(() => import('./components/CarouselStudioModal').then(m => ({ default: m.CarouselStudioModal })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[#1E1E20] border-t-[#00D9FF] rounded-full animate-spin" />
        <div className="text-[11px] font-mono text-[#8A8A8E] animate-pulse">VOID LOADING...</div>
      </div>
    </div>
  );
}

export default function App() {
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
      asset: post.asset || 'VOID_SF',
      caption: post.caption,
      status: 'draft',
      created_date: new Date().toISOString().split('T')[0],
      published_date: null
    };
    handleUpdateData(prev => ({ ...prev, posts: [newPost, ...prev.posts], xp: prev.xp + 50 }));
    setActiveTab(1);
  };

  const readyPostsCount = (data.posts || []).filter((p: any) => p.status !== 'published').length;

  // MINIMALISTYCZNE ZAKŁADKI - VOID SF
  const tabs = [
    { id: 'tab-replicator', label: 'REPLIKATOR', subtitle: 'Kopiuj strukturę', icon: Copy },
    { id: 'tab-studio', label: 'NOWY POST', subtitle: 'Generator 1:1', icon: Sparkles },
    { id: 'tab-pipeline', label: 'MOJE POSTY', subtitle: `${readyPostsCount} szkiców`, badge: readyPostsCount > 0 ? readyPostsCount : undefined, icon: Layers },
    { id: 'tab-radar', label: 'TRENDY & IDEE', subtitle: 'Nieskończone', icon: Radio },
    { id: 'tab-vault', label: 'GRAFIKI', subtitle: 'VOID Tła', icon: Box },
    { id: 'tab-mentor', label: 'HOOK LAB', subtitle: 'Test 3s', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#F5F5F3] font-sans antialiased selection:bg-[#00D9FF]/30 selection:text-white">
      {/* VOID HEADER z logo */}
      <div className="border-b border-[#1E1E20] bg-[#000000]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SF" className="w-8 h-8 rounded-full border border-[#1E1E20]" />
            <div>
              <div className="text-[13px] font-bold tracking-[0.2em]">SF • VOID</div>
              <div className="text-[10px] font-mono text-[#8A8A8E]">TIME IS RUNNING • DISCIPLINE PROTOCOL</div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#00D9FF]">{data.xp || 0} XP • OFFLINE • VOID</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4">
        <nav className="flex flex-wrap items-center gap-2 pb-4 border-b border-[#1E1E20] mb-6 select-none">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button key={tab.id} onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[11px] font-mono font-bold transition-all whitespace-nowrap cursor-pointer tracking-wider ${isActive ? 'bg-[#F5F5F3] text-black shadow-md scale-[1.02]' : 'bg-[#111113] text-[#8A8A8E] border border-[#1E1E20] hover:border-[#F5F5F3]/30 hover:text-[#F5F5F3]'}`}>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#8A8A8E]'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (<span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-black text-white' : 'bg-[#00D9FF]/20 text-[#00D9FF]'}`}>{tab.badge}</span>)}
              </button>
            );
          })}
        </nav>

        <main>
          <Suspense fallback={<TabFallback />}>
            {activeTab === 0 && (<ReplicatorTab onCreateFromTemplate={(tpl) => { console.log(tpl); setActiveTab(1); }} />)}
            {activeTab === 1 && (<InspirationStudio1to1 onSaveToPipeline={handleSavePostFrom1to1} userHandle={data.social_handles?.instagram || 'sf_void'} />)}
            {activeTab === 2 && (<PipelineTab data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={(hookText, bgUrl) => setVideoStudioModal({ isOpen: true, hookText, bgUrl: bgUrl || '' })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} />)}
            {activeTab === 3 && (<AiRadarTab data={data} onUpdateData={handleUpdateData} onOpenQR={(title, payload) => setQrModal({ isOpen: true, title, data: payload })} onNavigateToTab={(tabIdx) => setActiveTab(tabIdx)} />)}
            {activeTab === 4 && (<VaultTab data={data} onUpdateData={handleUpdateData} onOpenVideoStudio={(hookText, bgUrl) => setVideoStudioModal({ isOpen: true, hookText: hookText || '', bgUrl: bgUrl || '' })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} onSwitchToMentor={() => setActiveTab(5)} onSwitchToPipeline={() => setActiveTab(2)} />)}
            {activeTab === 5 && (<MentorTab data={data} onUpdateData={handleUpdateData} onSwitchTab={(idx) => setActiveTab(idx)} onOpenVideoStudio={(hookText) => setVideoStudioModal({ isOpen: true, hookText })} onOpenCarouselStudio={(title, slides) => setCarouselStudioModal({ isOpen: true, title, slides })} />)}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        <QRModal isOpen={qrModal.isOpen} onClose={() => setQrModal(prev => ({ ...prev, isOpen: false }))} title={qrModal.title} data={qrModal.data} />
        {videoStudioModal.isOpen && (<VideoStudioModal onClose={() => setVideoStudioModal(prev => ({ ...prev, isOpen: false }))} initialHook={videoStudioModal.hookText} initialBgUrl={videoStudioModal.bgUrl} availablePosts={data.posts} vaultAssets={data.vault_assets} />)}
        {carouselStudioModal.isOpen && (<CarouselStudioModal isOpen={carouselStudioModal.isOpen} onClose={() => setCarouselStudioModal(prev => ({ ...prev, isOpen: false }))} initialTitle={carouselStudioModal.title} initialSlides={carouselStudioModal.slides} handle={data.social_handles?.instagram || 'sf_void'} vaultAssets={data.vault_assets} />)}
      </Suspense>
    </div>
  );
}
