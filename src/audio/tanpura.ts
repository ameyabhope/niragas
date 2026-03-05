/**
 * Tanpura engine — sample-loop based Indian classical drone.
 *
 * Architecture (per tanpura instance):
 *
 *   Tone.Player (looping pre-recorded 20s tanpura drone)
 *       │
 *       ├── playbackRate used for pitch correction + fine tuning
 *       │
 *       ▼
 *   Mixer Channel
 *
 * Samples come from sankalp's "Electronic Tanpura" pack on Freesound
 * (CC-BY 4.0). Each is a 20-second crossfade-looped segment extracted
 * from ~4 minute recordings of a Raagini electronic tanpura.
 *
 * Available sample matrix:
 *   - 3 tuning types: Pa, Ma, Ni (first string)
 *   - 5 base pitches: A (110Hz), C (130.8Hz), D (146.8Hz), E (164.8Hz), F# (185Hz)
 *   - 3 EQ variants for Pa+C: bass, neutral, treble
 *
 * Pitch matching: we find the closest sample to the user's chosen SA,
 * then apply a small playbackRate adjustment to hit the exact frequency.
 *
 * Fine pitch: user can apply ±50 cents offset on top.
 * Speed: user can adjust playback speed (0.7x–1.4x) which also shifts pitch
 *        (this is natural — real tanpuras behave the same way).
 */

import * as Tone from 'tone';
import type { NoteName, TanpuraTuning, TanpuraEQ, TanpuraConfig } from './types';
import { getChannelInput } from './mixer';
import { noteToFreq } from '@/lib/notes';

// ── Sample Catalog ──────────────────────────────────────────────────────────

/** Base pitch keys with their reference SA frequency in Hz */
interface SampleEntry {
  key: string;        // e.g. 'A', 'C', 'D', 'E', 'Fs'
  saFreq: number;     // Hz — the SA frequency of this sample
  saNote: NoteName;   // Western note name
  saOctave: number;   // Octave
}

const SAMPLE_PITCHES: SampleEntry[] = [
  { key: 'A',  saFreq: 110.0,  saNote: 'A',  saOctave: 2 },
  { key: 'C',  saFreq: 130.8,  saNote: 'C',  saOctave: 3 },
  { key: 'D',  saFreq: 146.8,  saNote: 'D',  saOctave: 3 },
  { key: 'E',  saFreq: 164.8,  saNote: 'E',  saOctave: 3 },
  { key: 'Fs', saFreq: 185.0,  saNote: 'F#', saOctave: 3 },
];

/** Build the URL for a given tuning + pitch + eq variant */
function getSampleUrl(tuning: TanpuraTuning, pitchKey: string, eq: TanpuraEQ = 'neutral'): string {
  // EQ variants only exist for Pa + C
  if (tuning === 'Pa' && pitchKey === 'C' && eq !== 'neutral') {
    return `/samples/tanpura/${tuning}_${pitchKey}_${eq}.m4a`;
  }
  return `/samples/tanpura/${tuning}_${pitchKey}.m4a`;
}

/**
 * Find the closest sample pitch entry to a target frequency.
 * Returns the entry and the playback rate ratio needed to match.
 */
function findClosestSample(targetFreq: number): { entry: SampleEntry; rate: number } {
  let best = SAMPLE_PITCHES[0];
  let bestRatio = targetFreq / best.saFreq;
  let bestDistance = Math.abs(Math.log2(bestRatio));

  for (const entry of SAMPLE_PITCHES) {
    const ratio = targetFreq / entry.saFreq;
    const distance = Math.abs(Math.log2(ratio));
    if (distance < bestDistance) {
      best = entry;
      bestRatio = ratio;
      bestDistance = distance;
    }
  }

  return { entry: best, rate: bestRatio };
}

// ── Tanpura Instance ────────────────────────────────────────────────────────

export const DEFAULT_TANPURA_CONFIG: TanpuraConfig = {
  enabled: true,
  tuning: 'Pa',
  eq: 'neutral',
  finePitchCents: 0,
  speed: 1.0,
  volume: 0.75,
  pan: 0,
};

