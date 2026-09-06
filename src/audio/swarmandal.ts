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
import { swarToFreq } from '@/lib/notes';
import { getChannelInput } from './mixer';
import { log } from './log';

interface SwarMandalInstance {
  synths: Tone.PluckSynth[];
  reverb: Tone.Reverb;
  loop: Tone.Clock | null;
  playing: boolean;
  config: SwarMandalConfig;
  saNote: NoteName;
  saOctave: number;
  saCents: number;
  lastAttackTimes: number[];
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

  instance = {
    synths: [],
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
    saCents: 0,
    lastAttackTimes: [],
  };

  log('[SwarMandal] Created');
}

/**
 * Strum all enabled strings in rapid succession.
 */
export function strumSwarMandal(scheduledTime = Tone.now()): void {
  if (!instance) return;

  const enabledStrings = instance.config.strings
    .map((config, index) => ({ config, index }))
    .filter(({ config }) => config.enabled);
  if (enabledStrings.length === 0) return;

  const staggerMs = 0.035; // 35ms between each string

  enabledStrings.forEach(({ config: stringConfig, index }, i) => {
    const frequency = swarToFreq(
      instance!.saNote,
      instance!.saOctave,
      instance!.saCents,
      stringConfig.note,
      stringConfig.variant,
      stringConfig.octaveOffset
    );

    // Rapid strums or changing enabled strings can overlap queued attacks.
    const time = Math.max(scheduledTime + i * staggerMs, (instance!.lastAttackTimes[index] ?? -Infinity) + 0.01);
    instance!.lastAttackTimes[index] = time;
    const synth = instance!.synths[index] ??= new Tone.PluckSynth({
      attackNoise: 1.2,
      dampening: 4200,
      resonance: 0.92,
      release: 1.8,
    }).connect(instance!.reverb);
    synth.volume.value = -8 + Math.random() * 2;
    synth.triggerAttack(frequency, time);
  });
}

/**
 * Start the auto-loop (strum at regular intervals).
 */
export function startSwarMandalLoop(): void {
  if (!instance || instance.playing) return;

  // Clock frequency is in Hz, unlike transport loops whose ticks follow BPM.
  let lastTick = -1;
  instance.loop = new Tone.Clock((time, tick) => {
    // Tone can report a boundary tick twice due to floating-point rounding.
    if (tick === undefined || tick <= lastTick) return;
    lastTick = tick;
    strumSwarMandal(time);
  }, 1 / instance.config.loopDuration);
  instance.loop.start(Tone.now());
  instance.playing = true;

  log(`[SwarMandal] Auto-loop started: ${instance.config.loopDuration}s interval`);
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
  // Release only changes resonance; disposal also cancels future noise bursts.
  for (const synth of instance.synths) synth?.dispose();
  instance.synths = [];
  instance.lastAttackTimes = [];

  log('[SwarMandal] Auto-loop stopped');
}

/**
 * Update configuration, stop on disable, and reschedule an active loop when its
 * duration changes. Enabling and manual strums remain caller-controlled.
 */
export function updateSwarMandal(config: Partial<SwarMandalConfig>): void {
  if (!instance) return;

  // If loop duration changed while playing, recreate the loop
  const durationChanged =
    config.loopDuration !== undefined &&
    config.loopDuration !== instance.config.loopDuration;
  const wasLooping = instance.playing;
  const disabled = instance.config.enabled && config.enabled === false;

  instance.config = { ...instance.config, ...config };

  if (disabled) {
    stopSwarMandalLoop();
    return;
  }

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
export function updateSwarMandalPitch(saNote: NoteName, saOctave: number, saCents = 0): void {
  if (!instance) return;
  instance.saNote = saNote;
  instance.saOctave = saOctave;
  instance.saCents = saCents;
}

/**
 * Dispose the Swar Mandal.
 */
export function disposeSwarMandal(): void {
  if (!instance) return;

  stopSwarMandalLoop();
  instance.reverb.dispose();
  instance = null;

  log('[SwarMandal] Disposed');
}
