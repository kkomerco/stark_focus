import React, { useState } from 'react';
import {
  Send,
  Trash2,
  Plus,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Film,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Eye,
  ExternalLink
} from 'lucide-react';
import { StarkFocusData, Post, Platform, CTAPreset } from '../../types';
import { DEFAULT_PRESETS_EN } from '../../data/mentorTemplates';

interface PipelineTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenVideoStudio?: (hookText: string, bgUrl?: string) => void;
  onOpenCarouselStudio?: (title: string, slides: Array<{ headline: string; bodyText: string }>) => void;
  onOpenQR?: (title: string, data: string) => void;
}

function injectCtaIntoCaption(existingCaption: string, cta: string, tags: string): string {
  const trimmed = existingCaption.trim();
  if (!trimmed) {
    return `${cta}\n\n${tags}`;
  }
  const lines = trimmed.split('\n');
  const nonCtaLines = lines.filter((l) => {
    const t = l.trim();
    if (t.startsWith('#')) return false;
    if (
      t.toLowerCase().startsWith('save this') ||
      t.toLowerCase().startsWith('follow @') ||
      t.toLowerCase().startsWith('stark focus') ||
      t.toLowerCase().startsWith('execute in silence')
    ) {
      return false;
    }
    return true;
  });
  const cleanedBody = nonCtaLines.join('\n').trim();
  return cleanedBody ? `${cleanedBody}\n\n${cta}\n\n${tags}` : `${cta}\n\n${tags}`;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({
  data,
  onUpdateData,
  onOpenVideoStudio,
  onOpenCarouselStudio
}) => {
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<Platform>('Instagram');
  const [format, setFormat] = useState('🎬 Rolka 7-Sekundowa (Short Reel)');
  const [asset, setAsset] = useState('Brak przypisania');
  const [caption, setCaption] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeCtaDropdownPostId, setActiveCtaDropdownPostId] = useState<string | null>(null);
  const [appliedCtaPostId, setAppliedCtaPostId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const assetOptions = [
    'Brak przypisania',
    ...data.carousel_packages.map((c) => `🎠 ${c.name}`),
    ...data.vault_assets.filter((a) => a.type === 'bg').map((a) => `🌌 ${a.filename}`)
  ];

  const handleCopyCaption = (postId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaptionId(postId);
    setToastMessage('✓ Treść posta skopiowana do schowka!');
    setTimeout(() => {
      setCopiedCaptionId(null);
      setToastMessage(null);
    }, 2500);
  };

  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newPost: Post = {
      id: 'post-' + Date.now(),
      title: title.trim(),
      platform,
      format,
      asset,
      caption: caption.trim(),
      status: 'draft',
      created_date: todayStr,
      published_date: null
    };

    onUpdateData((prev) => ({
      ...prev,
      posts: [newPost, ...prev.posts]
    }));

    setTitle('');
    setCaption('');
    setIsCreateOpen(false);
    setToastMessage('✓ Dodano nowy szkic posta!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDelete = (postId: string) => {
    onUpdateData((prev) => ({
      ...prev,
      posts: prev.posts.filter((p) => p.id !== postId)
    }));
    setDeleteConfirmId(null);
    setToastMessage('✓ Usunięto szkic posta.');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApplyCtaToExistingPost = (postId: string, preset: CTAPreset) => {
    onUpdateData((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== postId) return p;
        const currentCap = p.caption || '';
        return {
          ...p,
          caption: injectCtaIntoCaption(currentCap, preset.cta, preset.tags)
        };
      })
    }));

    setActiveCtaDropdownPostId(null);
    setAppliedCtaPostId(postId);
    setToastMessage(`✓ Zastosowano pakiet CTA "${preset.name}"!`);
    setTimeout(() => {
      setAppliedCtaPostId(null);
      setToastMessage(null);
    }, 2500);
  };

  const getAssetThumbnail = (assetStr: string): string | null => {
    if (!assetStr || assetStr === 'Brak przypisania') return null;
    const cleanName = assetStr.replace('🎠 ', '').replace('🌌 ', '').trim();

    if (assetStr.startsWith('🎠')) {
      const pkg = data.carousel_packages.find((c) => c.name === cleanName);
      return pkg?.slides[0] || null;
    }

    const va = data.vault_assets.find((a) => a.filename === cleanName);
    return va?.url || null;
  };

  // Only active drafts are shown
  const drafts = data.posts.filter((p) => p.status === 'draft' || p.status === 'scheduled');

  return (
    <div className="space-y-5">
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

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141824] border border-[#2C354B] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
            <Layers className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              SZKICE POSTÓW // WIDOK GRAFICZNY ({drafts.length})
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Wizualny podgląd Twoich postów przed publikacją. Widzisz dokładnie kadr, hook i estetykę feedu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="py-2 px-4 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreateOpen ? 'Zamknij formularz' : '+ Nowy Szkic Posta'}</span>
        </button>
      </div>

      {/* Collapsible Create Draft Form */}
      {isCreateOpen && (
        <div className="bg-[#1D2333] border border-[#38BDF8]/40 rounded-xl p-4 sm:p-5 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#2C354B] pb-2">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              Stwórz Nowy Szkic Posta
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Pojawi się od razu w galerii wizualnej</span>
          </div>

          <form onSubmit={handleCreateDraft} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
                  Publikacja:
                </label>
                <div className="w-full text-xs font-mono py-2 px-2.5 bg-[#141824] border border-[#2C354B] rounded text-[#38BDF8] flex items-center justify-between">
                  <span>🌐 Wszystkie Platformy</span>
                  <span className="text-[10px] text-slate-400 font-bold">IG•TT•YT</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
                  Format:
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full text-xs font-mono py-2 px-2.5 bg-[#141824] border border-[#2C354B] rounded text-white focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="🎬 Rolka 7-Sekundowa (Short Reel)">🎬 Rolka 7-Sekundowa (Short Reel)</option>
                  <option value="🎠 Karuzela 5-7 Slajdów (Instagram Carousel)">🎠 Karuzela 5-7 Slajdów</option>
                  <option value="🖼️ Pojedyncza Grafika (Statyczny Post)">🖼️ Pojedyncza Grafika (Statyczny Post)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
                  Przypisane tło / asset:
                </label>
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full text-xs font-mono py-2 px-2.5 bg-[#141824] border border-[#2C354B] rounded text-white focus:outline-none focus:border-[#38BDF8]"
                >
                  {assetOptions.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
                Główny Hook (Tekst wyświetlany na grafice):
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. NOBODY CARES ABOUT YOUR EXCUSES."
                className="w-full text-xs font-mono py-2.5 px-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
                Treść posta (Caption / Opis):
              </label>
              <textarea
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Wpisz treść opisu pod postem z wezwaniem do działania..."
                className="w-full text-xs font-mono p-3 bg-[#141824] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-[#141824] hover:bg-[#2C354B] border border-[#2C354B] text-xs font-mono text-slate-300 rounded cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] text-xs font-mono font-bold uppercase rounded cursor-pointer transition-all"
              >
                + Zapisz jako Szkic
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visual Drafts Gallery */}
      {drafts.length === 0 ? (
        <div className="p-12 text-center bg-[#141824] border border-dashed border-[#2C354B] rounded-xl space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-500 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-white font-mono uppercase">
            Brak aktywnych szkiców postów
          </h3>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            Twórz nowe posty za pomocą przycisku powyżej lub przejdź do zakładki "Nowy Post" lub "Test Hooków", aby wygenerować warianty wizualne.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-[#38BDF8] text-[#141824] text-xs font-mono font-bold uppercase rounded cursor-pointer hover:bg-[#38BDF8]/90 transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Dodaj Pierwszy Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {drafts.map((post, idx) => {
            const thumb = getAssetThumbnail(post.asset);
            const isCarousel = post.format.includes('Karuzela');
            const isExpanded = expandedCaptions[post.id] || false;
            const isCopied = copiedCaptionId === post.id;

            return (
              <div
                key={post.id}
                className="bg-[#1D2333] border border-[#2C354B] hover:border-[#38BDF8]/50 rounded-xl overflow-hidden shadow-lg transition-all flex flex-col justify-between"
              >
                {/* Top Meta Bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#141824] border-b border-[#2C354B]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      🌐 WSZYSTKIE PLATFORMY
                    </span>
                    <span className="text-[10px] font-mono text-slate-300">
                      {isCarousel ? '🎠 Karuzela' : '🎬 Rolka 9:16'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    Szkic #{idx + 1}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* WYRAZISTY PODGLĄD GRAFICZNY (VISUAL MOCKUP CARD) */}
                  <div className="relative rounded-lg overflow-hidden border border-[#2C354B] bg-[#0A0D14] shadow-inner">
                    <div
                      className={`relative w-full flex flex-col justify-between p-5 overflow-hidden ${
                        isCarousel ? 'aspect-[4/5]' : 'aspect-[9/16] max-h-[360px]'
                      }`}
                      style={{
                        backgroundImage: thumb ? `url(${thumb})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {/* Dark aesthetic overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

                      {/* Header in Mockup */}
                      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 font-bold tracking-widest text-[#38BDF8] uppercase">
                          {isCarousel ? 'SLIDE 01/05' : '9:16 REEL'}
                        </span>
                        <span className="font-bold tracking-wider text-white/90 drop-shadow">
                          @stark_focus
                        </span>
                      </div>

                      {/* Prominent Graphic Hook in Center */}
                      <div className="relative z-10 text-center my-auto px-2">
                        <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider leading-snug drop-shadow-lg font-sans">
                          {post.title}
                        </h3>
                        <div className="w-8 h-0.5 bg-[#38BDF8] mx-auto mt-3 rounded-full opacity-80" />
                      </div>

                      {/* Footer in Mockup */}
                      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-300 pt-2 border-t border-white/10">
                        <span className="text-white/70">
                          {post.asset && post.asset !== 'Brak przypisania' ? post.asset : 'Tło: Stark Basalt Monolith'}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          100% EN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Caption & Content Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Bookmark className="w-3 h-3 text-[#38BDF8]" />
                        Treść posta (Caption):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCaption(post.id, post.caption)}
                        className="text-[#38BDF8] hover:text-white flex items-center gap-1 font-bold cursor-pointer transition-colors"
                        title="Skopiuj cały opis posta"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-[#10B981]" />
                            <span className="text-[#10B981]">Skopiowano!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopiuj Opis</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      className={`text-xs font-mono text-slate-300 bg-[#141824] p-3 rounded-lg border border-[#2C354B] leading-relaxed whitespace-pre-wrap ${
                        isExpanded ? '' : 'max-h-24 overflow-hidden'
                      }`}
                    >
                      {post.caption || 'Brak opisu dla tego szkicu.'}
                    </div>

                    {post.caption && post.caption.length > 120 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCaptions((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id]
                          }))
                        }
                        className="text-[10px] font-mono text-[#38BDF8] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Zwiń opis
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> Pokaż cały opis
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* CTA Presets Quick Inserter */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveCtaDropdownPostId((prev) => (prev === post.id ? null : post.id))
                      }
                      className="w-full py-1.5 px-2.5 rounded bg-[#141824] hover:bg-[#242B3F] text-slate-300 hover:text-white border border-[#2C354B] text-[11px] font-mono flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>Dodaj pakiet CTA & hasztagi</span>
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>

                    {activeCtaDropdownPostId === post.id && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-[#141824] border border-[#38BDF8]/60 rounded-lg shadow-2xl p-2 z-30 space-y-1.5 animate-in fade-in">
                        <span className="text-[9px] font-mono text-[#38BDF8] uppercase tracking-wider block px-1">
                          Wybierz pakiet CTA do dopisania:
                        </span>
                        {DEFAULT_PRESETS_EN.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyCtaToExistingPost(post.id, preset)}
                            className="w-full text-left p-2 rounded bg-[#1D2333] hover:bg-[#242B3F] text-slate-200 border border-[#2C354B] hover:border-[#38BDF8]/50 transition-all text-[11px] font-mono cursor-pointer"
                          >
                            <div className="font-bold text-white mb-0.5">{preset.name}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">{preset.cta}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Hub */}
                <div className="px-4 py-3 bg-[#141824] border-t border-[#2C354B] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {onOpenVideoStudio && (
                      <button
                        type="button"
                        onClick={() => onOpenVideoStudio(post.title, thumb || undefined)}
                        className="py-1.5 px-3 rounded-sm bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 border border-[#38BDF8]/40 text-xs font-mono font-bold text-[#38BDF8] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Otwórz montaż wideo 9:16 z tym hookiem"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>🎬 Studio Wideo</span>
                      </button>
                    )}

                    {onOpenCarouselStudio && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCarouselStudio(post.title, [
                            { headline: post.title.toUpperCase(), bodyText: post.caption.slice(0, 160) || 'Execute in silence.' }
                          ])
                        }
                        className="py-1.5 px-3 rounded-sm bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-xs font-mono font-bold text-purple-300 uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Otwórz generator slajdów i grafik"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>🖼️ Studio Karuzeli</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {deleteConfirmId === post.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-mono font-bold uppercase cursor-pointer"
                        >
                          Usuń!
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded bg-[#1D2333] text-slate-400 hover:text-white text-[11px] font-mono cursor-pointer"
                        >
                          Anuluj
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(post.id)}
                        className="p-1.5 rounded bg-[#1D2333] hover:bg-red-500/20 border border-[#2C354B] hover:border-red-500/50 text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                        title="Usuń ten szkic"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
