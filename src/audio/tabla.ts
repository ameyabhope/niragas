/**
 * Tabla engine.
 *
 * Schedules bol (syllable) playback according to the selected taal and tempo.
 *
 * Dual-mode playback:
 * 1. Sample-based: Uses real tabla recordings via Tone.Sampler (preferred)
 * 2. Synthesized: Falls back to MembraneSynth + NoiseSynth when samples unavailable
 *
 * Sound design (synthesis fallback):
 * - Each bol type maps to a combination of oscillator/noise bursts
 * - "Dha" / "Dhin" = bass (baya) + treble (daya) together
 * - "Na" / "Ta" / "Tin" = treble only
 * - "Ge" / "Ke" = bass only
 * - "Ti" / "Tu" = light treble tap
 *
 * All scheduling uses Tone.Transport for sample-accurate timing.
 */

import * as Tone from 'tone';
import type { TaalDefinition, Bol } from './types';
import { getChannelInput } from './mixer';
import { loadTablaSampler, getBolGain, getBolSamplerNote } from './sample-loader';
import { noteToFreq } from '@/lib/notes';
import type { NoteName } from './types';
import { getSpeedRange, getThekaForSpeed } from '@/lib/taal';
import { log } from './log';

// ── Bol Synth Definitions ──────────────────────────────────────────────────

/** Treble synth (daya - right drum) */
function createTrebleSynth(): Tone.MembraneSynth {
  return new Tone.MembraneSynth({
    pitchDecay: 0.008,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.25,
      sustain: 0,
      release: 0.3,
    },
  });
}

/** Bass synth (baya - left drum) */
function createBassSynth(): Tone.MembraneSynth {
  return new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.4,
      sustain: 0,
      release: 0.5,
    },
  });
}

/** Noise burst for "Na" / "Ta" type sounds (open treble) */
function createNoiseSynth(): Tone.NoiseSynth {
  return new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: {
      attack: 0.001,
      decay: 0.12,
      sustain: 0,
      release: 0.05,
    },
  });
}

// ── Bol → Sound Mapping ────────────────────────────────────────────────────

type BolCategory = 'bass+treble' | 'treble' | 'bass' | 'tap';

const BOL_CATEGORIES: Record<string, BolCategory> = {
  // Bass + Treble (both drums)
  'Dha': 'bass+treble',
  'Dhin': 'bass+treble',
  'Dhi': 'bass+treble',
  'Di': 'bass+treble',

  // Treble only (daya)
  'Na': 'treble',
  'Ta': 'treble',
  'Tin': 'treble',
  'Tun': 'treble',

  // Bass only (baya)
  'Ge': 'bass',
  'Ghe': 'bass',
  'Ke': 'bass',
  'Ka': 'bass',
  'Ga': 'bass',
  'Gad': 'bass',
  'Ghen': 'bass',
  'Ghir': 'bass',
  'Ki': 'bass',

  // Light tap
  'Ti': 'tap',
  'Tu': 'tap',
  'Te': 'tap',
  'Kt': 'tap',
  'Tit': 'tap',
};

/** Treble pitch varies slightly by bol for tonal differentiation */
const BOL_TREBLE_PITCH: Record<string, string> = {
  'Dha': 'C4',
  'Dhin': 'D4',
  'Dhi': 'D4',
  'Na': 'E4',
  'Ta': 'F4',
  'Tin': 'F#4',
  'Tun': 'G4',
  'Ti': 'A4',
  'Tu': 'G4',
  'Te': 'A4',
};

const BOL_BASS_PITCH: Record<string, string> = {
  'Dha': 'C2',
  'Dhin': 'C2',
  'Dhi': 'C2',
  'Ge': 'D2',
  'Ghe': 'C#2',
  'Ke': 'E2',
  'Ka': 'E2',
};

// ── Tabla Instance ─────────────────────────────────────────────────────────

interface TablaInstance {
  trebleSynth: Tone.MembraneSynth;
  bassSynth: Tone.MembraneSynth;
  noiseSynth: Tone.NoiseSynth;
  noiseGain: Tone.Gain;
  pitchShift: Tone.PitchShift;
  /** Sample-based player (null if samples not available) */
  sampler: Tone.Sampler | null;
  /** Whether to use sampler or synth */
  useSamples: boolean;
  /** Scheduled event IDs for cleanup */
  scheduledEvents: number[];
  /** Currently loaded taal */
  taal: TaalDefinition | null;
  /** Currently selected style ID */
  styleId: string;
  /** Whether tabla is playing */
  playing: boolean;
  /** Next 1-indexed beat the step sequencer will play (wraps per cycle) */
  nextBeat: number;
  /** Current matra (1-indexed, updated during playback) */
  currentMatra: number;
  /** Callback fired on each beat for UI updates */
  onBeat: ((matra: number, divisionLabel: string | null) => void) | null;
}

