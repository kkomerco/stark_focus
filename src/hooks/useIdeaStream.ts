import { useState, useCallback, useMemo } from "react";
import { IdeaItem, IdeaStreamResponse, StarkFocusData } from "../types";

/** Normalizuje hook do fingerprintu (odporny na drobne różnice formatowania). */
function getFingerprint(hook: string): string {
  return hook
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/**
 * Hook do zarządzania nieskończonym strumieniem pomysłów z anty-powtórką.
 * Fingerprintuje każdy hook i przechowuje historię w StarkFocusData.used_idea_fingerprints.
 */
export function useIdeaStream(
  data: StarkFocusData,
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void,
) {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
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

        // Double-check po stronie klienta: odrzuć wszystko, co już było.
        const existing = new Set(usedFingerprints);
        const uniqueNewIdeas = newIdeas.filter((idea) => !existing.has(getFingerprint(idea.hook)));

        if (uniqueNewIdeas.length === 0 && newIdeas.length > 0) {
          setError("Wszystkie pomysły były powtórkami — spróbuj ponownie.");
        }

        setIdeas(uniqueNewIdeas);

        // Historia rośnie tylko o faktycznie nowe fingerprinty (limit 500).
        if (uniqueNewIdeas.length > 0) {
          onUpdateData((prev) => {
            const prevFingerprints = prev.used_idea_fingerprints || [];
            const merged = [
              ...prevFingerprints,
              ...uniqueNewIdeas.map((idea) => getFingerprint(idea.hook)),
            ];
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
