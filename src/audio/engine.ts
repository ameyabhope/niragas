/**
 * Master audio engine.
 * Initializes Tone.js, manages the audio context, and routes all instruments
 * through the mix bus to the destination.
 *
 * This module is framework-agnostic (no React).
 */

import * as Tone from 'tone';

let initialized = false;

/**
 * Initialize the audio engine. Must be called from a user gesture (click/tap).
 * This resumes the AudioContext which browsers require a user interaction for.
 */
export async function initAudioEngine(): Promise<void> {
  if (initialized) return;

  await Tone.start();
  const ctx = Tone.getContext();
  console.log('[AudioEngine] Tone.js started. Context state:', ctx.state);

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

/**
 * Get the Tone.js destination node (speakers).
 */
export function getDestination(): Tone.ToneAudioNode {
  return Tone.getDestination();
}

/**
 * Suspend the audio context (battery saving when app is idle).
 */
export async function suspendAudio(): Promise<void> {
  const ctx = Tone.getContext();
  if ('rawContext' in ctx) {
    await (ctx as unknown as { rawContext: AudioContext }).rawContext.suspend();
  }
}

/**
 * Resume the audio context.
 */
export async function resumeAudio(): Promise<void> {
  const ctx = Tone.getContext();
  if ('rawContext' in ctx) {
    await (ctx as unknown as { rawContext: AudioContext }).rawContext.resume();
  }
}
