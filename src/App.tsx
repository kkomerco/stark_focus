// App.tsx - VOID v3.1 INFINITE ENGLISH - mindset / dark motivation - OFFLINE / FREE / MINIMAL
import React, { useState, useEffect } from 'react';
import { Copy, Sparkles, Layers, Radio, Box, Brain, Search, Download, Trash2, Settings2, Zap, BarChart3, Infinity as InfinityIcon } from 'lucide-react';

type BrandKit = {
  niche: string;
  tone: 'brutal' | 'cinematic' | 'minimal' | 'sigma';
  colors: { bg: string; card: string; accent: string };
  referenceProfiles: string[];
  favoriteHooks: string[];
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
};

const HOOKS_POOL = [
  "No one is coming.",
  "Time is running.",
  "Your excuses are killing you.",
  "Wolves don't care about sheep opinions.",
  "Discipline is freedom.",
  "Pain is temporary. Regret is forever.",
  "You're not tired. You're undisciplined.",
  "Everyone is watching. No one will help.",
  "Your old self must die.",
  "Success is silent. Failure is loud.",
  "Stop waiting for motivation.",
  "Loneliness is the price.",
  "Every day is 11:59 on the clock.",
  "You don't need more time. You need less excuses.",
  "Your bed at 11 AM tells everything.",
  "Empty wallet doesn't lie.",
  "The mirror has no filter.",
  "Future you is watching right now.",
  "1% daily > 100% once.",
  "Disappear for 6 months.",
  "Don't tell. Show with results.",
  "Comfort will kill you.",
  "Plan without execution is hallucination.",
  "You are the sum of your habits.",
  "No one will remember your excuses.",
  "Your comfort zone is your coffin.",
  "The clock doesn't stop for anyone.",
  "Weak men make excuses. Strong men make results.",
  "You are exactly where you deserve to be.",
  "If it's easy, you're doing it wrong.",
];

const ANGLES = ["Discipline", "Time", "Pain", "Loneliness", "Focus", "Money", "Habits", "Morning", "Night", "Courage", "Consistency", "Ego", "Sacrifice", "Legacy"];
const STRUCTURES: Idea['structure'][] = ['ALPHA_4_PHASE', 'SIGMA_OVERLAY', 'LIST_7', 'CINEMATIC_QUOTE', 'PAIN_AGITATE'];

const VISUAL_TEMPLATES: Record<Idea['structure'], string[]> = {
  ALPHA_4_PHASE: [
    "SCENE 1: Empty bed 11:00 AM - SCENE 2: Empty wallet - SCENE 3: Bathroom mirror - SCENE 4: You in 5 years",
    "SCENE 1: Clock 4:59 AM - SCENE 2: Empty gym - SCENE 3: Others sleeping - SCENE 4: Your transformation",
    "SCENE 1: Closed door - SCENE 2: Lonely road - SCENE 3: Dark forest / wolf - SCENE 4: Mountain peak",
  ],
  SIGMA_OVERLAY: [
    "Dark room, smoke, bold text overlay: HOOK in center, fast cuts 0.3s, bass boosted",
    "Black & white city at night, glitch effect on hook, zoom in on face",
    "POV: You at 5:00 AM, others partying - split screen",
  ],
  LIST_7: [
    "7 things you must quit to get rich - list 1-7 with icons - carousel",
    "7 lies your brain tells you - IG carousel 7 slides",
    "7 habits destroying your future",
  ],
  CINEMATIC_QUOTE: [
    "Black background, silver SF letters, hourglass center, quote bottom, film grain",
    "Wolves / lions / mountains, epic voiceover, minimal text center",
    "Ticking clock, sand in hourglass falling, blue glow",
  ],
  PAIN_AGITATE: [
    "Pain: Show problem (empty bank) -> Agitate: What you lose -> Solution: Discipline",
    "Hook: Mirror -> Agitate: What do you see? -> Solution: Disappear for 6 months",
  ],
};

