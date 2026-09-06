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
  /** Sounding selection, updated only by audio draws; never persisted. */
  activeTaalId: string | null;
  activeStyleId: string | null;
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
  setCurrentBeat: (matra: number, divisionLabel: string | null, taalId: string, styleId: string) => void;
}

export const useTablaStore = create<TablaState>((set, get) => ({
  taalId: 'teentaal',
  styleId: 'theka',
  activeTaalId: null,
  activeStyleId: null,
  tempo: 120,
  playing: false,
  currentMatra: 1,
  currentDivisionLabel: null,

  setTaalId: (id) =>
    set((state) => {
      const taal = getTaal(id);
      if (taal.id === state.taalId) return state;
      return {
        taalId: taal.id,
        styleId: state.playing && taal.id === state.activeTaalId
          ? state.activeStyleId ?? taal.styles[0]?.id ?? ''
          : taal.styles[0]?.id ?? '',
        tempo: clampTempo(taal.id, state.tempo),
        ...(!state.playing ? { currentMatra: 1, currentDivisionLabel: null } : {}),
      };
    }),
  setStyleId: (id) => set((state) => ({
    styleId: getTaal(state.taalId).styles.find((style) => style.id === id)?.id
      ?? getTaal(state.taalId).styles[0]?.id ?? '',
  })),

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

  setPlaying: (playing) => set((state) => state.playing === playing ? state : ({
    playing,
    activeTaalId: null,
    activeStyleId: null,
    currentMatra: 1,
    currentDivisionLabel: null,
  })),

  togglePlaying: () => get().setPlaying(!get().playing),

  setCurrentBeat: (matra, divisionLabel, taalId, styleId) =>
    set((state) => state.playing ? {
      currentMatra: matra, currentDivisionLabel: divisionLabel,
      activeTaalId: taalId, activeStyleId: styleId,
    } : state),
}));
