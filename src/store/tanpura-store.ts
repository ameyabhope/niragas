/**
 * Tanpura configuration state for both tanpuras.
 *
 * Now uses loop-based playback from pre-recorded electronic tanpura samples.
 * Controls: tuning (Pa/Ma/Ni), EQ variant, fine pitch, speed.
 */

import { create } from 'zustand';
import type { TanpuraTuning, TanpuraEQ, TanpuraConfig } from '@/audio/types';
import { DEFAULT_TANPURA_CONFIG } from '@/audio/tanpura';

interface TanpuraState {
  tanpura1: TanpuraConfig;
  tanpura2: TanpuraConfig;

  /** Toggle tanpura on/off */
  toggleTanpura: (id: 'tanpura1' | 'tanpura2') => void;
  /** Set the first string tuning (Pa, Ma, Ni) */
  setTuning: (id: 'tanpura1' | 'tanpura2', tuning: TanpuraTuning) => void;
  /** Set EQ variant (neutral, bass, treble) — only affects Pa+C samples */
  setEQ: (id: 'tanpura1' | 'tanpura2', eq: TanpuraEQ) => void;
  /** Set fine pitch adjustment in cents (-50 to +50) */
  setFinePitch: (id: 'tanpura1' | 'tanpura2', cents: number) => void;
  /** Set playback speed (0.7 to 1.4) */
  setSpeed: (id: 'tanpura1' | 'tanpura2', speed: number) => void;
  /** Set full tanpura config */
  setTanpuraConfig: (id: 'tanpura1' | 'tanpura2', config: Partial<TanpuraConfig>) => void;
}

export const useTanpuraStore = create<TanpuraState>((set) => ({
  tanpura1: {
    ...DEFAULT_TANPURA_CONFIG,
    enabled: false,
    pan: -0.3,
  },
  tanpura2: {
    ...DEFAULT_TANPURA_CONFIG,
    enabled: false,
    pan: 0.3,
  },

  toggleTanpura: (id) =>
    set((state) => ({
      [id]: { ...state[id], enabled: !state[id].enabled },
    })),

  setTuning: (id, tuning) =>
    set((state) => ({
      [id]: { ...state[id], tuning },
    })),

  setEQ: (id, eq) =>
    set((state) => ({
      [id]: { ...state[id], eq },
    })),

  setFinePitch: (id, cents) =>
    set((state) => ({
      [id]: { ...state[id], finePitchCents: Math.max(-50, Math.min(50, cents)) },
    })),

  setSpeed: (id, speed) =>
    set((state) => ({
      [id]: { ...state[id], speed: Math.max(0.7, Math.min(1.4, speed)) },
    })),

  setTanpuraConfig: (id, config) =>
    set((state) => ({
      [id]: { ...state[id], ...config },
    })),
}));