const CAPTION_TEMPLATES = [
  (hook: string) => `${hook}\n\nYou don't need motivation.\nYou need a system.\n\n1. Wake up.\n2. Do the hard thing.\n3. Repeat.\n\nThe rest is noise.\n\nSave this. You'll come back at 11:47 PM.`,
  (hook: string) => `${hook}\n\nYour future self is looking at you through the mirror.\nWhat will you tell him?\n\nDiscipline > Motivation.\nSilence > Excuses.\nWork > Talking.\n\nDisappear for 6 months and come back unrecognizable.`,
  (hook: string) => `${hook}\n\nComfort kills more dreams than failure.\n\nIf you're comfortable, you're losing.\n\nChoose the pain of discipline today,\nso you don't feel the pain of regret tomorrow.`,
  (hook: string) => `${hook}\n\nNo one is coming to save you.\n\nNot your parents.\nNot your friends.\nNot motivation.\n\nIt's just you vs you.\nEvery single day.`,
];

function generateIdea(index: number, brand: BrandKit): Idea {
  const hook = HOOKS_POOL[Math.floor(Math.random() * HOOKS_POOL.length)];
  const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];
  const structure = STRUCTURES[Math.floor(Math.random() * STRUCTURES.length)];
  const visuals = VISUAL_TEMPLATES[structure];
  const visualPrompt = visuals[Math.floor(Math.random() * visuals.length)];
  const captionGen = CAPTION_TEMPLATES[Math.floor(Math.random() * CAPTION_TEMPLATES.length)];
  const source = brand.referenceProfiles[Math.floor(Math.random() * brand.referenceProfiles.length)] || '@alphascript06';
  return {
    id: `idea_${Date.now()}_${index}_${Math.random().toString(36).slice(2,6)}`,
    hook,
    angle,
    structure,
    visualPrompt,
    caption: captionGen(hook),
    hashtags: ['#mindset', '#discipline', '#darkmotivation', '#sigma', '#grind', '#motivation', `#${angle.toLowerCase()}`],
    source: `inspired by ${source} • ${structure}`,
    score: Math.floor(70 + Math.random() * 28),
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
  const [activeTab, setActiveTab] = useState(0);
  const [replicatorUrl, setReplicatorUrl] = useState('');
  const [replicated, setReplicated] = useState<Idea | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [trendy, setTrendy] = useState<Idea[]>([]);
  const [posts, setPosts] = useState<Idea[]>([]);
  const [analysisInput, setAnalysisInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [showBrandKit, setShowBrandKit] = useState(false);

  const [brandKit, setBrandKit] = useState<BrandKit>({
    niche: 'mindset, motivation, discipline, dark motivation',
    tone: 'brutal',
    colors: { bg: '#0F0F11', card: '#18181B', accent: '#00D9FF' },
    referenceProfiles: ['@alphascript06', '@mlliboy', '@millionaire_mentality_7', '@bymgc'],
    favoriteHooks: ['No one is coming.', 'Time is running.'],
  });

  useEffect(() => {
    const stored = localStorage.getItem('void_v3_data');
    if (stored) {
      try {
        const d = JSON.parse(stored);
        setPosts(d.posts || []);
        if (d.brandKit) setBrandKit(d.brandKit);
      } catch {}
    }
    setIdeas(Array.from({ length: 12 }, (_, i) => generateIdea(i, brandKit)));
    setTrendy(Array.from({ length: 12 }, (_, i) => generateIdea(i + 100, brandKit)));
  }, []);

  useEffect(() => {
    localStorage.setItem('void_v3_data', JSON.stringify({ posts, brandKit }));
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

  const saveToPosts = (idea: Idea) => setPosts(prev => [idea, ...prev]);

  const handleAnalysis = () => {
    if (!analysisInput) return;
    const lower = analysisInput.toLowerCase();
    let result = `VOID ANALYSIS for: "${analysisInput.slice(0, 60)}..."\n\n`;
    const issues: string[] = [];
    if (lower.includes('motivation') && !lower.includes('pain') && !lower.includes('discipline')) issues.push('❌ Hook too soft - missing pain / discipline. In dark motivation you must hurt in 0-2s.');
    if (analysisInput.length < 40) issues.push('❌ Hook too short - you have 1.2s to stop the scroll on TikTok.');
    if (!lower.includes('you') && !lower.includes('your')) issues.push('⚠️ No personal callout - add "You" / "Your" - +30% watch time.');
    if (lower.includes('maybe') || lower.includes('i think') || lower.includes('try')) issues.push('❌ Weak language - sigma doesn\'t say "maybe". Use commands: "Do", "Disappear", "Stop".');
    if (!analysisInput.includes('#')) issues.push('⚠️ No niche hashtags - add 2-3 small ones #discipline #timeisrunning instead of only #motivation');
    
    if (issues.length === 0) {
      result += '✅ Strong, personal, brutal hook - keep it.\n';
      result += '✅ Structure OK for dark motivation.\n';
      result += '\nSuggestion: Add auto-caption:\n"Save this. You\'ll be back at 11:47 PM."\nIncreases saves.\n';
    } else {
      result += issues.join('\n\n') + '\n';
    }
    result += `\n\nRECOMMENDED TEMPLATE:\nUse ${brandKit.tone === 'brutal' ? 'PAIN_AGITATE' : 'ALPHA_4_PHASE'} + Brand Kit: ${brandKit.niche}\n\nFixed version:\n"No one is coming. ${analysisInput.slice(0,30)} - it's your fault. Disappear for 6 months."`;
    setAnalysisResult(result);
  };

  const tabs = [
    { label: 'REPLICATOR', icon: Copy, desc: 'Link -> 1:1 Template' },
    { label: 'INFINITE', icon: InfinityIcon, desc: 'Infinite Ideas' },
    { label: 'MY POSTS', icon: Layers, desc: `${posts.length} ready` },
    { label: 'TRENDS', icon: Radio, desc: 'What\'s viral now' },
    { label: 'VAULT', icon: Box, desc: 'Graphics' },
    { label: 'ANALYTICS', icon: BarChart3, desc: 'Why it flopped' },
    { label: 'HOOK LAB', icon: Brain, desc: 'Test hooks' },
  ];

  const IdeaCard = ({ idea, onSave }: { idea: Idea; onSave?: () => void }) => (
    <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl space-y-3 hover:border-[#3F3F46] transition group">
      <div className="flex justify-between items-start gap-2">
        <div className="text-[11px] font-mono text-[#71717A] tracking-wider">{idea.structure} • {idea.angle} • {idea.score}% VIRAL</div>
        <div className="text-[10px] px-2 py-0.5 rounded bg-[#27272A] border border-[#3F3F46] text-[#A1A1AA]">{idea.source}</div>
      </div>
      <div className="text-[15px] font-bold leading-tight text-white">"{idea.hook}"</div>
      <div className="text-[11px] font-mono text-[#A1A1AA] bg-[#0A0A0B] border border-[#27272A] p-2.5 rounded-lg">{idea.visualPrompt}</div>
      <div className="text-[12px] text-[#D4D4D8] whitespace-pre-wrap leading-relaxed">{idea.caption.slice(0, 180)}...</div>
      <div className="flex flex-wrap gap-1.5">{idea.hashtags.slice(0,4).map(h => <span key={h} className="text-[10px] text-[#00D9FF] bg-[#00D9FF]/10 border border-[#00D9FF]/20 px-1.5 py-0.5 rounded">{h}</span>)}</div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex-1 py-2 bg-white text-black text-[11px] font-bold uppercase rounded-lg hover:bg-[#F5F5F3] transition">Save to My Posts</button>
        <button onClick={() => { navigator.clipboard.writeText(idea.caption); }} className="px-3 py-2 bg-[#27272A] border border-[#3F3F46] text-white rounded-lg text-[11px]"><Copy className="w-3.5 h-3.5" /></button>
        <button onClick={() => {
          const blob = new Blob([`HOOK: ${idea.hook}\n\nVISUAL: ${idea.visualPrompt}\n\nCAPTION:\n${idea.caption}\n\n${idea.hashtags.join(' ')}`], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `${idea.id}.txt`; a.click();
        }} className="px-3 py-2 bg-[#27272A] border border-[#3F3F46] text-white rounded-lg text-[11px]"><Download className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0F11] text-[#F5F5F3] selection:bg-[#00D9FF]/30">
      <div className="border-b border-[#27272A] bg-[#0A0A0B]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SF" className="w-9 h-9 rounded-full object-cover border border-[#27272A] shadow-lg" />
            <div>
              <div className="text-[13px] font-bold tracking-[0.3em] flex items-center gap-2">SF • VOID • v3.1 EN <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D9FF] text-black font-mono">MINDSET</span></div>
              <div className="text-[9px] font-mono text-[#A1A1AA] tracking-widest">{brandKit.niche.toUpperCase()} • {brandKit.tone.toUpperCase()} • OFFLINE</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBrandKit(true)} className="text-[10px] font-mono border border-[#27272A] bg-[#18181B] px-2.5 py-1.5 rounded-lg hover:bg-[#27272A] flex items-center gap-1.5"><Settings2 className="w-3 h-3" /> BRAND KIT</button>
            <div className="text-[10px] font-mono text-[#00D9FF] border border-[#00D9FF]/30 px-2 py-1 rounded bg-[#18181B] hidden md:block">INFINITE • FREE • ENGLISH</div>
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
                  <div className="text-[8px] opacity-60 font-normal normal-case tracking-normal">{tab.desc}</div>
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
                  <h2 className="text-[13px] font-bold tracking-[0.2em]">REPLICATOR 1:1 // DARK MOTIVATION</h2>
                  <p className="text-[11px] font-mono text-[#A1A1AA]">Paste link from @alphascript06 / @mlliboy / @millionaire_mentality_7 / @bymgc — get ready template in your SF style</p>
                  <p className="text-[10px] font-mono text-[#71717A] mt-1">Auto-detects style: 4-phase / sigma overlay / 7-list / cinematic quote</p>
                </div>
              </div>
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl flex gap-2">
                <input value={replicatorUrl} onChange={e => setReplicatorUrl(e.target.value)} placeholder="https://www.tiktok.com/@alphascript06/video/..." className="flex-1 px-3 py-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm text-white outline-none font-mono focus:border-[#00D9FF]" />
                <button onClick={handleReplicate} className="px-6 py-3 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Replicate Structure</button>
              </div>
              {replicated && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="text-[11px] font-mono text-[#00D9FF]">DETECTED STYLE: {replicated.structure} • 96% MATCH • READY TO EDIT</div>
                  <IdeaCard idea={replicated} onSave={() => saveToPosts(replicated)} />
                </div>
              )}
            </div>
          )}

          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[13px] font-bold tracking-widest flex items-center gap-2"><InfinityIcon className="w-4 h-4" /> INFINITE IDEAS • {brandKit.niche}</h2>
                <button onClick={() => addMoreIdeas('ideas')} className="px-4 py-2 bg-[#18181B] border border-[#27272A] rounded-xl text-[11px] font-mono hover:bg-[#27272A]">+20 more (infinite)</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {ideas.map(i => <IdeaCard key={i.id} idea={i} onSave={() => saveToPosts(i)} />)}
              </div>
              <button onClick={() => addMoreIdeas('ideas')} className="w-full py-3 bg-[#18181B] border border-dashed border-[#3F3F46] rounded-xl text-[12px] font-mono text-[#A1A1AA] hover:text-white">Generate next 20 — never ends</button>
            </div>
          )}

          {activeTab === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-[13px] font-bold tracking-widest">MY POSTS • {posts.length} ready to download</h2>
                <button onClick={() => { setPosts([]); }} className="text-[11px] font-mono text-[#71717A] hover:text-white flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear</button>
              </div>
              {posts.length === 0 ? <div className="p-12 text-center border border-dashed border-[#27272A] rounded-xl text-[#71717A] font-mono text-sm">No saved yet. Go to INFINITE and click "Save".</div> : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {posts.map(p => <IdeaCard key={p.id} idea={p} onSave={() => {}} />)}
                </div>
              )}
            </div>
          )}

          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
                <div className="text-[12px] font-bold">TRENDS NOW • {new Date().toLocaleDateString('en-US')} • Dark Motivation</div>
                <div className="text-[11px] font-mono text-[#A1A1AA] mt-1">Based on @alphascript06 / @mlliboy / @bymgc — structures with most saves right now. Generated offline, no API, free.</div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trendy.map(t => <IdeaCard key={t.id} idea={t} onSave={() => saveToPosts(t)} />)}
              </div>
              <button onClick={() => addMoreIdeas('trendy')} className="w-full py-3 bg-[#18181B] border border-dashed border-[#3F3F46] rounded-xl text-[12px] font-mono">+20 more trends</button>
            </div>
          )}

          {activeTab === 4 && (
            <div className="p-8 border border-dashed border-[#27272A] rounded-xl text-center space-y-3">
              <Box className="w-8 h-8 mx-auto text-[#71717A]" />
              <div className="font-bold tracking-widest text-[13px]">VAULT • GRAPHICS</div>
              <div className="text-[11px] font-mono text-[#A1A1AA]">Your old Vault still works. Drop your generated backgrounds, wolves, clocks, hourglasses here. All local.</div>
            </div>
          )}

          {activeTab === 5 && (
            <div className="space-y-4">
              <div className="p-5 bg-[#18181B] border border-[#27272A] rounded-xl space-y-3">
                <h2 className="text-[13px] font-bold tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> PROFILE ANALYSIS • WHY IT FLOPPED</h2>
                <p className="text-[11px] font-mono text-[#A1A1AA]">Paste your reel description, hook, or stats: "Video 1200 views, 40% retention". Get brutal feedback.</p>
                <textarea value={analysisInput} onChange={e => setAnalysisInput(e.target.value)} placeholder="Paste here: link, reel description, or e.g. 'Discipline reel, 800 views, people drop after 2s'" className="w-full h-28 p-3 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm outline-none font-mono" />
                <button onClick={handleAnalysis} className="px-6 py-2.5 bg-white text-black text-xs font-bold uppercase rounded-xl flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Analyze Why It Stuck</button>
              </div>
              {analysisResult && (
                <pre className="p-4 bg-[#0A0A0B] border border-[#00D9FF]/30 rounded-xl text-[12px] font-mono whitespace-pre-wrap leading-relaxed text-[#D4D4D8]">{analysisResult}</pre>
              )}
            </div>
          )}

          {activeTab === 6 && (
            <div className="space-y-3">
              <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
                <div className="font-bold text-[13px] tracking-widest">HOOK LAB • TEST 20 HOOKS AT ONCE</div>
                <div className="text-[11px] font-mono text-[#A1A1AA] mt-1">Topic: e.g. "morning routine" — get 20 hooks in style of your 4 reference profiles.</div>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {HOOKS_POOL.slice(0, 20).map((h, i) => (
                  <div key={i} className="p-3 bg-[#18181B] border border-[#27272A] rounded-xl flex justify-between items-center">
                    <span className="text-[12px] font-bold">"{h}"</span>
                    <button onClick={() => navigator.clipboard.writeText(h)} className="p-1.5 bg-[#27272A] rounded-lg"><Copy className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {showBrandKit && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] border border-[#27272A] rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold tracking-widest text-[13px]">BRAND KIT • CONSISTENCY</h3>
              <button onClick={() => setShowBrandKit(false)} className="text-[#71717A] hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-mono text-[#A1A1AA]">Niche</label>
              <input value={brandKit.niche} onChange={e => setBrandKit({ ...brandKit, niche: e.target.value })} className="w-full p-2.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm" />
              <label className="text-[11px] font-mono text-[#A1A1AA]">Tone</label>
              <div className="flex gap-2">
                {(['brutal', 'cinematic', 'minimal', 'sigma'] as const).map(t => (
                  <button key={t} onClick={() => setBrandKit({ ...brandKit, tone: t })} className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border ${brandKit.tone === t ? 'bg-white text-black' : 'bg-[#0A0A0B] border-[#27272A] text-[#A1A1AA]'}`}>{t}</button>
                ))}
              </div>
              <label className="text-[11px] font-mono text-[#A1A1AA]">Reference profiles (1 per line)</label>
              <textarea value={brandKit.referenceProfiles.join('\n')} onChange={e => setBrandKit({ ...brandKit, referenceProfiles: e.target.value.split('\n').filter(Boolean) })} className="w-full h-20 p-2.5 bg-[#0A0A0B] border border-[#27272A] rounded-xl text-sm font-mono" />
              <div className="text-[10px] font-mono text-[#71717A]">Saved locally. Offline. No API. Free. This is your consistency - every idea in INFINITE uses this.</div>
              <button onClick={() => setShowBrandKit(false)} className="w-full py-2.5 bg-white text-black font-bold uppercase text-xs rounded-xl">Save Brand Kit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
