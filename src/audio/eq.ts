/**
 * 7-band parametric EQ.
 *
 * Inserts into the signal chain between the channel mix bus and the master output.
 * Uses Web Audio API BiquadFilterNodes via Tone.js for each band.
 *
 * Band layout:
 *   Band 1: 60 Hz   (lowshelf)
 *   Band 2: 150 Hz  (peaking)
 *   Band 3: 400 Hz  (peaking)
 *   Band 4: 1 kHz   (peaking)
 *   Band 5: 2.5 kHz (peaking)
 *   Band 6: 6 kHz   (peaking)
 *   Band 7: 15 kHz  (highshelf)
 */

import * as Tone from 'tone';
import type { EQBand, EQState } from './types';

interface EQInstance {
  bands: Tone.BiquadFilter[];
  inputGain: Tone.Gain;
  outputGain: Tone.Gain;
  enabled: boolean;
}

let instance: EQInstance | null = null;

/** Default band configuration */
export const DEFAULT_EQ_BANDS: EQBand[] = [
  { frequency: 60,    gain: 0, Q: 0.7, type: 'lowshelf' },
  { frequency: 150,   gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 400,   gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 1000,  gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 2500,  gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 6000,  gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 15000, gain: 0, Q: 0.7, type: 'highshelf' },
];

/** Named EQ presets */
export const EQ_PRESETS: Record<string, EQBand[]> = {
  'Flat': DEFAULT_EQ_BANDS.map((b) => ({ ...b })),

  'Bass Boost': [
    { frequency: 60,    gain: 6,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 0,  Q: 0.7, type: 'highshelf' },
  ],

  'Treble Boost': [
    { frequency: 60,    gain: 0,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 5,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 4,  Q: 0.7, type: 'highshelf' },
  ],

  'Vocal Presence': [
    { frequency: 60,    gain: -2, Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 3,  Q: 1.2, type: 'peaking' },
    { frequency: 2500,  gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 1,  Q: 0.7, type: 'highshelf' },
  ],

  'Warm': [
    { frequency: 60,    gain: 3,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: -3, Q: 0.7, type: 'highshelf' },
  ],

  'Bright': [
    { frequency: 60,    gain: -1, Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 5,  Q: 0.7, type: 'highshelf' },
  ],

  'Tabla Focus': [
    { frequency: 60,    gain: 4,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 2,  Q: 1.2, type: 'peaking' },
    { frequency: 2500,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: -1, Q: 0.7, type: 'highshelf' },
  ],

  'Tanpura Rich': [
    { frequency: 60,    gain: 2,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 0,  Q: 0.7, type: 'highshelf' },
  ],

  'Small Speakers': [
    { frequency: 60,    gain: 5,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 3,  Q: 0.7, type: 'highshelf' },
  ],

  'Headphones': [
    { frequency: 60,    gain: 1,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: -1, Q: 0.7, type: 'highshelf' },
  ],

  'V-Shape': [
    { frequency: 60,    gain: 5,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 5,  Q: 0.7, type: 'highshelf' },
  ],

  // ── Indian Classical Music Presets ──

  'Riyaaz (Practice)': [
    { frequency: 60,    gain: 1,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 2,  Q: 1.2, type: 'peaking' },
    { frequency: 2500,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 0,  Q: 0.7, type: 'highshelf' },
  ],

  'Khayal Vocal': [
    { frequency: 60,    gain: -3, Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 2,  Q: 1.2, type: 'peaking' },
    { frequency: 1000,  gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 0,  Q: 0.7, type: 'highshelf' },
  ],

  'Sitar / Sarod': [
    { frequency: 60,    gain: -2, Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 3,  Q: 1.2, type: 'peaking' },
    { frequency: 1000,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 1,  Q: 0.7, type: 'highshelf' },
  ],

  'Bansuri (Flute)': [
    { frequency: 60,    gain: -4, Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 2,  Q: 0.7, type: 'highshelf' },
  ],

  'Santoor': [
    { frequency: 60,    gain: -2, Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 3,  Q: 1.2, type: 'peaking' },
    { frequency: 2500,  gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 1,  Q: 0.7, type: 'highshelf' },
  ],

  'Deep Bass': [
    { frequency: 60,    gain: 8,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 5,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: -3, Q: 0.7, type: 'highshelf' },
  ],

  'Lo-Fi': [
    { frequency: 60,    gain: 3,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: -3, Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: -5, Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: -8, Q: 0.7, type: 'highshelf' },
  ],

  'Concert Hall': [
    { frequency: 60,    gain: 2,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 2,  Q: 0.7, type: 'highshelf' },
  ],

  'Late Night': [
    { frequency: 60,    gain: 2,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: -3, Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: -4, Q: 0.7, type: 'highshelf' },
  ],

  'Tabla + Vocal': [
    { frequency: 60,    gain: 3,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 3,  Q: 1.2, type: 'peaking' },
    { frequency: 2500,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 0,  Q: 0.7, type: 'highshelf' },
  ],

  'Bluetooth Speaker': [
    { frequency: 60,    gain: 6,  Q: 0.7, type: 'lowshelf' },
    { frequency: 150,   gain: 4,  Q: 1.0, type: 'peaking' },
    { frequency: 400,   gain: 1,  Q: 1.0, type: 'peaking' },
    { frequency: 1000,  gain: 0,  Q: 1.0, type: 'peaking' },
    { frequency: 2500,  gain: 2,  Q: 1.0, type: 'peaking' },
    { frequency: 6000,  gain: 3,  Q: 1.0, type: 'peaking' },
    { frequency: 15000, gain: 2,  Q: 0.7, type: 'highshelf' },
  ],
};

