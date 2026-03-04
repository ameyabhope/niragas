/**
 * Sur-Peti (Shruti Box) engine.
 *
 * A continuous drone that follows the global Sa pitch.
 * Uses additive synthesis to simulate a harmonium-like box drone:
 * - Fundamental + octave + 5th partial
 * - Slight detuning between partials for a warm chorus effect
 * - Tremolo for the characteristic breathing/pumping quality
 *
 * When real samples are available, replace with Tone.Player looping a sample.
 */

import * as Tone from 'tone';
import type { NoteName } from './types';
import { noteToFreq } from '@/lib/notes';
import { getChannelInput } from './mixer';

interface SurPetiInstance {
  /** Oscillators for each partial */
  oscillators: Tone.Oscillator[];
  /** Gains for mixing partials */
  gains: Tone.Gain[];
  /** Tremolo for breathing effect */
  tremolo: Tone.Tremolo;
  /** Filter for body shaping */
  filter: Tone.Filter;
  /** Master gain for this instance */
  masterGain: Tone.Gain;
  /** Whether currently playing */
  playing: boolean;
}

let instance: SurPetiInstance | null = null;

/**
 * Partial definition: frequency ratio from fundamental, amplitude, detune in cents.
 */
const PARTIALS = [
  { ratio: 1.0, amplitude: 0.35, detune: 0 },      // fundamental
  { ratio: 2.0, amplitude: 0.25, detune: 3 },       // octave (slightly sharp)
  { ratio: 1.5, amplitude: 0.12, detune: -2 },      // perfect fifth
  { ratio: 3.0, amplitude: 0.08, detune: 5 },       // octave + fifth
  { ratio: 4.0, amplitude: 0.04, detune: -4 },      // 2 octaves
];

/**
 * Create and connect the Sur-Peti audio chain.
 */
export function createSurPeti(): void {
  disposeSurPeti();

  const channelInput = getChannelInput('surpeti');

  const masterGain = new Tone.Gain(0).connect(channelInput);

  const filter = new Tone.Filter({
    type: 'lowpass',
    frequency: 3000,
    rolloff: -12,
    Q: 1,
  }).connect(masterGain);

  const tremolo = new Tone.Tremolo({
    frequency: 3.5,
    depth: 0.15,
    wet: 1,
    spread: 0,
    type: 'sine',
  }).connect(filter);
  tremolo.start();

  const oscillators: Tone.Oscillator[] = [];
  const gains: Tone.Gain[] = [];

  for (const partial of PARTIALS) {
    const gain = new Tone.Gain(partial.amplitude).connect(tremolo);
    const osc = new Tone.Oscillator({
      frequency: 261.63, // placeholder C4, will be updated
      type: 'sine',
      detune: partial.detune,
    }).connect(gain);

    oscillators.push(osc);
    gains.push(gain);
  }

  instance = {
    oscillators,
    gains,
    tremolo,
    filter,
    masterGain,
    playing: false,
  };

  console.log('[SurPeti] Created');
}

/**
 * Set the Sur-Peti pitch to match the global Sa.
 */
export function setSurPetiPitch(
  saNote: NoteName,
  saOctave: number,
  saCents: number = 0
): void {
  if (!instance) return;

  const fundamentalFreq = noteToFreq(saNote, saOctave, saCents);

  instance.oscillators.forEach((osc, i) => {
    const partial = PARTIALS[i];
    osc.frequency.value = fundamentalFreq * partial.ratio;
  });
}

/**
 * Start the Sur-Peti drone.
 */
export function startSurPeti(
  saNote: NoteName,
  saOctave: number,
  saCents: number = 0
): void {
  if (!instance || instance.playing) return;

  setSurPetiPitch(saNote, saOctave, saCents);

  // Fade in smoothly
  instance.masterGain.gain.setValueAtTime(0, Tone.now());
  instance.masterGain.gain.linearRampToValueAtTime(1, Tone.now() + 1.5);

  for (const osc of instance.oscillators) {
    osc.start();
  }

  instance.playing = true;
  console.log('[SurPeti] Started');
}

/**
 * Stop the Sur-Peti drone.
 */
export function stopSurPeti(): void {
  if (!instance || !instance.playing) return;

  // Fade out smoothly
  const now = Tone.now();
  instance.masterGain.gain.setValueAtTime(instance.masterGain.gain.value, now);
  instance.masterGain.gain.linearRampToValueAtTime(0, now + 0.5);

  // Stop oscillators after fade out
  const oscillators = instance.oscillators;
  setTimeout(() => {
    for (const osc of oscillators) {
      try { osc.stop(); } catch { /* may already be stopped */ }
    }
  }, 600);

  instance.playing = false;
  console.log('[SurPeti] Stopped');
}

/**
 * Check if Sur-Peti is playing.
 */
export function isSurPetiPlaying(): boolean {
  return instance?.playing ?? false;
}

/**
 * Dispose the Sur-Peti and free resources.
 */
export function disposeSurPeti(): void {
  if (!instance) return;

  if (instance.playing) {
    for (const osc of instance.oscillators) {
      try { osc.stop(); } catch { /* ignore */ }
    }
  }

  for (const osc of instance.oscillators) osc.dispose();
  for (const gain of instance.gains) gain.dispose();
  instance.tremolo.dispose();
  instance.filter.dispose();
  instance.masterGain.dispose();

  instance = null;
  console.log('[SurPeti] Disposed');
}
