/**
 * Master audio engine.
 * Initializes Tone.js, manages the audio context, and routes all instruments
 * through the mix bus to the destination.
 *
 * This module is framework-agnostic (no React).
 */

import * as Tone from 'tone';
import { log } from './log';

let initialized = false;

/**
 * Initialize the audio engine. Must be called from a user gesture (click/tap).
 * This resumes the AudioContext which browsers require a user interaction for.
 */
export async function initAudioEngine(): Promise<void> {
  if (initialized) return;

  await Tone.start();
  const ctx = Tone.getContext();
  log('[AudioEngine] Tone.js started. Context state:', ctx.state);

  // Set a reasonable latency hint for real-time playback
  ctx.lookAhead = 0.05; // 50ms look-ahead for scheduling

  initialized = true;
}

/**
 * Check if the audio engine has been initialized.
 */
export function isAudioEngineReady(): boolean {
  return initialized && Tone.getContext().state === 'running';
}