export const EQ_PRESET_NAMES = Object.keys(EQ_PRESETS);

/**
 * Create the 7-band EQ chain.
 * Returns the input and output nodes for insertion into the signal path.
 */
export function createEQ(): { input: Tone.Gain; output: Tone.Gain } {
  disposeEQ();

  const inputGain = new Tone.Gain(1);
  const outputGain = new Tone.Gain(1);

  // Create filter chain: input → band1 → band2 → ... → band7 → output
  const bands: Tone.BiquadFilter[] = DEFAULT_EQ_BANDS.map((bandConfig) => {
    return new Tone.BiquadFilter({
      frequency: bandConfig.frequency,
      type: bandConfig.type,
      gain: bandConfig.gain,
      Q: bandConfig.Q,
    });
  });

  // Chain them together
  inputGain.connect(bands[0]);
  for (let i = 0; i < bands.length - 1; i++) {
    bands[i].connect(bands[i + 1]);
  }
  bands[bands.length - 1].connect(outputGain);

  instance = {
    bands,
    inputGain,
    outputGain,
    enabled: true,
  };

  console.log('[EQ] Created 7-band parametric EQ');
  return { input: inputGain, output: outputGain };
}

/**
 * Set the gain for a specific EQ band.
 * @param bandIndex 0-6
 * @param gain -12 to +12 dB
 */
export function setEQBandGain(bandIndex: number, gain: number): void {
  if (!instance || bandIndex < 0 || bandIndex >= instance.bands.length) return;
  instance.bands[bandIndex].gain.value = Math.max(-12, Math.min(12, gain));
}

/**
 * Set the frequency for a specific EQ band.
 */
export function setEQBandFrequency(bandIndex: number, frequency: number): void {
  if (!instance || bandIndex < 0 || bandIndex >= instance.bands.length) return;
  instance.bands[bandIndex].frequency.value = frequency;
}

/**
 * Set the Q for a specific EQ band.
 */
export function setEQBandQ(bandIndex: number, Q: number): void {
  if (!instance || bandIndex < 0 || bandIndex >= instance.bands.length) return;
  instance.bands[bandIndex].Q.value = Q;
}

/**
 * Apply an EQ preset by name.
 */
export function applyEQPreset(presetName: string): void {
  const preset = EQ_PRESETS[presetName];
  if (!preset || !instance) return;

  preset.forEach((bandConfig, i) => {
    if (i < instance!.bands.length) {
      instance!.bands[i].gain.value = bandConfig.gain;
      instance!.bands[i].frequency.value = bandConfig.frequency;
      instance!.bands[i].Q.value = bandConfig.Q;
    }
  });

  console.log(`[EQ] Applied preset: ${presetName}`);
}

/**
 * Get the current EQ state.
 */
export function getEQState(): EQState {
  if (!instance) {
    return {
      enabled: false,
      bands: DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
      presetName: 'Flat',
    };
  }

  return {
    enabled: instance.enabled,
    bands: instance.bands.map((band, i) => ({
      frequency: band.frequency.value as number,
      gain: band.gain.value as number,
      Q: band.Q.value as number,
      type: DEFAULT_EQ_BANDS[i].type,
    })),
    presetName: null,
  };
}

/**
 * Enable/disable the EQ (bypass).
 */
export function setEQEnabled(enabled: boolean): void {
  if (!instance) return;
  instance.enabled = enabled;
  // Bypass by setting all gains to 0
  if (!enabled) {
    instance.bands.forEach((band) => {
      band.gain.value = 0;
    });
  }
}

/**
 * Dispose the EQ chain.
 */
export function disposeEQ(): void {
  if (!instance) return;

  instance.bands.forEach((band) => band.dispose());
  instance.inputGain.dispose();
  instance.outputGain.dispose();
  instance = null;

  console.log('[EQ] Disposed');
}
