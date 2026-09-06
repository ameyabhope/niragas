/**
 * Tabla engine.
 *
 * Schedules bol (syllable) playback according to the selected taal and tempo.
 *
 * Dual-mode playback:
 * 1. Sample-based: Uses rate-tuned, cancellable tabla one-shots (preferred)
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
import { loadTablaSampler, getBolGain, getBolSamplerNote, getBolPlaybackRate, BOL_SAMPLE_ALIASES } from './sample-loader';
import type { TablaSamplePlayer } from './sample-loader';
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

type BolCategory = 'treble' | 'bass' | 'tap';

const BOL_CATEGORIES: Record<string, BolCategory> = {
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

/** Closed taps have no sustained Sa resonance in the synthesis fallback. */
const BOL_TREBLE_PITCH: Record<string, string> = {
  'Ti': 'A4',
  'Tu': 'G4',
  'Te': 'A4',
};

const BOL_BASS_PITCH: Record<string, string> = {
  'Ge': 'D2',
  'Ghe': 'C#2',
  'Ke': 'E2',
  'Ka': 'E2',
};

// ── Tabla Instance ─────────────────────────────────────────────────────────

type TablaBeatCallback = (matra: number, divisionLabel: string | null, taalId: string, styleId: string) => void;

interface TablaInstance {
  trebleSynth: Tone.MembraneSynth;
  bassSynth: Tone.MembraneSynth;
  noiseSynth: Tone.NoiseSynth;
  noiseGain: Tone.Gain;
  output: Tone.Gain;
  targetHz: number;
  /** Sample-based player (null if samples not available) */
  sampler: TablaSamplePlayer | null;
  /** Whether to use sampler or synth */
  useSamples: boolean;
  /** Scheduled event IDs for cleanup */
  scheduledEvents: Set<number>;
  generation: number;
  pendingTaal: { taal: TaalDefinition; styleId: string } | null;
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
  onBeat: TablaBeatCallback | null;
}

let instance: TablaInstance | null = null;
let creationGeneration = 0;

/**
 * Pending beat callback — stored here so it survives the async gap
 * between setTablaBeatCallback() and createTabla() resolving.
 */
let pendingOnBeat: TablaBeatCallback | null = null;

/**
 * Create and connect the tabla audio chain.
 * Attempts to load samples first; falls back to synthesis if unavailable.
 */
