// StarkFocusApp.tsx - Visionary Media Lab / Stark Focus OS
import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Sparkles,
  Film,
  Flame,
  Calendar,
  Lightbulb,
  Link2,
  TestTubes,
  Rocket,
  Image as ImageIcon,
} from "lucide-react";
import { StarkFocusData, Post, PlannerTask } from "./types";
import { loadStoredData, saveStoredData } from "./utils/storage";
import { Header } from "./components/Header";

// Lazy - aktywne moduły
const InspirationStudio1to1 = lazy(() =>
  import("./components/InspirationStudio1to1").then((m) => ({ default: m.InspirationStudio1to1 })),
);
const VideoStudioModal = lazy(() =>
  import("./components/VideoStudioModal").then((m) => ({ default: m.VideoStudioModal })),
);
const AiRadarTab = lazy(() =>
  import("./components/tabs/AiRadarTab").then((m) => ({ default: m.AiRadarTab })),
);
const DailyPackModal = lazy(() =>
  import("./components/DailyPackModal").then((m) => ({ default: m.DailyPackModal })),
);
const IdeaStreamModal = lazy(() =>
  import("./components/IdeaStreamModal").then((m) => ({ default: m.IdeaStreamModal })),
);
const DeconstructViralModal = lazy(() =>
  import("./components/DeconstructViralModal").then((m) => ({ default: m.DeconstructViralModal })),
);
const AbModal = lazy(() => import("./components/AbModal").then((m) => ({ default: m.AbModal })));
const AutopilotModal = lazy(() =>
  import("./components/AutopilotModal").then((m) => ({ default: m.AutopilotModal })),
);
const PromptLibraryModal = lazy(() =>
  import("./components/PromptLibraryModal").then((m) => ({ default: m.PromptLibraryModal })),
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

  const [dailyPackOpen, setDailyPackOpen] = useState(false);
  const [ideaStreamOpen, setIdeaStreamOpen] = useState(false);
  const [deconstructOpen, setDeconstructOpen] = useState(false);
  const [abOpen, setAbOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [promptLibOpen, setPromptLibOpen] = useState(false);

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

  // Generuje zadania publikacji w plannerze na podstawie paczki dnia
  const handleSchedulePack = (pack: {
    reels: Array<{ hook: string; duration: number }>;
    carousel: { title: string };
    post: { headline: string };
  }) => {
    const today = new Date().toISOString().split("T")[0];
    const tasks: PlannerTask[] = [];

    // Rolki — publikacja o 12:00, 15:00, 18:00
    const reelTimes = ["12:00", "15:00", "18:00"];
    pack.reels.forEach((reel, idx) => {
      tasks.push({
        id: `task-${Date.now()}-reel-${idx}`,
        time: reelTimes[idx] || "18:00",
        title: `Publikacja Rolki ${idx + 1}: ${reel.hook.slice(0, 40)}...`,
        category: "post",
        targetTab: 1,
        completed: false,
        date: today,
        actionLabel: "Otwórz Studio Rolek",
      });
    });

    // Karuzela — publikacja o 14:00
    tasks.push({
      id: `task-${Date.now()}-carousel`,
      time: "14:00",
      title: `Publikacja Karuzeli: ${pack.carousel.title.slice(0, 40)}...`,
      category: "post",
      targetTab: 2,
      completed: false,
      date: today,
      actionLabel: "Otwórz Studio Karuzeli",
    });

    // Post 1:1 — publikacja o 20:00
    tasks.push({
      id: `task-${Date.now()}-post`,
      time: "20:00",
      title: `Publikacja Posta 1:1: ${pack.post.headline.slice(0, 40)}...`,
      category: "post",
      targetTab: 0,
      completed: false,
      date: today,
      actionLabel: "Otwórz Studio Posta",
    });

    handleUpdateData((prev) => ({
      ...prev,
      planner_tasks: [...(prev.planner_tasks || []), ...tasks],
    }));
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

        {/* Pasek akcji: Paczka Dnia + Nieskończone Pomysły + Analiza Virala */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDailyPackOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              Paczka Dnia
            </button>
            <button
              onClick={() => setIdeaStreamOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/30 hover:to-fuchsia-500/30 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Lightbulb className="w-4 h-4" />
              Nieskończone Pomysły
            </button>
            <button
              onClick={() => setDeconstructOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-cyan-500/20 hover:from-sky-500/30 hover:to-cyan-500/30 border border-sky-500/30 text-sky-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Link2 className="w-4 h-4" />
              Analiza Virala (Link)
            </button>
            <button
              onClick={() => setAbOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <TestTubes className="w-4 h-4" />
              Test A/B
            </button>
            <button
              onClick={() => setAutopilotOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-orange-500/20 hover:from-rose-500/30 hover:to-orange-500/30 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Rocket className="w-4 h-4" />
              Autopilot Tygień
            </button>
            <button
              onClick={() => setPromptLibOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-lime-500/15 to-emerald-500/15 hover:from-lime-500/25 hover:to-emerald-500/25 border border-lime-500/30 text-lime-300 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              Biblioteka Promptów
            </button>
          </div>
          <div className="text-[10px] font-mono text-neutral-500">
            {data.planner_tasks?.filter((t) => !t.completed).length || 0} zadań •{" "}
            {data.used_idea_fingerprints?.length || 0} użytych pomysłów
          </div>
        </div>

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
        {dailyPackOpen && (
          <DailyPackModal
            isOpen={dailyPackOpen}
            onClose={() => setDailyPackOpen(false)}
            onOpenVideoStudio={(hookText) => {
              setDailyPackOpen(false);
              handleSendToReel(hookText);
            }}
            onOpenCarouselStudio={(title, slides) => {
              setDailyPackOpen(false);
              // Przekierowanie do zakładki Trendy gdzie jest Studio Karuzeli
              setActiveTab(2);
            }}
            onSchedulePack={handleSchedulePack}
          />
        )}
        {ideaStreamOpen && (
          <IdeaStreamModal
            isOpen={ideaStreamOpen}
            onClose={() => setIdeaStreamOpen(false)}
            data={data}
            onUpdateData={handleUpdateData}
            onSendToReel={(hookText) => {
              setIdeaStreamOpen(false);
              handleSendToReel(hookText);
            }}
            onSendToPost={(text) => {
              setIdeaStreamOpen(false);
              handleSendToPost(text);
            }}
          />
        )}
        {deconstructOpen && (
          <DeconstructViralModal
            isOpen={deconstructOpen}
            onClose={() => setDeconstructOpen(false)}
            onSendToReel={(hookText) => {
              setDeconstructOpen(false);
              handleSendToReel(hookText);
            }}
          />
        )}
        {abOpen && (
          <AbModal
            isOpen={abOpen}
            onClose={() => setAbOpen(false)}
            data={data}
            onUpdateData={handleUpdateData}
            onSendToReel={(hookText) => {
              setAbOpen(false);
              handleSendToReel(hookText);
            }}
          />
        )}
        {autopilotOpen && (
          <AutopilotModal
            isOpen={autopilotOpen}
            onClose={() => setAutopilotOpen(false)}
            data={data}
            onUpdateData={handleUpdateData}
          />
        )}
        {promptLibOpen && (
          <PromptLibraryModal
            isOpen={promptLibOpen}
            onClose={() => setPromptLibOpen(false)}
            data={data}
            onUpdateData={handleUpdateData}
          />
        )}
      </Suspense>
    </div>
  );
}
