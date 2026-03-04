/**
 * EQ state store.
 */

import { create } from 'zustand';
import type { EQBand } from '@/audio/types';
import { DEFAULT_EQ_BANDS } from '@/audio/eq';

interface EQStoreState {
  enabled: boolean;
  bands: EQBand[];
  presetName: string;

  setEnabled: (enabled: boolean) => void;
  setBandGain: (index: number, gain: number) => void;
  setBandQ: (index: number, Q: number) => void;
  setPreset: (name: string, bands: EQBand[]) => void;
  resetToFlat: () => void;
}

export const useEQStore = create<EQStoreState>((set) => ({
  enabled: true,
  bands: DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
  presetName: 'Flat',

  setEnabled: (enabled) => set({ enabled }),

  setBandGain: (index, gain) =>
    set((state) => ({
      bands: state.bands.map((b, i) =>
        i === index ? { ...b, gain: Math.max(-12, Math.min(12, gain)) } : b
      ),
      presetName: 'Custom',
    })),

  setBandQ: (index, Q) =>
    set((state) => ({
      bands: state.bands.map((b, i) =>
        i === index ? { ...b, Q: Math.max(0.1, Math.min(10, Q)) } : b
      ),
      presetName: 'Custom',
    })),

  setPreset: (name, bands) =>
    set({
      presetName: name,
      bands: bands.map((b) => ({ ...b })),
    }),

  resetToFlat: () =>
    set({
      presetName: 'Flat',
      bands: DEFAULT_EQ_BANDS.map((b) => ({ ...b })),
    }),
}));
