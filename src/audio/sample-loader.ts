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
};

/** Conservative attenuation for unusually hot, short source recordings. */
export const BOL_GAIN: Record<string, number> = {
  Dhin: 0.58,
  Ghe: 0.87,
  Ka: 0.5,
  Kat: 0.6,
  Ke: 0.48,
};

/**
 * Create a Tone.Sampler for tabla bols.
 * Each bol gets its own buffer — the sampler maps note names to samples.
 * Since tabla bols aren't pitched, we use MIDI notes C1-C2 range as arbitrary keys.
 */
export async function loadTablaSampler(
  outputNode: Tone.InputNode
): Promise<Tone.Sampler | null> {
  // Build the sample URL map for Tone.Sampler
  const urls: Record<string, string> = {};
  for (const [bol, note] of Object.entries(BOL_TO_NOTE)) {
    if (TABLA_SAMPLE_MAP[bol]) {
      urls[note] = TABLA_SAMPLE_MAP[bol];
    }
  }

  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls,
      onload: () => {
        log('[SampleLoader] Tabla samples loaded');
        resolve(sampler);
      },
      onerror: (err) => {
        console.warn('[SampleLoader] Failed to load tabla samples:', err);
        sampler.dispose();
        resolve(null);
      },
    }).connect(outputNode as Tone.ToneAudioNode);
  });
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
