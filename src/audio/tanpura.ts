/**
 * Tanpura engine — sample-loop based Indian classical drone.
 *
 * Architecture (per tanpura instance):
 *
 *   Tone.Player (looping pre-recorded 20s tanpura drone)
 *       │  playbackRate = pluck tempo ONLY (0.7–1.4x, pitch-safe)
 *       ▼
 *   Tone.PitchShift (pitch correction + fine tune, preserves tempo feel)
 *       │
 *       ├── compensates speed-induced shift so tempo never changes pitch
 *       │
 *       ▼
 *   Tone.Chorus (subtle width + jivari shimmer, wet ~0.18)
 *       ▼
 *   Tone.Tremolo (slow 0.4Hz breathing, depth 0.08 — not vibrato)
 *       ▼
 *   Tone.Freeverb (small room glue, wet ~0.15)
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
 * then correct the residual via PitchShift (not playbackRate) so the
 * pluck cycle tempo and formants stay stable.
 *
 * Fine pitch: user can apply ±50 cents offset on top (via PitchShift).
 * Speed: pluck tempo 0.7x–1.4x, pitch-compensated — changing tempo
 *        never changes pitch (unlike varispeed).
 */

import * as Tone from 'tone';
import type { NoteName, TanpuraTuning, TanpuraEQ, TanpuraConfig } from './types';
import { getChannelInput } from './mixer';
import { noteToFreq } from '@/lib/notes';
import { log } from './log';

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
  pitchShift: Tone.PitchShift | null;
  chorus: Tone.Chorus | null;
  breathing: Tone.Tremolo | null;
  room: Tone.Freeverb | null;
  config: TanpuraConfig;
  saNote: NoteName;
  saOctave: number;
  saCents: number;
  playing: boolean;
  /** Start was requested while loading — honored as soon as the sample is ready. */
  startRequested: boolean;
  /** Last load/start error (surfaced to UI), null when healthy. */
  error: string | null;
  currentSampleKey: string;  // e.g. "Pa_C" — tracks which sample is loaded
  baseRate: number;          // sample-to-target ratio (before speed/finePitch)
  loading: boolean;
}

const instances: Map<string, TanpuraInstance> = new Map();

// ── Status subscription (reactive UI) ───────────────────────────────────────

export interface TanpuraStatus {
  loading: boolean;
  playing: boolean;
  error: string | null;
}

type StatusListener = (status: TanpuraStatus) => void;
const statusListeners: Map<string, Set<StatusListener>> = new Map();

function snapshot(id: string): TanpuraStatus {
  const instance = instances.get(id);
  return {
    loading: instance?.loading ?? false,
    playing: instance?.playing ?? false,
    error: instance?.error ?? null,
  };
}

function notify(id: string): void {
  const listeners = statusListeners.get(id);
  if (!listeners) return;
  const status = snapshot(id);
  for (const cb of listeners) cb(status);
}

/** Subscribe to loading/playing/error changes for a tanpura instance. */
export function subscribeTanpuraStatus(id: string, cb: StatusListener): () => void {
  let set = statusListeners.get(id);
  if (!set) {
    set = new Set();
    statusListeners.set(id, set);
  }
  set.add(cb);
  return () => {
    set.delete(cb);
  };
}