let instance: TablaInstance | null = null;
const TABLA_REFERENCE_FREQ = 440 * Math.pow(2, (49 - 69) / 12); // C#3 at A4=440

/**
 * Pending beat callback — stored here so it survives the async gap
 * between setTablaBeatCallback() and createTabla() resolving.
 */
let pendingOnBeat: ((matra: number, divisionLabel: string | null) => void) | null = null;

/**
 * Create and connect the tabla audio chain.
 * Attempts to load samples first; falls back to synthesis if unavailable.
 */
export async function createTabla(): Promise<void> {
  disposeTabla();

  const channelInput = getChannelInput('tabla');
  const pitchShift = new Tone.PitchShift({
    pitch: 0,
    windowSize: 0.04,
    delayTime: 0,
    feedback: 0,
    wet: 0,
  }).connect(channelInput);

  const trebleSynth = createTrebleSynth();
  trebleSynth.connect(pitchShift);

  const bassSynth = createBassSynth();
  bassSynth.connect(pitchShift);

  const noiseSynth = createNoiseSynth();
  // Reduce noise volume relative to membrane synths
  const noiseGain = new Tone.Gain(0.3).connect(pitchShift);
  noiseSynth.connect(noiseGain);

  // Try loading samples
  const sampler = await loadTablaSampler(pitchShift);

  instance = {
    trebleSynth,
    bassSynth,
    noiseSynth,
    noiseGain,
    pitchShift,
    sampler,
    useSamples: sampler !== null,
    scheduledEvents: [],
    taal: null,
    styleId: '',
    playing: false,
    nextBeat: 1,
    currentMatra: 1,
    onBeat: pendingOnBeat,
  };

  log(`[Tabla] Created (${sampler ? 'sample-based' : 'synthesis'})`);
}

/**
 * Set the beat callback for UI updates.
 * Stores the callback even if the instance doesn't exist yet (race-safe).
 */
export function setTablaBeatCallback(
  cb: (matra: number, divisionLabel: string | null) => void
): void {
  pendingOnBeat = cb;
  if (instance) instance.onBeat = cb;
}

/**
 * Trigger a single bol sound at the given time.
 * Uses sampler if available, otherwise falls back to synthesis.
 */
function triggerBol(bol: Bol, time: number): void {
  if (!instance) return;

  const velocity = bol.velocity ?? 0.7;

  // ── Sample-based playback ──
  if (instance.useSamples && instance.sampler) {
    const note = getBolSamplerNote(bol.name);
    if (note) {
      const level = Math.min(1, velocity * getBolGain(bol.name) * (0.97 + Math.random() * 0.06));
      // Let each one-shot sample play to its natural end. Musical note lengths
      // made resonance shrink as BPM increased.
      instance.sampler.triggerAttack(note, time, level);
      return;
    }
    // If this specific bol has no sample, fall through to synthesis
  }

  // ── Synthesis fallback ──
  const category = BOL_CATEGORIES[bol.name] ?? 'tap';

  switch (category) {
    case 'bass+treble': {
      const treblePitch = BOL_TREBLE_PITCH[bol.name] ?? 'C4';
      const bassPitch = BOL_BASS_PITCH[bol.name] ?? 'C2';
      instance.trebleSynth.triggerAttackRelease(treblePitch, '16n', time, velocity);
      instance.bassSynth.triggerAttackRelease(bassPitch, '8n', time, velocity * 0.8);
      break;
    }
    case 'treble': {
      const treblePitch = BOL_TREBLE_PITCH[bol.name] ?? 'E4';
      instance.trebleSynth.triggerAttackRelease(treblePitch, '16n', time, velocity);
      // Add a touch of noise for "Na" / "Ta" open sound
      if (bol.name === 'Na' || bol.name === 'Ta') {
        instance.noiseSynth.triggerAttackRelease('32n', time, velocity * 0.5);
      }
      break;
    }
    case 'bass': {
      const bassPitch = BOL_BASS_PITCH[bol.name] ?? 'D2';
      instance.bassSynth.triggerAttackRelease(bassPitch, '8n', time, velocity * 0.8);
      break;
    }
    case 'tap': {
      const treblePitch = BOL_TREBLE_PITCH[bol.name] ?? 'A4';
      instance.trebleSynth.triggerAttackRelease(treblePitch, '32n', time, velocity * 0.5);
      break;
    }
  }
}

/**
 * Schedule the theka as a step sequencer: one Transport repeat per beat.
 * Each firing plays the bols falling in the next beat window, reading the
 * live BPM for intra-beat offsets — so tempo changes glide without ever
 * re-scheduling (no jump back to sam). Taal/style/theka are also resolved
 * live, so style and speed-range switches apply on the next beat.
 */
