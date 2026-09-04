/**
 * Tabla state: taal selection, style, tempo, playback.
 */

import { create } from 'zustand';
import { getTaal } from '@/data/taals';

function clampTempo(taalId: string, bpm: number): number {
  const { min, max } = getTaal(taalId).tempoRange;
  return Math.max(min, Math.min(max, Math.round(bpm)));
}

interface TablaState {
  /** Selected taal ID */
  taalId: string;
  /** Selected style ID */
  styleId: string;
  /** Tempo in BPM */
  tempo: number;
  /** Whether tabla is playing */
  playing: boolean;
  /** Current matra being played (1-indexed) */
  currentMatra: number;
  /** Current division label (Sam, Taali, Khaali marker) */
  currentDivisionLabel: string | null;

  setTaalId: (id: string) => void;
  setStyleId: (id: string) => void;
  setTempo: (bpm: number) => void;
  adjustTempo: (delta: number) => void;
  halfTempo: () => void;
  doubleTempo: () => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setCurrentBeat: (matra: number, divisionLabel: string | null) => void;
}

export const useTablaStore = create<TablaState>((set) => ({
  taalId: 'teentaal',
  styleId: 'theka',
  tempo: 120,
  playing: false,
  currentMatra: 1,
  currentDivisionLabel: null,

  setTaalId: (id) =>
    set((state) => {
      const taal = getTaal(id);
      return {
        taalId: taal.id,
        styleId: taal.styles[0]?.id ?? '',
        tempo: clampTempo(taal.id, state.tempo),
        currentMatra: 1,
      };
    }),
  setStyleId: (id) => set({ styleId: id }),

  setTempo: (bpm) => set((state) => ({ tempo: clampTempo(state.taalId, bpm) })),

  adjustTempo: (delta) =>
    set((state) => ({
      tempo: clampTempo(state.taalId, state.tempo + delta),
    })),

  halfTempo: () =>
    set((state) => ({
      tempo: clampTempo(state.taalId, state.tempo / 2),
    })),

  doubleTempo: () =>
    set((state) => ({
      tempo: clampTempo(state.taalId, state.tempo * 2),
    })),

  setPlaying: (playing) => set({ playing }),

  togglePlaying: () => set((state) => ({ playing: !state.playing })),

  setCurrentBeat: (matra, divisionLabel) =>
    set({ currentMatra: matra, currentDivisionLabel: divisionLabel }),
}));
