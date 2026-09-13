// App.tsx - VOID v4.0 IMAGE GENERATOR - ENGLISH - Generates ready images, not just text
import React, { useState, useEffect, useRef } from 'react';
import { Copy, Layers, Radio, Box, Brain, Search, Download, Trash2, Settings2, Zap, BarChart3, Infinity as InfinityIcon, Image as ImageIcon, Film, Check } from 'lucide-react';
import StarkFocusApp from './StarkFocusApp';

type BrandKit = {
  niche: string;
  tone: 'brutal' | 'cinematic' | 'minimal' | 'sigma';
  referenceProfiles: string[];
};

type Idea = {
  id: string;
  hook: string;
  angle: string;
  structure: 'ALPHA_4_PHASE' | 'SIGMA_OVERLAY' | 'LIST_7' | 'CINEMATIC_QUOTE' | 'PAIN_AGITATE';
  visualPrompt: string;
  caption: string;
  hashtags: string[];
  source: string;
  score: number;
  generatedImages?: string[]; // data URLs
};

const HOOKS_POOL = [
  "No one is coming.", "Time is running.", "Your excuses are killing you.",
  "Wolves don't care about sheep opinions.", "Discipline is freedom.",
  "Pain is temporary. Regret is forever.", "You're not tired. You're undisciplined.",
  "Everyone is watching. No one will help.", "Your old self must die.",
  "Success is silent. Failure is loud.", "Stop waiting for motivation.",
  "Loneliness is the price.", "Every day is 11:59 on the clock.",
  "You don't need more time. You need less excuses.", "Your bed at 11 AM tells everything.",
  "Empty wallet doesn't lie.", "The mirror has no filter.", "Future you is watching right now.",
  "1% daily > 100% once.", "Disappear for 6 months.", "Don't tell. Show with results.",
  "Comfort will kill you.", "Plan without execution is hallucination.",
  "You are the sum of your habits.", "No one will remember your excuses.",
  "Your comfort zone is your coffin.", "The clock doesn't stop for anyone.",
  "Weak men make excuses. Strong men make results.",
];

const ANGLES = ["Discipline", "Time", "Pain", "Loneliness", "Focus", "Money", "Habits", "Morning", "Night", "Courage", "Consistency", "Ego"];
const STRUCTURES: Idea['structure'][] = ['ALPHA_4_PHASE', 'SIGMA_OVERLAY', 'LIST_7', 'CINEMATIC_QUOTE', 'PAIN_AGITATE'];

const VISUAL_TEMPLATES: Record<Idea['structure'], string[]> = {
  ALPHA_4_PHASE: ["4 scenes: Empty bed 11:00 AM / Empty wallet / Bathroom mirror / You in 5 years"],
  SIGMA_OVERLAY: ["Dark room, smoke, bold text overlay, fast cuts 0.3s"],
  LIST_7: ["7 things you must quit to get rich - carousel 7 slides"],
  CINEMATIC_QUOTE: ["Black bg, silver SF letters, hourglass center, film grain"],
  PAIN_AGITATE: ["Pain -> Agitate -> Solution"],
};

const CAPTION_TEMPLATES = [
  (hook: string) => `${hook}\n\nYou don't need motivation.\nYou need a system.\n\n1. Wake up.\n2. Do the hard thing.\n3. Repeat.\n\nSave this. You'll come back at 11:47 PM.`,
  (hook: string) => `${hook}\n\nYour future self is looking at you through the mirror.\nWhat will you tell him?\n\nDiscipline > Motivation.\nSilence > Excuses.\nWork > Talking.\n\nDisappear for 6 months and come back unrecognizable.`,
  (hook: string) => `${hook}\n\nComfort kills more dreams than failure.\n\nIf you're comfortable, you're losing.\n\nChoose the pain of discipline today,\nso you don't feel the pain of regret tomorrow.`,
];

// --- IMAGE GENERATION CORE - OFFLINE CANVAS ---
async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/logo.png';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

