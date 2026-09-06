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

/** Composite bols and rolls are assembled by the sequencer, not recordings. */
const TABLA_SAMPLE_MAP: Record<string, string> = {
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
  'Kat':  '/samples/tabla/Kat.wav',
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

/** Each attack owns a native source.
 * Sampler.releaseAll does not cancel attacks already handed to Web Audio.
 */
export interface TablaSamplePlayer {
  triggerAttack(bol: string, time: number, velocity: number, playbackRate?: number): void;
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
  const loads = Object.entries(TABLA_SAMPLE_MAP).map(async ([bol, url]) => {
    const buffer = new Tone.ToneAudioBuffer();
    buffers.set(bol, buffer);
    await buffer.load(url);
  });
  const results = await Promise.allSettled(loads);
  if (results.some((result) => result.status === 'rejected')) {
    buffers.forEach((buffer) => buffer.dispose());
    console.warn('[SampleLoader] Failed to load tabla samples; using synthesis');
    return null;
  }
  log('[SampleLoader] Tabla samples loaded');
  return {
    triggerAttack(bol, time, velocity, playbackRate = 1) {
      const buffer = buffers.get(BOL_SAMPLE_ALIASES[bol] ?? bol)?.get();
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

export function getBolSample(bolName: string): string | null {
  const canonicalBol = BOL_SAMPLE_ALIASES[bolName] ?? bolName;
  return Object.hasOwn(TABLA_SAMPLE_MAP, canonicalBol) ? canonicalBol : null;
}

export function getBolGain(bolName: string): number {
  const canonicalBol = BOL_SAMPLE_ALIASES[bolName] ?? bolName;
  return BOL_GAIN[canonicalBol] ?? 1;
}
