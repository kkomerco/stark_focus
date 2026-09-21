import { useCallback, useEffect, useRef, useState } from "react";

interface UseTtsInput {
  isPlaying: boolean;
  currentPhraseIndex: number;
  phrases: string[];
}

interface UseTtsOutput {
  enableTts: boolean;
  setEnableTts: (next: boolean) => void;
  speakPhrase: (text: string) => void;
  requestSpokenPhrase: (text: string) => void;
}

/**
 * Automatyczny lektor TTS, synchroniczny z frazami.
 * Przeniesione 1:1 z VideoStudioModal.tsx (logika bez zmian).
 */
export function useTts({ isPlaying, currentPhraseIndex, phrases }: UseTtsInput): UseTtsOutput {
  const [enableTts, setEnableTts] = useState<boolean>(false);
  const spokenPhraseRef = useRef<number>(-1);

  const speakPhrase = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS error:", err);
    }
  }, []);

  const requestSpokenPhrase = useCallback(
    (text: string) => {
      if (enableTts && isPlaying) speakPhrase(text);
    },
    [enableTts, isPlaying, speakPhrase],
  );

  // Lektor czyta każdą frazę dokładnie raz - w momencie wejścia na jej klatkę
  useEffect(() => {
    if (!enableTts) {
      spokenPhraseRef.current = -1;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    if (!isPlaying || spokenPhraseRef.current === currentPhraseIndex) return;
    const phrase = phrases[currentPhraseIndex];
    if (!phrase) return;
    spokenPhraseRef.current = currentPhraseIndex;
    speakPhrase(phrase);
  }, [enableTts, isPlaying, currentPhraseIndex, phrases, speakPhrase]);

  // Sprzątanie syntezatora mowy przy zamknięciu studia
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { enableTts, setEnableTts, speakPhrase, requestSpokenPhrase };
}
