import { GoogleGenAI } from "@google/genai";

/**
 * Jedyne źródło prawdy dla modeli Gemini w całym projekcie.
 * Zmiana modelu = zmiana w tym miejscu.
 */
export const GEMINI_MODEL = "gemini-3.8-flash";

/** Model zapasowy dla zadań, które nie wymagają pełnej mocy (tanio i szybko). */
export const GEMINI_LITE_MODEL = "gemini-3.1-flash-lite";

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
 * Jedno tło z promptu tekstowego. Zwraca `null`, gdy model nie oddał
 * bajtów (filtry RAI zwracają 200 bez obrazu), a rzuca AiResponseError
 * dopiero przy realnym braku konfiguracji.
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
  const prompt = `${options.prompt.trim()}. ${BRAND_IMAGE_STYLE}. Vertical framing ${aspect}.`;

  const response = await ai.models.generateImages({
    model: GEMINI_IMAGE_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: aspect,
      abortSignal: AbortSignal.timeout(GEMINI_IMAGE_TIMEOUT_MS),
    },
  });

  const generated = response.generatedImages?.[0];
  const bytes = generated?.image?.imageBytes;
  if (!bytes) return null;

  const mimeType = generated?.image?.mimeType || "image/png";
  return {
    dataUrl: `data:${mimeType};base64,${bytes}`,
    mimeType,
    prompt: generated?.enhancedPrompt || prompt,
  };
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

  return response.text ?? "";
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
  return preferredModel
    ? [preferredModel, GEMINI_LITE_MODEL, GEMINI_MODEL].filter((v, i, a) => a.indexOf(v) === i)
    : [GEMINI_LITE_MODEL, GEMINI_MODEL];
}

/** Przeciążenie modelu (503) albo limit zapytań (429) — warto spróbować ponownie. */
function isTransientGeminiError(err: unknown): boolean {
  const msg = String((err as any)?.message || err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  );
}

/**
 * Centralna pętla fallbacku: preferredModel → GEMINI_LITE_MODEL → GEMINI_MODEL,
 * po dwie próby na model z ~1.2 s backoffem przy błędach przejściowych.
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

  return withModelFallback(
    (model, attemptSignal) =>
      ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          ...options.config,
          abortSignal: anySignal([callerSignal, attemptSignal]),
        },
      }),
    options.preferredModel,
  );
}

/** Jak generateContent, ale od razu parsuje odpowiedź do obiektu JSON. */
export async function generateJson<T = any>(options: GenerateContentOptions): Promise<T> {
  return safeJsonParse<T>(await generateContent(options));
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
