/**
 * Hook to initialize the audio engine on first user interaction.
 */

import { useState, useCallback } from 'react';
import { initAudioEngine, isAudioEngineReady } from '@/audio/engine';
import { createMixer } from '@/audio/mixer';

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
      createMixer();
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
