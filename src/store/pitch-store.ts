/**
 * Global pitch (Sa) state.
 * All instruments share this pitch as their root.
 */

import { create } from 'zustand';
import type { NoteName } from '@/audio/types';
import { NOTE_NAMES } from '@/lib/notes';

interface PitchState {
  /** Current note name for Sa */
  note: NoteName;
  /** Octave number (2-4 range, default 3) */
  octave: number;
  /** Fine-tune offset in cents (-50 to +50) */
  cents: number;

  /** Set the note (e.g., "C#") */
  setNote: (note: NoteName) => void;
  /** Move up one semitone */
  noteUp: () => void;
  /** Move down one semitone */
  noteDown: () => void;
  /** Set the octave */
  setOctave: (octave: number) => void;
  /** Set fine-tune cents */
  setCents: (cents: number) => void;
  /** Adjust cents by a delta */
  adjustCents: (delta: number) => void;
  /** Set everything at once */
  setPitch: (note: NoteName, octave: number, cents: number) => void;
}

export const usePitchStore = create<PitchState>((set) => ({
  note: 'C#',
  octave: 3,
  cents: 0,

  setNote: (note) => set({ note }),

  noteUp: () =>
    set((state) => {
      const idx = NOTE_NAMES.indexOf(state.note);
      const nextIdx = (idx + 1) % 12;
      const octave = nextIdx === 0 ? Math.min(state.octave + 1, 4) : state.octave;
      // Don't go above E4
      if (octave === 4 && nextIdx > NOTE_NAMES.indexOf('E')) return state;
      return { note: NOTE_NAMES[nextIdx], octave };
    }),

  noteDown: () =>
    set((state) => {
      const idx = NOTE_NAMES.indexOf(state.note);
      const prevIdx = (idx - 1 + 12) % 12;
      const octave = prevIdx === 11 ? Math.max(state.octave - 1, 2) : state.octave;
      // Don't go below A2
      if (octave === 2 && prevIdx < NOTE_NAMES.indexOf('A')) return state;
      return { note: NOTE_NAMES[prevIdx], octave };
    }),

  setOctave: (octave) => set({ octave: Math.max(2, Math.min(4, octave)) }),

  setCents: (cents) => set({ cents: Math.max(-50, Math.min(50, cents)) }),

  adjustCents: (delta) =>
    set((state) => ({
      cents: Math.max(-50, Math.min(50, state.cents + delta)),
    })),

  setPitch: (note, octave, cents) => set({ note, octave, cents }),
}));