interface TanpuraInstance {
  player: Tone.Player | null;
  config: TanpuraConfig;
  saNote: NoteName;
  saOctave: number;
  saCents: number;
  playing: boolean;
  currentSampleKey: string;  // e.g. "Pa_C" — tracks which sample is loaded
  baseRate: number;          // playback rate for pitch correction (before speed/finePitch)
  loading: boolean;
}

const instances: Map<string, TanpuraInstance> = new Map();

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Compute the combined playback rate from base pitch correction + fine pitch + speed */
function computePlaybackRate(baseRate: number, finePitchCents: number, speed: number): number {
  const finePitchRatio = Math.pow(2, finePitchCents / 1200);
  return baseRate * finePitchRatio * speed;
}

/** Check if a sample URL exists */
async function sampleExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize a tanpura instance.
 */
export async function createTanpura(
  id: 'tanpura1' | 'tanpura2',
  config: TanpuraConfig,
  saNote: NoteName,
  saOctave: number,
  saCents: number = 0
): Promise<void> {
  disposeTanpura(id);

  const instance: TanpuraInstance = {
    player: null,
    config: { ...config },
    saNote,
    saOctave,
    saCents,
    playing: false,
    currentSampleKey: '',
    baseRate: 1.0,
    loading: false,
  };

  instances.set(id, instance);

  // Load the appropriate sample
  await loadSampleForInstance(id);

  console.log(`[Tanpura] Created ${id}`);
}

/**
 * Load (or reload) the correct sample for an instance based on its config and pitch.
 */
async function loadSampleForInstance(id: string): Promise<void> {
  const instance = instances.get(id);
  if (!instance) return;

  const { tuning, eq } = instance.config;
  const targetFreq = noteToFreq(instance.saNote, instance.saOctave, instance.saCents);
  const { entry, rate } = findClosestSample(targetFreq);

  const sampleKey = `${tuning}_${entry.key}_${eq}`;
  const sampleUrl = getSampleUrl(tuning, entry.key, eq);

  // Don't reload if same sample is already loaded
  if (sampleKey === instance.currentSampleKey && instance.player) {
    instance.baseRate = rate;
    const finalRate = computePlaybackRate(rate, instance.config.finePitchCents, instance.config.speed);
    instance.player.playbackRate = finalRate;
    return;
  }

  instance.loading = true;
  const wasPlaying = instance.playing;
  if (wasPlaying) stopTanpura(id);

  // Dispose old player
  instance.player?.dispose();
  instance.player = null;

  // Check if sample exists
  const exists = await sampleExists(sampleUrl);
  if (!exists) {
    console.warn(`[Tanpura] Sample not found: ${sampleUrl}, trying neutral EQ`);
    // Fall back to neutral EQ
    const fallbackUrl = getSampleUrl(tuning, entry.key, 'neutral');
    const fallbackExists = await sampleExists(fallbackUrl);
    if (!fallbackExists) {
      console.error(`[Tanpura] No sample found for ${tuning} ${entry.key}`);
      instance.loading = false;
      return;
    }
    // Load fallback
    await loadPlayerFromUrl(id, fallbackUrl, `${tuning}_${entry.key}_neutral`, rate);
  } else {
    await loadPlayerFromUrl(id, sampleUrl, sampleKey, rate);
  }

  instance.loading = false;

  if (wasPlaying && instance.config.enabled) {
    startTanpura(id);
  }
}

async function loadPlayerFromUrl(
  id: string,
  url: string,
  sampleKey: string,
  baseRate: number
): Promise<void> {
  const instance = instances.get(id);
  if (!instance) return;

  const channelInput = getChannelInput(id as 'tanpura1' | 'tanpura2');

  return new Promise<void>((resolve) => {
    const player = new Tone.Player({
      url,
      loop: true,
      fadeIn: 0.5,
      fadeOut: 0.5,
      onload: () => {
        instance.player = player;
        instance.currentSampleKey = sampleKey;
        instance.baseRate = baseRate;

        const finalRate = computePlaybackRate(
          baseRate,
          instance.config.finePitchCents,
          instance.config.speed
        );
        player.playbackRate = finalRate;

        console.log(
          `[Tanpura] Loaded ${sampleKey} for ${id} ` +
          `(baseRate=${baseRate.toFixed(4)}, finalRate=${finalRate.toFixed(4)})`
        );
        resolve();
      },
      onerror: (err) => {
        console.error(`[Tanpura] Failed to load ${url}:`, err);
        player.dispose();
        resolve();
      },
    }).connect(channelInput);
  });
}

