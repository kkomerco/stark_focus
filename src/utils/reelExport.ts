// src/utils/reelExport.ts
// Eksport rolki klatka-po-klatce: WebCodecs + MP4, bez nagrywania czasu
// rzeczywistego.
//
// `MediaRecorder` zbiera to, co karta zdoła narysować w czasie, gdy film
// leci. Dwie rzeczy z tego wynikają i obie kosztują właściciela marki
// materiał: ukryta albo zamrożona karta nie dostaje `requestAnimationFrame`,
// więc plik wychodzi z zamrożoną klatką, a przy typografii słowo-po-słowie
// zgubiona klatka przesuwa każdy kolejny wyraz o ułamek sekundy względem
// uderzenia w podkładzie. Tu licznik jest nasz: rysujemy kadr `i/fps`,
// wrzucamy go do enkodera z własnym znacznikiem czasu i nie pytamy zegara
// ściennego o nic.
import { ArrayBufferTarget, Muxer } from "mp4-muxer";

/** 30 fps to standard rolek pionowych; wyżej odtwarzacze i tak nie chcą. */
export const REEL_FPS = 30;

/** Poziom 4.2 znosi 1080x1920 przy 30 fps; baseline łamie się na rozdzielczości. */
const VIDEO_CANDIDATES = ["avc1.640028", "avc1.4d0028", "avc1.42E01E"] as const;

/** Typografia na czerni to ostry kontrast — poniżej tego widać blokowanie krawędzi. */
const VIDEO_BITRATE = 16_000_000;
const AUDIO_BITRATE = 192_000;

/** Enkoder pracuje asynchronicznie; bez tego kolejka urosłaby do całego filmu. */
const MAX_ENCODE_QUEUE = 8;

export function exactExportSupported(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
}

async function pickVideoCodec(
  width: number,
  height: number,
): Promise<(typeof VIDEO_CANDIDATES)[number] | null> {
  for (const codec of VIDEO_CANDIDATES) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: VIDEO_BITRATE,
        framerate: REEL_FPS,
      });
      if (support.supported) return codec;
    } catch {
      // Brak wsparcia dla jednej propozycji to nie błąd — pytamy o następną.
    }
  }
  return null;
}

const idle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function drain(encoder: VideoEncoder | AudioEncoder) {
  while (encoder.encodeQueueSize > MAX_ENCODE_QUEUE) await idle();
}

/**
 * PCM z `AudioBuffer` w kawałki zrozumiałe dla enkodera AAC. Planarnie, bo
 * `AudioBuffer` trzyma kanały osobno i przepisywanie ich do interleaved
 * tylko mnoży okazje do pomyłki przy ostatniej, niepełnej próbce.
 */
function audioChunks(buffer: AudioBuffer, chunkFrames: number) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const data: Float32Array[] = [];
  for (let c = 0; c < channels; c++) data.push(buffer.getChannelData(c));

  const chunks: {
    data: Float32Array<ArrayBuffer>;
    timestamp: number;
    frames: number;
  }[] = [];
  for (let start = 0; start < buffer.length; start += chunkFrames) {
    const frames = Math.min(chunkFrames, buffer.length - start);
    // Planarnie: jedna płaszczyzna po drugiej. To układ, którego oczekuje
    // `f32-planar`, a przy okazji pojedynczy bufor zamiast tablicy kanałów.
    // `new ArrayBuffer`, nie liczba: bez tego TS widzi bufór, który *może*
    // być współdzielony, a `AudioData` chce zwykłego.
    const planar = new Float32Array(new ArrayBuffer(frames * channels * 4));
    for (let c = 0; c < channels; c++)
      planar.set(data[c].subarray(start, start + frames), c * frames);
    chunks.push({ data: planar, timestamp: (start / buffer.sampleRate) * 1e6, frames });
  }
  return { chunks, channels };
}

