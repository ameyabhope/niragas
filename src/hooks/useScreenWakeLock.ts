import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getAudioContextState, subscribeAudioContextState } from '@/audio/engine';
import { isPlayingAccompaniment, subscribeSession } from '@/lib/session-controls';
import { createScreenWakeLockLifecycle } from '@/lib/screen-wake-lock';

export function useScreenWakeLock() {
  const lifecycle = useMemo(() => createScreenWakeLockLifecycle({
    request: typeof navigator === 'undefined' || !('wakeLock' in navigator)
      ? undefined
      : () => navigator.wakeLock.request('screen'),
    visible: () => typeof document === 'undefined' || document.visibilityState === 'visible',
    eligible: () => getAudioContextState() === 'running' && isPlayingAccompaniment(),
    subscribeVisibility: listener => {
      if (typeof document === 'undefined') return () => {};
      document.addEventListener('visibilitychange', listener);
      return () => document.removeEventListener('visibilitychange', listener);
    },
    subscribeEligibility: listener => {
      const stopSession = subscribeSession(listener);
      const stopContext = subscribeAudioContextState(listener);
      return () => { stopSession(); stopContext(); };
    },
  }), []);

  useEffect(() => {
    lifecycle.start();
    return () => lifecycle.stop();
  }, [lifecycle]);

  const snapshot = useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getSnapshot);
  return { ...snapshot, setRequested: lifecycle.setRequested };
}
