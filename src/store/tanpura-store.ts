/**
 * Tanpura configuration state for both tanpuras.
 */

import { create } from 'zustand';
import type { TanpuraConfig, TanpuraStringConfig, SwarName, SwarVariant } from '@/audio/types';
import { DEFAULT_TANPURA_STRINGS } from '@/audio/types';

interface TanpuraState {
  tanpura1: TanpuraConfig;
  tanpura2: TanpuraConfig;

  /** Toggle tanpura on/off */
  toggleTanpura: (id: 'tanpura1' | 'tanpura2') => void;
  /** Set the first string tuning (Pa, Ma, Ni, etc.) */
  setFirstString: (id: 'tanpura1' | 'tanpura2', note: SwarName, variant?: SwarVariant) => void;
  /** Set a specific string's configuration */
  setString: (id: 'tanpura1' | 'tanpura2', index: number, config: Partial<TanpuraStringConfig>) => void;
  /** Set cycle speed (seconds per full cycle) */
  setCycleSpeed: (id: 'tanpura1' | 'tanpura2', speed: number) => void;
  /** Set full tanpura config */
  setTanpuraConfig: (id: 'tanpura1' | 'tanpura2', config: Partial<TanpuraConfig>) => void;
}

const defaultTanpura = (pan: number): TanpuraConfig => ({
  enabled: false,
  strings: DEFAULT_TANPURA_STRINGS.map((s) => ({ ...s })),
  pan,
  volume: 0.75,
  cycleSpeed: 5, // 5 seconds per full cycle
});

export const useTanpuraStore = create<TanpuraState>((set) => ({
  tanpura1: { ...defaultTanpura(-0.3), enabled: true },
  tanpura2: defaultTanpura(0.3),

  toggleTanpura: (id) =>
    set((state) => ({
      [id]: { ...state[id], enabled: !state[id].enabled },
    })),

  setFirstString: (id, note, variant = 'shuddha') =>
    set((state) => ({
      [id]: {
        ...state[id],
        strings: state[id].strings.map((s, i) =>
          i === 0 ? { ...s, note, variant } : s
        ),
      },
    })),

  setString: (id, index, config) =>
    set((state) => ({
      [id]: {
        ...state[id],
        strings: state[id].strings.map((s, i) =>
          i === index ? { ...s, ...config } : s
        ),
      },
    })),

  setCycleSpeed: (id, speed) =>
    set((state) => ({
      [id]: { ...state[id], cycleSpeed: Math.max(2, Math.min(10, speed)) },
    })),

  setTanpuraConfig: (id, config) =>
    set((state) => ({
      [id]: { ...state[id], ...config },
    })),
}));
