import React, { useState } from 'react';
import {
  Brain,
  Zap,
  Copy,
  Check,
  Plus,
  Sparkles,
  MessageSquare,
  Flame,
  Film,
  Image as ImageIcon,
  Swords,
  Award,
  Trash2,
  X,
  RotateCcw,
  Layers,
  Filter
} from 'lucide-react';
import { StarkFocusData, Post, HookBattleItem } from '../../types';
import { MENTOR_TEMPLATES_BY_FORMAT, MentorTemplate } from '../../data/mentorTemplates';
import { SlideData } from '../../utils/canvasRenderer';

export function extractCarouselSlides(hook: string, caption: string): SlideData[] {
  const slides: SlideData[] = [];

  // 1. Check if caption has explicit Slide 1 / Slajd 1 sections
  const slideRegex = /(?:Slide|Slajd)\s*(\d+)(?:\s*\/\s*\d+)?\s*:\s*([\s\S]*?)(?=(?:Slide|Slajd)\s*\d+|#|$)/gi;
  const matches = Array.from(caption.matchAll(slideRegex));

  if (matches.length >= 2) {
    matches.forEach((m, idx) => {
      const fullText = m[2].trim();
      let headline = `RULE 0${idx + 1}`;
      let bodyText = fullText;

      const colonIdx = fullText.indexOf(':');
      if (colonIdx > 0 && colonIdx < 36) {
        headline = fullText.slice(0, colonIdx).trim().toUpperCase();
        bodyText = fullText.slice(colonIdx + 1).trim();
      } else if (idx === 0) {
        headline = hook.length <= 44 ? hook : `RULE 01 // ${hook.slice(0, 28)}...`;
      }
      slides.push({ headline, bodyText });
    });
  }

  // 2. If no slide format found, check if caption has numbered list 1. ... 2. ...
  if (slides.length < 2) {
    const numRegex = /(?:^|\n)\s*(\d+)[.)]\s*([\s\S]*?)(?=(?:\n\s*\d+[.)])|#|$)/g;
    const numMatches = Array.from(caption.matchAll(numRegex));
    if (numMatches.length >= 2) {
      numMatches.forEach((m, idx) => {
        const fullText = m[2].trim();
        let headline = `0${idx + 1} // STARK PRINCIPLE`;
        let bodyText = fullText;

        const colonIdx = fullText.indexOf(':');
        if (colonIdx > 0 && colonIdx < 36) {
          headline = fullText.slice(0, colonIdx).trim().toUpperCase();
          bodyText = fullText.slice(colonIdx + 1).trim();
        } else if (idx === 0) {
          headline = hook.length <= 44 ? hook.toUpperCase() : `01 // THE HARSH REALITY`;
        }
        slides.push({ headline, bodyText });
      });
    }
  }

  // 3. If still empty, check for paragraphs
  if (slides.length === 0) {
    const paragraphs = caption
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20 && !p.startsWith('#') && !p.startsWith('//'));

    if (paragraphs.length >= 2) {
      paragraphs.forEach((p, idx) => {
        slides.push({
          headline: idx === 0 ? hook.toUpperCase() : `0${idx + 1} // STARK PRINCIPLE`,
          bodyText: p
        });
      });
    }
  }

  // 4. Guaranteed 5-Slide Completion: ALWAYS deliver 5 complete slides
  if (slides.length === 0) {
    return [
      {
        headline: hook.toUpperCase(),
        bodyText: 'Most people negotiate with weakness every single morning. This is the exact principle to conquer resistance.'
      },
      {
        headline: '01 // THE SILENT TRAP',
        bodyText: caption.slice(0, 160) || 'You think you lack time. In reality, you lack non-negotiable standards and discipline.'
      },
      {
        headline: '02 // THE STOIC AXIOM',
        bodyText: 'Execute what is necessary regardless of internal feelings. Emotions are fleeting; discipline compounds forever.'
      },
      {
        headline: '03 // RUTHLESS EXECUTION',
        bodyText: 'Pick the single most uncomfortable objective today and crush it first before the world wakes up.'
      },
      {
        headline: 'THE FINAL STANDARD',
        bodyText: 'Save this reminder. Re-read it when your finger hovers over excuses. Stay ruthless // @stark_focus'
      }
    ];
  }

  // If we have fewer than 5 slides (e.g. 3), pad with high-impact slides up to 5
  if (slides.length < 5) {
    const fillerTemplates = [
      {
        headline: '✦ THE COLD TRUTH',
        bodyText: 'Comfort is the quiet assassin of ambition. Do not wait for ideal conditions—they will never arrive.'
      },
      {
        headline: '⚡ UNCOMPROMISING EXECUTION',
        bodyText: 'Measure your progress by the friction you overcome daily. Where there is resistance, there is growth.'
      },
      {
        headline: 'THE FINAL STANDARD',
        bodyText: 'Save this post. Re-read it when discipline falters. Follow @stark_focus for daily non-negotiable standards.'
      }
    ];

    while (slides.length < 5) {
      if (slides.length === 4) {
        slides.push({
          headline: 'THE FINAL STANDARD',
          bodyText: 'Save this post. Re-read it when discipline falters. Follow @stark_focus for daily non-negotiable standards.'
        });
      } else {
        const nextFiller = fillerTemplates[slides.length % fillerTemplates.length];
        slides.push(nextFiller);
      }
    }
  }

  return slides.slice(0, 7);
}