export async function createTabla(): Promise<void> {
  disposeTabla();
  const generation = ++creationGeneration;

  const channelInput = getChannelInput('tabla');
  const output = new Tone.Gain(0).connect(channelInput);

  const trebleSynth = createTrebleSynth();
  trebleSynth.connect(output);

  const bassSynth = createBassSynth();
  bassSynth.connect(output);

  const noiseSynth = createNoiseSynth();
  // Reduce noise volume relative to membrane synths
  const noiseGain = new Tone.Gain(0.3).connect(output);
  noiseSynth.connect(noiseGain);

  // Try loading samples
  const sampler = await loadTablaSampler(output);
  if (generation !== creationGeneration) {
    sampler?.dispose();
    trebleSynth.dispose();
    bassSynth.dispose();
    noiseSynth.dispose();
    noiseGain.dispose();
    output.dispose();
    return;
  }

  instance = {
    trebleSynth,
    bassSynth,
    noiseSynth,
    noiseGain,
    output,
    targetHz: noteToFreq('C#', 3),
    sampler,
    useSamples: sampler !== null,
    scheduledEvents: new Set(),
    generation: 0,
    pendingTaal: null,
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
  cb: TablaBeatCallback
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

  const name = BOL_SAMPLE_ALIASES[bol.name] ?? bol.name;
  if (name === 'Dha' || name === 'Dhin' || name === 'Dhi') {
    triggerBol({ ...bol, name: 'Ge' }, time);
    triggerBol({ ...bol, name: name === 'Dha' ? 'Na' : 'Tin' }, time);
    return;
  }
  bol = { ...bol, name };

  const velocity = bol.velocity ?? 0.7;

  // ── Sample-based playback ──
  if (instance.useSamples && instance.sampler) {
    const note = getBolSamplerNote(bol.name);
    if (note) {
      const level = Math.min(1, velocity * getBolGain(bol.name) * (0.97 + Math.random() * 0.06));
      // Let each one-shot sample play to its natural end. Musical note lengths
      // made resonance shrink as BPM increased.
      instance.sampler.triggerAttack(note, time, level, getBolPlaybackRate(name, instance.targetHz));
      return;
    }
    // If this specific bol has no sample, fall through to synthesis
  }

  // ── Synthesis fallback ──
  const category = BOL_CATEGORIES[bol.name] ?? 'tap';

  switch (category) {
    case 'treble': {
      const treblePitch = instance.targetHz;
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
 * Subdivisions remain transport ticks until their callbacks fire, rather than
 * being submitted a whole beat ahead as fixed Web Audio seconds.
 * Style/speed switches apply on the next beat; taal switches at the next sam.
 */
function scheduleThekaLoop(): void {
  if (!instance || !instance.taal) return;

  // Clear any previously scheduled events
  clearScheduledEvents();

  const transport = Tone.getTransport();
  const owner = instance;
  const generation = owner.generation;
  const eventId = transport.scheduleRepeat(
    (time) => {
      if (instance !== owner || !owner.playing || owner.generation !== generation) return;
      if (owner.nextBeat === 1 && owner.pendingTaal) {
        owner.taal = owner.pendingTaal.taal;
        owner.styleId = owner.pendingTaal.styleId;
        owner.pendingTaal = null;
      }
      const taal = owner.taal;
      if (!taal) return;

      const style = taal.styles.find((s) => s.id === instance!.styleId) ?? taal.styles[0];
      if (!style) return;

      const bpm = Tone.getTransport().bpm.value;
      const speedRange = getSpeedRange(taal, bpm);

      const theka = getThekaForSpeed(style, speedRange);
      if (!theka) return;

      const beat = instance.nextBeat;
      const beatTicks = transport.getTicksAtTime(time);

      // Build a division lookup: matra → division label
      const divisionMap = new Map<number, string>();
      for (const div of taal.divisions) {
        divisionMap.set(div.matra, div.label);
      }

      instance.currentMatra = beat;
      if (instance.onBeat) {
        const label = divisionMap.get(beat) ?? null;
        Tone.getDraw().schedule(() => {
          if (instance === owner && owner.playing && owner.generation === generation) {
            // Capture the scheduled pattern, not the mutable lookahead state.
            owner.onBeat?.(beat, label, taal.id, style.id);
          }
        }, time);
      }

      // Play bols in this beat's window, preserving fractional offsets
      for (const bol of expandTablaBols(theka)) {
        if (bol.position < beat || bol.position >= beat + 1) continue;

        if (bol.position === beat) triggerBol(bol, time);
        else {
          const id = transport.scheduleOnce((attackTime) => {
            owner.scheduledEvents.delete(id);
            if (instance === owner && owner.playing && owner.generation === generation) {
              triggerBol(bol, attackTime);
            }
          }, `${Math.round(beatTicks + (bol.position - beat) * transport.PPQ)}i`);
          owner.scheduledEvents.add(id);
        }
      }

      instance.nextBeat = (beat % taal.matras) + 1;
    },
    '4n', // one beat — follows Transport BPM smoothly
    `${Math.ceil(transport.ticks + transport.PPQ * 0.1)}i`
  );

  instance.scheduledEvents.add(eventId);

  log(`[Tabla] Scheduled step sequencer for ${instance.taal.name}`);
}

/** Fit Ti/Re/Ka/Ta into the remaining beat (or the next bol, if earlier).
 * Re uses the existing closed Te stroke; no dedicated Re recording is shipped.
 */
export function expandTablaBols(theka: Bol[]): Bol[] {
  return theka.flatMap((bol) => {
    if (bol.name !== 'Trkt') return [bol];
    const end = Math.min(Math.floor(bol.position) + 1,
      ...theka.filter((next) => next.position > bol.position).map((next) => next.position));
    return ['Ti', 'Re', 'Ka', 'Ta'].map((name, index) => ({
      ...bol, name, position: bol.position + index * (end - bol.position) / 4,
    }));
  });
}

/** Tune tonal tabla strokes to the shared Sa reference. */
export function setTablaPitch(note: NoteName, octave: number, cents = 0): void {
  if (!instance) return;
  instance.targetHz = noteToFreq(note, octave, cents);
}

/**
 * Clear all scheduled transport events.
 */
function clearScheduledEvents(): void {
  if (!instance) return;
  for (const id of instance.scheduledEvents) {
    Tone.getTransport().clear(id);
  }
  instance.scheduledEvents.clear();
  instance.generation++;
}

/**
 * Load a taal and style into the tabla engine.
 */
export function loadTaal(taal: TaalDefinition, styleId?: string): void {
  if (!instance) return;

  const selectedStyle = styleId ?? taal.styles[0]?.id ?? '';
  if (instance.playing) {
    if (instance.taal?.id === taal.id) {
      instance.styleId = selectedStyle;
      instance.pendingTaal = null;
    } else {
      instance.pendingTaal = { taal, styleId: selectedStyle };
    }
    return;
  }

  instance.taal = taal;
  instance.styleId = selectedStyle;
  instance.pendingTaal = null;
  instance.currentMatra = 1;
  instance.nextBeat = 1;

  log(`[Tabla] Loaded taal: ${taal.name}, style: ${instance.styleId}`);
}

/**
 * Set the tabla tempo (BPM).
 * Ramps the Transport clock — the step sequencer follows it live,
 * so tempo glides mid-cycle with no restart and no jump to sam.
 */
export function setTablaTempo(bpm: number): void {
  if (!instance?.taal) return;

  if (!Number.isFinite(bpm)) return;
  const selectedTaal = instance.pendingTaal?.taal ?? instance.taal;
  const clampedBpm = Math.max(
    selectedTaal.tempoRange.min,
    Math.min(selectedTaal.tempoRange.max, bpm)
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

  instance.playing = true;
  instance.output.gain.setValueAtTime(1, Tone.immediate());
  scheduleThekaLoop();

  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  instance.currentMatra = 1;
  instance.nextBeat = 1;

  log(`[Tabla] Started: ${instance.taal.name} at ${Tone.getTransport().bpm.value} BPM`);
}

/**
 * Stop the tabla.
 */
export function stopTabla(): void {
  if (!instance || !instance.playing) return;

  clearScheduledEvents();
  instance.sampler?.stopAll();
  // Also discard synth envelopes already submitted inside Transport lookahead.
  instance.output.gain.cancelScheduledValues(Tone.immediate());
  instance.output.gain.setValueAtTime(0, Tone.immediate());
  instance.trebleSynth.dispose();
  instance.bassSynth.dispose();
  instance.noiseSynth.dispose();
  instance.trebleSynth = createTrebleSynth().connect(instance.output);
  instance.bassSynth = createBassSynth().connect(instance.output);
  instance.noiseSynth = createNoiseSynth().connect(instance.noiseGain);
  if (instance.pendingTaal) {
    instance.taal = instance.pendingTaal.taal;
    instance.styleId = instance.pendingTaal.styleId;
    instance.pendingTaal = null;
  }
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
  creationGeneration++;
  if (!instance) return;

  stopTabla();
  instance.trebleSynth.dispose();
  instance.bassSynth.dispose();
  instance.noiseSynth.dispose();
  instance.noiseGain.dispose();
  instance.output.dispose();
  instance.sampler?.dispose();
  instance = null;

  log('[Tabla] Disposed');
}
