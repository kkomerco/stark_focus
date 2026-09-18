// StarkFocusApp.tsx - Visionary Media Lab / Stark Focus OS
import React, { useState, useEffect, lazy, Suspense } from "react";
import { Sparkles, Film, Flame } from "lucide-react";
import { StarkFocusData, Post } from "./types";
import { loadStoredData, saveStoredData } from "./utils/storage";
import { Header } from "./components/Header";

// Lazy - aktywne 3 moduły
const InspirationStudio1to1 = lazy(() =>
  import("./components/InspirationStudio1to1").then((m) => ({ default: m.InspirationStudio1to1 })),
);
const VideoStudioModal = lazy(() =>
  import("./components/VideoStudioModal").then((m) => ({ default: m.VideoStudioModal })),
);
const AiRadarTab = lazy(() =>
  import("./components/tabs/AiRadarTab").then((m) => ({ default: m.AiRadarTab })),
);

const QRModal = lazy(() => import("./components/QRModal").then((m) => ({ default: m.QRModal })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-xs font-mono text-neutral-400 tracking-wider">Ładowanie modułu...</div>
      </div>
    </div>
  );
}

export default function StarkFocusApp() {
  const [data, setData] = useState<StarkFocusData>(() => loadStoredData());
  const [activeTab, setActiveTab] = useState<number>(0);

  // Injected data from "Trendy i Pomysły" tab
  const [postPreset, setPostPreset] = useState<{ text?: string; caption?: string }>({});
  const [reelPreset, setReelPreset] = useState<{ hook?: string; bgUrl?: string }>({});

  const [qrModal, setQrModal] = useState<{ isOpen: boolean; title: string; data: string }>({
    isOpen: false,
    title: "",
    data: "",
  });

  useEffect(() => {
    saveStoredData(data);
  }, [data]);

  const handleUpdateData = (updater: (prev: StarkFocusData) => StarkFocusData) => {
    setData((prev) => updater(prev));
  };

  const handleSavePostFrom1to1 = (post: any) => {
    const newPost: Post = {
      id: post.id || "post-" + Date.now(),
      title: post.title,
      platform: "Instagram",
      format: post.format,
      asset: post.asset || "Monolith_Ledger",
      caption: post.caption,
      created_date: new Date().toISOString().split("T")[0],
      published_date: null,
    };
    handleUpdateData((prev) => ({ ...prev, posts: [newPost, ...prev.posts], xp: prev.xp + 50 }));
  };

  const handleSendToPost = (text: string, caption?: string) => {
    setPostPreset({ text, caption });
    setActiveTab(0);
  };

  const handleSendToReel = (hookText: string, bgUrl?: string) => {
    setReelPreset({ hook: hookText, bgUrl });
    setActiveTab(1);
  };

  const tabs = [
    {
      id: "tab-post",
      label: "Post",
      tag: "JPG / PNG",
      subtitle: "Generator grafik 1:1",
      icon: Sparkles,
    },
    {
      id: "tab-reel",
      label: "Rolka",
      tag: "WIDEO 9s",
      subtitle: "Automontażysta rolek",
      icon: Film,
    },
    {
      id: "tab-trends",
      label: "Trendy i Pomysły",
      tag: "VIRAL AI",
      subtitle: "Baza kątów i hooków",
      icon: Flame,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] font-sans antialiased selection:bg-white/20 selection:text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4">
        <Header data={data} onUpdateData={handleUpdateData} activeTab={activeTab} />

        {/* 3 Główne Zakładki - Wyrazisty Segmented Control */}
        <nav className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pb-4 mb-5 border-b border-white/10 select-none">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(idx)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isActive
                    ? "bg-white text-black border-white shadow-[0_4px_20px_rgba(255,255,255,0.12)] scale-[1.01]"
                    : "bg-[#0C0C0C] border-white/10 text-neutral-400 hover:text-white hover:border-white/30 hover:bg-[#121212]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive ? "bg-black text-white" : "bg-white/10 text-neutral-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black uppercase tracking-wider">
                        {tab.label}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] font-mono ${
                        isActive ? "text-neutral-700" : "text-neutral-500"
                      }`}
                    >
                      {tab.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? "bg-black/10 text-black"
                      : "bg-white/5 text-neutral-400 border border-white/5"
                  }`}
                >
                  {tab.tag}
                </span>
              </button>
            );
          })}
        </nav>

        <main>
          <Suspense fallback={<TabFallback />}>
            {activeTab === 0 && (
              <InspirationStudio1to1
                key={postPreset.text || "default-post"}
                onSaveToPipeline={handleSavePostFrom1to1}
                userHandle={data.social_handles?.instagram || "stark_focus"}
                initialText={postPreset.text}
                initialCaption={postPreset.caption}
                onSendToReel={handleSendToReel}
              />
            )}
            {activeTab === 1 && (
              <VideoStudioModal
                key={reelPreset.hook || "default-reel"}
                embedded={true}
                initialHook={reelPreset.hook}
                initialBgUrl={reelPreset.bgUrl}
                availablePosts={data.posts}
                vaultAssets={data.vault_assets}
                onSendToPost={handleSendToPost}
              />
            )}
            {activeTab === 2 && (
              <AiRadarTab
                data={data}
                onUpdateData={handleUpdateData}
                onOpenQR={(title, payload) => setQrModal({ isOpen: true, title, data: payload })}
                onNavigateToTab={(tabIdx) => setActiveTab(tabIdx)}
                onSendToPost={handleSendToPost}
                onSendToReel={handleSendToReel}
              />
            )}
          </Suspense>
        </main>
      </div>

      <Suspense fallback={null}>
        <QRModal
          isOpen={qrModal.isOpen}
          onClose={() => setQrModal((prev) => ({ ...prev, isOpen: false }))}
          title={qrModal.title}
          data={qrModal.data}
        />
      </Suspense>
    </div>
  );
}
