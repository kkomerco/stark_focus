import { GoogleGenAI } from "@google/genai";

/**
 * Jedyne źródło prawdy dla modeli Gemini w całym projekcie.
 * Zmiana modelu = zmiana w tym miejscu.
 */
export const GEMINI_MODEL = "gemini-3.8-flash";

/** Model zapasowy dla zadań, które nie wymagają pełnej mocy (tanio i szybko).
 * UWAGA: "gemini-3.1-flash-lite" został wycofany przez Google (shut down) —
 * nie wracaj do niego; obecny model lite to gemini-3.5-flash-lite. */
export const GEMINI_LITE_MODEL = "gemini-3.5-flash-lite";

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

/**
 * Gemini nagminnie opakowuje JSON w bloki markdown lub dodaje komentarz.
 * Funkcja wyciąga pierwszą poprawną strukturę JSON z odpowiedzi.
 */
export function safeJsonParse<T = any>(text: string): T {
  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(clean) as T;
  } catch {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1)) as T;
    }
    throw new AiResponseError("Nie znaleziono poprawnej struktury JSON w odpowiedzi AI");
  }
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
 */
export async function generateContent({
  contents,
  systemInstruction,
  model = GEMINI_MODEL,
  temperature,
  responseMimeType,
  abortSignal,
}: GenerateContentOptions): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AiResponseError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env serwera");
  }

  const config: Record<string, unknown> = {};
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (temperature !== undefined) config.temperature = temperature;
  if (responseMimeType) config.responseMimeType = responseMimeType;
  if (abortSignal) config.abortSignal = abortSignal;

  const response = await ai.models.generateContent({
    model,
    contents: contents as never,
    config: Object.keys(config).length > 0 ? (config as never) : undefined,
  });

  return response.text ?? "";
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

/**
 * CENTRALNA pętla fallbacku modeli + retry (jedyna w projekcie — patrz AGENTS.md):
 * — 503 UNAVAILABLE / "high demand" (przeciążenie modelu)
 * — 429 RESOURCE_EXHAUSTED / quota (limity zapytań)
 *
 * Kolejno próbuje: preferredModel → GEMINI_LITE_MODEL → GEMINI_MODEL.
 * Na każdym modelu dwie próby z krótkim backoffem (~1.2 s) w razie tymczasowego błędu.
 * Zwraca surową odpowiedź SDK ({ text }) — warstwy wyższe (generateContentWithFallback,
 * generateJsonWithFallback) tylko delegują tutaj.
 */
export async function callGeminiWithFallback(
  ai: { models: { generateContent: (args: any) => Promise<any> } },
  options: {
    contents: any;
    config?: GeminiRawConfig;
    preferredModel?: string;
  },
): Promise<{ text?: string }> {
  const modelList = options.preferredModel
    ? [options.preferredModel, GEMINI_LITE_MODEL, GEMINI_MODEL].filter(
        (v, i, a) => a.indexOf(v) === i,
      )
    : [GEMINI_LITE_MODEL, GEMINI_MODEL];

  let lastError: unknown = null;

  for (const model of modelList) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isUnavailable =
          msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
        const isRateLimit =
          msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

        if ((isUnavailable || isRateLimit) && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        break;
      }
    }
  }

  throw lastError;
}

/** Jak generateContent, ale od razu parsuje odpowiedź do obiektu JSON. */
export async function generateJson<T = any>(options: GenerateContentOptions): Promise<T> {
  return safeJsonParse<T>(await generateContent(options));
}

/**
 * generateJson z wielopoziomowym fallbackiem modeli (preferredModel -> LITE -> MAIN)
 * oraz automatycznym retry i backoffem przy błędach 503/429.
 */
export async function generateJsonWithFallback<T = any>(
  options: GenerateContentOptions & { preferredModel?: string },
): Promise<T> {
  const text = await generateContentWithFallback(options);
  return safeJsonParse<T>(text);
}

/**
 * generateContent z wielopoziomowym fallbackiem i retry przy błędach 503/429.
 * Deleguje do centralnej pętli w callGeminiWithFallback() — nie reimplementuje logiki.
 */
export async function generateContentWithFallback(
  options: GenerateContentOptions & { preferredModel?: string },
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new AiResponseError("Brak skonfigurowanego klucza GEMINI_API_KEY w pliku .env serwera");
  }

  const config: GeminiRawConfig = {};
  if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
  if (options.temperature !== undefined) config.temperature = options.temperature;
  if (options.responseMimeType) config.responseMimeType = options.responseMimeType;
  if (options.abortSignal) config.abortSignal = options.abortSignal;

  const response = await callGeminiWithFallback(ai, {
    contents: options.contents,
    config: Object.keys(config).length > 0 ? config : undefined,
    preferredModel: options.preferredModel,
  });

  return response.text ?? "";
}
