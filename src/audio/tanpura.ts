/**
 * Tanpura engine.
 *
 * Uses Tone.js to simulate a 5-string tanpura with cyclic plucking.
 * Currently uses synthesized tones as placeholders until real samples are provided.
 *
 * When real samples are available:
 * - Replace the Tone.Synth with Tone.Sampler
 * - Load multi-pitched WAV/OGG samples
 * - Tone.Sampler handles pitch interpolation automatically
 *
 * Architecture:
 *   Each tanpura instance has:
 *   - A synth (or sampler) for sound generation
 *   - A Tone.Loop that cycles through the 5 strings
 *   - Connection to the mixer channel
 */

import * as Tone from 'tone';
import type { TanpuraConfig, NoteName } from './types';
import { swarToToneNote } from '@/lib/notes';
import { getChannelInput } from './mixer';

interface TanpuraInstance {
  /** Synth used for placeholder sounds. Will be replaced by Tone.Sampler. */
  synth: Tone.PolySynth;
  /** Loop that triggers string plucks in sequence */
  loop: Tone.Loop | null;
  /** Current string index in the plucking sequence */
  currentStringIndex: number;
  /** Whether this instance is actively playing */
  playing: boolean;
  /** The current configuration */
  config: TanpuraConfig;
  /** Current Sa reference for note calculations */
  saNote: NoteName;
  saOctave: number;
}

const instances: Map<string, TanpuraInstance> = new Map();

/**
 * Create a placeholder synth that approximates a tanpura sound.
 * Uses FM synthesis with a long release for a drone-like quality.
 *
 * TODO: Replace with Tone.Sampler when real samples are available.
 */
function createTanpuraSynth(): Tone.PolySynth {
  const synth = new Tone.PolySynth(Tone.FMSynth);
  synth.maxPolyphony = 6;
  synth.set({
    harmonicity: 3,
    modulationIndex: 10,
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.3,
      decay: 0.5,
      sustain: 0.6,
      release: 3.0,
    },
    modulation: {
      type: 'triangle',
    },
    modulationEnvelope: {
      attack: 0.5,
      decay: 0.3,
      sustain: 0.4,
      release: 2.0,
    },
  });
  return synth;
}

/**
 * Initialize a tanpura instance and connect it to the mixer.
 */
export function createTanpura(
  id: 'tanpura1' | 'tanpura2',
  config: TanpuraConfig,
  saNote: NoteName,
  saOctave: number
): void {
  // Dispose existing instance if any
  disposeTanpura(id);

  const synth = createTanpuraSynth();
  const channelInput = getChannelInput(id);
  synth.connect(channelInput);

  const instance: TanpuraInstance = {
    synth,
    loop: null,
    currentStringIndex: 0,
    playing: false,
    config: { ...config },
    saNote,
    saOctave,
  };

  instances.set(id, instance);
  console.log(`[Tanpura] Created ${id}`);
}

/**
 * Start the tanpura plucking loop.
 */
export function startTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance || instance.playing) return;

  const enabledStrings = instance.config.strings.filter((s) => s.enabled);
  if (enabledStrings.length === 0) return;

  // Time between each string pluck
  const pluckInterval = instance.config.cycleSpeed / enabledStrings.length;

  instance.currentStringIndex = 0;

  instance.loop = new Tone.Loop((time) => {
    const stringConfig = enabledStrings[instance.currentStringIndex];
    if (!stringConfig) return;

    // Calculate the note for this string
    const toneNote = swarToToneNote(
      instance.saNote,
      instance.saOctave,
      stringConfig.note,
      stringConfig.variant,
      stringConfig.octaveOffset
    );

    // Trigger the note with a natural-sounding duration
    const noteDuration = Math.min(pluckInterval * 1.5, 3);
    instance.synth.triggerAttackRelease(toneNote, noteDuration, time);

    // Advance to next string
    instance.currentStringIndex =
      (instance.currentStringIndex + 1) % enabledStrings.length;
  }, pluckInterval);

  instance.loop.start(0);
  instance.playing = true;

  // Start the Tone.js transport if not already running
  // (Tanpura uses its own loop timing, not the transport BPM)
  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  console.log(`[Tanpura] Started ${id}: ${enabledStrings.length} strings, ${pluckInterval.toFixed(2)}s interval`);
}

/**
 * Stop the tanpura plucking loop.
 */
export function stopTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  instance.loop?.stop();
  instance.loop?.dispose();
  instance.loop = null;
  instance.synth.releaseAll();
  instance.playing = false;
  instance.currentStringIndex = 0;

  console.log(`[Tanpura] Stopped ${id}`);
}

/**
 * Update the tanpura configuration (string tuning, cycle speed, etc.).
 * Restarts the loop if currently playing.
 */
export function updateTanpura(
  id: 'tanpura1' | 'tanpura2',
  config: Partial<TanpuraConfig>,
  saNote?: NoteName,
  saOctave?: number
): void {
  const instance = instances.get(id);
  if (!instance) return;

  const wasPlaying = instance.playing;

  if (wasPlaying) {
    stopTanpura(id);
  }

  // Update config
  instance.config = { ...instance.config, ...config };
  if (saNote !== undefined) instance.saNote = saNote;
  if (saOctave !== undefined) instance.saOctave = saOctave;

  if (wasPlaying && instance.config.enabled) {
    startTanpura(id);
  }
}

/**
 * Update the Sa pitch for a tanpura. Restarts if playing.
 */
export function updateTanpuraPitch(
  id: string,
  saNote: NoteName,
  saOctave: number
): void {
  const instance = instances.get(id);
  if (!instance) return;

  const wasPlaying = instance.playing;
  if (wasPlaying) stopTanpura(id);

  instance.saNote = saNote;
  instance.saOctave = saOctave;

  if (wasPlaying) startTanpura(id);
}

/**
 * Check if a tanpura is currently playing.
 */
export function isTanpuraPlaying(id: string): boolean {
  return instances.get(id)?.playing ?? false;
}

/**
 * Dispose a tanpura instance and free resources.
 */
export function disposeTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  stopTanpura(id);
  instance.synth.dispose();
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
