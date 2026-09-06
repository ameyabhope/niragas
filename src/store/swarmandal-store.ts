/**
 * Swar Mandal state: string configuration, loop settings.
 */

import { create } from 'zustand';
import type { SwarMandalConfig, SwarMandalStringConfig, SwarName, SwarVariant } from '@/audio/types';

/** Neutral starting point until a raag or custom tuning is selected. */
function defaultStrings(): SwarMandalStringConfig[] {
  const swaras: { note: SwarName; variant: SwarVariant; octave: number }[] = [
    { note: 'Sa', variant: 'shuddha', octave: 0 },
    { note: 'Sa', variant: 'shuddha', octave: 1 },
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
  setStringOctave: (index: number, octaveOffset: number) => void;
  addString: () => void;
  removeString: (index: number) => void;
  setAutoLoop: (autoLoop: boolean) => void;
  setLoopDuration: (duration: number) => void;
  setConfig: (config: SwarMandalConfig) => void;
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
  setStringOctave: (index, octaveOffset) => {
    if (!Number.isInteger(octaveOffset) || octaveOffset < -2 || octaveOffset > 3) return;
    set((state) => ({ strings: state.strings.map((s, i) => i === index ? { ...s, octaveOffset } : s) }));
  },
  addString: () => set((state) => ({
    strings: state.strings.length >= 64 ? state.strings : [
      ...state.strings, { note: 'Sa', variant: 'shuddha', octaveOffset: 0, enabled: true },
    ],
  })),
  removeString: (index) => set((state) => ({ strings: state.strings.filter((_, i) => i !== index) })),
  setLoopDuration: (duration) => set({ loopDuration: Math.max(2, Math.min(30, duration)) }),
  setConfig: (config) =>
    set({
      enabled: config.enabled,
      strings: config.strings.map((string) => ({ ...string })),
      autoLoop: config.autoLoop,
      loopDuration: Math.max(2, Math.min(30, config.loopDuration)),
    }),
}));
