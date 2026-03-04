/**
 * Tabla engine.
 *
 * Schedules bol (syllable) playback according to the selected taal and tempo.
 * Uses synthesized percussion sounds as placeholders until real samples are loaded.
 *
 * Sound design approach:
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
  /** Scheduled event IDs for cleanup */
  scheduledEvents: number[];
  /** Currently loaded taal */
  taal: TaalDefinition | null;
  /** Currently selected style ID */
  styleId: string;
  /** Whether tabla is playing */
  playing: boolean;
  /** Current matra (1-indexed, updated during playback) */
  currentMatra: number;
  /** Callback fired on each beat for UI updates */
  onBeat: ((matra: number, divisionLabel: string | null) => void) | null;
}

let instance: TablaInstance | null = null;

/**
 * Create and connect the tabla audio chain.
 */
export function createTabla(): void {
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

  instance = {
    trebleSynth,
    bassSynth,
    noiseSynth,
    scheduledEvents: [],
    taal: null,
    styleId: '',
    playing: false,
    currentMatra: 1,
    onBeat: null,
  };

  console.log('[Tabla] Created');
}

/**
 * Set the beat callback for UI updates.
 */
export function setTablaBeatCallback(
  cb: (matra: number, divisionLabel: string | null) => void
): void {
  if (instance) instance.onBeat = cb;
}

/**
 * Trigger a single bol sound at the given time.
 */
function triggerBol(bol: Bol, time: number): void {
  if (!instance) return;

  const category = BOL_CATEGORIES[bol.name] ?? 'tap';
  const velocity = bol.velocity ?? 0.7;

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
 * Schedule all bols for one full cycle of the current taal.
 * Uses Tone.Transport.scheduleRepeat for continuous looping.
 */
function scheduleThekaLoop(): void {
  if (!instance || !instance.taal) return;

  // Clear any previously scheduled events
  clearScheduledEvents();

  const taal = instance.taal;
  const style = taal.styles.find((s) => s.id === instance!.styleId) ?? taal.styles[0];
  if (!style) return;

  const bpm = Tone.getTransport().bpm.value;
  const speedRange = getSpeedRangeKey(taal, bpm);

  // Find the best matching theka: exact speed match, or fall back to 'madhya'
  const theka = style.thekas[speedRange] ?? style.thekas['madhya'];
  if (!theka) return;

  // Duration of one full taal cycle in seconds
  const secondsPerBeat = 60 / bpm;
  const cycleDuration = taal.matras * secondsPerBeat;

  // Build a division lookup: matra → division label
  const divisionMap = new Map<number, string>();
  for (const div of taal.divisions) {
    divisionMap.set(div.matra, div.label);
  }

  // Schedule a repeating callback for each bol
  for (const bol of theka) {
    // Position is 1-indexed, convert to 0-indexed offset
    const offsetSeconds = (bol.position - 1) * secondsPerBeat;

    const eventId = Tone.getTransport().scheduleRepeat(
      (time) => {
        triggerBol(bol, time);

        // Fire beat callback for UI (use whole-number matra positions only)
        if (instance?.onBeat && Number.isInteger(bol.position)) {
          const label = divisionMap.get(bol.position) ?? null;
          // Use Tone.Draw to sync with animation frame
          Tone.getDraw().schedule(() => {
            instance?.onBeat?.(bol.position, label);
          }, time);
        }
      },
      cycleDuration, // repeat interval = one full taal cycle
      offsetSeconds   // start offset within the cycle
    );

    instance.scheduledEvents.push(eventId);
  }

  console.log(
    `[Tabla] Scheduled ${theka.length} bols for ${taal.name} (${style.name}), ` +
    `${speedRange}, cycle=${cycleDuration.toFixed(2)}s`
  );
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

  if (wasPlaying) startTabla();

  console.log(`[Tabla] Loaded taal: ${taal.name}, style: ${instance.styleId}`);
}

/**
 * Set the tabla tempo (BPM).
 */
export function setTablaTempo(bpm: number): void {
  if (!instance?.taal) return;

  const clampedBpm = Math.max(
    instance.taal.tempoRange.min,
    Math.min(instance.taal.tempoRange.max, bpm)
  );

  Tone.getTransport().bpm.value = clampedBpm;

  // Re-schedule if playing (tempo change affects cycle duration)
  if (instance.playing) {
    scheduleThekaLoop();
  }
}

/**
 * Get the current tempo.
 */
export function getTablaTempo(): number {
  return Tone.getTransport().bpm.value;
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

  console.log(`[Tabla] Started: ${instance.taal.name} at ${Tone.getTransport().bpm.value} BPM`);
}

/**
 * Stop the tabla.
 */
export function stopTabla(): void {
  if (!instance) return;

  clearScheduledEvents();
  instance.playing = false;
  instance.currentMatra = 1;

  console.log('[Tabla] Stopped');
}

/**
 * Check if tabla is playing.
 */
export function isTablaPlaying(): boolean {
  return instance?.playing ?? false;
}

/**
 * Get the currently loaded taal.
 */
export function getCurrentTaal(): TaalDefinition | null {
  return instance?.taal ?? null;
}

/**
 * Get the current style ID.
 */
export function getCurrentStyleId(): string {
  return instance?.styleId ?? '';
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
  instance = null;

  console.log('[Tabla] Disposed');
}