function scheduleThekaLoop(): void {
  if (!instance || !instance.taal) return;

  // Clear any previously scheduled events
  clearScheduledEvents();

  const transport = Tone.getTransport();
  const eventId = transport.scheduleRepeat(
    (time) => {
      const taal = instance?.taal;
      if (!instance || !taal) return;

      const style = taal.styles.find((s) => s.id === instance!.styleId) ?? taal.styles[0];
      if (!style) return;

      const bpm = Tone.getTransport().bpm.value;
      const speedRange = getSpeedRange(taal, bpm);

      const theka = getThekaForSpeed(style, speedRange);
      if (!theka) return;

      const secondsPerBeat = 60 / bpm;
      const beat = instance.nextBeat;

      // Build a division lookup: matra → division label
      const divisionMap = new Map<number, string>();
      for (const div of taal.divisions) {
        divisionMap.set(div.matra, div.label);
      }

      instance.currentMatra = beat;
      if (instance.onBeat) {
        const label = divisionMap.get(beat) ?? null;
        Tone.getDraw().schedule(() => {
          instance?.onBeat?.(beat, label);
        }, time);
      }

      // Play bols in this beat's window, preserving fractional offsets
      for (const bol of theka) {
        if (bol.position < beat || bol.position >= beat + 1) continue;

        const bolTime = time + (bol.position - beat) * secondsPerBeat;
        triggerBol(bol, bolTime);

      }

      instance.nextBeat = (beat % taal.matras) + 1;
    },
    '4n', // one beat — follows Transport BPM smoothly
    transport.seconds + 0.05
  );

  instance.scheduledEvents.push(eventId);

  log(`[Tabla] Scheduled step sequencer for ${instance.taal.name}`);
}

/** Tune tonal tabla strokes to the shared Sa reference. */
export function setTablaPitch(note: NoteName, octave: number, cents = 0): void {
  if (!instance) return;
  const target = noteToFreq(note, octave, cents);
  const semitones = 12 * Math.log2(target / TABLA_REFERENCE_FREQ);
  instance.pitchShift.pitch = semitones;
  instance.pitchShift.wet.rampTo(Math.abs(semitones) < 0.01 ? 0 : 1, 0.02);
}

/**
 * Clear all scheduled transport events.
 */
function clearScheduledEvents(): void {
  if (!instance) return;
  for (const id of instance.scheduledEvents) {
    Tone.getTransport().clear(id);
  }
  instance.scheduledEvents = [];
}

/**
 * Load a taal and style into the tabla engine.
 */
export function loadTaal(taal: TaalDefinition, styleId?: string): void {
  if (!instance) return;

  const wasPlaying = instance.playing;
  if (wasPlaying) stopTabla();

  instance.taal = taal;
  instance.styleId = styleId ?? taal.styles[0]?.id ?? '';
  instance.currentMatra = 1;
  instance.nextBeat = 1;

  if (wasPlaying) startTabla();

  log(`[Tabla] Loaded taal: ${taal.name}, style: ${instance.styleId}`);
}

/**
 * Set the tabla tempo (BPM).
 * Ramps the Transport clock — the step sequencer follows it live,
 * so tempo glides mid-cycle with no restart and no jump to sam.
 */
export function setTablaTempo(bpm: number): void {
  if (!instance?.taal) return;

  const clampedBpm = Math.max(
    instance.taal.tempoRange.min,
    Math.min(instance.taal.tempoRange.max, bpm)
  );

  try {
    Tone.getTransport().bpm.rampTo(clampedBpm, 0.3);
  } catch {
    Tone.getTransport().bpm.value = clampedBpm;
  }
}

/**
 * Start the tabla.
 */
export function startTabla(): void {
  if (!instance || instance.playing || !instance.taal) return;

  scheduleThekaLoop();

  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  instance.playing = true;
  instance.currentMatra = 1;
  instance.nextBeat = 1;

  log(`[Tabla] Started: ${instance.taal.name} at ${Tone.getTransport().bpm.value} BPM`);
}

/**
 * Stop the tabla.
 */
export function stopTabla(): void {
  if (!instance) return;

  clearScheduledEvents();
  instance.playing = false;
  instance.currentMatra = 1;
  instance.nextBeat = 1;

  log('[Tabla] Stopped');
}

/**
 * Check if tabla is playing.
 */
export function isTablaPlaying(): boolean {
  return instance?.playing ?? false;
}

/**
 * Dispose the tabla engine.
 */
export function disposeTabla(): void {
  if (!instance) return;

  stopTabla();
  instance.trebleSynth.dispose();
  instance.bassSynth.dispose();
  instance.noiseSynth.dispose();
  instance.noiseGain.dispose();
  instance.pitchShift.dispose();
  instance.sampler?.dispose();
  instance = null;

  log('[Tabla] Disposed');
}
