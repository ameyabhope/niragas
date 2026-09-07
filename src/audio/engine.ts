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
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize the audio engine. Must be called from a user gesture (click/tap).
 * This resumes the AudioContext which browsers require a user interaction for.
 */
export async function initAudioEngine(): Promise<void> {
  const context = Tone.getContext();
  if (initialized && context.state === 'running') return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    await Tone.start();
    const ctx = Tone.getContext();
    log('[AudioEngine] Tone.js started. Context state:', ctx.state);

    // Set a reasonable latency hint for real-time playback
    ctx.lookAhead = 0.05; // 50ms look-ahead for scheduling
    initialized = true;
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Check if the audio engine has been initialized.
 */
export function isAudioEngineReady(): boolean {
  return initialized && Tone.getContext().state === 'running';
}

export type BrowserAudioContextState = AudioContextState | 'interrupted';

function rawAudioContext(): AudioContext {
  return (Tone.getContext() as unknown as { rawContext: AudioContext }).rawContext;
}

export function getAudioContextState(): BrowserAudioContextState {
  return rawAudioContext().state as BrowserAudioContextState;
}

export function subscribeAudioContextState(listener: () => void): () => void {
  const context = rawAudioContext();
  context.addEventListener('statechange', listener);
  return () => context.removeEventListener('statechange', listener);
}