/** Current loading/playing/error snapshot (for useState initializers). */
export function getTanpuraStatus(id: string): TanpuraStatus {
  return snapshot(id);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * PitchShift amount (semitones) needed so output pitch stays exact
 * regardless of pluck tempo.
 *
 * Output = sampleFreq * speed * 2^(shiftSt/12) = target * fineRatio,
 * so shiftSt = 12*log2(baseRate / speed) + fine/100.
 */
function computePitchShiftSt(
  baseRate: number,
  finePitchCents: number,
  speed: number,
  extraCents = 0
): number {
  const shiftSt = 12 * Math.log2(baseRate / speed) + (finePitchCents + extraCents) / 100;
  // Tone.PitchShift degrades past ~±12st; our worst case is ~±9st.
  return Math.max(-12, Math.min(12, shiftSt));
}

/** Small per-instance detune so tanpura1+tanpura2 on the same sample don't phase. */
function dephaseCents(id: string): number {
  return id === 'tanpura2' ? 4 : 0;
}

/** Apply tempo (Player) + pitch (PitchShift) from current config. */
function applyTempoAndPitch(instance: TanpuraInstance, id: string): void {
  if (instance.player) {
    instance.player.playbackRate = instance.config.speed;
  }
  if (instance.pitchShift) {
    instance.pitchShift.pitch = computePitchShiftSt(
      instance.baseRate,
      instance.config.finePitchCents,
      instance.config.speed,
      dephaseCents(id)
    );
  }
}

/** Static set of all valid tanpura sample URLs (no network check needed) */
const VALID_SAMPLES: Set<string> = (() => {
  const set = new Set<string>();
  const tunings: TanpuraTuning[] = ['Pa', 'Ma', 'Ni'];
  const pitchKeys = SAMPLE_PITCHES.map((p) => p.key);
  for (const tuning of tunings) {
    for (const key of pitchKeys) {
      set.add(`/samples/tanpura/${tuning}_${key}.m4a`);
    }
  }
  // EQ variants exist only for Pa + C
  set.add('/samples/tanpura/Pa_C_bass.m4a');
  set.add('/samples/tanpura/Pa_C_treble.m4a');
  return set;
})();

function sampleExists(url: string): boolean {
  return VALID_SAMPLES.has(url);
}

/** Dispose the audio chain nodes (keeps config/pitch state). */
function disposeChain(instance: TanpuraInstance): void {
  instance.player?.dispose();
  instance.player = null;
  instance.pitchShift?.dispose();
  instance.pitchShift = null;
  instance.chorus?.dispose();
  instance.chorus = null;
  instance.breathing?.dispose();
  instance.breathing = null;
  instance.room?.dispose();
  instance.room = null;
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
    pitchShift: null,
    chorus: null,
    breathing: null,
    room: null,
    config: { ...config },
    saNote,
    saOctave,
    saCents,
    playing: false,
    startRequested: false,
    error: null,
    currentSampleKey: '',
    baseRate: 1.0,
    loading: false,
  };

  instances.set(id, instance);

  // Load the appropriate sample (honors config.enabled on completion)
  await loadSampleForInstance(id);

  log(`[Tanpura] Created ${id}`);
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
    applyTempoAndPitch(instance, id);
    return;
  }

  instance.loading = true;
  instance.error = null;
  notify(id);
  const wasPlaying = instance.playing;
  if (wasPlaying) stopTanpura(id);

  // Dispose old chain
  disposeChain(instance);

  // Primary URL first, then extension fallbacks (.ogg/.wav for browsers
  // whose Web Audio can't decode AAC). Missing files 404 fast to next.
  const candidates: Array<{ url: string; key: string }> = [];
  if (sampleExists(sampleUrl)) {
    candidates.push({ url: sampleUrl, key: sampleKey });
  } else {
    console.warn(`[Tanpura] Sample not found: ${sampleUrl}, trying neutral EQ`);
    const fallbackUrl = getSampleUrl(tuning, entry.key, 'neutral');
    const fallbackKey = `${tuning}_${entry.key}_neutral`;
    if (sampleExists(fallbackUrl)) {
      candidates.push({ url: fallbackUrl, key: fallbackKey });
    }
  }
  // Extension fallbacks for the chosen candidate (decode-failure path)
  const primary = candidates[0];
  if (primary) {
    for (const ext of ['.ogg', '.wav']) {
      candidates.push({
        url: primary.url.replace(/\.m4a$/, ext),
        key: primary.key,
      });
    }
  }

  let loaded = false;
  for (const candidate of candidates) {
    loaded = await loadPlayerFromUrl(id, candidate.url, candidate.key, rate);
    if (loaded) break;
  }

  if (!loaded) {
    instance.error = `Sample failed to load (${tuning} ${entry.key}) — format may be unsupported in this browser`;
    console.error(`[Tanpura] ${instance.error}`);
  }

  instance.loading = false;
  notify(id);

  if ((wasPlaying || instance.startRequested) && instance.config.enabled && !instance.error) {
    startTanpura(id);
  }
}

