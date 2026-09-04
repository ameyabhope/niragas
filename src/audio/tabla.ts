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
import type { TaalDefinition, Bol, SpeedRange } from './types';
import { getChannelInput } from './mixer';
import { loadTablaSampler, getBolSamplerNote } from './sample-loader';
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

  // Light tap
  'Ti': 'tap',
  'Tu': 'tap',
  'Te': 'tap',
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

  const trebleSynth = createTrebleSynth();
  trebleSynth.connect(channelInput);

  const bassSynth = createBassSynth();
  bassSynth.connect(channelInput);

  const noiseSynth = createNoiseSynth();
  // Reduce noise volume relative to membrane synths
  const noiseGain = new Tone.Gain(0.3).connect(channelInput);
  noiseSynth.connect(noiseGain);

  // Try loading samples
  const sampler = await loadTablaSampler(channelInput);

  instance = {
    trebleSynth,
    bassSynth,
    noiseSynth,
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
      instance.sampler.triggerAttackRelease(note, '4n', time, velocity);
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
 * Get the appropriate speed range key for the current tempo.
 */
function getSpeedRangeKey(taal: TaalDefinition, bpm: number): SpeedRange {
  const bp = taal.speedBreakpoints;
  if (bp.atiVilambit && bpm < bp.atiVilambit) return 'ati-vilambit';
  if (bpm < bp.vilambit) return 'vilambit';
  if (bpm < bp.madhya) return 'madhya';
  if (bpm < bp.drut) return 'drut';
  if (bp.atiDrut && bpm >= bp.atiDrut) return 'ati-drut';
  return 'drut';
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

  const eventId = Tone.getTransport().scheduleRepeat(
    (time) => {
      const taal = instance?.taal;
      if (!instance || !taal) return;

      const style = taal.styles.find((s) => s.id === instance!.styleId) ?? taal.styles[0];
      if (!style) return;

      const bpm = Tone.getTransport().bpm.value;
      const speedRange = getSpeedRangeKey(taal, bpm);

      // Find the best matching theka: exact speed match, or fall back to 'madhya'
      const theka = style.thekas[speedRange] ?? style.thekas['madhya'];
      if (!theka) return;

      const secondsPerBeat = 60 / bpm;
      const beat = instance.nextBeat;

      // Build a division lookup: matra → division label
      const divisionMap = new Map<number, string>();
      for (const div of taal.divisions) {
        divisionMap.set(div.matra, div.label);
      }

      // Play bols in this beat's window, preserving fractional offsets
      for (const bol of theka) {
        if (bol.position < beat || bol.position >= beat + 1) continue;

        const bolTime = time + (bol.position - beat) * secondsPerBeat;
        triggerBol(bol, bolTime);

        // Fire beat callback for UI (whole-number matra positions only)
        if (instance.onBeat && Number.isInteger(bol.position)) {
          const label = divisionMap.get(bol.position) ?? null;
          const position = bol.position;
          // Use Tone.Draw to sync with animation frame
          Tone.getDraw().schedule(() => {
            instance?.onBeat?.(position, label);
          }, bolTime);
        }
      }

      instance.nextBeat = (beat % taal.matras) + 1;
    },
    '4n' // one beat — follows Transport BPM smoothly
  );

  instance.scheduledEvents.push(eventId);

  log(`[Tabla] Scheduled step sequencer for ${instance.taal.name}`);
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
  instance.sampler?.dispose();
  instance = null;

  log('[Tabla] Disposed');
}


