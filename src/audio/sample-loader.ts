/**
 * Sample loader: loads audio samples from public/samples/ directory.
 *
 * Provides a centralized way to load and check availability of tabla samples.
 * Tanpura samples are loaded directly by the tanpura engine (Tone.Player).
 *
 * Expected directory structure:
 *   public/samples/
 *     tabla/          - Individual bol samples (Dha.wav, Na.wav, etc.)
 *     tanpura/        - Electronic tanpura loop files (Pa_C.m4a, etc.)
 */

import * as Tone from 'tone';
import { log } from './log';

// ── State ───────────────────────────────────────────────────────────────────

/** Tracks whether tabla samples have been loaded */
// ── Expected sample files ───────────────────────────────────────────────────

/**
 * Tabla bol sample paths.
 * Keys are bol names, values are file paths relative to /samples/tabla/
 */
const TABLA_SAMPLE_MAP: Record<string, string> = {
  'Dha':  '/samples/tabla/Dha.wav',
  'Dhin': '/samples/tabla/Dhin.wav',
  'Dhi':  '/samples/tabla/Dhi.wav',
  'Na':   '/samples/tabla/Na.wav',
  'Ta':   '/samples/tabla/Ta.wav',
  'Tin':  '/samples/tabla/Tin.wav',
  'Tun':  '/samples/tabla/Tun.wav',
  'Ge':   '/samples/tabla/Ge.wav',
  'Ghe':  '/samples/tabla/Ghe.wav',
  'Ke':   '/samples/tabla/Ke.wav',
  'Ka':   '/samples/tabla/Ka.wav',
  'Ti':   '/samples/tabla/Ti.wav',
  'Tu':   '/samples/tabla/Tu.wav',
  'Te':   '/samples/tabla/Te.wav',
  'Trkt': '/samples/tabla/Trkt.wav',
  'Kat':  '/samples/tabla/Kat.wav',
};

// ── Loading ─────────────────────────────────────────────────────────────────

const BOL_TO_NOTE: Record<string, string> = {
  'Dha': 'C1', 'Dhin': 'C#1', 'Dhi': 'D1',
  'Na': 'D#1', 'Ta': 'E1', 'Tin': 'F1', 'Tun': 'F#1',
  'Ge': 'G1', 'Ghe': 'G#1', 'Ke': 'A1', 'Ka': 'A#1',
  'Ti': 'B1', 'Tu': 'C2', 'Te': 'C#2',
  'Trkt': 'D2', 'Kat': 'D#2',
};

/** Conventional spelling variants mapped to the closest recorded stroke. */
export const BOL_SAMPLE_ALIASES: Record<string, string> = {
  Di: 'Dhi',
  Ga: 'Ge',
  Gad: 'Ge',
  Ghen: 'Ghe',
  Ghir: 'Ghe',
  Ki: 'Ke',
  Kt: 'Kat',
  Tit: 'Ti',
  Re: 'Te',
};

/** Conservative attenuation for unusually hot, short source recordings. */
export const BOL_GAIN: Record<string, number> = {
  Dhin: 0.58,
  Ghe: 0.87,
  Ka: 0.5,
  Kat: 0.6,
  Ke: 0.48,
};

/** Dominant sustained modes measured with a Hann-window DFT, 40-440 ms,
 * 0.5 Hz bins, on the shipped WAVs. These are not assumed note-name roots.
 * Closed strokes and baya stay at their recorded rate.
 */
export const TABLA_SAMPLE_ROOT_HZ: Record<string, number> = {
  Na: 557,
  Ta: 554,
  Tin: 311.5,
  Tun: 314.5,
};

export function getBolPlaybackRate(bolName: string, targetHz: number): number {
  const root = TABLA_SAMPLE_ROOT_HZ[BOL_SAMPLE_ALIASES[bolName] ?? bolName];
  return root ? targetHz / root : 1;
}

/** Arbitrary note keys are retained, but each attack owns a native source.
 * Sampler.releaseAll does not cancel attacks already handed to Web Audio.
 */
export interface TablaSamplePlayer {
  triggerAttack(note: string, time: number, velocity: number, playbackRate?: number): void;
  stopAll(): void;
  dispose(): void;
}

export async function loadTablaSampler(
  outputNode: Tone.InputNode
): Promise<TablaSamplePlayer | null> {
  const buffers = new Map<string, Tone.ToneAudioBuffer>();
  const voices = new Map<AudioBufferSourceNode, GainNode>();
  const stopAll = () => {
    for (const [source, gain] of voices) {
      source.onended = null;
      source.stop(Tone.immediate());
      source.disconnect();
      gain.disconnect();
    }
    voices.clear();
  };
  const loads = Object.entries(BOL_TO_NOTE).map(async ([bol, note]) => {
    // Composite bols and rolls are assembled by the sequencer, not recordings.
    if (['Dha', 'Dhin', 'Dhi', 'Trkt'].includes(bol)) return;
    const buffer = new Tone.ToneAudioBuffer();
    buffers.set(note, buffer);
    await buffer.load(TABLA_SAMPLE_MAP[bol]);
  });
  const results = await Promise.allSettled(loads);
  if (results.some((result) => result.status === 'rejected')) {
    buffers.forEach((buffer) => buffer.dispose());
    console.warn('[SampleLoader] Failed to load tabla samples; using synthesis');
    return null;
  }
  log('[SampleLoader] Tabla samples loaded');
  return {
    triggerAttack(note, time, velocity, playbackRate = 1) {
      const buffer = buffers.get(note)?.get();
      if (!buffer) return;
      const context = Tone.getContext();
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      gain.gain.value = velocity;
      source.connect(gain);
      Tone.connect(gain, outputNode);
      voices.set(source, gain);
      source.onended = () => {
        voices.delete(source);
        source.disconnect();
        gain.disconnect();
      };
      source.start(time);
    },
    stopAll,
    dispose() {
      stopAll();
      buffers.forEach((buffer) => buffer.dispose());
      buffers.clear();
    },
  };
}

/**
 * Get the MIDI note key for a tabla bol name (used with the sampler).
 */
export function getBolSamplerNote(bolName: string): string | null {
  const canonicalBol = BOL_SAMPLE_ALIASES[bolName] ?? bolName;
  return BOL_TO_NOTE[canonicalBol] ?? null;
}

export function getBolGain(bolName: string): number {
  const canonicalBol = BOL_SAMPLE_ALIASES[bolName] ?? bolName;
  return BOL_GAIN[canonicalBol] ?? 1;
}
