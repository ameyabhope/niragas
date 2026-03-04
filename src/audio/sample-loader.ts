/**
 * Sample loader: loads audio samples from public/samples/ directory.
 *
 * Provides a centralized way to load, cache, and check availability of
 * audio samples for all instruments. If samples aren't available,
 * instruments fall back to synthesis.
 *
 * Expected directory structure:
 *   public/samples/
 *     tabla/          - Individual bol samples (Dha.wav, Na.wav, etc.)
 *     tanpura/        - Tanpura string pluck samples per note
 *     manjira/        - Manjira hit samples
 *     surpeti/        - Sur-Peti drone samples
 *     swarmandal/     - Swar Mandal string pluck samples
 *     metronome/      - Click samples
 */

import * as Tone from 'tone';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SampleMap {
  [key: string]: string; // note/name → URL path
}

export type InstrumentSampleSet = 'tabla' | 'tanpura' | 'manjira' | 'surpeti' | 'swarmandal' | 'metronome';

// ── State ───────────────────────────────────────────────────────────────────

/** Tracks which sample sets have been loaded */
const loadedSets = new Set<InstrumentSampleSet>();

/** Tracks which sample sets failed to load (missing files) */
const failedSets = new Set<InstrumentSampleSet>();

/** Created Tone.Sampler instances, keyed by instrument */
const samplers = new Map<string, Tone.Sampler>();

// ── Expected sample files ───────────────────────────────────────────────────

/**
 * Tabla bol sample paths.
 * Keys are bol names, values are file paths relative to /samples/tabla/
 */
export const TABLA_SAMPLE_MAP: SampleMap = {
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

/**
 * Tanpura pluck sample paths.
 * Keys are MIDI note names, values are file paths.
 * We need a few reference pitches; Tone.Sampler will pitch-shift the rest.
 */
export const TANPURA_SAMPLE_MAP: SampleMap = {
  'C#3': '/samples/tanpura/Sa-low.wav',
  'C#4': '/samples/tanpura/Sa.wav',
  'G#3': '/samples/tanpura/Pa.wav',
  'B3':  '/samples/tanpura/Ni.wav',
  // Ma (F#3) not available — Tone.Sampler will interpolate from Pa and Sa
};

/**
 * Manjira hit sample paths.
 */
export const MANJIRA_SAMPLE_MAP: SampleMap = {
  'hit':    '/samples/manjira/hit.wav',
  'accent': '/samples/manjira/accent.wav',
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
 * Check if any samples exist for an instrument.
 * Tests the first file in the sample map.
 */
export async function hasSamples(instrument: InstrumentSampleSet): Promise<boolean> {
  if (loadedSets.has(instrument)) return true;
  if (failedSets.has(instrument)) return false;

  let testUrl: string;
  switch (instrument) {
    case 'tabla':
      testUrl = TABLA_SAMPLE_MAP['Dha'];
      break;
    case 'tanpura':
      testUrl = TANPURA_SAMPLE_MAP['C#4'];
      break;
    case 'manjira':
      testUrl = MANJIRA_SAMPLE_MAP['hit'];
      break;
    default:
      testUrl = `/samples/${instrument}/test.wav`;
  }

  const exists = await sampleExists(testUrl);
  if (!exists) {
    failedSets.add(instrument);
  }
  return exists;
}

/**
 * Create a Tone.Sampler for tabla bols.
 * Each bol gets its own buffer — the sampler maps note names to samples.
 * Since tabla bols aren't pitched, we use MIDI notes C1-C2 range as arbitrary keys.
 */
export async function loadTablaSampler(
  outputNode: Tone.InputNode
): Promise<Tone.Sampler | null> {
  const exists = await hasSamples('tabla');
  if (!exists) {
    console.log('[SampleLoader] No tabla samples found, using synthesis');
    return null;
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
        loadedSets.add('tabla');
        console.log('[SampleLoader] Tabla samples loaded');
        resolve(sampler);
      },
      onerror: (err) => {
        console.warn('[SampleLoader] Failed to load tabla samples:', err);
        failedSets.add('tabla');
        sampler.dispose();
        resolve(null);
      },
    }).connect(outputNode as Tone.ToneAudioNode);
  });
}

/**
 * Create a Tone.Sampler for tanpura.
 */
export async function loadTanpuraSampler(
  outputNode: Tone.InputNode
): Promise<Tone.Sampler | null> {
  const exists = await hasSamples('tanpura');
  if (!exists) {
    console.log('[SampleLoader] No tanpura samples found, using synthesis');
    return null;
  }

  return new Promise((resolve) => {
    const sampler = new Tone.Sampler({
      urls: TANPURA_SAMPLE_MAP,
      onload: () => {
        loadedSets.add('tanpura');
        console.log('[SampleLoader] Tanpura samples loaded');
        resolve(sampler);
      },
      onerror: (err) => {
        console.warn('[SampleLoader] Failed to load tanpura samples:', err);
        failedSets.add('tanpura');
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

/**
 * Check if samples have been loaded for an instrument.
 */
export function areSamplesLoaded(instrument: InstrumentSampleSet): boolean {
  return loadedSets.has(instrument);
}

/**
 * Dispose a sampler instance.
 */
export function disposeSampler(key: string): void {
  const sampler = samplers.get(key);
  if (sampler) {
    sampler.dispose();
    samplers.delete(key);
  }
}
