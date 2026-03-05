/**
 * Swar Mandal engine.
 *
 * A harp-like instrument with 15-20 configurable strings.
 * Each string is assigned to a note (swara). When triggered, all enabled
 * strings are plucked in rapid succession (staggered ~30ms) creating
 * a cascading harp glissando effect.
 *
 * Modes:
 * - Play once: single strum
 * - Auto-loop: repeats at a configurable interval
 *
 * Uses a plucked-string synth (PluckSynth) for a realistic harp timbre.
 */

import * as Tone from 'tone';
import type { SwarMandalConfig, NoteName } from './types';
import { swarToToneNote } from '@/lib/notes';
import { getChannelInput } from './mixer';

interface SwarMandalInstance {
  synth: Tone.PolySynth;
  reverb: Tone.Reverb;
  loop: Tone.Loop | null;
  playing: boolean;
  config: SwarMandalConfig;
  saNote: NoteName;
  saOctave: number;
}

let instance: SwarMandalInstance | null = null;

/**
 * Create the Swar Mandal audio chain.
 */
export function createSwarMandal(): void {
  disposeSwarMandal();

  const channelInput = getChannelInput('swarmandal');

  const reverb = new Tone.Reverb({
    decay: 3,
    wet: 0.35,
    preDelay: 0.01,
  }).connect(channelInput);

  // Use a basic synth with pluck-like envelope
  const synth = new Tone.PolySynth(Tone.Synth);
  synth.maxPolyphony = 24;
  synth.set({
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.002,
      decay: 1.5,
      sustain: 0,
      release: 2.0,
    },
  });
  synth.connect(reverb);

  instance = {
    synth,
    reverb,
    loop: null,
    playing: false,
    config: {
      enabled: false,
      strings: [],
      autoLoop: false,
      loopDuration: 8,
      volume: 0.7,
    },
    saNote: 'C#',
    saOctave: 3,
  };

  console.log('[SwarMandal] Created');
}

/**
 * Strum all enabled strings in rapid succession.
 */
export function strumSwarMandal(): void {
  if (!instance) return;

  const enabledStrings = instance.config.strings.filter((s) => s.enabled);
  if (enabledStrings.length === 0) return;

  const now = Tone.now();
  const staggerMs = 0.035; // 35ms between each string

  enabledStrings.forEach((stringConfig, i) => {
    const toneNote = swarToToneNote(
      instance!.saNote,
      instance!.saOctave,
      stringConfig.note,
      stringConfig.variant,
      stringConfig.octaveOffset
    );

    const time = now + i * staggerMs;
    const velocity = 0.4 + Math.random() * 0.2; // slight variation
    instance!.synth.triggerAttackRelease(toneNote, '2n', time, velocity);
  });
}

/**
 * Start the auto-loop (strum at regular intervals).
 */
export function startSwarMandalLoop(): void {
  if (!instance || instance.playing) return;

  // Strum immediately
  strumSwarMandal();

  instance.loop = new Tone.Loop(() => {
    strumSwarMandal();
  }, instance.config.loopDuration);

  instance.loop.start(0);
  instance.playing = true;

  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  console.log(`[SwarMandal] Auto-loop started: ${instance.config.loopDuration}s interval`);
}

/**
 * Stop the auto-loop.
 */
export function stopSwarMandalLoop(): void {
  if (!instance) return;

  instance.loop?.stop();
  instance.loop?.dispose();
  instance.loop = null;
  instance.playing = false;
  instance.synth.releaseAll();

  console.log('[SwarMandal] Auto-loop stopped');
}

/**
 * Update the Swar Mandal configuration (config only, does NOT start/stop loop).
 * Callers should manage start/stop explicitly.
 */
export function updateSwarMandal(config: Partial<SwarMandalConfig>): void {
  if (!instance) return;

  // If loop duration changed while playing, recreate the loop
  const durationChanged =
    config.loopDuration !== undefined &&
    config.loopDuration !== instance.config.loopDuration;
  const wasLooping = instance.playing;

  instance.config = { ...instance.config, ...config };

  if (wasLooping && durationChanged) {
    stopSwarMandalLoop();
    if (instance.config.autoLoop && instance.config.enabled) {
      startSwarMandalLoop();
    }
  }
}

/**
 * Check if swar mandal auto-loop is currently playing.
 */
export function isSwarMandalPlaying(): boolean {
  return instance?.playing ?? false;
}

/**
 * Update pitch reference.
 */
export function updateSwarMandalPitch(saNote: NoteName, saOctave: number): void {
  if (!instance) return;
  instance.saNote = saNote;
  instance.saOctave = saOctave;
}

/**
 * Dispose the Swar Mandal.
 */
export function disposeSwarMandal(): void {
  if (!instance) return;

  stopSwarMandalLoop();
  instance.synth.dispose();
  instance.reverb.dispose();
  instance = null;

  console.log('[SwarMandal] Disposed');
}
