/**
 * Swar Mandal state: string configuration, loop settings.
 */

import { create } from 'zustand';
import type { SwarMandalStringConfig, SwarName, SwarVariant } from '@/audio/types';

/** Default 15 strings: Sa Re Ga Ma Pa Dha Ni across ~2 octaves */
function defaultStrings(): SwarMandalStringConfig[] {
  const swaras: { note: SwarName; variant: SwarVariant; octave: number }[] = [
    { note: 'Sa', variant: 'shuddha', octave: 0 },
    { note: 'Re', variant: 'shuddha', octave: 0 },
    { note: 'Ga', variant: 'shuddha', octave: 0 },
    { note: 'Ma', variant: 'shuddha', octave: 0 },
    { note: 'Pa', variant: 'shuddha', octave: 0 },
    { note: 'Dha', variant: 'shuddha', octave: 0 },
    { note: 'Ni', variant: 'shuddha', octave: 0 },
    { note: 'Sa', variant: 'shuddha', octave: 1 },
    { note: 'Re', variant: 'shuddha', octave: 1 },
    { note: 'Ga', variant: 'shuddha', octave: 1 },
    { note: 'Ma', variant: 'shuddha', octave: 1 },
    { note: 'Pa', variant: 'shuddha', octave: 1 },
    { note: 'Dha', variant: 'shuddha', octave: 1 },
    { note: 'Ni', variant: 'shuddha', octave: 1 },
    { note: 'Sa', variant: 'shuddha', octave: 2 },
  ];

  return swaras.map((s) => ({
    note: s.note,
    variant: s.variant,
    octaveOffset: s.octave,
    enabled: true,
  }));
}

interface SwarMandalState {
  enabled: boolean;
  strings: SwarMandalStringConfig[];
  autoLoop: boolean;
  loopDuration: number;

  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
  toggleString: (index: number) => void;
  setStringNote: (index: number, note: SwarName, variant?: SwarVariant) => void;
  setAutoLoop: (autoLoop: boolean) => void;
  setLoopDuration: (duration: number) => void;
}

export const useSwarMandalStore = create<SwarMandalState>((set) => ({
  enabled: false,
  strings: defaultStrings(),
  autoLoop: false,
  loopDuration: 8,

  toggle: () => set((state) => ({ enabled: !state.enabled })),
  setEnabled: (enabled) => set({ enabled }),

  toggleString: (index) =>
    set((state) => ({
      strings: state.strings.map((s, i) =>
        i === index ? { ...s, enabled: !s.enabled } : s
      ),
    })),

  setStringNote: (index, note, variant = 'shuddha') =>
    set((state) => ({
      strings: state.strings.map((s, i) =>
        i === index ? { ...s, note, variant } : s
      ),
    })),

  setAutoLoop: (autoLoop) => set({ autoLoop }),
  setLoopDuration: (duration) => set({ loopDuration: Math.max(2, Math.min(30, duration)) }),
}));