interface MentorTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onSwitchTab: (tabIndex: number) => void;
  onOpenVideoStudio?: (hookText: string, scriptText?: string) => void;
  onOpenCarouselStudio?: (title: string, slides?: SlideData[]) => void;
}

export const MentorTab: React.FC<MentorTabProps> = ({
  data,
  onUpdateData,
  onSwitchTab,
  onOpenVideoStudio,
  onOpenCarouselStudio
}) => {
  const [activeSection, setActiveSection] = useState<'generator' | 'battle' | 'all'>('generator');
  const [selectedFormat, setSelectedFormat] = useState('🎬 Rolka 7-Sekundowa (Short Reel)');
  const [activeVariants, setActiveVariants] = useState<MentorTemplate[]>(
    MENTOR_TEMPLATES_BY_FORMAT['🎬 Rolka 7-Sekundowa (Short Reel)'] || []
  );

  // Hook Strength Analyzer & Battle State (Merged Hook Lab)
  const [battleTopic, setBattleTopic] = useState('Dyscyplina i walka z oporem');
  const [isBattleLoading, setIsBattleLoading] = useState(false);
  const [copiedHookId, setCopiedHookId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [battles, setBattles] = useState<HookBattleItem[]>([
    {
      id: 'hb-1',
      angle: 'Negatywny Pattern Interrupt',
      hook: "Your lack of discipline isn't burnout. You're simply comfortable being mediocre.",
      estimatedRetention: 96,
      psychologicalTrigger: 'Uderzenie w dumę i negacja kłamstwa widza',
      reason: 'Zatrzymuje scroll w pierwszych 800ms poprzez brutalne zakwestionowanie wymówki odbiorcy.'
    },
    {
      id: 'hb-2',
      angle: 'Stoicki Paradoks',
      hook: 'The more freedom you chase, the heavier your invisible chains become.',
      estimatedRetention: 93,
      psychologicalTrigger: 'Pozorna sprzeczność zmuszająca do natychmiastowego myślenia',
      reason: 'Zmusza mózg do zwolnienia kciuka, by zrozumieć pojęcie pozornej wolności.'
    },
    {
      id: 'hb-3',
      angle: 'Prowokacyjne Pytanie',
      hook: 'If someone filmed your last 48 hours, would it look like an empire or an embarrassment?',
      estimatedRetention: 94,
      psychologicalTrigger: 'Wizualizacja zewnętrznego osądu i audyt wstydu',
      reason: 'Audyt własnego lenistwa w głowie widza generuje natychmiastową potrzebę usprawiedliwienia.'
    },
    {
      id: 'hb-4',
      angle: 'Brutalne Liczby & Dane',
      hook: '99% of men will lose their war today before 7:00 AM. Here is why.',
      estimatedRetention: 89,
      psychologicalTrigger: 'Lęk przed przynależnością do przegranej większości',
      reason: 'Konkretna godzina i statystyka uruchamiają natychmiastowy lęk przed powtórzeniem tego samego błędu.'
    },
    {
      id: 'hb-5',
      angle: 'Zagadka / Enigma Stoicka',
      hook: 'Marcus Aurelius had one private rule that modern men are too weak to adopt.',
      estimatedRetention: 91,
      psychologicalTrigger: 'Ciekawość historyczna i niekwestionowany autorytet',
      reason: 'Odbiorca musi obejrzeć co najmniej 5 sekund, by poznać tę sekretną zasadę.'
    }
  ]);

  const [variantTopic, setVariantTopic] = useState<string>('');
  const [isLoadingVariants, setIsLoadingVariants] = useState<boolean>(false);

  // Collect all inspirations from both database properties
  const userInspirations = [
    ...(Array.isArray((data as any).inspirations) ? (data as any).inspirations : []),
    ...(Array.isArray(data.vault_assets) ? data.vault_assets.filter((a) => a.type === 'inspiration') : [])
  ];

  const handleGenerateVariants = async () => {
    setIsLoadingVariants(true);
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch('/api/ai/generate-mentor-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          format: selectedFormat,
          topic: variantTopic.trim() || 'Dyscyplina i bezwzględny stoicyzm',
          tone: 'Bezwzględny Stoicyzm',
          inspirations: userInspirations,
          count: 5
        })
      });

      clearTimeout(timeoutTimer);

      if (res.ok) {
        const json = await res.json();
        if (json?.variants && Array.isArray(json.variants) && json.variants.length > 0) {
          const userPrompt = variantTopic.trim();
          const normalized: MentorTemplate[] = json.variants.map((v: any, idx: number) => {
            if (typeof v === 'string') {
              return {
                format: selectedFormat,
                hook: v,
                caption: `${v}\n\nMost people negotiate with weakness every single day. Stop waiting for motivation.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #focus #starkfocus`,
                notes: `Analiza w czasie rzeczywistym: Wariant ${idx + 1} dla "${userPrompt || 'Dyscyplina'}"`
              };
            }
            return {
              format: v.format || selectedFormat,
              hook: v.hook || v.title || 'Execute in silence.',
              caption: v.caption || `${v.hook}\n\nExecute in silence.\n\n#stoicism #discipline #starkfocus`,
              notes: v.notes || `Analiza w czasie rzeczywistym: Wariant ${idx + 1} dla "${userPrompt || 'Dyscyplina'}"`
            };
          });
          setActiveVariants(normalized);
          return;
        }
      }
    } catch (err) {
      console.warn('AI variant generation safely timed out or errored, generating original dynamic pool:', err);
    } finally {
      clearTimeout(timeoutTimer);
      setIsLoadingVariants(false);
    }

    // Dynamic contextual synthesis without clumsy quote insertions
    const userPrompt = variantTopic.trim() || 'Dyscyplina';
    const pLower = userPrompt.toLowerCase();
    let dynamicOriginalHooks: string[] = [];

    if (pLower.includes('1%') || pLower.includes('protokół') || pLower.includes('protokol')) {
      dynamicOriginalHooks = [
        'You want top 1% results with bottom 99% discipline?',
        'The top 1% isn’t special. They are just obsessively cold.',
        'Getting 1% better daily is useless if your foundation is rotten.',
        'Is 1% success worth destroying your entire social life?',
        'Most men talk like the 1%, but fold under 1% pain.'
      ];
    } else if (pLower.includes('rano') || pLower.includes('morning') || pLower.includes('wstaw')) {
      dynamicOriginalHooks = [
        'Touching your phone before 7:00 AM guarantees another mediocre day.',
        'The snooze button is where weak men bury their self-respect.',
        'While the world is asleep, silent empires are being built.',
        'Are you genuinely tired, or just addicted to comfortable decay?',
        'Marcus Aurelius had a brutal morning ritual that killed excuses instantly.'
      ];
    } else if (pLower.includes('ruthless') || pLower.includes('bezwzględ')) {
      dynamicOriginalHooks = [
        'Being ruthless with yourself is the highest form of self-respect.',
        'If you hesitate to cut off your weakness, it will consume you.',
        'Stay ruthless in the dark. Let results arrive like thunder.',
        'Your feelings are suggestions. Your standards are laws.',
        'Nobody respects a man who negotiates with his alarm.'
      ];
    } else {
      dynamicOriginalHooks = [
        `Comfort in ${userPrompt} is quietly ruining your potential.`,
        `The silent price you pay for temporary relief is permanent regret.`,
        `If you cannot master yourself in silence, the world will master you in public.`,
        `99% of people fail because they demand applause before delivering results.`,
        `The day you stop seeking sympathy is the day you become dangerous.`
      ];
    }

    const fallbackVariants: MentorTemplate[] = dynamicOriginalHooks.slice(0, 5).map((h, idx) => ({
      format: selectedFormat,
      hook: h,
      caption: `${h}\n\nWe live in an age that glorifies comfortable decay. Every time you pick temporary relief over necessary friction, you cast a vote for your future irrelevance.\n\nCut the noise. Step into the shadow and let your results arrive like an earthquake.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #mentaltoughness #focus #starkfocus`,
      notes: `Inteligentna synteza: Wariant ${idx + 1} dla "${userPrompt}"`
    }));

    setActiveVariants(fallbackVariants);
  };

  const handleSaveToDrafts = (variant: MentorTemplate) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newDraft: Post = {
      id: 'post-' + Date.now(),
      title: variant.hook.slice(0, 70),
      platform: 'Instagram',
      format: selectedFormat,
      asset: 'Brak przypisania',
      caption: variant.caption,
      status: 'draft',
      created_date: todayStr,
      published_date: null,
      notes: variant.notes
    };

    onUpdateData((prev) => ({
      ...prev,
      posts: [newDraft, ...prev.posts]
    }));

    onSwitchTab(1); // switch to Moje Posty tab
  };

  const handleSaveBattleHookToDrafts = (battle: HookBattleItem) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newDraft: Post = {
      id: 'post-' + Date.now(),
      title: battle.hook.slice(0, 70),
      platform: 'Instagram',
      format: '🎬 Rolka 7-Sekundowa (Short Reel)',
      asset: 'Obsidian_Basalt_Monolith.webp',
      caption: `${battle.hook}\n\nMost people don't lack motivation. They lack non-negotiable standards.\n\nDisappear for 6 months. Kill the noise. Execute what is required in total solitude.\n\nSave this reminder. Execute in silence.\n\n#stoicism #discipline #darkdiscipline #mentaltoughness #focus #stark_focus`,
      status: 'draft',
      created_date: todayStr,
      published_date: null,
      notes: `Kąt: ${battle.angle} | Retencja: ${battle.estimatedRetention}%`
    };

    onUpdateData((prev) => ({
      ...prev,
      posts: [newDraft, ...prev.posts],
      xp: prev.xp + 50
    }));

    onSwitchTab(1);
  };

  // Run AI Hook Battle for given topic
  const handleRunHookBattle = async () => {
    if (!battleTopic.trim()) return;
    setIsBattleLoading(true);
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch('/api/ai/hook-battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ topic: battleTopic })
      });
      clearTimeout(timeoutTimer);
      if (res.ok) {
        const dataJson = await res.json();
        if (dataJson.battle && Array.isArray(dataJson.battle)) {
          setBattles(dataJson.battle);
          return;
        }
      }
    } catch {
      // Fallback generator if offline or timed out
    } finally {
      clearTimeout(timeoutTimer);
      setIsBattleLoading(false);
    }

    const topicClean = battleTopic.trim();
    const tLower = topicClean.toLowerCase();
    let algorithmicBattles: HookBattleItem[] = [];

    if (tLower.includes('1%') || tLower.includes('protokół') || tLower.includes('protokol')) {
      algorithmicBattles = [
        {
          id: 'hb-' + Date.now() + '-1',
          angle: 'Negatywny Pattern Interrupt',
          hook: 'The 1% protocol isn’t about adding habits. It’s about amputating distractions.',
          estimatedRetention: 97,
          psychologicalTrigger: 'Uderzenie w popularny mit i szok poznawczy',
          reason: 'Radykalny zwrot akcji zatrzymuje kciuk w pierwszych 400ms.'
        },
        {
          id: 'hb-' + Date.now() + '-2',
          angle: 'Paradoks Stoicki',
          hook: 'Total restriction is the only real path to absolute freedom.',
          estimatedRetention: 95,
          psychologicalTrigger: 'Pozorna sprzeczność logiczna zmuszająca do namysłu',
          reason: 'Mózg zatrzymuje scroll, by zrozumieć zderzenie restrykcji z wolnością.'
        },
        {
          id: 'hb-' + Date.now() + '-3',
          angle: 'Prowokacyjny Audyt Standardów',
          hook: 'Look at how you spent your last 24 hours and tell me you belong in the 1%.',
          estimatedRetention: 94,
          psychologicalTrigger: 'Brutalny audyt wstydu i konfrontacja z ego',
          reason: 'Wywołuje natychmiastowy rachunek sumienia w głowie widza.'
        },
        {
          id: 'hb-' + Date.now() + '-4',
          angle: 'Protokół 1%',
          hook: 'The top 1% have only one rule: never let your emotions negotiate with your duty.',
          estimatedRetention: 92,
          psychologicalTrigger: 'Eliminacja paraliżu decyzyjnego i obietnica żelaznej zasady',
          reason: 'Uderza w sedno prokrastynacji i negocjacji z własnym nastrojem.'
        },
        {
          id: 'hb-' + Date.now() + '-5',
          angle: 'Zagadka / Stoicka Enigma',
          hook: 'There is a silent contract the top 1% sign every morning—and it costs everything.',
          estimatedRetention: 90,
          psychologicalTrigger: 'Potężna luka informacyjna i mistyka elitaryzmu',
          reason: 'Zmusza do obejrzenia kolejnych sekund w celu poznania warunków umowy.'
        }
      ];
    } else {
      algorithmicBattles = [
        {
          id: 'hb-' + Date.now() + '-1',
          angle: 'Negatywny Pattern Interrupt',
          hook: `Comfort is quietly robbing you of everything you could become.`,
          estimatedRetention: 97,
          psychologicalTrigger: 'Odrzucenie racjonalizacji widza w 500ms',
          reason: 'Natychmiastowo niszczy fałszywe poczucie bezpieczeństwa.'
        },
        {
          id: 'hb-' + Date.now() + '-2',
          angle: 'Stoicki Paradoks Przetrwania',
          hook: `The day you stop seeking approval is the exact day you become dangerous.`,
          estimatedRetention: 94,
          psychologicalTrigger: 'Pozorna sprzeczność poznawcza',
          reason: 'Mózg zatrzymuje przewijanie, by rozwikłać sprzeczność logiczną.'
        },
        {
          id: 'hb-' + Date.now() + '-3',
          angle: 'Prowokacyjny Audyt Standardów',
          hook: `If everyone saw what you did when alone, would they respect you?`,
          estimatedRetention: 95,
          psychologicalTrigger: 'Uderzenie w poczucie własnej wartości i wstyd',
          reason: 'Wywołuje emocjonalny impuls obronny i potrzebę natychmiastowej refleksji.'
        },
        {
          id: 'hb-' + Date.now() + '-4',
          angle: 'Ekskluzywny Protokół 1%',
          hook: `The 1% never negotiate with weakness. They execute in cold silence.`,
          estimatedRetention: 92,
          psychologicalTrigger: 'Separacja od przeciętnej większości',
          reason: 'Odbiorca czuje presję dorównania bezwzględnym standardom.'
        }
      ];
    }

    setBattles(algorithmicBattles);
  };

  const handleCopyHook = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHookId(id);
    setTimeout(() => setCopiedHookId(null), 2000);
  };

  const handleDismissVariant = (index: number) => {
    setActiveVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearVariants = () => {
    setActiveVariants([]);
  };

  const handleResetDefaultVariants = () => {
    setActiveVariants(MENTOR_TEMPLATES_BY_FORMAT[selectedFormat] || []);
  };

  const handleDismissBattle = (id: string) => {
    setBattles((prev) => prev.filter((b) => b.id !== id));
  };

  const sortedBattles = [...battles].sort((a, b) => b.estimatedRetention - a.estimatedRetention);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/40 rounded-lg text-xs font-mono text-[#10B981] flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[10px] text-slate-400 hover:text-white font-mono cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      )}

      {/* Mentor Sub-Navigation Bar: Clean Focused Workspaces */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141824] border border-[#2C354B] p-2 rounded-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSection('generator')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'generator'
                ? 'bg-[#38BDF8] text-[#141824] shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-[#1D2333] border border-transparent hover:border-[#2C354B]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>1. Generator Formatów & Postów</span>
            <span className="text-[10px] opacity-80 font-normal">({activeVariants.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('battle')}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSection === 'battle'
                ? 'bg-[#38BDF8] text-[#141824] shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-[#1D2333] border border-transparent hover:border-[#2C354B]'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>2. Bitwa Hooków & Retencja</span>
            <span className="text-[10px] opacity-80 font-normal">({sortedBattles.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveSection(activeSection === 'all' ? 'generator' : 'all')}
          className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 cursor-pointer border ${
            activeSection === 'all'
              ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50 font-bold'
              : 'text-slate-400 hover:text-white border-[#2C354B] bg-[#1D2333]'
          }`}
          title="Przełącz pełny widok obu modułów jednocześnie"
        >
          <Filter className="w-3 h-3" />
          <span>{activeSection === 'all' ? 'Widok: Wszystko' : 'Pokaż oba moduły'}</span>
        </button>
      </div>
      {/* 1. Generator Formatów & Postów */}
      {(activeSection === 'generator' || activeSection === 'all') && (
        <div className="space-y-4">
          <div className="bg-[#1D2333] border border-[#2C354B] rounded-lg p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-[#2C354B] pb-2">
              <Brain className="w-4 h-4 text-[#38BDF8]" />
              <div>
                <h3 className="text-xs font-bold text-[#38BDF8] uppercase tracking-widest">
                  🧠 MROCZNY MENTOR // GENERATOR FORMATÓW (100% ENGLISH)
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Wybierz format i generuj stoickie skrypty z hookami. Odrzucaj niepotrzebne szablony, by zachować pełną czystość pracy.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider block mb-1">
                  Wybierz format produkcyjny:
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => {
                    setSelectedFormat(e.target.value);
                    setActiveVariants(MENTOR_TEMPLATES_BY_FORMAT[e.target.value] || []);
                  }}
                  className="w-full text-xs font-bold py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-[#38BDF8] focus:border-[#38BDF8] focus:outline-none"
                >
                  {Object.keys(MENTOR_TEMPLATES_BY_FORMAT).map((fmt) => (
                    <option key={fmt} value={fmt}>
                      {fmt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10px] font-bold text-[#E2E8F0] uppercase tracking-wider block mb-1">
                  Kąt / Temat (opcjonalny):
                </label>
                <input
                  type="text"
                  value={variantTopic}
                  onChange={(e) => setVariantTopic(e.target.value)}
                  placeholder="np. 5 AM solitude, Dopamine fasting..."
                  className="w-full text-xs py-2 px-3 bg-[#141824] border border-[#2C354B] rounded text-slate-200 placeholder:text-slate-600 focus:border-[#38BDF8] focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <button
                  onClick={handleGenerateVariants}
                  disabled={isLoadingVariants}
                  className="w-full py-2 px-3 bg-[#38BDF8] hover:bg-[#38BDF8]/90 disabled:opacity-50 text-[#141824] font-black text-xs uppercase tracking-wider rounded-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  {isLoadingVariants ? (
                    <>
                      <span className="w-3 h-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ANALIZA AI...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" /> ⚡ GENERUJ WARIANTY
                    </>
                  )}
                </button>
              </div>
            </div>

            {userInspirations.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-emerald-400">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>AI Few-Shot aktywne: {userInspirations.length} wzorców z Twojej Bazy Inspiracji jest wstrzykiwanych do generacji wariantów!</span>
              </div>
            )}
          </div>

          {/* Variants Display */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-[#E2E8F0] uppercase tracking-wider flex items-center gap-2 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                Aktywne Warianty ({activeVariants.length}) dla: <span className="text-[#38BDF8]">{selectedFormat}</span>
              </h4>

              <div className="flex items-center gap-3">
                {activeVariants.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearVariants}
                    className="text-[11px] font-mono text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Wyczyść wszystkie bieżące warianty z ekranu"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Wyczyść listę</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetDefaultVariants}
                  className="text-[11px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                  title="Przywróć domyślne szablony dla tego formatu"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Przywróć domyślne</span>
                </button>
              </div>
            </div>

            {activeVariants.length === 0 ? (
              <div className="p-8 text-center bg-[#1D2333] border border-dashed border-[#2C354B] rounded-lg space-y-2">
                <p className="text-xs font-mono text-slate-400">
                  Brak aktywnych wariantów na ekranie. Lista została wyczyszczona.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleGenerateVariants}
                    disabled={isLoadingVariants}
                    className="px-3 py-1.5 rounded bg-[#38BDF8] text-[#141824] text-xs font-bold font-mono hover:bg-[#38BDF8]/90 transition-colors"
                  >
                    ⚡ Wygeneruj nowe warianty AI
                  </button>
                  <button
                    onClick={handleResetDefaultVariants}
                    className="px-3 py-1.5 rounded bg-[#141824] border border-[#2C354B] text-slate-300 text-xs font-mono hover:text-white transition-colors"
                  >
                    Przywróć szablony bazowe
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeVariants.map((varItem, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1D2333] border border-[#2C354B] rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-3 hover:border-[#38BDF8]/60 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[#2C354B] pb-1.5">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-[#141824] text-[#38BDF8] border border-[#2C354B]">
                          WARIANT {idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">100% EN</span>
                          <button
                            type="button"
                            onClick={() => handleDismissVariant(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                            title="Odrzuć ten wariant (usuń z widoku)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-wider block mb-0.5">
                          [HOOK - ENGLISH]:
                        </span>
                        <div className="text-xs sm:text-sm font-bold text-white leading-snug italic">
                          "{varItem.hook}"
                        </div>
                      </div>

                      <div className="border-t border-[#2C354B] pt-2">
                        <span className="text-[10px] font-mono text-[#10B981] uppercase tracking-wider block mb-1">
                          [CONTENT / CAPTION]:
                        </span>
                        <div className="text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-wrap max-h-44 overflow-y-auto p-2 bg-[#141824] rounded border border-[#2C354B] font-sans opacity-90">
                          {varItem.caption}
                        </div>
                      </div>

                      <div className="p-2 bg-[#141824] rounded border border-[#2C354B] text-[10px] font-mono text-slate-400">
                        <span className="font-bold text-slate-300">Wskazówka:</span> {varItem.notes}
                      </div>
                    </div>

                    {/* Multimedia Action Hub */}
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            if (onOpenVideoStudio) {
                              onOpenVideoStudio(varItem.hook, varItem.caption);
                            }
                          }}
                          className="py-1.5 px-2 rounded-sm bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[11px] font-bold text-[#38BDF8] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Automontaż wideo 9:16 z tym hookiem"
                        >
                          <Film className="w-3.5 h-3.5" /> 🎬 Montuj Rolkę
                        </button>

                        <button
                          onClick={() => {
                            if (onOpenCarouselStudio) {
                              const parsedSlides = extractCarouselSlides(varItem.hook, varItem.caption);
                              onOpenCarouselStudio(varItem.hook, parsedSlides);
                            }
                          }}
                          className="py-1.5 px-2 rounded-sm bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-[11px] font-bold text-purple-300 uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Otwórz Studio Karuzel (Wszystkie 5 slajdów)"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> 🖼️ Grafika/Slajdy
                        </button>
                      </div>

                      <button
                        onClick={() => handleSaveToDrafts(varItem)}
                        className="w-full py-1.5 px-3 rounded-sm bg-transparent border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> 📥 Zapisz do Lejka Treści
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ⚔️ ZUNIFIKOWANA BITWA HOOKÓW & ANALIZATOR RETENCJI (AI HOOK LAB) */}
      {(activeSection === 'battle' || activeSection === 'all') && (
        <div id="stark-hook-battle-lab" className="bg-[#1D2333] border border-[#38BDF8]/40 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
          {/* Module Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C354B] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                <Swords className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                  ⚔️ BITWA HOOKÓW & ANALIZATOR RETENCJI // AI HOOK LAB
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Wpisz temat, a sztuczna inteligencja wygeneruje konkurencyjne kąty psychologiczne i uszereguje je pod kątem zatrzymania kciuka.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold uppercase">
                Ranking wg Retencji 800ms
              </span>
            </div>
          </div>

          {/* AI Battle Generator */}
          <div className="bg-[#141824] p-4 rounded-lg border border-[#2C354B] space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                Generuj Bitwę Kątów Psychologicznych (AI Battle):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={battleTopic}
                  onChange={(e) => setBattleTopic(e.target.value)}
                  placeholder="Wpisz temat lub problem (np. Samodyscyplina o 5:00 rano, lenistwo, strach przed porażką)..."
                  className="flex-1 text-xs font-mono py-2.5 px-3 bg-[#1D2333] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunHookBattle();
                  }}
                />
                <button
                  onClick={handleRunHookBattle}
                  disabled={isBattleLoading}
                  className="py-2.5 px-5 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isBattleLoading ? 'Generowanie bitwy...' : '⚡ Uruchom Bitwę Hooków'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-mono leading-relaxed pt-0.5">
                Generuje konkurencyjne hooki (Pattern Interrupt, Paradoks Stoicki, Prowokacyjny Audyt, Protokół 1%) uszeregowane według szacowanej retencji w pierwszych 800ms.
              </p>
            </div>
          </div>

          {/* The Battle Arena: Ranked Hook Cards */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#2C354B] pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                  Wyniki Areny // Hooki Posortowane według Siły Retencji ({sortedBattles.length}):
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Najwyższa retencja = mniejszy scroll drop w 800ms
              </span>
            </div>

            <div className="space-y-3">
              {sortedBattles.map((battle, index) => {
                const isWinner = index === 0;
                const isCopied = copiedHookId === battle.id;

                return (
                  <div
                    key={battle.id}
                    className={`p-3.5 sm:p-4 rounded-lg border transition-all ${
                      isWinner
                        ? 'bg-[#1D2333] border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/50'
                        : 'bg-[#141824] border-[#2C354B] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm font-mono flex items-center gap-1 ${
                            isWinner
                              ? 'bg-amber-400 text-[#141824]'
                              : index === 1
                              ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isWinner ? (
                            <>
                              <Award className="w-3 h-3" /> #1 ZWYCIĘZCA ALGORYTMU
                            </>
                          ) : (
                            `⚔️ RYWAL #${index + 1}`
                          )}
                        </span>

                        <span className="text-[10px] font-bold text-slate-300 uppercase font-mono px-2 py-0.5 rounded-sm bg-[#1D2333] border border-[#2C354B]">
                          {battle.angle}
                        </span>
                      </div>

                      {/* Retention Meter & Dismiss */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-28 sm:w-36 bg-[#0B0D14] h-2.5 rounded-full overflow-hidden border border-[#2C354B]">
                          <div
                            className={`h-full rounded-full transition-all ${
                              battle.estimatedRetention >= 95
                                ? 'bg-gradient-to-r from-[#10B981] to-emerald-300'
                                : battle.estimatedRetention >= 90
                                ? 'bg-gradient-to-r from-[#38BDF8] to-cyan-300'
                                : 'bg-gradient-to-r from-[#F59E0B] to-amber-300'
                            }`}
                            style={{ width: `${Math.min(100, battle.estimatedRetention)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-mono font-black ${
                            isWinner ? 'text-amber-400' : 'text-[#38BDF8]'
                          }`}
                        >
                          {battle.estimatedRetention}% Retencja
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDismissBattle(battle.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          title="Usuń ten hook z ringu"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Hook Text Display */}
                    <div className="p-2.5 bg-[#0B0D14] rounded border border-[#2C354B] mb-2.5">
                      <p className="text-xs sm:text-sm font-bold text-white font-mono leading-relaxed select-all">
                        "{battle.hook}"
                      </p>
                    </div>

                    {/* Psychology breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono mb-3">
                      <div className="p-2 rounded bg-[#1D2333] border border-[#2C354B] text-slate-300">
                        <span className="text-amber-400 font-bold block mb-0.5">🧠 Trigger Psychologiczny:</span>
                        {battle.psychologicalTrigger}
                      </div>
                      <div className="p-2 rounded bg-[#1D2333] border border-[#2C354B] text-slate-300">
                        <span className="text-[#38BDF8] font-bold block mb-0.5">⏱️ Dlaczego zatrzymuje scroll:</span>
                        {battle.reason}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[#2C354B]">
                      <button
                        onClick={() => {
                          if (onOpenVideoStudio) {
                            onOpenVideoStudio(battle.hook);
                          }
                        }}
                        className="py-1.5 px-3 rounded-sm bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/50 text-xs font-bold text-[#38BDF8] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Film className="w-3.5 h-3.5" /> 🎬 Montuj Rolkę z tym Hookiem
                      </button>

                      <button
                        onClick={() => {
                          if (onOpenCarouselStudio) {
                            const parsedSlides = extractCarouselSlides(battle.hook, battle.reason);
                            onOpenCarouselStudio(battle.hook, parsedSlides);
                          }
                        }}
                        className="py-1.5 px-3 rounded-sm bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/50 text-xs font-bold text-purple-300 uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" /> 🖼️ Grafika/Slajdy
                      </button>

                      <button
                        onClick={() => handleSaveBattleHookToDrafts(battle)}
                        className="py-1.5 px-3 rounded-sm bg-[#10B981]/15 hover:bg-[#10B981]/25 border border-[#10B981]/40 text-xs font-bold text-[#10B981] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> 📥 Zapisz do Lejka (+50 XP)
                      </button>

                      <button
                        onClick={() => handleCopyHook(battle.id, battle.hook)}
                        className="py-1.5 px-3 rounded-sm bg-[#1D2333] hover:bg-[#242B3F] border border-[#2C354B] text-xs font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ml-auto"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#10B981]" />
                            <span className="text-[#10B981]">Skopiowano</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopiuj Hook</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
