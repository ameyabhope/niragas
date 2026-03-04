/**
 * Tanpura engine.
 *
 * Simulates a 5-string tanpura with cyclic plucking using synthesis.
 * The sound chain per tanpura:
 *   PolySynth(FMSynth) → Chorus (shimmer) → Resonance filter → Reverb → Mixer Channel
 *
 * This approximates the tanpura's characteristic "jivari" buzzing by using:
 * - FM synthesis with high modulation index for harmonic richness
 * - Chorus to create the shimmering overtone beating effect
 * - A resonant lowpass filter to simulate the wooden body
 * - Reverb for natural room ambiance
 *
 * When real samples are available, replace createTanpuraSynth() with Tone.Sampler
 * and remove the effects chain (real samples already contain these characteristics).
 */

import * as Tone from 'tone';
import type { TanpuraConfig, NoteName } from './types';
import { swarToToneNote } from '@/lib/notes';
import { getChannelInput } from './mixer';

interface TanpuraInstance {
  synth: Tone.PolySynth;
  chorus: Tone.Chorus;
  filter: Tone.Filter;
  reverb: Tone.Reverb;
  loop: Tone.Loop | null;
  currentStringIndex: number;
  playing: boolean;
  config: TanpuraConfig;
  saNote: NoteName;
  saOctave: number;
}

const instances: Map<string, TanpuraInstance> = new Map();

/**
 * Create the tanpura synthesis chain.
 * The FM synth generates a harmonically rich tone, then the chorus adds the
 * characteristic shimmering quality, the filter shapes the body resonance,
 * and reverb adds natural space.
 */
function createTanpuraChain(channelInput: Tone.Volume): {
  synth: Tone.PolySynth;
  chorus: Tone.Chorus;
  filter: Tone.Filter;
  reverb: Tone.Reverb;
} {
  // Reverb: natural room ambiance
  const reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.25,
    preDelay: 0.01,
  }).connect(channelInput);

  // Resonant lowpass filter: simulates wooden body
  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 2500,
    rolloff: -12,
    Q: 2,
  }).connect(reverb);

  // Chorus: creates the shimmering overtone beating (jivari-like)
  const chorus = new Tone.Chorus({
    frequency: 0.8,
    delayTime: 3.5,
    depth: 0.6,
    wet: 0.4,
    spread: 180,
  }).connect(filter);
  chorus.start();

  // FM synth: harmonically rich tone
  const synth = new Tone.PolySynth(Tone.FMSynth);
  synth.maxPolyphony = 8;
  synth.set({
    harmonicity: 2,
    modulationIndex: 12,
    oscillator: {
      type: 'sine',
    },
    envelope: {
      attack: 0.15,
      decay: 1.0,
      sustain: 0.5,
      release: 4.0,
    },
    modulation: {
      type: 'triangle',
    },
    modulationEnvelope: {
      attack: 0.3,
      decay: 0.8,
      sustain: 0.3,
      release: 3.0,
    },
  });
  synth.connect(chorus);

  return { synth, chorus, filter, reverb };
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
  disposeTanpura(id);

  const channelInput = getChannelInput(id);
  const { synth, chorus, filter, reverb } = createTanpuraChain(channelInput);

  const instance: TanpuraInstance = {
    synth,
    chorus,
    filter,
    reverb,
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
 * Strings are plucked in sequence with slight timing humanization.
 */
export function startTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance || instance.playing) return;

  const enabledStrings = instance.config.strings.filter((s) => s.enabled);
  if (enabledStrings.length === 0) return;

  const pluckInterval = instance.config.cycleSpeed / enabledStrings.length;
  instance.currentStringIndex = 0;

  instance.loop = new Tone.Loop((time) => {
    const stringConfig = enabledStrings[instance.currentStringIndex];
    if (!stringConfig) return;

    const toneNote = swarToToneNote(
      instance.saNote,
      instance.saOctave,
      stringConfig.note,
      stringConfig.variant,
      stringConfig.octaveOffset
    );

    // Longer sustain for overlapping strings (characteristic tanpura sound)
    const noteDuration = Math.min(pluckInterval * 2.5, 5);

    // Slight velocity variation for natural feel
    const velocity = 0.55 + Math.random() * 0.15;

    // Slight timing humanization (±20ms)
    const humanize = (Math.random() - 0.5) * 0.04;
    const triggerTime = Math.max(time + humanize, time);

    instance.synth.triggerAttackRelease(toneNote, noteDuration, triggerTime, velocity);

    instance.currentStringIndex =
      (instance.currentStringIndex + 1) % enabledStrings.length;
  }, pluckInterval);

  instance.loop.start(0);
  instance.playing = true;

  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  console.log(
    `[Tanpura] Started ${id}: ${enabledStrings.length} strings, ${pluckInterval.toFixed(2)}s interval`
  );
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
 * Update the tanpura configuration. Restarts the loop if currently playing.
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
  if (wasPlaying) stopTanpura(id);

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
 * Dispose a tanpura instance and free all audio nodes.
 */
export function disposeTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  stopTanpura(id);
  instance.synth.dispose();
  instance.chorus.dispose();
  instance.filter.dispose();
  instance.reverb.dispose();
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
