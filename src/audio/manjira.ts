/**
 * Manjira (small cymbals) engine.
 *
 * Plays rhythmic cymbal hits synced to the Tone.Transport.
 * Pattern depends on the taal: typically hits on certain beats or subdivisions.
 * Uses metallic noise synthesis as a placeholder for real samples.
 */

import * as Tone from 'tone';
import type { TaalDefinition } from './types';
import { getChannelInput } from './mixer';

interface ManjiraInstance {
  synth: Tone.MetalSynth;
  scheduledEvents: number[];
  playing: boolean;
  taal: TaalDefinition | null;
}

let instance: ManjiraInstance | null = null;

/**
 * Create the Manjira audio chain.
 */
export function createManjira(): void {
  disposeManjira();

  const channelInput = getChannelInput('manjira');

  const synth = new Tone.MetalSynth({
    envelope: {
      attack: 0.001,
      decay: 0.12,
      release: 0.05,
    },
    harmonicity: 5.1,
    modulationIndex: 16,
    resonance: 4000,
    octaves: 1.5,
  });
  synth.frequency.value = 800;
  synth.connect(channelInput);
  synth.volume.value = -8; // reduce volume

  instance = {
    synth,
    scheduledEvents: [],
    playing: false,
    taal: null,
  };

  console.log('[Manjira] Created');
}

/**
 * Get the manjira hit pattern for a taal.
 * Returns an array of beat positions (1-indexed) where the manjira should strike.
 * For simple taals like Dadra (6 beats): hits on 1 and 4.
 * For Keherva (8 beats): hits on 1, 3, 5, 7.
 */
function getManjiraPattern(taal: TaalDefinition): number[] {
  // Hit on each division marker (sam, taali, khaali positions)
  const pattern = taal.divisions.map((d) => d.matra);

  // If too few hits, also add subdivisions
  if (pattern.length < 3 && taal.matras >= 6) {
    const step = Math.floor(taal.matras / 4) || 1;
    for (let i = 1; i <= taal.matras; i += step) {
      if (!pattern.includes(i)) pattern.push(i);
    }
    pattern.sort((a, b) => a - b);
  }

  return pattern;
}

/**
 * Start the Manjira playing along with the taal.
 */
export function startManjira(taal: TaalDefinition): void {
  if (!instance || instance.playing) return;
  if (!taal.manjiraSupported) return;

  clearManjiraEvents();
  instance.taal = taal;

  const pattern = getManjiraPattern(taal);
  const bpm = Tone.getTransport().bpm.value;
  const secondsPerBeat = 60 / bpm;
  const cycleDuration = taal.matras * secondsPerBeat;

  for (const beat of pattern) {
    const offsetSeconds = (beat - 1) * secondsPerBeat;

    const eventId = Tone.getTransport().scheduleRepeat(
      (time) => {
        // Accent on sam (first beat)
        const velocity = beat === 1 ? 0.8 : 0.5;
        instance?.synth.triggerAttackRelease('16n', time, velocity);
      },
      cycleDuration,
      offsetSeconds
    );

    instance.scheduledEvents.push(eventId);
  }

  instance.playing = true;
  console.log(`[Manjira] Started with ${pattern.length} hits per cycle`);
}

/**
 * Stop the Manjira.
 */
export function stopManjira(): void {
  if (!instance) return;

  clearManjiraEvents();
  instance.playing = false;
  instance.taal = null;

  console.log('[Manjira] Stopped');
}

/**
 * Clear scheduled events.
 */
function clearManjiraEvents(): void {
  if (!instance) return;
  for (const id of instance.scheduledEvents) {
    Tone.getTransport().clear(id);
  }
  instance.scheduledEvents = [];
}

/**
 * Check if Manjira is playing.
 */
export function isManjiraPlaying(): boolean {
  return instance?.playing ?? false;
}

/**
 * Dispose the Manjira.
 */
export function disposeManjira(): void {
  if (!instance) return;

  stopManjira();
  instance.synth.dispose();
  instance = null;

  console.log('[Manjira] Disposed');
}
