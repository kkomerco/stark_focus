import { GoogleGenAI } from "@google/genai";
import { softenForPlatform } from "../platformSafe";

/**
 * Jedyne źródło prawdy dla modeli Gemini w całym projekcie.
 * Zmiana modelu = zmiana w tym miejscu.
 *
 * Nazwy nie są wybrane „na oko" — każda z nich przeszła test `generateContent`
 * na kluczu z tego repo. Darmowy tier Google ma dwa osobne sufity na model:
 * dzienny limit zapytań (~20) oraz „high demand" (503), które potrafi zdjąć
 * pojedynczy model na godziny. Dlatego poniżej jest łańcuch, a nie jeden model.
 */
export const GEMINI_MODEL = "gemini-3.6-flash";

/** Model zapasowy dla zadań, które nie wymagają pełnej mocy (tanio i szybko). */
export const GEMINI_LITE_MODEL = "gemini-3.5-flash-lite";

/**
 * Kolejne modele do próby, gdy tamte dwa są w tej chwili przeciążone.
 * Każdy ma własny worek limitu, więc cztery modele to realnie cztery razy
 * więcej generacji dziennie niż jeden.
 */
const GEMINI_SPARE_MODELS = ["gemini-3-flash-preview", "gemini-3.8-flash"];

/**
 * Model obrazowy — też tylko tutaj, bo reguła projektu mówi: żaden plik
 * poza tym nie wolna nazwy modelu. Darmowy tier nalicza obrazy osobno,
 * więc można go przestawić przez `GEMINI_IMAGE_MODEL` bez ruszania kodu.
 */
export const GEMINI_IMAGE_MODEL = process.env["GEMINI_IMAGE_MODEL"] || "gemini-3.1-flash-image";

/** Styl wymuszany na każdym tle, żeby kadr został marką, nie losowym art. */
const BRAND_IMAGE_STYLE =
  "Dark stoic minimalism for the brand @stark_focus: obsidian black and deep charcoal, bone-white light, a single deep crimson accent (#E11D48). Cinematic low-key lighting, high contrast chiaroscuro, monumental and quiet. Absolutely NO text, NO letters, NO watermarks, NO logos, NO cyan or neon blue.";

export interface GeneratedImage {
  /** Dane gotowe do wstawienia w <img src>. */
  dataUrl: string;
  mimeType: string;
  /** Prompt, którego użyto — przy włączonym enhancerze modelu nie nasz. */
  prompt: string;
}

/**
 * Jedno tło z promptu tekstowego.
 *
 * `ai.models.generateImages` (Imagen) jest tylko w Vertex/Enterprise — na
 * zwykłym kluczu z AI Studio rzuca „This method is only supported by…".
 * Obrazy przez Gemini API idą więc normalnym `generateContent` z
 * `responseModalities: ["IMAGE"]`, a bajty wracają w `inlineData`.
 *
 * Zwraca `null`, gdy model odda odpowiedź bez obrazu (filtr treści), a rzuca
 * AiResponseError tylko przy realnym braku konfiguracji.
 */
export async function generateImage(options: {
  prompt: string;
  aspect?: "9:16" | "1:1" | "4:5";
}): Promise<GeneratedImage | null> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AiResponseError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env serwera");
  }

  const aspect = options.aspect ?? "9:16";
  const orientation =
    aspect === "1:1" ? "Square composition" : aspect === "4:5" ? "Portrait 4:5" : "Vertical 9:16";
  const prompt = `${options.prompt.trim()}. ${BRAND_IMAGE_STYLE}. ${orientation} framing.`;

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      abortSignal: AbortSignal.timeout(GEMINI_IMAGE_TIMEOUT_MS),
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;
    const mimeType = part.inlineData?.mimeType || "image/png";
    return { dataUrl: `data:${mimeType};base64,${data}`, mimeType, prompt };
  }

  return null;
}

let cachedClient: GoogleGenAI | null = null;
let cachedKey: string | null = null;

/** Wspólny, leniwie inicjalizowany klient Gemini (klucz wyłącznie server-side). */
export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) return null;

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "stark-focus-os" } },
    });
    cachedKey = apiKey;
  }
  return cachedClient;
}

/** Odpowiedź modelu bez poprawnego JSON-a lub brak klucza API. */
export class AiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiResponseError";
  }
}

