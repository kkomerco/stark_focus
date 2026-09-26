import type { MiniApp } from "../../mini-express.server";
import { generateJsonWithFallback, getGeminiClient } from "../gemini.server";
import { asArray, asString, sendDegraded } from "../normalize.server";
import { clampInt, clampText } from "../../limits";
import { isPolishCopy } from "../../caption";
import { attributionLine, clipFits, isVerbatim } from "../../quotes";

/**
 * WYDOBYWANIE CYTATÓW Z TRANSKRYPTU.
 *
 * „Wycinek z podcastu" jako materiał to cudze audio i cudzy obraz — czyli
 * dokładnie to, co od 30 kwietnia 2026 leci w dół rekomendacji jako recykling.
 * Zostaje wersja uczciwa: bierzemy ZDANIE, podpisujemy je mówcą i opakowujemy
 * WASZĄ typografią. To cytat, nie kradzież.
 *
 * Warunek jest jeden i nie podlega negocjacji: zdanie musiało paść. Model
 * poprawia cytaty mimowolnie, a sfałszowany cytat przypisany żywej osobie
 * potrafi kosztować konto więcej niż cały jego zasięg. Dlatego każdy kandydat
 * wraca do transkryptu, zanim wyjdzie z tej trasy.
 */

const TRANSCRIPT_MAX = 14000;
const OVERGENERATE = 10;

export function buildClipPrompt(transcript: string, count: number): string {
  return `Jesteś redaktorem marki @stark_focus. Z TRANSKRYPTU poniżej wybierz ${count} fragmenty, które obroniłyby się jako osobny cytat.

ZASADY:
- PRZEPISUJ SŁOWO W SŁOWO. Nie poprawiaj gramatyki, nie skracaj środkowych słów, nie zmieniaj kolejności. Dozwolone jest tylko ucięcie początku i końca zdania.
- 3 do 14 słów. Dłużze nie da się przeczytać na kadrze.
- Zdanie musi być zrozumiałe bez kontekstu (bez "that thing", "like I said before").
- Bez przekleństw i bez zdań, które da się wcisnąć pod dowolny motywacyjny post.
- "why" to jedno zdanie PO POLSKU, dlaczego ten fragment zatrzyma widza.

TRANSKRYPT:
""""
${transcript}
""""

Zwróc WYŁĄCZNIE czysty JSON:
{
  "clips": [
    { "quote": "zdanie dokładnie jak w transkrypcie, po angielsku", "why": "jedno zdanie po polsku" }
  ]
}`;
}

export function rankClips(
  raw: unknown,
  transcript: string,
  speaker: string,
  source: string,
  count: number,
): {
  clips: { quote: string; why: string; attribution: string }[];
  rejected: number;
  notVerbatim: number;
} {
  const seen = new Set<string>();
  const clips: { quote: string; why: string; attribution: string }[] = [];
  // Powodów nie wrzucamy do jednego worka: „model nie znalazł cytatu" i
  // „cytat jest za długi" to dla autora dwie różne informacje.
  let notVerbatim = 0;
  let rejected = 0;

  for (const entry of asArray(raw).map((item) => (item ?? {}) as Record<string, unknown>)) {
    const quote = asString(entry.quote).replace(/["”“]/g, "").trim();
    if (!quote || isPolishCopy(quote)) {
      rejected++;
      continue;
    }
    // Tu zapada wyrok: jeśli nie ma tego w transkrypcie, to nie jest cytat.
    if (!isVerbatim(quote, transcript)) {
      notVerbatim++;
      continue;
    }
    if (!clipFits(quote)) {
      rejected++;
      continue;
    }
    const key = quote.toLowerCase();
    if (seen.has(key)) {
      rejected++;
      continue;
    }
    seen.add(key);
    clips.push({
      quote,
      why: asString(entry.why, "").slice(0, 200),
      attribution: attributionLine(speaker, source),
    });
    if (clips.length >= count) break;
  }

  return { clips, rejected, notVerbatim };
}

export function registerClipRoutes(app: MiniApp): void {
  app.post("/api/ai/clip-miner", async (req, res) => {
    const transcript = clampText(req.body?.transcript, TRANSCRIPT_MAX);
    const speaker = clampText(req.body?.speaker, 80);
    const source = clampText(req.body?.source, 120);
    const count = clampInt(req.body?.count, 1, 8, 5);

    if (transcript.trim().split(/\s+/).length < 20) {
      return res.json({
        clips: [],
        rejected: 0,
        notice: "Transkrypt jest za krótki, żeby cokolwiek z niego wynikało.",
      });
    }
    // Pytamy o to PRZED modelem: cytat bez mówcy i tak nie mógłby wyjść,
    // a każde pytanie to płatne zapytanie z dziennej kasetki.
    if (!attributionLine(speaker, source)) {
      return res.json({
        clips: [],
        rejected: 0,
        notice:
          "Bez podpisu, czyje to zdanie, nie wypuszczamy cytatu — cytat bez źródła to kradzież, a nie treść.",
      });
    }
    if (!getGeminiClient()) {
      return sendDegraded(res, {
        clips: [],
        rejected: 0,
        error: "Brak klucza GEMINI_API_KEY — cytat trzeba najpierw znaleźć w tekście.",
      });
    }

    try {
      const parsed = await generateJsonWithFallback({
        contents: buildClipPrompt(transcript.slice(0, TRANSCRIPT_MAX), OVERGENERATE),
        temperature: 0.4,
      });
      const { clips, rejected, notVerbatim } = rankClips(
        parsed?.clips,
        transcript,
        speaker,
        source,
        count,
      );

      if (clips.length === 0) {
        // Nazwij przyczynę, którą naprawdę zmierzono — „żaden nie padł" przy
        // pięciu za długich zdaniach byłoby nieprawdą.
        const reason =
          notVerbatim > 0
            ? `Model wskazał ${notVerbatim} fragmentów, których nie ma słowo w słowo w transkrypcie. Dobrze: nie wypuszczamy zdania, które nie padło.`
            : `Każdy z ${rejected} fragmentów był w transkrypcie, ale żaden nie nadaje się na kadr (3-14 słów).`;
        return res.json({
          clips: [],
          rejected,
          notVerbatim,
          notice: reason,
        });
      }
      return res.json({ clips, rejected, notVerbatim });
    } catch (error) {
      console.error("Błąd wydobywania cytatów:", error);
      return sendDegraded(res, {
        clips: [],
        rejected: 0,
        error: "Wydobywanie cytatów nie udało się — model nie odpowiedział.",
      });
    }
  });
}
