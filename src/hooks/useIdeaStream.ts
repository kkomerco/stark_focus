import { useCallback, useMemo, useRef, useState } from "react";
import { IdeaItem, IdeaStreamResponse, StarkFocusData } from "../types";
import { hookFingerprint, maxSimilarity, SIMILARITY } from "../lib/similarity";
import { usedHookFingerprints } from "../lib/usedContent";
import { topPublishedHooks } from "../lib/published";

export interface ScoredIdea extends IdeaItem {
  /** 0..1 — maksymalne podobieństwo do tego, co już mamy. */
  similarity: number;
  /** true = pomysł odrzucony w trybie ścisłym (za duże podobieństwo). */
  rejected: boolean;
  /** Karta z banku musi nią zostać także wtedy, gdy do listy dojdzie partia z modelu. */
  source: IdeaStreamResponse["source"];
}

/**
 * Serwer ma 90 s na próbę, dwa modele w łańcuchu i po dwie próby na model.
 * Czekanie dłuższe niż cała ta droga nie ma sensu, a bez limitu spinner wisiał
 * w nieskończoność, gdy połączenie umarło po cichu.
 */
const REQUEST_TIMEOUT_MS = 300_000;

/** „Więcej pomysłów" dokłada do listy — sufit trzyma ją w rozmiarze ekranu. */
const MAX_ON_SCREEN = 20;

/**
 * Sufit pamięci tego generatora. `usedHookFingerprints` ma wspólny limit 300
 * dla wszystkich silników treści, więc tu wystarcza setka zdań, po które
 * właściciel marki realnie kliknął.
 */
const USED_IDEA_LIMIT = 100;

/**
 * Hook do zarządzania strumieniem pomysłów z anty-powtórką.
 * Poza identycznymi odciskami mierzy PODOBIEŃSTWO strukturalne — pomysły zbyt
 * bliskie poprzednim spadają, zanim ktokolwiek je zobaczy.
 */
export function useIdeaStream(
  data: StarkFocusData,
  onUpdateData: (updater: (prev: StarkFocusData) => StarkFocusData) => void,
) {
  const [ideas, setIdeas] = useState<ScoredIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Historia to nie to, co wypadło z generatora, ale to, co już poszło z
  // aplikacji: zapisane posty i dziennik publikacji.
  const usedFingerprints = useMemo(() => usedHookFingerprints(data), [data]);
  // Wzorce liczone osobno i w osobnym `useMemo`: całe `data` zmienia się przy
  // każdym kliknięciu, a prompt ma zostawać taki sam, dopóki nie przybędzie
  // publikacja z metrykami.
  const exemplars = useMemo(() => topPublishedHooks(data.published ?? []), [data.published]);

  /** Zamknięcie okna nie zostawia zapytania w locie — wynik i tak byłby do wyrzucenia. */
  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const generateIdeas = useCallback(
    async (count: number = 5, topic?: string) => {
      // Nowa partia przerywa poprzednią: dwa kliknięcia nie mogą ścigać się
      // o to, która odpowiedź zostanie na ekranie.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai/idea-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count,
            excludeHooks: usedFingerprints,
            exemplars,
            usedCount: usedFingerprints.length,
            topic: topic || "dark motivation and brutal discipline",
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("HTTP " + res.status);

        const response = (await res.json()) as IdeaStreamResponse;
        if (controller.signal.aborted) return;
        setNotice(typeof response.notice === "string" ? response.notice : null);

        // Oceniamy KAŻDY pomysł: identyczność (odcisk) i podobieństwo (tokeny).
        const exact = new Set(usedFingerprints);
        const scored: ScoredIdea[] = response.ideas.map((idea) => {
          if (exact.has(hookFingerprint(idea.hook))) {
            return { ...idea, similarity: 1, rejected: true, source: response.source };
          }
          const { score } = maxSimilarity(idea.hook, usedFingerprints);
          return {
            ...idea,
            similarity: score,
            rejected: score >= SIMILARITY.HARD_BLOCK,
            source: response.source,
          };
        });
        const kept = scored.filter((idea) => !idea.rejected);

        // Zatrzymanie dobrej listy: gdy filtr wykoszy wszystko, pokazujemy
        // powód, a nie pustą planszę.
        if (kept.length === 0) {
          setError(
            scored.length > 0
              ? `Każdy z ${scored.length} pomysłów był zbyt podobny do tego, co już masz. Spróbuj ponownie.`
              : "Nie udało się wygenerować pomysłów. Spróbuj ponownie.",
          );
          return;
        }

        // Dokładamy, nie zastępujemy: „Nowa partia" nie może kasować listy,
        // na której człowiek właśnie pracuje.
        setIdeas((prev) => {
          const seen = new Set<string>();
          return [...kept, ...prev]
            .filter((idea) => {
              const fingerprint = hookFingerprint(idea.hook);
              if (seen.has(fingerprint)) return false;
              seen.add(fingerprint);
              return true;
            })
            .slice(0, MAX_ON_SCREEN);
        });
      } catch {
        if (!controller.signal.aborted) {
          setError("Nie udało się wygenerować pomysłów. Spróbuj ponownie.");
        }
      } finally {
        clearTimeout(timeout);
        // Przerwana partia nie może wyłączyć spinnera nowszej, która właśnie idzie.
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    },
    [usedFingerprints, exemplars],
  );

  /**
   * Pamięć anty-powtórki NIE rośnie przy generowaniu. Dotąd każda partia
   * dokładała kilkadziesiąt zdań, których właściciel marki nigdy nie użył, i
   * zatruwała wspólną listę wszystkich generatorów. Wchodzi tylko to, po co
   * realnie kliknął — reszta jest powietrzem.
   */
  const markUsed = useCallback(
    (hook: string) => {
      const fingerprint = hookFingerprint(hook);
      if (!fingerprint) return;
      onUpdateData((prev) => ({
        ...prev,
        used_idea_fingerprints: Array.from(
          new Set([...(prev.used_idea_fingerprints ?? []), fingerprint]),
        ).slice(-USED_IDEA_LIMIT),
      }));
    },
    [onUpdateData],
  );

  /**
   * Zapomina WYŁĄCZNIE zdania wpisane tutaj, czyli to, co wyszło z tego
   * generatora. Postów i dziennika publikacji nie dotyka — to pamięć całej
   * aplikacji i kasowanie jej jednym kliknięciem rozbroiłoby każdy generator.
   */
  const clearHistory = useCallback(() => {
    onUpdateData((prev) => ({ ...prev, used_idea_fingerprints: [] }));
  }, [onUpdateData]);

  return {
    ideas,
    loading,
    error,
    notice,
    generateIdeas,
    markUsed,
    clearHistory,
    abort,
    usedCount: usedFingerprints.length,
  };
}
