/** Sample-based electronic tanpura: offline WSOLA -> native pitch resampling
 * -> chorus -> breathing -> room -> mixer. Speed and pitch are independent.
 * Recordings and attribution: SAMPLE-CREDITS.md (no acoustic source implied).
 */
import * as Tone from 'tone';
import type { NoteName, TanpuraTuning, TanpuraEQ, TanpuraConfig } from './types';
import { getChannelInput } from './mixer';
import { noteToFreq } from '@/lib/notes';
import { stretchTanpuraLoop, tanpuraPitchRate } from './tanpura-processing';

const SAMPLE_PITCHES: { key: string; saFreq: number; saNote: NoteName; saOctave: number }[] = [
  { key: 'A', saFreq: 110, saNote: 'A', saOctave: 2 },
  { key: 'C', saFreq: 130.8, saNote: 'C', saOctave: 3 },
  { key: 'D', saFreq: 146.8, saNote: 'D', saOctave: 3 },
  { key: 'E', saFreq: 164.8, saNote: 'E', saOctave: 3 },
  { key: 'Fs', saFreq: 185, saNote: 'F#', saOctave: 3 },
];

/** Per-recording gain compensation toward a common -19 LUFS target. */
export const TANPURA_SAMPLE_GAIN_DB: Record<string, number> = {
  Ma_A_neutral: -1.2, Ma_C_neutral: -0.6, Ma_D_neutral: -1.6, Ma_E_neutral: 0, Ma_Fs_neutral: -1.7,
  Ni_A_neutral: -1.1, Ni_C_neutral: 0.1, Ni_D_neutral: -0.1, Ni_E_neutral: -1.5, Ni_Fs_neutral: 2.3,
  Pa_A_neutral: -2.3, Pa_C_bass: -1.4, Pa_C_treble: 0.3, Pa_C_neutral: -1,
  Pa_D_neutral: -0.1, Pa_E_neutral: 0.5, Pa_Fs_neutral: -0.6,
};

export interface TanpuraSampleSelection {
  url: string;
  key: string;
  pitchKey: string;
  sourcePitch: NoteName;
  sourceOctave: number;
  baseRate: number;
}

export function resolveTanpuraSample(tuning: TanpuraTuning, eq: TanpuraEQ, targetFreq: number): TanpuraSampleSelection {
  const entry = SAMPLE_PITCHES.reduce((best, candidate) =>
    Math.abs(Math.log2(targetFreq / candidate.saFreq)) < Math.abs(Math.log2(targetFreq / best.saFreq)) ? candidate : best);
  const effectiveEQ = tuning === 'Pa' && entry.key === 'C' ? eq : 'neutral';
  return {
    url: `/samples/tanpura/${tuning}_${entry.key}${effectiveEQ === 'neutral' ? '' : `_${effectiveEQ}`}.m4a`,
    key: `${tuning}_${entry.key}_${effectiveEQ}`, pitchKey: entry.key,
    sourcePitch: entry.saNote, sourceOctave: entry.saOctave, baseRate: targetFreq / entry.saFreq,
  };
}

export const DEFAULT_TANPURA_CONFIG: TanpuraConfig = {
  enabled: true, tuning: 'Pa', eq: 'neutral', finePitchCents: 0, speed: 1, volume: 0.75, pan: 0,
};

interface TanpuraInstance {
  player: Tone.Player | null;
  effects: Tone.ToneAudioNode[];
  retiring: Map<Tone.Player, number>;
  source: { url: string; buffer: AudioBuffer } | null;
  request: AbortController | null;
  config: TanpuraConfig;
  saNote: NoteName;
  saOctave: number;
  saCents: number;
  targetFreq: number;
  playing: boolean;
  startRequested: boolean;
  loading: boolean;
  error: string | null;
}
const instances = new Map<string, TanpuraInstance>();
export interface TanpuraStatus { loading: boolean; playing: boolean; error: string | null }
const listeners = new Map<string, Set<(status: TanpuraStatus) => void>>();
export function getTanpuraStatus(id: string): TanpuraStatus {
  const i = instances.get(id);
  return { loading: i?.loading ?? false, playing: i?.playing ?? false, error: i?.error ?? null };
}
function notify(id: string): void {
  for (const cb of listeners.get(id) ?? []) cb(getTanpuraStatus(id));
}
export function subscribeTanpuraStatus(id: string, cb: (status: TanpuraStatus) => void): () => void {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(cb);
  return () => {
    const set = listeners.get(id);
    set?.delete(cb);
    if (!set?.size) listeners.delete(id);
  };
}

export async function createTanpura(
  id: 'tanpura1' | 'tanpura2', config: TanpuraConfig, saNote: NoteName, saOctave: number, saCents = 0,
): Promise<void> {
  disposeTanpura(id);
  instances.set(id, {
    player: null, effects: [], retiring: new Map(), source: null, request: null,
    config: { ...config }, saNote, saOctave, saCents, targetFreq: noteToFreq(saNote, saOctave, saCents),
    playing: false, startRequested: false, loading: false, error: null,
  });
  await loadSampleForInstance(id);
}

