import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getAudioContextState, subscribeAudioContextState } from '@/audio/engine';
import { getTaal } from '@/data/taals';
import { createBrowserPlaybackLifecycle } from '@/lib/browser-playback-lifecycle';
import { practiceSession } from '@/lib/practice-session';
import { isPlayingAccompaniment, subscribeSession } from '@/lib/session-controls';
import { usePitchStore } from '@/store/pitch-store';
import { useSessionStore } from '@/store/session-store';
import { useTablaStore } from '@/store/tabla-store';

export function usePracticeSession() {
  const lifecycle = useMemo(() => createBrowserPlaybackLifecycle({
    context: { getState: getAudioContextState, subscribe: subscribeAudioContextState },
    commands: practiceSession,
    mediaSession: typeof navigator === 'undefined' ? undefined : navigator.mediaSession,
    getRequested: () => useSessionStore.getState().requested,
    isPlayingAccompaniment,
    subscribeSession,
    getMetadata: () => {
      const pitch = usePitchStore.getState();
      const tabla = useTablaStore.getState();
      const taal = tabla.activeTaalId ? getTaal(tabla.activeTaalId).name : null;
      return {
        title: `Sa ${pitch.note}${pitch.octave}${taal ? ` · ${taal}` : ''}`,
        artist: 'Niragas',
        album: 'Practice session',
      };
    },
    createMetadata: value => typeof MediaMetadata === 'undefined'
      ? value as MediaMetadata
      : new MediaMetadata(value),
  }), []);

  useEffect(() => {
    lifecycle.start();
    return () => lifecycle.stop();
  }, [lifecycle]);

  const status = useSyncExternalStore(lifecycle.subscribe, lifecycle.getSnapshot, lifecycle.getSnapshot);
  return { ...status, resume: lifecycle.resume };
}
