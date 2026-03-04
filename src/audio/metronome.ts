/**
 * Metronome engine.
 *
 * Simple click track with accent on beat 1.
 * Supports common time signatures: 2/4, 3/4, 4/4, 5/4, 6/8, 7/8.
 */

import * as Tone from 'tone';
import { getChannelInput } from './mixer';

interface MetronomeInstance {
  accentSynth: Tone.MembraneSynth;
  normalSynth: Tone.MembraneSynth;
  loop: Tone.Loop | null;
  playing: boolean;
  beatsPerMeasure: number;
  currentBeat: number;
}

let instance: MetronomeInstance | null = null;

/**
 * Create the Metronome audio chain.
 */
export function createMetronome(): void {
  disposeMetronome();

  const channelInput = getChannelInput('metronome');

  // Accent click (beat 1) - higher pitch
  const accentSynth = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.08,
      sustain: 0,
      release: 0.05,
    },
  });
  accentSynth.connect(channelInput);

  // Normal click - lower pitch
  const normalSynth = new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 4,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.001,
      decay: 0.06,
      sustain: 0,
      release: 0.05,
    },
  });
  normalSynth.connect(channelInput);

  instance = {
    accentSynth,
    normalSynth,
    loop: null,
    playing: false,
    beatsPerMeasure: 4,
    currentBeat: 0,
  };

  console.log('[Metronome] Created');
}

/**
 * Start the metronome.
 */
export function startMetronome(beatsPerMeasure = 4): void {
  if (!instance || instance.playing) return;

  instance.beatsPerMeasure = beatsPerMeasure;
  instance.currentBeat = 0;

  instance.loop = new Tone.Loop((time) => {
    if (instance!.currentBeat === 0) {
      instance!.accentSynth.triggerAttackRelease('C5', '32n', time, 0.8);
    } else {
      instance!.normalSynth.triggerAttackRelease('C4', '32n', time, 0.5);
    }

    instance!.currentBeat =
      (instance!.currentBeat + 1) % instance!.beatsPerMeasure;
  }, '4n'); // quarter note interval

  instance.loop.start(0);
  instance.playing = true;

  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  console.log(`[Metronome] Started: ${beatsPerMeasure}/4`);
}

/**
 * Stop the metronome.
 */
export function stopMetronome(): void {
  if (!instance) return;

  instance.loop?.stop();
  instance.loop?.dispose();
  instance.loop = null;
  instance.playing = false;
  instance.currentBeat = 0;

  console.log('[Metronome] Stopped');
}

/**
 * Check if metronome is playing.
 */
export function isMetronomePlaying(): boolean {
  return instance?.playing ?? false;
}

/**
 * Dispose the metronome.
 */
export function disposeMetronome(): void {
  if (!instance) return;

  stopMetronome();
  instance.accentSynth.dispose();
  instance.normalSynth.dispose();
  instance = null;

  console.log('[Metronome] Disposed');
}
