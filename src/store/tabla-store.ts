/**
 * Tabla state: taal selection, style, tempo, playback.
 */

import { create } from 'zustand';

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

  setTaalId: (id) => set({ taalId: id, styleId: 'theka', currentMatra: 1 }),
  setStyleId: (id) => set({ styleId: id }),

  setTempo: (bpm) => set({ tempo: Math.max(10, Math.min(700, bpm)) }),

  adjustTempo: (delta) =>
    set((state) => ({
      tempo: Math.max(10, Math.min(700, state.tempo + delta)),
    })),

  halfTempo: () =>
    set((state) => ({
      tempo: Math.max(10, Math.round(state.tempo / 2)),
    })),

  doubleTempo: () =>
    set((state) => ({
      tempo: Math.min(700, state.tempo * 2),
    })),

  setPlaying: (playing) => set({ playing }),

  togglePlaying: () => set((state) => ({ playing: !state.playing })),

  setCurrentBeat: (matra, divisionLabel) =>
    set({ currentMatra: matra, currentDivisionLabel: divisionLabel }),
}));