/** Budżet czasowego jednego wywołania modelu. Bez niego zawieszony request trzyma trasę w nieskończoność. */
const GEMINI_ATTEMPT_TIMEOUT_MS = 90_000;

/** Backoff przy błędach przejściowych (przeciążenie / limit zapytań). */
const GEMINI_RETRY_BACKOFF_MS = 1_200;

/** Obrazy schodzą wyraźnie dłużej niż tekst — własny budżet, żeby nie dzielić limitu tekstu. */
const GEMINI_IMAGE_TIMEOUT_MS = 120_000;

/**
 * Gemini nagminnie opakowuje JSON w bloki markdown lub dodaje komentarz.
 * Funkcja wyciąga pierwszą poprawną strukturę JSON z odpowiedzi.
 */
export function safeJsonParse<T = any>(text: string): T {
  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const candidate = extractJsonSpan(clean);
  if (candidate === null) {
    throw new AiResponseError("Nie znaleziono poprawnej struktury JSON w odpowiedzi AI");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new AiResponseError("Odpowiedź AI wygląda na JSON, ale nie jest poprawna składniowo");
  }

  if (parsed === null || typeof parsed !== "object") {
    throw new AiResponseError("Odpowiedź AI nie jest obiektem JSON");
  }

  return parsed as T;
}

/**
 * Wycina pierwszy DOMYKNIĘTY fragment JSON. Cięcie "od pierwszego `{` do
 * ostatniego `}`" łączyłoby kilka struktur w jedną i zwracało błędny obiekt,
 * a przy odpowiedzi tablicowej zwracało obiekt z przemieszanymi kluczami.
 */
