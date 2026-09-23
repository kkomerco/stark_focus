import type { MiniApp } from "../../mini-express.server";
import {
  GEMINI_LITE_MODEL,
  generateContent,
  generateImage,
  getGeminiClient,
} from "../gemini.server";
import { clampText } from "../../limits";
import { asString } from "../normalize.server";

/**
 * TŁO WE WNYTRZ APLIKACJI.
 *
 * Wcześnieiej aplikacja oddawała tylko tekst `bingPrompt`, który trzeba było
 * ręcznie wkleić w obcy generator — czyli materiał graficzny nie był
 * samowystarczalny. Tu hook/prompt zamienia się w gotowy obraz.
 */

const ASPECTS = ["9:16", "1:1", "4:5"] as const;
type Aspect = (typeof ASPECTS)[number];

/** Krótka, tania zamiana myśli na scenę — bez tego tło nie ma związku z treścią. */
async function describeScene(hook: string, theme: string): Promise<string> {
  const prompt = `Jesteś dyrektorem artystycznym marki @stark_focus (dark stoic discipline).
Na podstawie tej myśli opisz JEDNĄ konkretną scenę wizualną, która ją niesie — nie metaforę ogólną, tylko namacalny kadr: przedmiot, materia, światło, pora, pogoda, perspektywa.

Myśl: "${hook}"
${theme ? `Motyw: ${theme}` : ""}

Po angielsku, 25-45 słów, bez tekstu na obrazie, bez osób twarzą do kamery. Zwróć TYLKO opis sceny.`;

  try {
    const text = await generateContent({
      contents: prompt,
      model: GEMINI_LITE_MODEL,
      temperature: 0.85,
      abortSignal: AbortSignal.timeout(20_000),
    });
    return asString(text).slice(0, 400);
  } catch {
    // Bez opisu od modelu i tak mamy co rysować — bierzemy samą myśl.
    return hook;
  }
}

export function registerBackgroundRoutes(app: MiniApp): void {
  app.post("/api/ai/generate-background", async (req, res) => {
    if (!getGeminiClient()) {
      // Obrazu nie da się udawać z banku treści — tu brak klucza jest realną
      // blokadą, nie degradacją, więc mówimy o tym uczciwie.
      return res.status(503).json({
        error: "Generowanie tła wymaga GEMINI_API_KEY. Bez klucza użyj banku gotowych scen.",
      });
    }

    const hook = clampText(req.body?.hook, 300);
    const theme = clampText(req.body?.theme, 80);
    let scene = clampText(req.body?.prompt, 600);
    const aspect: Aspect = (ASPECTS as readonly string[]).includes(asString(req.body?.aspect))
      ? (req.body.aspect as Aspect)
      : "9:16";

    if (!scene) {
      if (!hook) {
        return res
          .status(400)
          .json({ error: "Potrzeba `prompt` albo `hook`, z którego zrobimy scenę." });
      }
      scene = await describeScene(hook, theme);
    }

    try {
      const image = await generateImage({ prompt: scene, aspect });
      if (!image) {
        return res.status(502).json({
          error:
            "Model nie zwrócił obrazu (filtr treści lub pusta odpowiedź). Spróbuj innego ujęcia.",
        });
      }
      return res.json({ dataUrl: image.dataUrl, scenePrompt: image.prompt, aspect });
    } catch (err) {
      console.error("Błąd generowania tła:", err);
      return res.status(502).json({ error: "Generowanie tła nie powiodło się." });
    }
  });
}
