import { useState, useCallback, useMemo } from "react";
import { IdeaItem, IdeaStreamResponse, StarkFocusData } from "../types";
import { hookSimilarity, SIMILARITY } from "../lib/similarity";

/** Normalizuje hook do fingerprintu (odporny na drobne różnice formatowania). */
function getFingerprint(hook: string): string {
  return hook
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export interface ScoredIdea extends IdeaItem {
  /** 0..1 — maksymalne podobieństwo do hooków z historii. */
  similarity: number;
  /** Hook z historii najbardziej podobny (null = brak). */
  similarTo: string | null;
  /** true = pomysł odrzucony w trybie ścisłym (za duże podobieństwo). */
  rejected: boolean;
}

/**
 * Hook do zarządzania nieskończonym strumieniem pomysłów z anty-powtórką.
 * Poza identycznymi fingerprintami mierzy też PODOBIEŃSTWO strukturalne —
 * pomysły zbyt bliskie poprzednim są odfiltrowywane lub oznaczane.
 */
export function useIdeaStream(
  data: StarkFocusData,
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void,
) {
  const [ideas, setIdeas] = useState<ScoredIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedFingerprints = useMemo(
    () => data.used_idea_fingerprints || [],
    [data.used_idea_fingerprints],
  );

  const generateIdeas = useCallback(
    async (count: number = 5, topic?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/idea-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count,
            excludeHooks: usedFingerprints,
            usedCount: usedFingerprints.length,
            topic: topic || "dark motivation and brutal discipline",
          }),
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const response = (await res.json()) as IdeaStreamResponse;
        const newIdeas = response.ideas || [];

        // Oceniamy KAŻDY pomysł: identyczność (fingerprint) i podobieństwo (tokeny).
        const exactSet = new Set(usedFingerprints);
        const scoredIdeas: ScoredIdea[] = newIdeas.map((idea) => {
          const fp = getFingerprint(idea.hook);
          if (exactSet.has(fp)) {
            return { ...idea, similarity: 1, similarTo: idea.hook, rejected: true };
          }
          let best = 0;
          let similarTo: string | null = null;
          for (const h of usedFingerprints) {
            const s = hookSimilarity(idea.hook, h);
            if (s > best) {
              best = s;
              similarTo = h;
            }
          }
          return {
            ...idea,
            similarity: best,
            similarTo,
            rejected: best >= SIMILARITY.HARD_BLOCK,
          };
        });

        const kept = scoredIdeas.filter((i) => !i.rejected);
        const rejectedCount = scoredIdeas.length - kept.length;

        if (kept.length === 0 && newIdeas.length > 0) {
          setError(
            rejectedCount === newIdeas.length
              ? `Wszystkie ${newIdeas.length} pomysły były zbyt podobne do historii (tryb ścisły). Wygeneruj ponownie albo wyczyść historię.`
              : "Nie udało się wygenerować pomysłów — spróbuj ponownie.",
          );
        }

        setIdeas(kept);

        // Historia rośnie tylko o nowe fingerprinty (limit 500).
        if (kept.length > 0) {
          onUpdateData((prev) => {
            const prevFingerprints = prev.used_idea_fingerprints || [];
            const merged = [...prevFingerprints, ...kept.map((idea) => getFingerprint(idea.hook))];
            return {
              ...prev,
              used_idea_fingerprints: Array.from(new Set(merged)).slice(-500),
            };
          });
        }
      } catch {
        setError("Nie udało się wygenerować pomysłów. Spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [usedFingerprints, onUpdateData],
  );

  const clearHistory = useCallback(() => {
    onUpdateData((prev) => ({
      ...prev,
      used_idea_fingerprints: [],
    }));
  }, [onUpdateData]);

  return {
    ideas,
    loading,
    error,
    generateIdeas,
    clearHistory,
    usedCount: usedFingerprints.length,
  };
}