async function loadSampleForInstance(id: string): Promise<void> {
  const instance = instances.get(id);
  if (!instance) return;
  instance.request?.abort();
  const request = new AbortController();
  instance.request = request;
  const current = () => instances.get(id) === instance && instance.request === request && !request.signal.aborted;
  const { tuning, eq, finePitchCents, speed } = instance.config;
  instance.targetFreq = noteToFreq(instance.saNote, instance.saOctave, instance.saCents);
  const selection = resolveTanpuraSample(tuning, eq, instance.targetFreq);
  const pitchRate = tanpuraPitchRate(selection.baseRate, finePitchCents);
  instance.loading = true;
  instance.error = null;
  notify(id);
  let replacement: Tone.Player | null = null;
  try {
    if (!current()) return;
    let source = instance.source?.url === selection.url ? instance.source.buffer : null;
    if (!source) {
      for (const extension of ['m4a', 'ogg', 'wav']) {
        try {
          const response = await fetch(selection.url.replace(/m4a$/, extension), { signal: request.signal });
          if (!current()) return;
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.arrayBuffer();
          if (!current()) return;
          source = await Tone.getContext().decodeAudioData(data);
          break;
        } catch (error) {
          if (!current()) return;
          if (extension === 'wav') throw error;
        }
      }
      if (!current()) return;
      if (!source) throw new Error('Sample decode failed');
      instance.source = { url: selection.url, buffer: source };
    }
    const pcm = await stretchTanpuraLoop(
      Array.from({ length: source.numberOfChannels }, (_, c) => source.getChannelData(c)),
      source.sampleRate, pitchRate, speed, request.signal,
    );
    if (!current()) return;
    const buffer = Tone.getContext().createBuffer(pcm.length, pcm[0].length, source.sampleRate);
    pcm.forEach((channel, c) => buffer.getChannelData(c).set(channel));
    if (!instance.effects.length) {
      // Keep partially constructed nodes owned so failures and disposal free them.
      const chorus = new Tone.Chorus({ frequency: 0.6, delayTime: 14, depth: 0.25, wet: 0.18, spread: 180 });
      instance.effects.push(chorus);
      chorus.start();
      const breathing = new Tone.Tremolo({ frequency: 0.4, depth: 0.08, wet: 1, spread: 180, type: 'sine' });
      instance.effects.push(breathing);
      breathing.start();
      const room = new Tone.Freeverb({ roomSize: 0.65, dampening: 2800, wet: 0.15 });
      instance.effects.push(room);
      chorus.connect(breathing);
      breathing.connect(room);
      room.connect(getChannelInput(id as 'tanpura1' | 'tanpura2'));
    }
    replacement = new Tone.Player({ url: buffer, loop: true, playbackRate: pitchRate, fadeIn: 0.5, fadeOut: 0.5 });
    replacement.volume.value = TANPURA_SAMPLE_GAIN_DB[selection.key] ?? 0;
    replacement.connect(instance.effects[0]);
    const shouldPlay = instance.startRequested && instance.config.enabled;
    const now = Tone.now();
    if (shouldPlay) replacement.start(now, Math.random() * Math.min(5, buffer.duration));
    const old = instance.player;
    instance.player = replacement;
    replacement = null;
    instance.playing = shouldPlay;
    if (old) {
      old.stop(now);
      // Audio-clock retirement preserves the fade through suspension and lookahead.
      const timer = old.context.setTimeout(() => {
        old.dispose();
        instance.retiring.delete(old);
      }, 0.5 + old.context.lookAhead + 0.05);
      instance.retiring.set(old, timer);
    }
  } catch (error) {
    if (!current()) return;
    replacement?.dispose();
    if (!instance.player) {
      instance.effects.forEach(node => node.dispose());
      instance.effects = [];
    }
    instance.error = `Tanpura sample preparation failed (${selection.key}): ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    if (current()) {
      instance.loading = false;
      instance.request = null;
      notify(id);
    }
  }
}

export function startTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;
  instance.startRequested = true;
  if (instance.playing || !instance.config.enabled) return;
  if (instance.player) {
    try {
      instance.player.start(Tone.now(), Math.random() * Math.min(5, instance.player.buffer.duration));
      instance.playing = true;
    } catch {
      instance.error = 'Failed to start tanpura playback';
    }
  } else if (!instance.loading) {
    void loadSampleForInstance(id);
  }
  notify(id);
}

export function stopTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;
  instance.startRequested = false;
  // Tone.stop also cancels scheduled starts, even when state is still stopped.
  instance.player?.stop();
  instance.playing = false;
  notify(id);
}

export async function updateTanpura(
  id: 'tanpura1' | 'tanpura2', config: Partial<TanpuraConfig>, saNote?: NoteName, saOctave?: number, saCents?: number,
): Promise<void> {
  const instance = instances.get(id);
  if (!instance) return;
  const old = instance.config;
  const changed = (['tuning', 'eq', 'finePitchCents', 'speed'] as const).some(k => config[k] !== undefined && config[k] !== old[k]) ||
    (saNote !== undefined && saNote !== instance.saNote) || (saOctave !== undefined && saOctave !== instance.saOctave) ||
    (saCents !== undefined && saCents !== instance.saCents) ||
    noteToFreq(saNote ?? instance.saNote, saOctave ?? instance.saOctave, saCents ?? instance.saCents) !== instance.targetFreq;
  instance.config = { ...old, ...config };
  if (saNote !== undefined) instance.saNote = saNote;
  if (saOctave !== undefined) instance.saOctave = saOctave;
  if (saCents !== undefined) instance.saCents = saCents;
  if (!instance.config.enabled) stopTanpura(id);
  if (changed || (instance.error && !instance.loading)) await loadSampleForInstance(id);
}

export function disposeTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;
  instances.delete(id);
  instance.request?.abort();
  instance.player?.dispose();
  for (const [player, timer] of instance.retiring) { player.context.clearTimeout(timer); player.dispose(); }
  instance.effects.forEach(node => node.dispose());
  notify(id);
}
