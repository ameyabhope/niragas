/**
 * Hook to initialize the audio engine on first user interaction.
 *
 * The mixer is created eagerly (before Tone.start()) so that instrument
 * components can connect to their channel strips on mount. Only the
 * AudioContext resume (Tone.start) requires a user gesture.
 */

import { useSyncExternalStore } from 'react';
import { initAudioEngine, isAudioEngineReady } from '@/audio/engine';
import { createMixer, isMixerReady } from '@/audio/mixer';
import { initAudioSubscriptions } from '@/audio/subscriptions';

// Create mixer immediately so instrument create* calls on mount can connect.
// Tone.js nodes work fine before Tone.start() — they just sit in a suspended context.
if (!isMixerReady()) {
  createMixer();
}

// Set up store → audio engine subscriptions immediately.
// They are safe to register even before Tone.start() since they only fire on state changes.
initAudioSubscriptions();

interface AudioStatus {
  ready: boolean;
  loading: boolean;
  error: string | null;
}

let status: AudioStatus = {
  ready: isAudioEngineReady(),
  loading: false,
  error: null,
};
let initializationPromise: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

function emit(next: AudioStatus): void {
  status = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AudioStatus {
  return status;
}

async function initialize(): Promise<boolean> {
  if (isAudioEngineReady()) {
    if (!status.ready || status.error) {
      emit({ ready: true, loading: false, error: null });
    }
    return true;
  }
  if (initializationPromise) return initializationPromise;

  emit({ ready: false, loading: true, error: null });
  initializationPromise = (async () => {
    try {
      await initAudioEngine();
      emit({ ready: true, loading: false, error: null });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize audio';
      emit({ ready: false, loading: false, error: message });
      console.error('[useAudioEngine]', err);
      return false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

export function useAudioEngine() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...current, initialize };
}
