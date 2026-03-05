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

// ── State ───────────────────────────────────────────────────────────────────

/** Tracks whether tabla samples have been loaded */
let tablaLoaded = false;
let tablaFailed = false;

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

/**
 * Check if a sample file exists by attempting a HEAD request.
 */
async function sampleExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Create a Tone.Sampler for tabla bols.
 * Each bol gets its own buffer — the sampler maps note names to samples.
 * Since tabla bols aren't pitched, we use MIDI notes C1-C2 range as arbitrary keys.
 */
export async function loadTablaSampler(
  outputNode: Tone.InputNode
): Promise<Tone.Sampler | null> {
  if (tablaFailed) return null;
  if (!tablaLoaded) {
    const exists = await sampleExists(TABLA_SAMPLE_MAP['Dha']);
    if (!exists) {
      console.log('[SampleLoader] No tabla samples found, using synthesis');
      tablaFailed = true;
      return null;
    }
  }

  // Map each bol to an arbitrary MIDI note for Tone.Sampler
  const bolToNote: Record<string, string> = {
    'Dha': 'C1', 'Dhin': 'C#1', 'Dhi': 'D1',
    'Na': 'D#1', 'Ta': 'E1', 'Tin': 'F1', 'Tun': 'F#1',
    'Ge': 'G1', 'Ghe': 'G#1', 'Ke': 'A1', 'Ka': 'A#1',
    'Ti': 'B1', 'Tu': 'C2', 'Te': 'C#2',
    'Trkt': 'D2', 'Kat': 'D#2',
  };

  // Build the sample URL map for Tone.Sampler
  const urls: Record<string, string> = {};
  for (const [bol, note] of Object.entries(bolToNote)) {
    if (TABLA_SAMPLE_MAP[bol]) {
      urls[note] = TABLA_SAMPLE_MAP[bol];
    }
  }

  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls,
      onload: () => {
        tablaLoaded = true;
        console.log('[SampleLoader] Tabla samples loaded');
        resolve(sampler);
      },
      onerror: (err) => {
        console.warn('[SampleLoader] Failed to load tabla samples:', err);
        tablaFailed = true;
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
  const map: Record<string, string> = {
    'Dha': 'C1', 'Dhin': 'C#1', 'Dhi': 'D1',
    'Na': 'D#1', 'Ta': 'E1', 'Tin': 'F1', 'Tun': 'F#1',
    'Ge': 'G1', 'Ghe': 'G#1', 'Ke': 'A1', 'Ka': 'A#1',
    'Ti': 'B1', 'Tu': 'C2', 'Te': 'C#2',
    'Trkt': 'D2', 'Kat': 'D#2',
  };
  return map[bolName] ?? null;
}
