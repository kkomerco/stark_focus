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
  BarChart3,
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
import { DataBar } from "./components/DataBar";
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
const PromptLibraryModal = lazy(() =>
  import("./components/PromptLibraryModal").then((m) => ({ default: m.PromptLibraryModal })),
);

const QRModal = lazy(() => import("./components/QRModal").then((m) => ({ default: m.QRModal })));
const PublishLedgerModal = lazy(() =>
  import("./components/PublishLedgerModal").then((m) => ({ default: m.PublishLedgerModal })),
);

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
  const [ledgerOpen, setLedgerOpen] = useState(false);

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
  /**
   * Przepis z analizy wchodzi do studia jako gotowy kadr — inaczej człowiek
   * przepisywałby wiersz i wybierał układ ręcznie, czyli dokładnie to, przed
   * czym miała go obronić analiza.
   */
  const handleOpenBlueprint = (spec: UniversalLayoutSpec) => {
    setPostPreset({ spec });
    setActiveTab(0);
  };

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

  // Powierzchnie robocze: to, w czym się robi materiał.
  const panes = [
    { id: "post", label: "Kadr", icon: Sparkles },
    { id: "reel", label: "Rolka", icon: Film },
    { id: "radar", label: "Radar", icon: Flame },
  ];

  // Narzędzia to generatory i analizy wywoływane na żądanie — nie zakładki,
  // więc nie udają równorzędnych ekranów.
  const tools = [
    { label: "Paczka dnia", icon: Calendar, open: () => setDailyPackOpen(true) },
    { label: "Pomysły", icon: Lightbulb, open: () => setIdeaStreamOpen(true) },
    { label: "Analiza linku", icon: Link2, open: () => setDeconstructOpen(true) },
    { label: "Test A/B", icon: TestTubes, open: () => setAbOpen(true) },
    { label: "Publikacje", icon: BarChart3, open: () => setLedgerOpen(true) },
    { label: "Autopilot", icon: Rocket, open: () => setAutopilotOpen(true) },
    { label: "Prompty tła", icon: ImageIcon, open: () => setPromptLibOpen(true) },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-[#EDEDED] font-sans antialiased selection:bg-white/20 selection:text-white">
      <div className="max-w-[1500px] mx-auto px-3 sm:px-5 py-4">
        <Header />

        <main className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-2 border-b border-white/10 select-none">
            <div className="flex items-center gap-1">
              {panes.map((pane, idx) => {
                const Icon = pane.icon;
                const isActive = activeTab === idx;
                return (
                  <button
                    key={pane.id}
                    onClick={() => setActiveTab(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                      isActive
                        ? "bg-white text-black"
                        : "text-neutral-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {pane.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={tool.open}
                    title={tool.label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                  >
                    <Icon className="w-3 h-3" />
                    {tool.label}
                  </button>
                );
              })}
              <span className="w-px h-4 bg-white/10 mx-1" />
              <DataBar data={data} tasks={data.planner_tasks || []} />
            </div>
          </div>

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
            onOpenPostStudio={(text, caption) => {
              setDailyPackOpen(false);
              handleSendToPost(text, caption);
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
            onOpenBlueprint={handleOpenBlueprint}
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
        {ledgerOpen && (
          <PublishLedgerModal
            isOpen={ledgerOpen}
            onClose={() => setLedgerOpen(false)}
            data={data}
            onUpdateData={handleUpdateData}
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
