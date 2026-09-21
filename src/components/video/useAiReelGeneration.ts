// Logika "Generuj AI" dla Video Studio — wycięta z VideoStudioModal.tsx (etap 3 refaktoryzacji).
// Stan pozostaje w rodzicu; hook dostaje zależności i zwraca akcję handleGenerateAiReel.
import type { MutableRefObject } from "react";
import { STOIC_CATEGORIES, getRandomUniqueFormula } from "../../data/ideaMatrix";
import { getRandomBackgroundScene } from "../../data/expandedBackgrounds";
import type { ReelTemplate } from "../../data/reelTemplates";
import type { ReelDuration, VisualTheme } from "./reel-helpers";
import type { ViralReelFormat } from "../VideoStudioModal";

export interface AiReelGenerationDeps {
  reelFormat: ViralReelFormat;
  duration: ReelDuration;
  selectedTheme: VisualTheme;
  captionStyle: "short" | "deep";
  seenTitlesRef: MutableRefObject<string[]>;
  timeRef: MutableRefObject<number>;
  setIsGeneratingAi: (v: boolean) => void;
  setPhrases: (v: string[]) => void;
  setDuration: (v: ReelDuration) => void;
  setActiveTemplate: (v: ReelTemplate) => void;
  setCaption: (v: string) => void;
  setHashtags: (v: string[]) => void;
  setSelectedTheme: (v: VisualTheme) => void;
  setCurrentTime: (v: number) => void;
  setToastMessage: (v: string | null) => void;
}

export function useAiReelGeneration(deps: AiReelGenerationDeps): () => Promise<void> {
  const {
    reelFormat,
    duration,
    selectedTheme,
    captionStyle,
    seenTitlesRef,
    timeRef,
    setIsGeneratingAi,
    setPhrases,
    setDuration,
    setActiveTemplate,
    setCaption,
    setHashtags,
    setSelectedTheme,
    setCurrentTime,
    setToastMessage,
  } = deps;

  return async () => {
    setIsGeneratingAi(true);
    // Automatyczny losowy dobór kąta stoickiego
    const randomCat = STOIC_CATEGORIES[Math.floor(Math.random() * STOIC_CATEGORIES.length)];
    const chosenCategoryId = randomCat?.id || "sovereign_mindset";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("/api/ghostwrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic:
            "Ruthless stoic discipline, sovereign posture, high-leverage focus, psychological power shift",
          format: reelFormat,
          category: chosenCategoryId,
          excludeTitles: seenTitlesRef.current,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        let parsedData = json;
        if (!json.phrases && json.content) {
          try {
            const match = json.content.match(/\{[\s\S]*\}/);
            if (match) parsedData = JSON.parse(match[0]);
          } catch {
            // keep json
          }
        }

        if (
          parsedData.phrases &&
          Array.isArray(parsedData.phrases) &&
          parsedData.phrases.length > 0
        ) {
          const freshTitle = parsedData.title || "Sovereign Mindset Protocol";
          seenTitlesRef.current.push(freshTitle.toLowerCase().replace(/\s+/g, "_"));
          if (seenTitlesRef.current.length > 60) seenTitlesRef.current.shift();

          // Dopasowanie fraz i długości do wybranego formatu
          let finalPhrases = parsedData.phrases;
          if (reelFormat === "viral_loop_6s" && finalPhrases.length > 1) {
            finalPhrases = [finalPhrases.join(" ")];
          } else if (reelFormat === "hook_payoff_5s" && finalPhrases.length > 2) {
            finalPhrases = [finalPhrases[0], finalPhrases.slice(1).join(" ")];
          }

          setPhrases(finalPhrases);

          if (parsedData.duration) {
            setDuration(parsedData.duration as ReelDuration);
          } else {
            if (reelFormat === "viral_loop_6s") setDuration(6);
            else if (reelFormat === "hook_payoff_5s") setDuration(5);
            else if (reelFormat === "dynamic_broll_cut") setDuration(6);
            else setDuration(9);
          }
          const shortC =
            parsedData.captionShort ||
            parsedData.caption ||
            "Walk like a king, or walk like you don't care who the king is. Read caption.";
          const deepC =
            parsedData.captionDeep ||
            `${shortC}\n\n3 sovereign rules for your day:\n1. Never negotiate with weakness.\n2. Execute in complete silence.\n3. Reclaim your internal sovereignty.\n\nSave this reel. Follow @stark_focus.`;

          const validThemes: VisualTheme[] = [
            "obsidian_void",
            "crimson_eclipse",
            "emerald_abyss",
            "carbon_aura",
            "silver_mist",
          ];
          const nextTheme = validThemes.includes(parsedData.suggestedTheme as VisualTheme)
            ? (parsedData.suggestedTheme as VisualTheme)
            : selectedTheme;

          const randBg = getRandomBackgroundScene();
          const dynamicTpl: ReelTemplate = {
            id: `ai_${Date.now()}`,
            format: "three_phases",
            title: freshTitle,
            phrases: finalPhrases,
            captionShort: shortC,
            captionDeep: deepC,
            hashtags:
              parsedData.hashtags && Array.isArray(parsedData.hashtags)
                ? parsedData.hashtags
                : ["#stoicism", "#discipline", "#sovereignty", "#focus", "#starkfocus"],
            suggestedTheme: nextTheme,
            suggestedDuration: duration,
            suggestedBackground: parsedData.suggestedBackground || randBg.name,
            backgroundRationale: parsedData.backgroundRationale || randBg.rationale,
          };

          setActiveTemplate(dynamicTpl);
          setCaption(captionStyle === "deep" ? deepC : shortC);
          setHashtags(dynamicTpl.hashtags);
          setSelectedTheme(nextTheme);
          timeRef.current = 0;
          setCurrentTime(0);

          setToastMessage(`✓ Wygenerowano unikalną rolkę: "${freshTitle}"!`);
          setTimeout(() => setToastMessage(null), 2800);
          setIsGeneratingAi(false);
          return;
        }
      }
    } catch {
      // fallback to instant combinatorial matrix
    }

    // Dynamic Combinatorial Matrix Fallback (Zero duplicates, 28,000+ linked stoic formulas)
    const formula = getRandomUniqueFormula("three_phases", chosenCategoryId, seenTitlesRef.current);
    seenTitlesRef.current.push(formula.title.toLowerCase().replace(/\s+/g, "_"));
    if (seenTitlesRef.current.length > 60) seenTitlesRef.current.shift();

    let fallbackPhrases = formula.phrases;
    if (reelFormat === "viral_loop_6s") {
      fallbackPhrases = [
        formula.phrases[0] || "Walk like a king, or walk like you don't care who the king is.",
      ];
      setDuration(6);
    } else if (reelFormat === "hook_payoff_5s") {
      fallbackPhrases = [formula.phrases[0], formula.phrases[formula.phrases.length - 1]];
      setDuration(5);
    } else {
      setDuration(9);
    }

    setActiveTemplate(formula);
    setPhrases(fallbackPhrases);
    setCaption(captionStyle === "deep" ? formula.captionDeep : formula.captionShort);
    setHashtags(formula.hashtags);
    setSelectedTheme(formula.suggestedTheme);
    timeRef.current = 0;
    setCurrentTime(0);

    setToastMessage(`✓ Wygenerowano unikalny pomysł: "${formula.title}"!`);
    setTimeout(() => setToastMessage(null), 2800);
    setIsGeneratingAi(false);
  };
}