function extractJsonSpan(text: string): string | null {
  const start = text.search(/[[{]/);
  if (start === -1) return null;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      const open = stack.pop();
      const closes = (open === "{" && ch === "}") || (open === "[" && ch === "]");
      if (!closes) return null;
      if (stack.length === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

export interface GenerateContentOptions {
  /** Prompt tekstowy lub tablica części (np. prompt + obraz dla Gemini Vision). */
  contents: string | unknown[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  responseMimeType?: string;
  abortSignal?: AbortSignal;
}

/**
 * Jedno wejście do generowania treści: zwraca surowy tekst odpowiedzi.
 * Rzuca AiResponseError, gdy klient nie jest skonfigurowany.
 *
 * `attemptSignal` pozwala pętli fallbacku dać każdej próbie własny budżet
 * czasowy; bez niego i bez wartości domyślnej request mógłby wiszieć wiecznie.
 */
export async function generateContent(
  options: GenerateContentOptions,
  attemptSignal?: AbortSignal,
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AiResponseError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env serwera");
  }

  const config: Record<string, unknown> = {};
  if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
  if (options.temperature !== undefined) config.temperature = options.temperature;
  if (options.responseMimeType) config.responseMimeType = options.responseMimeType;
  config.abortSignal = anySignal([
    attemptSignal,
    options.abortSignal,
    AbortSignal.timeout(GEMINI_ATTEMPT_TIMEOUT_MS),
  ]);

  const response = await ai.models.generateContent({
    model: options.model ?? GEMINI_MODEL,
    contents: options.contents as never,
    config: config as never,
  });

  // Jedno wyjście na wszystkie trasy: to, co model napisał, przechodzi przez
  // filtr treści ryzykownych dla platformy, zanim ktokolwiek to sparsuje.
  return softenForPlatform(response.text ?? "");
}

/** Sygnał przerwania aktywny, gdy przerwie KTÓRYKOLWEK z podanych. */
function anySignal(signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

/** Skrót dla klasycznego promptu tekstowego. */
export async function generateText(options: {
  prompt: string;
  systemInstruction?: string;
  model?: string;
}): Promise<string> {
  return generateContent({
    contents: options.prompt,
    systemInstruction: options.systemInstruction,
    model: options.model,
  });
}

/** Klasyczny kształt konfiguracji (kompatybilny z bezpośrednimi wywołaniami SDK). */
export interface GeminiRawConfig {
  temperature?: number;
  responseMimeType?: string;
  systemInstruction?: unknown;
  abortSignal?: AbortSignal;
  [key: string]: unknown;
}

function modelChain(preferredModel?: string): string[] {
  return [preferredModel, GEMINI_LITE_MODEL, GEMINI_MODEL, ...GEMINI_SPARE_MODELS].filter(
    (model, index, all): model is string => !!model && all.indexOf(model) === index,
  );
}

/**
 * Przeciążenie modelu (503) — warto spróbować ponownie za chwilę.
 * Limitu zapytań (429) NIE próbujemy drugi raz na tym samym modelu: na
 * darmowym tierze to sufit dzienny, więc każda kolejna próba tylko dokłada
 * kilkanaście sekund do odpowiedzi i nic nie może zmienić. Pętła idzie
 * wtedy od razu do następnego modelu.
 */
function isTransientGeminiError(err: unknown): boolean {
  const msg = String((err as any)?.message || err);
  return msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
}

/**
 * Centralna pętla fallbacku: każdy model z `modelChain()`, po dwie próby na
 * model z ~1.2 s backoffem przy przeciążeniu (503). Limit dzienny (429) nie
 * jest ponawiany — przechodzimy do następnego modelu.
 * To jedyne miejsce implementujące retry — nie reimplementuj jej w trasach.
 *
 * Każda próba dostaje WŁASNY sygnał przerwania. Współdzielony AbortSignal
 * sprawiałby, że po pierwszym przekroczeniu czasu wszystkie pozostałe modele
 * przerywałyby się natychmiast i łańcuch fallbacku nie miałby sensu.
 */
async function withModelFallback<T>(
  run: (model: string, attemptSignal: AbortSignal) => Promise<T>,
  preferredModel?: string,
): Promise<T> {
  let lastError: unknown = null;

  for (const model of modelChain(preferredModel)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await run(model, AbortSignal.timeout(GEMINI_ATTEMPT_TIMEOUT_MS));
      } catch (err) {
        lastError = err;
        if (isTransientGeminiError(err) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_BACKOFF_MS));
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

/**
 * Bezpośrednie wywołanie SDK z fallbackiem — dla tras budujących własną
 * konfigurację SDK. Nowy kod powinien raczej użyć generateContentWithFallback().
 */
export async function callGeminiWithFallback(
  ai: { models: { generateContent: (args: any) => Promise<any> } },
  options: {
    contents: any;
    config?: GeminiRawConfig;
    preferredModel?: string;
  },
): Promise<{ text?: string }> {
  const callerSignal = options.config?.abortSignal;

  return withModelFallback(async (model, attemptSignal) => {
    const response = await ai.models.generateContent({
      model,
      contents: options.contents,
      config: {
        ...options.config,
        abortSignal: anySignal([callerSignal, attemptSignal]),
      },
    });
    // Odpowiedź wraca jako `{ text }`, nie jako surowy obiekt SDK: wszystkie
    // trasy czytają z niej wyłącznie `text`, a dzięki temu jednemu miejscu
    // ryzykowne sformułowania nie docierają ani do jednego silnika treści.
    return { text: softenForPlatform(response.text ?? "") };
  }, options.preferredModel);
}

/** Jak generateContent, ale od razu parsuje odpowiedź do obiektu JSON. */
export async function generateJson<T = any>(options: GenerateContentOptions): Promise<T> {
  return safeJsonParse<T>(await generateContent(options));
}

/**
 * generateJson z łańcuchem fallbacku modeli.
 *
 * Trasy, które przypiął-y sobie `model: GEMINI_MODEL` bez fallbacku, przy
 * 503 („model w wysokim popycie") cicho zjeżdżały do banku treści, choć model
 * zapasowy odpowiadał normalnie — czyli oddawały gorszą jakość zamiast
 * gorszego modelu.
 */
export async function generateJsonWithFallback<T = any>(
  options: GenerateContentOptions & { preferredModel?: string },
): Promise<T> {
  return safeJsonParse<T>(await generateContentWithFallback(options));
}

/**
 * generateContent z fallbackem modeli i retry. Zwraca surowy tekst odpowiedzi.
 */
export async function generateContentWithFallback(
  options: GenerateContentOptions & { preferredModel?: string },
): Promise<string> {
  if (!getGeminiClient()) {
    throw new AiResponseError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env serwera");
  }

  return withModelFallback(
    (model, attemptSignal) => generateContent({ ...options, model }, attemptSignal),
    options.preferredModel,
  );
}