/**
 * Start the tanpura drone.
 */
export function startTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance || instance.playing || !instance.player || instance.loading) return;

  try {
    instance.player.start();
    instance.playing = true;

    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }

    console.log(`[Tanpura] Started ${id}`);
  } catch (err) {
    console.error(`[Tanpura] Error starting ${id}:`, err);
  }
}

/**
 * Stop the tanpura drone.
 */
export function stopTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  if (instance.player?.state === 'started') {
    instance.player.stop();
  }
  instance.playing = false;

  console.log(`[Tanpura] Stopped ${id}`);
}

/**
 * Update the tanpura configuration.
 * If tuning, EQ, or SA pitch changed, reloads the sample.
 * If only fine pitch or speed changed, just adjusts playbackRate.
 */
export async function updateTanpura(
  id: 'tanpura1' | 'tanpura2',
  config: Partial<TanpuraConfig>,
  saNote?: NoteName,
  saOctave?: number,
  saCents?: number
): Promise<void> {
  const instance = instances.get(id);
  if (!instance) return;

  const oldConfig = { ...instance.config };
  const oldSaNote = instance.saNote;
  const oldSaOctave = instance.saOctave;
  const oldSaCents = instance.saCents;

  // Update config
  instance.config = { ...instance.config, ...config };
  if (saNote !== undefined) instance.saNote = saNote;
  if (saOctave !== undefined) instance.saOctave = saOctave;
  if (saCents !== undefined) instance.saCents = saCents;

  // Check if we need to reload the sample (tuning, EQ, or pitch changed significantly)
  const tuningChanged = config.tuning !== undefined && config.tuning !== oldConfig.tuning;
  const eqChanged = config.eq !== undefined && config.eq !== oldConfig.eq;
  const pitchChanged =
    (saNote !== undefined && saNote !== oldSaNote) ||
    (saOctave !== undefined && saOctave !== oldSaOctave) ||
    (saCents !== undefined && saCents !== oldSaCents);

  if (tuningChanged || eqChanged || pitchChanged) {
    // Need to reload sample
    await loadSampleForInstance(id);
  } else if (instance.player) {
    // Just update playback rate
    const targetFreq = noteToFreq(instance.saNote, instance.saOctave, instance.saCents);
    const { rate } = findClosestSample(targetFreq);
    instance.baseRate = rate;
    const finalRate = computePlaybackRate(
      rate,
      instance.config.finePitchCents,
      instance.config.speed
    );
    instance.player.playbackRate = finalRate;
  }
}

/**
 * Update the Sa pitch. Reloads sample if the closest sample changes.
 */
export async function updateTanpuraPitch(
  id: string,
  saNote: NoteName,
  saOctave: number,
  saCents: number = 0
): Promise<void> {
  const instance = instances.get(id);
  if (!instance) return;

  instance.saNote = saNote;
  instance.saOctave = saOctave;
  instance.saCents = saCents;

  await loadSampleForInstance(id);
}

/**
 * Check if a tanpura is currently playing.
 */
export function isTanpuraPlaying(id: string): boolean {
  return instances.get(id)?.playing ?? false;
}

/**
 * Check if a tanpura sample is loaded and ready.
 */
export function isTanpuraReady(id: string): boolean {
  const inst = instances.get(id);
  return inst !== null && inst !== undefined && inst.player !== null && !inst.loading;
}

/**
 * Dispose a tanpura instance and free all audio nodes.
 */
export function disposeTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  stopTanpura(id);
  instance.player?.dispose();
  instances.delete(id);

  console.log(`[Tanpura] Disposed ${id}`);
}

/**
 * Dispose all tanpura instances.
 */
export function disposeAllTanpuras(): void {
  for (const id of instances.keys()) {
    disposeTanpura(id);
  }
}
