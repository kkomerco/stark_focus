/**
 * Proceduralne tło dźwiękowe rolki.
 *
 * Dlaczego nie plik: aplikacja jest lokalna, bez konta, bez cache'u zasobów i
 * bez prawa do muzyki z bibliotek platformowych (konto firmowe dostaje tylko
 * próbkę komercyjną). Silnik WebAudio składa bed z dronu, risera i uderzeń na
 * grzbietach fraz — to niczego nie udaje, po prostu jest zrobione w kodzie.
 *
 * Cel: 10-25 s materiału, który nie jest cichy. W tej niszy wysyłki idą przez
 * DM-y, a tam się ogląda ze dźwiękiem.
 */

export interface ReelBedOptions {
  durationSec: number;
  /** Chwile, w których wchodzi nowa fraza — na nie pada uderzenie. */
  beatTimes: number[];
}

const SAMPLE_RATE = 44_100;

/** Biały szum dwóch sekund — wystarczy, bo puszczamy go w pętli. */
function makeNoise(ctx: BaseAudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * SAMPLE_RATE), SAMPLE_RATE);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function addDrone(ctx: BaseAudioContext, master: GainNode, durationSec: number) {
  // Kwinta na basie: 55 Hz i 82,4 Hz. Nisko, bez melodii do zapamiętania.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  filter.connect(master);

  for (const [freq, level] of [
    [55, 0.16],
    [82.4, 0.09],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    // Wchodzi z ciemności w pierwsze 0,35 s i trzyma — bez nagłego startu.
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.linearRampToValueAtTime(level, durationSec * 0.35);
    gain.gain.setValueAtTime(level, Math.max(durationSec * 0.35, durationSec - 0.4));
    gain.gain.linearRampToValueAtTime(0.0001, durationSec);

    osc.connect(gain).connect(filter);
    osc.start(0);
    osc.stop(durationSec);
  }
}

function addRiser(ctx: BaseAudioContext, master: GainNode, durationSec: number, from: number) {
  const noise = ctx.createBufferSource();
  noise.buffer = makeNoise(ctx);
  noise.loop = true;

  const band = ctx.createBiquadFilter();
  band.type = "highpass";
  band.frequency.setValueAtTime(500, from);
  band.frequency.exponentialRampToValueAtTime(6000, Math.max(from + 0.2, durationSec - 0.12));

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, from);
  gain.gain.linearRampToValueAtTime(0.05, Math.max(from + 0.2, durationSec - 0.12));
  // Cisza przed uderzeniem — to ten moment, w którym widz zostaje.
  gain.gain.setValueAtTime(0.05, Math.max(durationSec - 0.1, from + 0.2));
  gain.gain.linearRampToValueAtTime(0.0001, durationSec);

  noise.connect(band).connect(gain).connect(master);
  noise.start(from);
  noise.stop(durationSec);
}

function addHit(ctx: BaseAudioContext, master: GainNode, at: number, strength: number) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, at);
  osc.frequency.exponentialRampToValueAtTime(42, at + 0.18);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(strength, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);

  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + 0.35);
}

/**
 * Składa i renderuje bed do `AudioBuffer`. Render jest deterministyczny,
 * więc ten sam kadr zawsze brzmi tak samo — ważne, bo eksport bywa powtarzany.
 */
export async function renderReelBed(options: ReelBedOptions): Promise<AudioBuffer> {
  const durationSec = Math.min(60, Math.max(1, options.durationSec));
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSec * SAMPLE_RATE), SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  addDrone(ctx, master, durationSec);

  const beats = options.beatTimes
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t) && t > 0.05 && t < durationSec - 0.05)
    .sort((a, b) => a - b);

  for (const beat of beats) addHit(ctx, master, beat, 0.34);
  if (beats.length > 0) addRiser(ctx, master, durationSec, beats[beats.length - 1] * 0.55);
  // Ostatnie uderzenie jest najmocniejsze: to na nim kadr się zapętla.
  addHit(ctx, master, Math.max(0.1, durationSec - 0.12), 0.5);

  return await ctx.startRendering();
}

/** Czasówki grzbietów fraz z timeline'u rolki. */
export function beatTimesFrom(timeline: { start: number }[]): number[] {
  return timeline.map((segment) => segment.start);
}