async function generateSingleImage(hook: string, structure: Idea['structure'], slideIndex: number = 0, totalSlides: number = 1): Promise<string> {
  const isReel = structure === 'SIGMA_OVERLAY' || structure === 'CINEMATIC_QUOTE';
  const W = 1080;
  const H = isReel ? 1920 : 1350;
  
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  
  // Background - dark gradient
  const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.8);
  bgGrad.addColorStop(0, '#1C1C1F');
  bgGrad.addColorStop(0.5, '#121214');
  bgGrad.addColorStop(1, '#0A0A0B');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);
  
  // Subtle vignette
  const vignette = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  
  // Top bar - SF branding
  ctx.fillStyle = '#18181B';
  ctx.fillRect(0, 0, W, 80);
  ctx.fillStyle = '#27272A';
  ctx.fillRect(0, 79, W, 1);
  
  ctx.fillStyle = '#F5F5F3';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SF • VOID', 40, 50);
  ctx.fillStyle = '#71717A';
  ctx.font = '12px monospace';
  ctx.fillText(`${structure} • ${slideIndex+1}/${totalSlides}`, W - 300, 50);
  
  // Logo - center top
  const logo = await loadLogo();
  if (logo) {
    const logoSize = 220;
    const logoX = (W - logoSize) / 2;
    const logoY = isReel ? 280 : 200;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.globalAlpha = 1;
    
    // Glow effect behind logo
    ctx.shadowColor = '#00D9FF';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(W/2, logoY + logoSize/2, 5, 0, Math.PI*2);
    ctx.fillStyle = '#00D9FF';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  // Main hook text - centered
  const textY = isReel ? 700 : 550;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 84px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  
  // Auto adjust font size based on length
  let fontSize = 84;
  if (hook.length > 30) fontSize = 68;
  if (hook.length > 50) fontSize = 54;
  ctx.font = `bold ${fontSize}px Inter, sans-serif`;
  
  const maxWidth = W - 120;
  wrapText(ctx, hook.toUpperCase(), W/2, textY, maxWidth, fontSize * 1.15);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  
  // Bottom accent line
  ctx.fillStyle = '#00D9FF';
  ctx.fillRect(W/2 - 40, H - 180, 80, 3);
  
  // Footer - TIME IS RUNNING
  ctx.fillStyle = '#71717A';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TIME IS RUNNING • VOID PROTOCOL', W/2, H - 120);
  ctx.fillStyle = '#3F3F46';
  ctx.font = '10px monospace';
  ctx.fillText('OFFLINE • FREE • READY TO POST', W/2, H - 90);
  
  // For LIST_7 structure, add number
  if (structure === 'LIST_7') {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.font = 'bold 400px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${slideIndex+1}`, W/2, H/2 + 100);
    // Bring hook back on top
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    wrapText(ctx, hook.toUpperCase(), W/2, textY, maxWidth, fontSize * 1.15);
    ctx.shadowBlur = 0;
  }
  
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function generateImagesForIdea(idea: Idea): Promise<string[]> {
  let count = 1;
  if (idea.structure === 'ALPHA_4_PHASE') count = 4;
  if (idea.structure === 'LIST_7') count = 7;
  if (idea.structure === 'SIGMA_OVERLAY') count = 1;
  
  const images: string[] = [];
  const baseHooks = idea.structure === 'ALPHA_4_PHASE' 
    ? ["EMPTY BED • 11 AM", "EMPTY WALLET", "MIRROR • NO FILTER", `FUTURE YOU • ${idea.hook}`]
    : idea.structure === 'LIST_7'
    ? Array.from({length: 7}, (_, i) => `${i+1}. ${idea.hook} - Part ${i+1}`)
    : [idea.hook];
  
  for (let i = 0; i < count; i++) {
    const text = baseHooks[i] || idea.hook;
    const img = await generateSingleImage(text, idea.structure, i, count);
    images.push(img);
  }
  return images;
}

function generateIdea(index: number, brand: BrandKit): Idea {
  const hook = HOOKS_POOL[Math.floor(Math.random() * HOOKS_POOL.length)];
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  const structure = STRUCTURES[Math.floor(Math.random() * STRUCTURES.length)];
  const visualPrompt = VISUAL_TEMPLATES[structure][0];
  const captionGen = CAPTION_TEMPLATES[Math.floor(Math.random() * CAPTION_TEMPLATES.length)];
  const source = brand.referenceProfiles[Math.floor(Math.random() * brand.referenceProfiles.length)] || '@alphascript06';
  return {
    id: `idea_${Date.now()}_${index}_${Math.random().toString(36).slice(2,6)}`,
    hook,
    angle,
    structure,
    visualPrompt,
    caption: captionGen(hook),
    hashtags: ['#mindset', '#discipline', '#darkmotivation', '#sigma', '#grind', `#${angle.toLowerCase()}`],
    source: `inspired by ${source} • ${structure}`,
    score: Math.floor(70 + Math.random() * 28),
    generatedImages: [],
  };
}

function detectStyleFromUrl(url: string): Idea['structure'] {
  const u = url.toLowerCase();
  if (u.includes('alphascript')) return 'ALPHA_4_PHASE';
  if (u.includes('mlliboy') || u.includes('mindsetboy')) return 'SIGMA_OVERLAY';
  if (u.includes('millionaire_mentality') || u.includes('millionaire')) return 'LIST_7';
  if (u.includes('bymgc')) return 'CINEMATIC_QUOTE';
  return 'PAIN_AGITATE';
}

export default function App() {
  const [viewMode, setViewMode] = useState<'stark' | 'void'>('stark');
  const [activeTab, setActiveTab] = useState(0);
  const [replicatorUrl, setReplicatorUrl] = useState('');
  const [replicated, setReplicated] = useState<Idea | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [trendy, setTrendy] = useState<Idea[]>([]);
  const [posts, setPosts] = useState<Idea[]>([]);
  const [analysisInput, setAnalysisInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [brandKit, setBrandKit] = useState<BrandKit>({
    niche: 'mindset, motivation, discipline, dark motivation',
    tone: 'brutal',
    referenceProfiles: ['@alphascript06', '@mlliboy', '@millionaire_mentality_7', '@bymgc'],
  });

  useEffect(() => {
    const stored = localStorage.getItem('void_v4_data');
    if (stored) {
      try {
        const d = JSON.parse(stored);
        // Don't load images from localStorage (too big) - just posts metadata
        setPosts((d.posts || []).map((p: Idea) => ({ ...p, generatedImages: [] })));
        if (d.brandKit) setBrandKit(d.brandKit);
      } catch {}
    }
    setIdeas(Array.from({ length: 12 }, (_, i) => generateIdea(i, brandKit)));
    setTrendy(Array.from({ length: 12 }, (_, i) => generateIdea(i + 100, brandKit)));
  }, []);

  useEffect(() => {
    // Save without images to avoid quota
    const toSave = { posts: posts.map(p => ({ ...p, generatedImages: [] })), brandKit };
    localStorage.setItem('void_v4_data', JSON.stringify(toSave));
  }, [posts, brandKit]);

  const handleReplicate = () => {
    if (!replicatorUrl) return;
    const style = detectStyleFromUrl(replicatorUrl);
    const idea = generateIdea(999, brandKit);
    idea.structure = style;
    idea.visualPrompt = VISUAL_TEMPLATES[style][0] + ` | ORIGINAL: ${replicatorUrl}`;
    idea.source = `REPLICA from ${replicatorUrl}`;
    idea.score = 96;
    setReplicated(idea);
  };

  const addMoreIdeas = (target: 'ideas' | 'trendy') => {
    const more = Array.from({ length: 20 }, (_, i) => generateIdea(Date.now() + i, brandKit));
    if (target === 'ideas') setIdeas(prev => [...more, ...prev]);
    else setTrendy(prev => [...more, ...prev]);
  };

  const saveToPosts = (idea: Idea) => {
    if (posts.find(p => p.id === idea.id)) return;
    setPosts(prev => [{ ...idea, generatedImages: [] }, ...prev]);
  };

  const handleGenerateImage = async (idea: Idea, isInPosts: boolean) => {
    setGeneratingId(idea.id);
    try {
      const images = await generateImagesForIdea(idea);
      if (isInPosts) {
        setPosts(prev => prev.map(p => p.id === idea.id ? { ...p, generatedImages: images } : p));
      } else {
        // For replicated / infinite, update that specific list
        setIdeas(prev => prev.map(p => p.id === idea.id ? { ...p, generatedImages: images } : p));
        setTrendy(prev => prev.map(p => p.id === idea.id ? { ...p, generatedImages: images } : p));
        if (replicated && replicated.id === idea.id) {
          setReplicated({ ...replicated, generatedImages: images });
        }
        // Also save to my posts with images
        setPosts(prev => {
          const exists = prev.find(p => p.id === idea.id);
          if (exists) return prev.map(p => p.id === idea.id ? { ...p, generatedImages: images } : p);
          return [{ ...idea, generatedImages: images }, ...prev];
        });
      }
    } catch (e) {
      console.error(e);
    }
    setGeneratingId(null);
  };

  const handleAnalysis = () => {
    if (!analysisInput) return;
    const lower = analysisInput.toLowerCase();
    let result = `VOID ANALYSIS for: "${analysisInput.slice(0, 60)}..."\n\n`;
    const issues: string[] = [];
    if (lower.includes('motivation') && !lower.includes('pain') && !lower.includes('discipline')) issues.push('❌ Hook too soft - missing pain / discipline. In dark motivation you must hurt in 0-2s.');
    if (analysisInput.length < 40) issues.push('❌ Hook too short - you have 1.2s to stop the scroll on TikTok.');
    if (!lower.includes('you') && !lower.includes('your')) issues.push('⚠️ No personal callout - add "You" / "Your" - +30% watch time.');
    if (lower.includes('maybe') || lower.includes('i think')) issues.push('❌ Weak language - sigma doesn\'t say "maybe". Use commands: "Do", "Disappear", "Stop".');
    if (issues.length === 0) result += '✅ Strong, personal, brutal hook - keep it.\n\nSuggestion: Add "Save this. You\'ll be back at 11:47 PM." Increases saves.\n';
    else result += issues.join('\n\n') + '\n';
    result += `\nFixed version:\n"No one is coming. ${analysisInput.slice(0,30)} - it's your fault. Disappear for 6 months."`;
    setAnalysisResult(result);
  };

  const tabs = [
    { label: 'REPLICATOR', icon: Copy, desc: 'Link -> Image' },
    { label: 'INFINITE', icon: InfinityIcon, desc: 'Infinite Ideas' },
    { label: 'MY POSTS', icon: Layers, desc: `${posts.length} ready` },
    { label: 'TRENDS', icon: Radio, desc: "What's viral" },
    { label: 'VAULT', icon: Box, desc: 'Graphics' },
    { label: 'ANALYTICS', icon: BarChart3, desc: 'Why it flopped' },
    { label: 'HOOK LAB', icon: Brain, desc: 'Test hooks' },
  ];

  const IdeaCard = ({ idea, isInMyPosts = false }: { idea: Idea; isInMyPosts?: boolean }) => {
    const hasImages = idea.generatedImages && idea.generatedImages.length > 0;
    return (
      <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl space-y-3 hover:border-[#3F3F46] transition group">
        <div className="flex justify-between items-start gap-2">
          <div className="text-[11px] font-mono text-[#71717A] tracking-wider">{idea.structure} • {idea.angle} • {idea.score}% VIRAL</div>
          <div className="text-[10px] px-2 py-0.5 rounded bg-[#27272A] border border-[#3F3F46] text-[#A1A1AA] truncate max-w-[140px]">{idea.source}</div>
        </div>
        
        <div className="text-[15px] font-bold leading-tight text-white">"{idea.hook}"</div>
        
        {/* GENERATED IMAGES PREVIEW */}
        {hasImages && (
          <div className={`grid ${idea.generatedImages!.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
            {idea.generatedImages!.map((img, idx) => (
              <div key={idx} className="relative group/img">
                <img src={img} alt={`Generated ${idx+1}`} className="w-full rounded-lg border border-[#27272A] object-cover" />
                <a href={img} download={`${idea.id}_${idx+1}.jpg`} className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 border border-white/20 rounded-lg text-[10px] font-mono text-white backdrop-blur opacity-0 group-hover/img:opacity-100 transition">DOWNLOAD</a>
              </div>
            ))}
          </div>
        )}

        <div className="text-[11px] font-mono text-[#A1A1AA] bg-[#0A0A0B] border border-[#27272A] p-2.5 rounded-lg">{idea.visualPrompt}</div>
        <div className="text-[12px] text-[#D4D4D8] whitespace-pre-wrap leading-relaxed line-clamp-3">{idea.caption.slice(0, 180)}...</div>
        
        <div className="flex gap-2 pt-1">
          {!isInMyPosts ? (
            <>
              <button onClick={() => saveToPosts(idea)} className="flex-1 py-2.5 bg-[#27272A] border border-[#3F3F46] text-white text-[11px] font-bold uppercase rounded-xl hover:bg-[#3F3F46] transition flex items-center justify-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Save to My Posts</button>
              <button 
                onClick={() => handleGenerateImage(idea, false)}
                disabled={generatingId === idea.id}
                className="flex-1 py-2.5 bg-white text-black text-[11px] font-bold uppercase rounded-xl hover:bg-[#F5F5F3] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generatingId === idea.id ? 'Generating...' : <><ImageIcon className="w-3.5 h-3.5" /> Generate Ready Image</>}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleGenerateImage(idea, true)}
                disabled={generatingId === idea.id}
                className="flex-1 py-2.5 bg-white text-black text-[11px] font-bold uppercase rounded-xl hover:bg-[#F5F5F3] transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generatingId === idea.id ? 'Generating...' : hasImages ? <><Check className="w-3.5 h-3.5" /> Regenerate Image</> : <><Film className="w-3.5 h-3.5" /> Generate {idea.structure === 'ALPHA_4_PHASE' ? '4 Images' : idea.structure === 'LIST_7' ? '7 Slides' : 'Image'}</>}
              </button>
              <button onClick={() => {
                if (hasImages) {
                  idea.generatedImages!.forEach((img, idx) => {
                    const a = document.createElement('a'); a.href = img; a.download = `${idea.id}_${idx+1}.jpg`; a.click();
                  });
                }
              }} disabled={!hasImages} className="px-3 py-2.5 bg-[#27272A] border border-[#3F3F46] text-white rounded-xl text-[11px] disabled:opacity-30"><Download className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPosts(prev => prev.filter(p => p.id !== idea.id))} className="px-3 py-2.5 bg-[#27272A] border border-[#3F3F46] text-[#71717A] hover:text-white rounded-xl text-[11px]"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(idea.caption + '\n\n' + idea.hashtags.join(' '))} className="flex-1 py-1.5 bg-[#0A0A0B] border border-[#27272A] rounded-lg text-[10px] font-mono text-[#71717A] hover:text-white flex items-center justify-center gap-1"><Copy className="w-3 h-3" /> Copy Caption</button>
        </div>
      </div>
    );
  };

  if (viewMode === 'stark') {
    return <StarkFocusApp onOpenVoidStudio={() => setViewMode('void')} />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F11] text-[#F5F5F3] selection:bg-[#00D9FF]/30">
      <div className="border-b border-[#27272A] bg-[#0A0A0B]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SF" className="w-9 h-9 rounded-full object-cover border border-[#27272A] shadow-lg" />
            <div>
              <div className="text-[13px] font-bold tracking-[0.3em] flex items-center gap-2">SF • VOID • v4.0 IMAGE <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D9FF] text-black font-mono">READY TO POST</span></div>
              <div className="text-[9px] font-mono text-[#A1A1AA] tracking-widest">{brandKit.niche.toUpperCase()} • GENERATES IMAGES, NOT JUST TEXT</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('stark')}
              className="text-[10px] font-mono border border-[#38BDF8]/60 bg-[#111622] text-[#38BDF8] px-2.5 py-1.5 rounded-lg hover:bg-[#1E2638] flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
            >
              ← STARK FOCUS OS
            </button>
            <button onClick={() => setShowBrandKit(true)} className="text-[10px] font-mono border border-[#27272A] bg-[#18181B] px-2.5 py-1.5 rounded-lg hover:bg-[#27272A] flex items-center gap-1.5"><Settings2 className="w-3 h-3" /> BRAND KIT</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-4">
        <nav className="flex flex-wrap gap-2 pb-4 border-b border-[#27272A] mb-6">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === idx;
            return (
              <button key={idx} onClick={() => setActiveTab(idx)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-wider transition ${isActive ? 'bg-white text-black shadow' : 'bg-[#18181B] text-[#A1A1AA] border border-[#27272A] hover:bg-[#27272A] hover:text-white'}`}>
                <Icon className="w-3.5 h-3.5" />
                <div className="text-left leading-none">
                  <div>{tab.label}</div>
                  <div className="text-[8px] opacity-60 font-normal normal-case">{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </nav>

        <main>
          {activeTab === 0 && (
            <div className="space-y-5">
              <div className="p-5 bg-[#18181B] border border-[#27272A] rounded-xl flex gap-3 items-center">
                <img src="/logo.png" className="w-12 h-12 rounded-full border border-[#3F3F46]" alt="" />
                <div>
                  <h2 className="text-[13px] font-bold tracking-[0.2em]">REPLICATOR 1:1 → READY IMAGE</h2>
                  <p className="text-[11px] font-mono text-[#A1A1AA]">Paste link from @alphascript06 / @mlliboy / @millionaire_mentality_7 / @bymgc — get ready JPG to post, not just text</p>
                </div>
              </div>
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl flex gap-2">
                <input value={replicatorUrl} onChange={e => setReplicatorUrl(e.target.value)} placeholder="https://www.tiktok.com/@alphascript06/video/..." className="flex-1 px-3 py-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm text-white outline-none font-mono focus:border-[#00D9FF]" />
                <button onClick={handleReplicate} className="px-6 py-3 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Replicate</button>
              </div>
              {replicated && <IdeaCard idea={replicated} />}
            </div>
          )}

          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[13px] font-bold tracking-widest flex items-center gap-2"><InfinityIcon className="w-4 h-4" /> INFINITE IDEAS • Click "Generate Ready Image" = JPG ready to post</h2>
                <button onClick={() => addMoreIdeas('ideas')} className="px-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[11px] font-mono hover:bg-[#27272A]">+20 more</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ideas.map(i => <IdeaCard key={i.id} idea={i} />)}
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[13px] font-bold tracking-widest">MY POSTS • {posts.length} • Ready JPGs to send to phone</h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    posts.forEach(p => {
                      if (p.generatedImages) p.generatedImages.forEach((img, idx) => {
                        const a = document.createElement('a'); a.href = img; a.download = `${p.id}_${idx+1}.jpg`; a.click();
                      });
                    });
                  }} className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-[11px] font-mono flex items-center gap-1"><Download className="w-3 h-3" /> Download All Images</button>
                  <button onClick={() => setPosts([])} className="text-[11px] font-mono text-[#71717A] hover:text-white flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear</button>
                </div>
              </div>
              {posts.length === 0 ? <div className="p-12 text-center border border-dashed border-[#27272A] rounded-xl text-[#71717A] font-mono text-sm">No saved yet. Go to INFINITE and click "Generate Ready Image" - it auto-saves here with JPG.</div> : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {posts.map(p => <IdeaCard key={p.id} idea={p} isInMyPosts={true} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trendy.map(t => <IdeaCard key={t.id} idea={t} />)}
              </div>
            </div>
          )}

          {activeTab === 4 && <div className="p-8 border border-dashed border-[#27272A] rounded-xl text-center"><Box className="w-8 h-8 mx-auto text-[#71717A]" /><div className="font-bold tracking-widest text-[13px] mt-2">VAULT • Your generated JPGs are ready to post - no Canva needed</div></div>}

          {activeTab === 5 && (
            <div className="space-y-4">
              <div className="p-5 bg-[#18181B] border border-[#27272A] rounded-xl space-y-3">
                <h2 className="text-[13px] font-bold tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> WHY IT FLOPPED</h2>
                <textarea value={analysisInput} onChange={e => setAnalysisInput(e.target.value)} placeholder="Paste description or stats" className="w-full h-28 p-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm outline-none font-mono" />
                <button onClick={handleAnalysis} className="px-6 py-2.5 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Analyze</button>
              </div>
              {analysisResult && <pre className="p-4 bg-[#0A0A0B] border border-[#00D9FF]/30 rounded-xl text-[12px] font-mono whitespace-pre-wrap">{analysisResult}</pre>}
            </div>
          )}

          {activeTab === 6 && (
            <div className="grid md:grid-cols-2 gap-2">
              {HOOKS_POOL.slice(0, 20).map((h, i) => (
                <div key={i} className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl flex justify-between items-center">
                  <span className="text-[12px] font-bold">"{h}"</span>
                  <button onClick={() => navigator.clipboard.writeText(h)} className="p-1.5 bg-[#27272A] rounded-lg"><Copy className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {showBrandKit && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold tracking-widest text-[13px]">BRAND KIT</h3>
              <button onClick={() => setShowBrandKit(false)} className="text-[#71717A] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <input value={brandKit.niche} onChange={e => setBrandKit({ ...brandKit, niche: e.target.value })} className="w-full p-2.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm" />
              <button onClick={() => setShowBrandKit(false)} className="w-full py-2.5 bg-white text-black font-bold uppercase text-xs rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
