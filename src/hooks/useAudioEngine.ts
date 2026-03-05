/**
 * Hook to initialize the audio engine on first user interaction.
 *
 * The mixer is created eagerly (before Tone.start()) so that instrument
 * components can connect to their channel strips on mount. Only the
 * AudioContext resume (Tone.start) requires a user gesture.
 */

import { useState, useCallback } from 'react';
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

export function useAudioEngine() {
  const [ready, setReady] = useState(isAudioEngineReady());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (ready) return;
    setLoading(true);
    setError(null);

    try {
      await initAudioEngine();
      setReady(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize audio';
      setError(message);
      console.error('[useAudioEngine]', err);
    } finally {
      setLoading(false);
    }
  }, [ready]);

  return { ready, loading, error, initialize };
}
