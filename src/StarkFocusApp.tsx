// StarkFocusApp.tsx - Visionary Media Lab / Stark Focus OS
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
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
  ListChecks,
} from "lucide-react";
import {
  DailyPack,
  DeconstructViralResponse,
  IdeaItem,
  ReelHandoff,
  StarkFocusData,
  Post,
  PlannerTask,
  UniversalLayoutSpec,
} from "./types";
import { specFromIdea } from "./utils/ideaLayout";
import { usedHookFingerprints } from "./lib/usedContent";
import { loadStoredData, normalizePlannerTasks, saveStoredData } from "./utils/storage";
import { useIdeaStream } from "./hooks/useIdeaStream";
import type { AbDraft } from "./components/AbModal";
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
const PipelineTab = lazy(() =>
  import("./components/PipelineTab").then((m) => ({ default: m.PipelineTab })),
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

const AB_DEFAULT_TOPIC = "dark motivation and brutal discipline";

const EMPTY_AB_DRAFT: AbDraft = {
  topic: AB_DEFAULT_TOPIC,
  variants: [],
  experimentId: "",
  results: [],
  conclusion: null,
};

export default function StarkFocusApp() {
  const [data, setData] = useState<StarkFocusData>(() => loadStoredData());
  const [activeTab, setActiveTab] = useState<number>(0);

  // Injected data from "Trendy i Pomysły" tab
  const [postPreset, setPostPreset] = useState<{
    text?: string;
    caption?: string;
    spec?: UniversalLayoutSpec;
  }>({});
  const [reelPreset, setReelPreset] = useState<{ reel: ReelHandoff; bgUrl?: string } | null>(null);
  // Karuzela z Paczki Dnia czekająca aż Studio Karuzeli (zakładka Trendy) ją przejmie
  const [pendingCarousel, setPendingCarousel] = useState<{
    title: string;
    slides: Array<{ headline: string; bodyText: string }>;
  } | null>(null);

  // Generatory renderujemy warunkowo — ich efekt żyje w rodzicu, żeby zamknięcie okna
  // (które następuje przy każdym wysłaniu treści do studia) nie kasowało wygenerowanej treści.
  const [pack, setPack] = useState<DailyPack | null>(null);
  const [deconstructUrl, setDeconstructUrl] = useState("");
  const [deconstructResult, setDeconstructResult] = useState<DeconstructViralResponse | null>(null);
  const [abDraft, setAbDraft] = useState<AbDraft>(EMPTY_AB_DRAFT);

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

  const ideaStream = useIdeaStream(data, handleUpdateData);

  // Jedna lista na wszystkie generatory: to, co już wyszło z aplikacji.
  // Memoizowana, bo każdy generator trzyma ją w zależnościach efektu.
  const usedHooks = useMemo(() => usedHookFingerprints(data), [data]);

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

  const handleSendToPost = (text: string, caption?: string, idea?: IdeaItem) => {
    // Pomysł z układu strumienia niesie układ i strukturę — bez tego
    // studio i tak renderowałoby cytat na czerni.
    setPostPreset(idea ? { text, caption, spec: specFromIdea(idea) } : { text, caption });
    setActiveTab(0);
  };

  /**
   * Studio rolek przyjmuje cały pakiet. Starsze ścieżki (Studio 1:1, Radar trendów)
   * oddają goły tekst — tu zamieniamy go na pakiet z samym hookiem.
   */
  const handleSendToReel = (incoming?: ReelHandoff | string, bgUrl?: string) => {
    const reel = typeof incoming === "string" ? { hook: incoming } : incoming;
    if (reel && (reel.hook || (Array.isArray(reel.phrases) && reel.phrases.length > 0))) {
      setReelPreset({ reel, bgUrl });
    }
    setActiveTab(1);
  };

  // Generuje zadania publikacji w plannerze na podstawie paczki dnia
  const handleSchedulePack = (pack: DailyPack) => {
    const today = new Date().toISOString().split("T")[0];
    const stamp = Date.now();
    const tasks: PlannerTask[] = [];
    // Paczka przyszła z modelu: zanim weźmiemy z niej tytuł do zadania, sprawdzamy pole.
    const labelOf = (value: unknown) => (typeof value === "string" ? value.slice(0, 40) : "");
    const reels = Array.isArray(pack.reels) ? pack.reels : [];

    // Rolki — publikacja o 12:00, 15:00, 18:00
    const reelTimes = ["12:00", "15:00", "18:00"];
    reels.forEach((reel, idx) => {
      tasks.push({
        id: `task-${stamp}-reel-${idx}`,
        time: reelTimes[idx] || "18:00",
        title: `Publikacja Rolki ${idx + 1}: ${labelOf(reel.hook)}...`,
        category: "post",
        targetTab: 1,
        completed: false,
        date: today,
        actionLabel: "Otwórz Studio Rolek",
        format: "Rolka",
        // Pełna treść zadania — bez payloadu "Otwórz w studio" byłoby pustą nawigacją
        payload: {
          reel: {
            hook: typeof reel.hook === "string" ? reel.hook : "",
            phrases: Array.isArray(reel.phrases) ? reel.phrases : [],
            theme: reel.theme,
            duration: reel.duration,
            caption: reel.captionShort,
            hashtags: reel.hashtags,
          },
        },
      });
    });

    // Karuzela — publikacja o 14:00
    tasks.push({
      id: `task-${stamp}-carousel`,
      time: "14:00",
      title: `Publikacja Karuzeli: ${labelOf(pack.carousel?.title)}...`,
      category: "post",
      targetTab: 2,
      completed: false,
      date: today,
      actionLabel: "Otwórz Studio Karuzeli",
      format: "Karuzela",
      payload: {
        carousel: {
          title: typeof pack.carousel?.title === "string" ? pack.carousel.title : "",
          slides: Array.isArray(pack.carousel?.slides) ? pack.carousel.slides : [],
        },
      },
    });

    // Post 1:1 — publikacja o 20:00 (studio posta mieszka w zakładce 0)
    tasks.push({
      id: `task-${stamp}-post`,
      time: "20:00",
      title: `Publikacja Posta 1:1: ${labelOf(pack.post?.headline)}...`,
      category: "post",
      targetTab: 0,
      completed: false,
      date: today,
      actionLabel: "Otwórz Studio Posta",
      format: "Post 1:1",
      payload: {
        post: {
          text:
            (typeof pack.post?.headline === "string" ? pack.post.headline : "") +
            "\n\n" +
            (typeof pack.post?.body === "string" ? pack.post.body : ""),
        },
      },
    });

    handleUpdateData((prev) => ({
      ...prev,
      // Ten sam normalizator co przy odczycie z localStorage — dane od modelu są niezaufane
      planner_tasks: [...(prev.planner_tasks || []), ...normalizePlannerTasks(tasks)],
    }));
  };

  // Krok 3 flowu: zadanie z Pipeline'u otwiera studio z dokładnie tą treścią,
  // którą zaplanowano. Bez payloadu (starsze zadania Autopilota) zostaje sam przekaz.
  const handleOpenScheduledTask = (task: PlannerTask) => {
    const payload = task.payload;
    const reel = payload?.reel;
    if (reel && (reel.hook || (Array.isArray(reel.phrases) && reel.phrases.length > 0))) {
      handleSendToReel(reel);
      return;
    }
    if (payload?.carousel) {
      setPendingCarousel(payload.carousel);
      // Studio karuzeli działa w zakładce Trendy i przejmuje paczkę raz przy starcie
      setActiveTab(2);
      return;
    }
    if (payload?.post?.text) {
      handleSendToPost(payload.post.text, payload.post.caption || undefined);
      return;
    }
    setActiveTab(typeof task.targetTab === "number" ? task.targetTab : 0);
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
    {
      id: "tab-pipeline",
      label: "Pipeline",
      tag: "HARMONOGRAM",
      subtitle: "Zaplanowane publikacje",
      icon: ListChecks,
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] font-sans antialiased selection:bg-white/20 selection:text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-4">
        <Header data={data} onUpdateData={handleUpdateData} activeTab={activeTab} />

        {/* 3 Główne Zakładki - Wyrazisty Segmented Control */}
        <nav className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pb-4 mb-5 border-b border-white/10 select-none">
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-zinc-500/20 to-zinc-400/20 hover:from-zinc-500/30 hover:to-zinc-400/30 border border-zinc-500/30 text-zinc-200 text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
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
          <button
            type="button"
            onClick={() => setActiveTab(3)}
            title="Otwórz Pipeline publikacji"
            className="text-[10px] font-mono text-neutral-500 hover:text-white transition-colors cursor-pointer"
          >
            {(data.planner_tasks || []).filter((t) => t && !t.completed).length} zadań w pipeline •{" "}
            {data.used_idea_fingerprints?.length || 0} użytych pomysłów
          </button>
        </div>

        <main>
          <Suspense fallback={<TabFallback />}>
            {activeTab === 0 && (
              <InspirationStudio1to1
                key={`${postPreset.spec?.layoutName ?? ""}-${postPreset.text ?? ""}`}
                onSaveToPipeline={handleSavePostFrom1to1}
                userHandle={data.social_handles?.instagram || "stark_focus"}
                initialText={postPreset.text}
                initialCaption={postPreset.caption}
                initialSpec={postPreset.spec}
                onSendToReel={handleSendToReel}
                usedHooks={usedHooks}
              />
            )}
            {activeTab === 1 && (
              <VideoStudioModal
                key={reelPreset?.reel.hook || "default-reel"}
                embedded={true}
                initialReel={reelPreset?.reel}
                initialBgUrl={reelPreset?.bgUrl}
                availablePosts={data.posts}
                vaultAssets={data.vault_assets}
                onSendToPost={handleSendToPost}
              />
            )}
            {activeTab === 2 && (
              <AiRadarTab
                data={data}
                onUpdateData={handleUpdateData}
                incomingCarousel={pendingCarousel}
                onIncomingCarouselUsed={() => setPendingCarousel(null)}
                onOpenQR={(title, payload) => setQrModal({ isOpen: true, title, data: payload })}
                onNavigateToTab={(tabIdx) => setActiveTab(tabIdx)}
                onSendToPost={handleSendToPost}
                onSendToReel={handleSendToReel}
              />
            )}
            {activeTab === 3 && (
              <PipelineTab
                data={data}
                onUpdateData={handleUpdateData}
                onOpenInStudio={handleOpenScheduledTask}
                onOpenDailyPack={() => setDailyPackOpen(true)}
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
            pack={pack}
            onPackChange={setPack}
            onOpenVideoStudio={(reel) => {
              setDailyPackOpen(false);
              handleSendToReel(reel);
            }}
            onOpenCarouselStudio={(title, slides) => {
              setDailyPackOpen(false);
              setPendingCarousel({ title, slides });
              // Studio karuzeli działa w zakładce Trendy i przejmuje paczkę raz przy starcie
              setActiveTab(2);
            }}
            onSchedulePack={handleSchedulePack}
            usedHooks={usedHooks}
          />
        )}
        {ideaStreamOpen && (
          <IdeaStreamModal
            isOpen={ideaStreamOpen}
            onClose={() => setIdeaStreamOpen(false)}
            stream={ideaStream}
            onSendToReel={(reel) => {
              setIdeaStreamOpen(false);
              handleSendToReel(reel);
            }}
            onSendToPost={(text, caption) => {
              setIdeaStreamOpen(false);
              handleSendToPost(text, caption);
            }}
          />
        )}
        {deconstructOpen && (
          <DeconstructViralModal
            isOpen={deconstructOpen}
            onClose={() => setDeconstructOpen(false)}
            url={deconstructUrl}
            onUrlChange={setDeconstructUrl}
            result={deconstructResult}
            onResultChange={setDeconstructResult}
            onSendToReel={(reel) => {
              setDeconstructOpen(false);
              handleSendToReel(reel);
            }}
          />
        )}
        {abOpen && (
          <AbModal
            isOpen={abOpen}
            onClose={() => setAbOpen(false)}
            data={data}
            onUpdateData={handleUpdateData}
            draft={abDraft}
            onDraftChange={setAbDraft}
            onSendToReel={(reel) => {
              setAbOpen(false);
              handleSendToReel(reel);
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
