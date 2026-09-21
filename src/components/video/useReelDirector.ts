// Stan "deski reżyserskiej" studia rolek — tworzenie, format, opisy, presety.
// Przeniesione 1:1 z VideoStudioModal.tsx (logika bez zmian).
import { useMemo, useState } from "react";
import {
  NarrativeFormat,
  ReelTemplate,
  ReelVisualTheme,
} from "../../data/reelTemplates";
import {
  FontFamily,
  HighlightStyle,
  PacingMode,
  ReelDuration,
  VisualTheme,
} from "./reel-helpers";
import { VIRAL_REEL_TEMPLATES } from "../../data/reelTemplates";

const PRESET_STORAGE_KEY = "stark_reel_default_preset_v2";

interface DirectorStateInput {
  initialHook?: string;
  initialBgUrl?: string;
}

type TextCase = "natural" | "uppercase";
type CaptionStyle = "short" | "deep";

export function useReelDirector({ initialHook }: DirectorStateInput) {
  // Read saved preset from localStorage if exists
  const savedPreset = useMemo(() => {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  }, []);

  // 1. Initial State from curated templates
  const initialTpl = useMemo(() => {
    if (initialHook) {
      const found = VIRAL_REEL_TEMPLATES.find(
        (t) => t.phrases.join(" ").toUpperCase() === initialHook.toUpperCase(),
      );
      if (found) return found;
    }
    return VIRAL_REEL_TEMPLATES[0];
  }, [initialHook]);

  // Director Controls
  const [duration, setDuration] = useState<ReelDuration>(
    (savedPreset?.duration as ReelDuration) ||
      (initialTpl.suggestedDuration as ReelDuration) ||
      7,
  );
  const [pacingMode, setPacingMode] = useState<PacingMode>(
    savedPreset?.pacingMode || "climax_hold",
  );
  const [format, setFormat] = useState<NarrativeFormat>(
    initialTpl.format || "three_phases",
  );
  const [selectedTheme, setSelectedTheme] = useState<VisualTheme>(
    savedPreset?.selectedTheme || initialTpl.suggestedTheme || "obsidian_void",
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    savedPreset?.fontFamily === "syne"
      ? "montserrat"
      : savedPreset?.fontFamily || "cinzel",
  );
  const [fontSize, setFontSize] = useState<number>(savedPreset?.fontSize ?? 76);
  const [textCase, setTextCase] = useState<TextCase>(
    savedPreset?.textCase ?? "natural",
  );
  const [highlightStyle, setHighlightStyle] = useState<HighlightStyle>(
    savedPreset?.highlightStyle || "white_halo",
  );
  const [verticalPos, setVerticalPos] = useState<number>(
    savedPreset?.verticalPos ?? 42,
  );
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    savedPreset?.captionStyle || "short",
  );

  // Editable phrases for quick preview & correction (Traditional sentence case)
  const [phrases, setPhrases] = useState<string[]>(() => {
    if (initialHook) {
      const parts = initialHook.split("\n").filter(Boolean);
      return parts.length > 0 ? parts : initialTpl.phrases;
    }
    return initialTpl.phrases;
  });

  // Current template reference for caption toggling
  const [activeTemplate, setActiveTemplate] =
    useState<ReelTemplate>(initialTpl);

  // Ready-to-copy Caption & Hashtags
  const [caption, setCaption] = useState<string>(
    captionStyle === "deep" ? initialTpl.captionDeep : initialTpl.captionShort,
  );
  const [hashtags, setHashtags] = useState<string[]>(initialTpl.hashtags);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return {
    savedPreset,
    initialTpl,
    duration,
    setDuration,
    pacingMode,
    setPacingMode,
    format,
    setFormat,
    selectedTheme,
    setSelectedTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    textCase,
    setTextCase,
    highlightStyle,
    setHighlightStyle,
    verticalPos,
    setVerticalPos,
    captionStyle,
    setCaptionStyle,
    phrases,
    setPhrases,
    activeTemplate,
    setActiveTemplate,
    caption,
    setCaption,
    hashtags,
    setHashtags,
    toastMessage,
    setToastMessage,
  };
}

export { PRESET_STORAGE_KEY };
export type { ReelVisualTheme };
