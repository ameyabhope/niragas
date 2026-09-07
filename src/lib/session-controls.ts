import { useTanpuraStore } from '@/store/tanpura-store';
import { useTablaStore } from '@/store/tabla-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { usePitchStore } from '@/store/pitch-store';
import { stopTanpura } from '@/audio/tanpura';
import { getTanpuraStatus, subscribeTanpuraStatus } from '@/audio/tanpura';
import { isTablaPlaying, stopTabla } from '@/audio/tabla';
import { isSurPetiPlaying, stopSurPeti } from '@/audio/surpeti';
import { isSwarMandalPlaying, stopSwarMandalLoop, strumSwarMandal } from '@/audio/swarmandal';

import type { InstrumentId } from '@/audio/types';
import { useSessionStore } from '@/store/session-store';

export function selectedInstruments() {
  return {
    tanpura1: useTanpuraStore.getState().tanpura1.enabled,
    tanpura2: useTanpuraStore.getState().tanpura2.enabled,
    tabla: useTablaStore.getState().enabled,
    surpeti: useSurPetiStore.getState().enabled,
    swarmandal: useSwarMandalStore.getState().enabled,
  };
}

export function isSessionActive() {
  const selected = selectedInstruments();
  return useSessionStore.getState().running && (
    selected.tanpura1 || selected.tanpura2 || selected.tabla || selected.surpeti ||
    (selected.swarmandal && useSwarMandalStore.getState().autoLoop)
  );
}

export function isPlayingAccompaniment() {
  return useSessionStore.getState().running && (
    getTanpuraStatus('tanpura1').playing || getTanpuraStatus('tanpura2').playing ||
    isTablaPlaying() || isSurPetiPlaying() || isSwarMandalPlaying()
  );
}

export function subscribeSession(listener: () => void) {
  const unsubscribe = [useSessionStore, useTanpuraStore, useTablaStore, useSurPetiStore, useSwarMandalStore, usePitchStore]
    .map((store) => store.subscribe(listener));
  unsubscribe.push(subscribeTanpuraStatus('tanpura1', listener), subscribeTanpuraStatus('tanpura2', listener));
  return () => unsubscribe.forEach((stop) => stop());
}

export function createSessionControls(initialize: () => Promise<boolean>) {
  let generation = 0;
  let starting: Promise<void> | null = null;
  let resuming: Promise<boolean> | null = null;
  const setEnabled = (id: InstrumentId, enabled: boolean) => {
    switch (id) {
      case 'tanpura1': case 'tanpura2':
        useTanpuraStore.getState().setTanpuraConfig(id, { enabled }); break;
      case 'tabla': useTablaStore.getState().setEnabled(enabled); break;
      case 'surpeti': useSurPetiStore.getState().setEnabled(enabled); break;
      case 'swarmandal': useSwarMandalStore.getState().setEnabled(enabled); break;
    }
  };
  const controls = {
    play(): Promise<void> {
      if (starting) return starting;
      resuming = null;
      const request = ++generation;
      useSessionStore.setState({ requested: true });
      starting = (async () => {
        try {
          const ready = await initialize();
          if (request !== generation) return;
          if (!ready) {
            useSessionStore.setState({ requested: false, running: false });
            return;
          }
          useSessionStore.setState({ running: true });
        } finally {
          if (request === generation) starting = null;
        }
      })();
      return starting;
    },
    resume(): Promise<boolean> {
      if (!useSessionStore.getState().requested) return Promise.resolve(false);
      if (resuming) return resuming;
      starting = null;
      const request = ++generation;
      resuming = (async () => {
        try {
          const ready = await initialize();
          if (request !== generation || !useSessionStore.getState().requested) return false;
          if (ready) useSessionStore.setState({ running: true });
          return ready;
        } finally {
          if (request === generation) resuming = null;
        }
      })();
      return resuming;
    },
    stop() {
      ++generation;
      starting = null;
      resuming = null;
      useSessionStore.setState({ requested: false, running: false });
      stopTanpura('tanpura1');
      stopTanpura('tanpura2');
      stopTabla();
      stopSurPeti();
      stopSwarMandalLoop();
      useTablaStore.getState().setPlaying(false);
    },
    setEnabled,
    toggleInstrument(id: InstrumentId) { setEnabled(id, !selectedInstruments()[id]); },
    async toggleTabla() {
      if (useTablaStore.getState().playing) setEnabled('tabla', false);
      else { setEnabled('tabla', true); await controls.play(); }
    },
    async strum() {
      const request = generation;
      if (!await initialize() || request !== generation) return;
      setEnabled('swarmandal', true);
      // A running auto-loop owns its initial sweep; manual mode can strum while stopped.
      if (!(useSessionStore.getState().running && useSwarMandalStore.getState().autoLoop)) strumSwarMandal();
    },
    cancelPending() { ++generation; starting = null; resuming = null; },
  };
  return controls;
}
