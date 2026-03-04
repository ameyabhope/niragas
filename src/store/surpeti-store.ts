/**
 * Sur-Peti (Shruti Box) state.
 */

import { create } from 'zustand';

interface SurPetiState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const useSurPetiStore = create<SurPetiState>((set) => ({
  enabled: false,
  toggle: () => set((state) => ({ enabled: !state.enabled })),
  setEnabled: (enabled) => set({ enabled }),
}));
