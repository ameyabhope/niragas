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
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
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
  /**
   * Apply a saved taal/style/tempo/selection in one store update so
   * subscribers never observe a transient taal/style combination. Loading
   * never starts sound: disabling clears stale sounding state, while an
   * enabled load keeps the current playing state for the live engine to
   * reconcile through the shared session boundary.
   */
  applySetup: (setup: { taalId: string; styleId: string; tempo: number; enabled: boolean }) => void;
}

export const useTablaStore = create<TablaState>((set, get) => ({
  taalId: 'teentaal',
  styleId: 'theka',
  activeTaalId: null,
  activeStyleId: null,
  tempo: 120,
  playing: false,
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
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

  applySetup: ({ taalId, styleId, tempo, enabled }) =>
    set((state) => {
      const taal = getTaal(taalId);
      const validStyle = taal.styles.some((entry) => entry.id === styleId)
        ? styleId
        : taal.styles[0]?.id ?? '';
      // A sounding cycle keeps its style until the audio draw confirms the
      // new selection, mirroring the single-field taal update.
      const nextStyleId = state.playing && taal.id === state.activeTaalId
        ? state.activeStyleId ?? validStyle
        : validStyle;
      const playing = enabled ? state.playing : false;
      const cleared = state.playing && !playing;
      return {
        taalId: taal.id,
        styleId: nextStyleId,
        tempo: clampTempo(taal.id, tempo),
        enabled,
        playing,
        ...(!state.playing || cleared
          ? { activeTaalId: null, activeStyleId: null, currentMatra: 1, currentDivisionLabel: null }
          : {}),
      };
    }),

  setCurrentBeat: (matra, divisionLabel, taalId, styleId) =>
    set((state) => state.playing ? {
      currentMatra: matra, currentDivisionLabel: divisionLabel,
      activeTaalId: taalId, activeStyleId: styleId,
    } : state),
}));