async function loadPlayerFromUrl(
  id: string,
  url: string,
  sampleKey: string,
  baseRate: number
): Promise<boolean> {
  const instance = instances.get(id);
  if (!instance) return false;

  const channelInput = getChannelInput(id as 'tanpura1' | 'tanpura2');

  return new Promise<boolean>((resolve) => {
    // Build chain: Player -> PitchShift -> Chorus -> Tremolo -> Freeverb -> out.
    // Nodes are created first so onload can set exact tempo + pitch.
    let pitchShift: Tone.PitchShift | null = null;
    let chorus: Tone.Chorus | null = null;
    let breathing: Tone.Tremolo | null = null;
    let room: Tone.Freeverb | null = null;
    try {
      pitchShift = new Tone.PitchShift({
        pitch: 0,
        windowSize: 0.1,
        delayTime: 0,
        feedback: 0,
        wet: 1,
      });
      chorus = new Tone.Chorus({
        frequency: 0.6,
        delayTime: 14,
        depth: 0.25,
        wet: 0.18,
        spread: 180,
      }).start();
      breathing = new Tone.Tremolo({
        frequency: 0.4,
        depth: 0.08,
        wet: 1,
        spread: 180,
        type: 'sine',
      }).start();
      room = new Tone.Freeverb({
        roomSize: 0.65,
        dampening: 2800,
        wet: 0.15,
      });
    } catch (err) {
      console.error(`[Tanpura] Failed to build effect chain for ${id}:`, err);
      // Dispose whatever was constructed before the throw
      pitchShift?.dispose();
      chorus?.dispose();
      breathing?.dispose();
      room?.dispose();
      if (instance) {
        instance.error = 'Audio effects unavailable in this browser';
        notify(id);
      }
      resolve(false);
      return;
    }

    // Wire chain to mixer
    pitchShift.connect(chorus);
    chorus.connect(breathing);
    breathing.connect(room);
    room.connect(channelInput);

    const player = new Tone.Player({
      url,
      loop: true,
      fadeIn: 0.5,
      fadeOut: 0.5,
      onload: () => {
        instance.player = player;
        instance.pitchShift = pitchShift;
        instance.chorus = chorus;
        instance.breathing = breathing;
        instance.room = room;
        instance.currentSampleKey = sampleKey;
        instance.baseRate = baseRate;

        applyTempoAndPitch(instance, id);

        log(
          `[Tanpura] Loaded ${sampleKey} for ${id} ` +
          `(baseRate=${baseRate.toFixed(4)}, ` +
          `pitchShift=${pitchShift.pitch.toFixed(2)}st, tempo=${instance.config.speed.toFixed(2)}x)`
        );
        resolve(true);
      },
      onerror: (err) => {
        console.warn(`[Tanpura] Failed to load ${url}:`, err);
        player.dispose();
        pitchShift.dispose();
        chorus.dispose();
        breathing.dispose();
        room.dispose();
        resolve(false);
      },
    });
    player.connect(pitchShift);
  });
}

/**
 * Start the tanpura drone.
 * Safe to call while loading — the start intent is queued and honored
 * once the sample finishes loading (if still enabled).
 */
export function startTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance || instance.playing) return;

  // Record intent first so a start during load isn't dropped.
  instance.startRequested = true;

  if (!instance.player || instance.loading || instance.error) {
    notify(id);
    return;
  }

  try {
    // Random offset into the 20s loop so tanpura1+tanpura2 never
    // start phase-locked when they share the same sample.
    const offset = Math.random() * 5;
    instance.player.start(Tone.now(), offset);
    instance.playing = true;
    instance.error = null;

    if (Tone.getTransport().state !== 'started') {
      Tone.getTransport().start();
    }

    log(`[Tanpura] Started ${id}`);
  } catch (err) {
    console.error(`[Tanpura] Error starting ${id}:`, err);
    instance.error = 'Failed to start playback in this browser';
  }
  notify(id);
}

/**
 * Stop the tanpura drone.
 */
export function stopTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  instance.startRequested = false;

  if (instance.player?.state === 'started') {
    instance.player.stop();
  }
  instance.playing = false;

  notify(id);
  log(`[Tanpura] Stopped ${id}`);
}

/**
 * Update the tanpura configuration.
 * If tuning, EQ, or SA pitch changed, reloads the sample.
 * If only fine pitch or tempo changed, just adjusts PitchShift/tempo.
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
    // Just update tempo + pitch correction (no reload)
    const targetFreq = noteToFreq(instance.saNote, instance.saOctave, instance.saCents);
    const { rate } = findClosestSample(targetFreq);
    instance.baseRate = rate;
    applyTempoAndPitch(instance, id);
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
 * Dispose a tanpura instance and free all audio nodes.
 */
export function disposeTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  stopTanpura(id);
  disposeChain(instance);
  instances.delete(id);
  notify(id);

  log(`[Tanpura] Disposed ${id}`);
}


