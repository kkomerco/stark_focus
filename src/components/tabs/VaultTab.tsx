import React, { useState, useRef } from "react";
import {
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
  Film,
  Upload,
  Trash2,
  Plus,
  Palette,
  Wand2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { StarkFocusData, VaultAsset, SlideData } from "../../types";

interface VaultTabProps {
  data: StarkFocusData;
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void;
  onOpenCarouselStudio?: (title?: string, slides?: SlideData[]) => void;
  onOpenVideoStudio?: (hookText?: string, bgUrl?: string) => void;
  onSwitchToMentor?: () => void;
  onSwitchToPipeline?: () => void;
}

interface PromptPreset {
  id: string;
  name: string;
  motif: string;
  description: string;
}

const MINIMALIST_MYSTERIOUS_PRESETS: PromptPreset[] = [
  {
    id: "void_light",
    name: "1. 🌫️ Promień w Pustce",
    motif:
      "Ultra-minimalist pitch black infinite void, razor-thin single beam of cold diffuse directional light cutting through dense atmosphere, mysterious enigmatic moody darkness, subtle volumetric haze, vast negative space for typography overlay",
    description:
      "Czysta tajemnica i głęboka czerń. Brak rozpraszaczy, doskonałe pod biały tekst w rolkach i karuzelach.",
  },
  {
    id: "abstract_geometry",
    name: "2. 🏛️ Geometria Cienia",
    motif:
      "Abstract minimalist dark architecture, sharp geometric chiaroscuro shadow intersecting smooth matte carbon surfaces, eerie silent atmosphere, mysterious twilight gradient, brutalist clean composition",
    description:
      "Surowe geometryczne płaszczyzny, głębokie grafitowe cienie i chłodne światło studyjne.",
  },
  {
    id: "foggy_horizon",
    name: "3. 🌌 Horyzont w Mgle",
    motif:
      "Minimalist enigmatic dark horizon shrouded in heavy silent fog, lone subtle silhouette dissolving into cold atmospheric mist, vast negative space, haunting cinematic mood, clean contrast",
    description:
      "Metafora samotnej drogi i ciszy o świcie. Głębia, tajemnica i przestrzeń negatywna.",
  },
  {
    id: "matte_void",
    name: "4. ⬛ Mroczna Pustka Mineralna",
    motif:
      "Deep matte obsidian and charcoal raw mineral textures with soft dark vignette, mysterious ambient shadows, ultra-clean negative space for text overlay, cinematic editorial depth",
    description: "Matowa, głęboka czerń z organicznym mineralnym ziarnem. Bezwzględny minimalizm.",
  },
];

// Inteligentny generator wizualny w j. angielskim dla haseł użytkownika (bez wklejania haseł jako tekstu na grafikę!)
function synthesizeVisualPrompt(topic: string): string {
  const t = topic.trim().toLowerCase();
  let scene = "";

  if (t.includes("1%") || t.includes("protokół") || t.includes("protokol")) {
    scene =
      "Abstract minimalist dark architecture, razor-thin sliver of cold diffuse light cutting through pure pitch black darkness, matte carbon textures, stark silent geometry, haunting volumetric fog, mysterious liminal perspective";
  } else if (t.includes("ruthless") || t.includes("bezwzględ") || t.includes("zimn")) {
    scene =
      "Ultra-minimalist dark composition, solitary shadowy silhouette standing motionless at the edge of a deep charcoal abyss, cold sharp directional rim lighting, eerie silent atmosphere, mysterious cinematic chiaroscuro";
  } else if (
    t.includes("poranek") ||
    t.includes("rano") ||
    t.includes("morning") ||
    t.includes("świt")
  ) {
    scene =
      "Minimalist moody dark city skyline at 4:30 AM before dawn, thick atmospheric fog rolling over wet asphalt, lone solitary figure in dark trench coat in distance, eerie silence, vast negative space";
  } else if (t.includes("samotn") || t.includes("cisz") || t.includes("droga")) {
    scene =
      "Eerie infinite empty black road shrouded in impenetrable silent mist, faint cold ambient twilight gradient in the far horizon, solitary stoic mood, minimalist editorial framing";
  } else if (t.includes("monolit") || t.includes("kamień") || t.includes("stone")) {
    scene =
      "Abstract minimalist dark geometric monolith silhouette shrouded in heavy cold fog, subtle rim light from behind, pure void, brutalist raw slate texture";
  } else {
    scene = `Abstract minimalist dark void inspired by the feeling of ${topic}, razor-thin beam of cold diffused light cutting through black atmospheric fog, deep chiaroscuro, matte obsidian textures, generous negative space for overlay`;
  }

  return `${scene}, 8k photorealistic, raw texture, vertical 9:16 composition, minimalist editorial photography, cinematic lighting, shot on 35mm lens, strictly no text, no words, no letters, no typography, no watermark, no logos`;
}

export const VaultTab: React.FC<VaultTabProps> = ({
  data,
  onUpdateData,
  onOpenCarouselStudio,
  onOpenVideoStudio,
}) => {
  // 1. Generator Promptów Bing / DALL-E (Format 9:16)
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset>(
    MINIMALIST_MYSTERIOUS_PRESETS[0],
  );
  const [customSubject, setCustomSubject] = useState<string>("");
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string | null>(null);
  const [isGeneratingAiPrompt, setIsGeneratingAiPrompt] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // 2. Biblioteka Teł - Wgrywanie
  const [newBgName, setNewBgName] = useState<string>("");
  const [newBgUrl, setNewBgUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Filtrowanie grafik tła
  const bgAssets = data.vault_assets.filter((a) => a.type === "bg" || !a.type);

  // Budowanie pełnego promptu w j. angielskim dla DALL-E / Bing
  const fullBingPrompt = aiCustomPrompt
    ? aiCustomPrompt
    : customSubject.trim()
      ? synthesizeVisualPrompt(customSubject)
      : `${selectedPreset.motif}, dark stoic aesthetic, high contrast, cinematic dramatic lighting, moody deep shadows, 8k photorealistic, raw texture, vertical 9:16 composition, minimalist editorial photography, shot on 35mm lens, strictly no text, no watermark, no typography`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullBingPrompt);
    setCopiedPrompt(true);
    setToastMessage("✓ Prompt skopiowany! Możesz wkleić go w Bing Image Creator.");
    setTimeout(() => {
      setCopiedPrompt(false);
      setToastMessage(null);
    }, 3000);
  };

  const handleGenerateAiPrompt = async () => {
    if (!customSubject.trim()) return;
    setIsGeneratingAiPrompt(true);
    try {
      const res = await fetch("/api/ai/generate-background-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: customSubject.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.prompt) {
          setAiCustomPrompt(json.prompt);
          setToastMessage("✓ Wygenerowano unikalny prompt wizualny AI!");
          setTimeout(() => setToastMessage(null), 3000);
          return;
        }
      }
    } catch {
      // Fallback to client synthesis
    } finally {
      setIsGeneratingAiPrompt(false);
    }

    setAiCustomPrompt(synthesizeVisualPrompt(customSubject));
  };

  const handleAddUrlBg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBgUrl.trim()) return;

    const filename = newBgName.trim() || `Tło_${Date.now().toString().slice(-4)}.jpg`;
    const newAsset: VaultAsset = {
      id: "bg-" + Date.now(),
      filename,
      type: "bg",
      url: newBgUrl.trim(),
      created_date: new Date().toISOString().split("T")[0],
    };

    onUpdateData((prev) => ({
      ...prev,
      vault_assets: [newAsset, ...prev.vault_assets],
    }));

    setNewBgName("");
    setNewBgUrl("");
    setToastMessage("✓ Dodano grafikę do biblioteki!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newAsset: VaultAsset = {
        id: "bg-" + Date.now(),
        filename: file.name.replace(/\.[^/.]+$/, ""),
        type: "bg",
        url: dataUrl,
        created_date: new Date().toISOString().split("T")[0],
      };

      onUpdateData((prev) => ({
        ...prev,
        vault_assets: [newAsset, ...prev.vault_assets],
      }));

      setIsUploading(false);
      setToastMessage(`✓ Wgrano grafikę "${file.name}"!`);
      setTimeout(() => setToastMessage(null), 3000);
    };

    reader.onerror = () => {
      setIsUploading(false);
      setToastMessage("Błąd odczytu pliku.");
      setTimeout(() => setToastMessage(null), 3000);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDeleteBg = (id: string) => {
    onUpdateData((prev) => ({
      ...prev,
      vault_assets: prev.vault_assets.filter((a) => a.id !== id),
    }));
    setToastMessage("✓ Usunięto grafikę.");
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleClearAllBgs = () => {
    onUpdateData((prev) => ({
      ...prev,
      vault_assets: prev.vault_assets.filter((a) => a.type !== "bg" && a.type),
    }));
    setShowClearConfirm(false);
    setToastMessage("✓ Wyszczyszczono całą bibliotekę teł.");
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
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

      {/* Header & Studio Quick Access Hub */}
      <div className="bg-[#141824] border border-[#2C354B] p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#38BDF8]" />
            GRAFIKI & PROMPTY // MROCZNY MINIMALIZM
          </h2>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
            Generuj minimalistyczne, zagadkowe tła bez napisów i montuj swoje materiały w Studio.
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2">
          {onOpenVideoStudio && (
            <button
              type="button"
              onClick={() => onOpenVideoStudio()}
              className="py-2 px-3.5 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 Studio Wideo (9:16)</span>
            </button>
          )}

          {onOpenCarouselStudio && (
            <button
              type="button"
              onClick={() => onOpenCarouselStudio()}
              className="py-2 px-3.5 rounded-sm bg-purple-600 hover:bg-purple-700 text-white font-black text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>🖼️ Studio Karuzeli (4:5)</span>
            </button>
          )}
        </div>
      </div>

      {/* FUNKCJA 1: GENERATOR PROMPTÓW DO BING DALL-E */}
      <div className="bg-[#1D2333] border border-[#2C354B] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#2C354B] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#38BDF8]/20 text-[#38BDF8] font-bold text-xs font-mono">
              1
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase font-mono tracking-wider">
              Generator Zagadkowych Promptów Bing / DALL-E (Format 9:16)
            </h3>
          </div>
          <a
            href="https://www.bing.com/images/create"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-[#38BDF8] hover:underline flex items-center gap-1 font-bold"
          >
            <span>Otwórz Bing Image Creator</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* 4 Zagadkowe, Minimalistyczne Presety */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MINIMALIST_MYSTERIOUS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelectedPreset(preset);
                setCustomSubject("");
                setAiCustomPrompt(null);
              }}
              className={`p-3 rounded-lg text-left transition-all border font-mono cursor-pointer flex flex-col justify-between ${
                selectedPreset.id === preset.id && !customSubject && !aiCustomPrompt
                  ? "bg-[#141824] border-[#38BDF8] shadow-sm ring-1 ring-[#38BDF8]/40"
                  : "bg-[#141824]/60 border-[#2C354B] hover:border-slate-500"
              }`}
            >
              <div>
                <div className="font-bold text-xs text-white mb-1">{preset.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">
                  {preset.description}
                </div>
              </div>
              <span className="text-[9px] text-[#38BDF8] font-bold uppercase mt-2 block">
                {selectedPreset.id === preset.id && !customSubject && !aiCustomPrompt
                  ? "✓ Aktywny styl"
                  : "Wybierz styl"}
              </span>
            </button>
          ))}
        </div>

        {/* Wpisz własne słowo / motyw + Inteligentny generator promptu AI */}
        <div className="space-y-2 bg-[#141824] p-3.5 rounded-lg border border-[#2C354B]">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-300 block uppercase font-mono">
              Wpisz własny temat / hasło (AI przekształci je w zagadkową scenę bez napisów):
            </label>
            {customSubject && (
              <button
                type="button"
                onClick={() => {
                  setCustomSubject("");
                  setAiCustomPrompt(null);
                }}
                className="text-[10px] text-slate-400 hover:text-white font-mono cursor-pointer"
              >
                Wyczyść
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={customSubject}
              onChange={(e) => {
                setCustomSubject(e.target.value);
                setAiCustomPrompt(null);
              }}
              placeholder="np. stay ruthless, 1% standard, nocna praca, pustka, stoicki chłód..."
              className="flex-1 text-xs font-mono py-2 px-3 bg-[#1D2333] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
            />

            <button
              type="button"
              onClick={handleGenerateAiPrompt}
              disabled={!customSubject.trim() || isGeneratingAiPrompt}
              className="py-2 px-4 rounded bg-gradient-to-r from-[#38BDF8] to-blue-600 hover:opacity-90 disabled:opacity-40 text-[#141824] font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              {isGeneratingAiPrompt ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generuję wizję...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Stwórz Prompt Wizualny AI</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-mono">
            💡 AI przekształca Twoje słowa w chłodną, kinową kompozycję z przestrzenią negatywną,
            wymuszając brak tekstu i znaków wodnych.
          </p>
        </div>

        {/* Podgląd gotowego promptu z 1-klikowym kopiowaniem */}
        <div className="bg-[#141824] p-3.5 rounded-lg border border-[#2C354B] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              Gotowy prompt po angielsku (9:16 Dark Minimalist Enigma):
            </span>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="py-1.5 px-3 rounded-sm bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-[#141824] font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Skopiowano!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kopiuj Prompt</span>
                </>
              )}
            </button>
          </div>
          <div className="text-xs font-mono text-slate-200 leading-relaxed bg-[#0A0D14] p-2.5 rounded border border-[#2C354B]/60 select-all">
            {fullBingPrompt}
          </div>
        </div>
      </div>

      {/* FUNKCJA 2: BIBLIOTEKA TEŁ I ZDJĘĆ */}
      <div className="bg-[#1D2333] border border-[#2C354B] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2C354B] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#38BDF8]/20 text-[#38BDF8] font-bold text-xs font-mono">
              2
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase font-mono tracking-wider">
              Twoja Biblioteka Teł & Zdjęć ({bgAssets.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400">
              Wgrywaj własne wygenerowane tła z Bing / Midjourney.
            </span>
            {bgAssets.length > 0 && !showClearConfirm && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-[10px] text-red-400 hover:text-red-300 font-mono flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Wyczyść całą bibliotekę</span>
              </button>
            )}
          </div>
        </div>

        {/* Potwierdzenie czyszczenia całej galerii */}
        {showClearConfirm && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Czy na pewno chcesz usunąć wszystkie {bgAssets.length} zapisane tła?</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAllBgs}
                className="py-1 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-mono font-bold cursor-pointer"
              >
                Tak, wyczyść wszystko
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-1 px-2 text-slate-400 hover:text-white rounded text-xs font-mono cursor-pointer"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}

        {/* Panel dodawania nowego tła */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-[#141824] p-3 rounded-lg border border-[#2C354B]">
          <div className="sm:col-span-5">
            <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
              Link do grafiki (URL):
            </label>
            <input
              type="url"
              value={newBgUrl}
              onChange={(e) => setNewBgUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... lub link do grafiki"
              className="w-full text-xs font-mono py-1.5 px-2.5 bg-[#1D2333] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="text-[10px] font-bold text-slate-300 block mb-1 uppercase font-mono">
              Nazwa tła (opcjonalnie):
            </label>
            <input
              type="text"
              value={newBgName}
              onChange={(e) => setNewBgName(e.target.value)}
              placeholder="np. Mgła o 4 rano"
              className="w-full text-xs font-mono py-1.5 px-2.5 bg-[#1D2333] border border-[#2C354B] rounded text-white focus:border-[#38BDF8] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <button
              type="button"
              onClick={handleAddUrlBg}
              disabled={!newBgUrl.trim()}
              className="flex-1 py-1.5 px-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 disabled:opacity-40 text-[#141824] text-xs font-mono font-bold uppercase rounded cursor-pointer transition-all text-center"
            >
              + Dodaj URL
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="py-1.5 px-2.5 bg-[#1D2333] hover:bg-[#2C354B] border border-[#2C354B] text-slate-200 text-xs font-mono font-bold uppercase rounded cursor-pointer transition-all flex items-center gap-1"
              title="Wgraj plik graficzny z dysku komputera"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Plik</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Siatka dostępnych teł */}
        {bgAssets.length === 0 ? (
          <div className="p-8 text-center bg-[#141824] border border-dashed border-[#2C354B] rounded-lg space-y-2">
            <p className="text-xs text-slate-300 font-mono font-bold">
              ✓ Biblioteka jest czysta (brak sztywnych teł).
            </p>
            <p className="text-[11px] text-slate-400 font-mono max-w-md mx-auto">
              Skopiuj prompt z sekcji 1, wygeneruj minimalistyczne tło w Bing Image Creator i dodaj
              je powyżej (plik z dysku lub link URL). Będzie ono natychmiast dostępne do wyboru w
              Studio Karuzeli i Studio Wideo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {bgAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-[#141824] border border-[#2C354B] rounded-lg overflow-hidden flex flex-col justify-between group hover:border-[#38BDF8]/50 transition-all"
              >
                {/* Podgląd miniaturki */}
                <div className="relative aspect-[9/16] bg-[#0A0D14] overflow-hidden">
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-[11px] font-mono font-bold text-white truncate drop-shadow">
                      {asset.filename}
                    </p>
                  </div>
                </div>

                {/* Przyciski szybkiego użycia w Studio */}
                <div className="p-2 bg-[#141824] space-y-1.5 border-t border-[#2C354B]">
                  <div className="grid grid-cols-2 gap-1">
                    {onOpenVideoStudio && (
                      <button
                        type="button"
                        onClick={() => onOpenVideoStudio(undefined, asset.url)}
                        className="py-1 px-1.5 rounded bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/30 text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Użyj tego tła w Studio Wideo"
                      >
                        <Film className="w-3 h-3" /> Wideo
                      </button>
                    )}

                    {onOpenCarouselStudio && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenCarouselStudio(asset.filename, [
                            {
                              headline: asset.filename.toUpperCase(),
                              bodyText: "Execute in silence.",
                            },
                          ])
                        }
                        className="py-1 px-1.5 rounded bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Użyj w Studio Karuzeli"
                      >
                        <ImageIcon className="w-3 h-3" /> Slajd
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBg(asset.id)}
                    className="w-full py-0.5 text-center text-[10px] font-mono text-slate-500 hover:text-red-400 cursor-pointer transition-colors"
                  >
                    Usuń tło
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