export interface ExactReelExport {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  durationSec: number;
  /** Narysuj kadr przypadający na `t` sekund. To jedyny kontakt z rendererem. */
  drawFrame: (t: number) => void | Promise<void>;
  /**
   * Przygotowanie klatki PRZED narysowaniem — np. przewinięcie tła wideo na
   * czas tej klatki. Bez tego okna eksport blituje to, co w danej chwili
   * pokazuje żywy element, a nie to, co wypada w liczniku klatek.
   */
  beforeFrame?: (t: number) => void | Promise<void>;
  signal?: AbortSignal;
  /** Gotowy podkład z `renderReelBed`; bez niego plik jest niemy. */
  audio?: AudioBuffer | null;
  onProgress?: (percent: number) => void;
}

/**
 * Zwraca gotowy plik MP4 albo rzuca wyjątkiem — wołający ma wtedy wrócić do
 * `MediaRecorder`, bo na części przeglądarki enkoder H.264 po prostu nie
 * istnieje. Nigdy nie udajemy sukcesu pustym plikiem.
 */
export async function exportReelExact(options: ExactReelExport): Promise<Blob> {
  const { canvas, width, height, durationSec, drawFrame, beforeFrame, audio, onProgress, signal } =
    options;
  signal?.throwIfAborted();
  const codec = await pickVideoCodec(width, height);
  signal?.throwIfAborted();
  if (!codec) throw new Error("Brak wspieranego enkodera H.264 dla tego kadru.");

  const withAudio = !!audio && typeof AudioEncoder !== "undefined";
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height, frameRate: REEL_FPS },
    ...(withAudio
      ? {
          audio: {
            codec: "aac",
            numberOfChannels: Math.min(2, audio.numberOfChannels),
            sampleRate: audio.sampleRate,
          },
        }
      : {}),
    fastStart: "in-memory",
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => console.error("Enkoder wideo:", err),
  });
  encoder.configure({
    codec,
    width,
    height,
    bitrate: VIDEO_BITRATE,
    framerate: REEL_FPS,
    // Co sekundę klatka kluczowa: social media tną plik na fragmenty i
    // bez nich podgląd zaczyna się od szarego obrazu.
    latencyMode: "quality",
  });

  let aac: AudioEncoder | null = null;
  if (withAudio && audio) {
    aac = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (err) => console.error("Enkoder audio:", err),
    });
    aac.configure({
      codec: "mp4a.40.2",
      sampleRate: audio.sampleRate,
      numberOfChannels: Math.min(2, audio.numberOfChannels),
      bitrate: AUDIO_BITRATE,
    });
  }

  const totalFrames = Math.max(1, Math.round(durationSec * REEL_FPS));
  try {
    for (let index = 0; index < totalFrames; index++) {
      signal?.throwIfAborted();
      const at = index / REEL_FPS;
      await beforeFrame?.(at);
      signal?.throwIfAborted();
      await drawFrame(at);
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(at * 1e6),
        duration: Math.round((1 / REEL_FPS) * 1e6),
      });
      encoder.encode(frame, { keyFrame: index % REEL_FPS === 0 });
      frame.close();
      await drain(encoder);
      onProgress?.(Math.min(99, Math.round((index / totalFrames) * 100)));
    }

    if (aac && audio) {
      const { chunks, channels } = audioChunks(audio, 1024);
      for (const chunk of chunks) {
        aac.encode(
          new AudioData({
            format: "f32-planar",
            sampleRate: audio.sampleRate,
            numberOfFrames: chunk.frames,
            numberOfChannels: channels,
            timestamp: chunk.timestamp,
            data: chunk.data,
          }),
        );
        while (aac.encodeQueueSize > MAX_ENCODE_QUEUE) await idle();
      }
      await aac.flush();
      aac.close();
    }

    await encoder.flush();
    signal?.throwIfAborted();
    onProgress?.(99);
  } catch (err) {
    // Niedomknięty enkoder zostaje w karcie i blokuje następny eksport.
    try {
      encoder.close();
    } catch {
      /* już zamknięty przez błąd */
    }
    aac?.close();
    throw err;
  }

  encoder.close();
  muxer.finalize();
  const { buffer } = muxer.target;
  onProgress?.(100);
  return new Blob([buffer], { type: "video/mp4" });
}
