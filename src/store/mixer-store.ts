/**
 * Mixer state: per-instrument volume, pan, mute + master.
 */

import { create } from 'zustand';
import type { InstrumentId, ChannelState } from '@/audio/types';

const defaultChannel = (): ChannelState => ({
  volume: 0.75,
  pan: 0,
  muted: false,
});

interface MixerState {
  channels: Record<InstrumentId, ChannelState>;
  masterVolume: number;
  masterMuted: boolean;

  setVolume: (id: InstrumentId, volume: number) => void;
  setPan: (id: InstrumentId, pan: number) => void;
  toggleMute: (id: InstrumentId) => void;
  setMuted: (id: InstrumentId, muted: boolean) => void;
  setMasterVolume: (volume: number) => void;
  toggleMasterMute: () => void;
  setMasterMuted: (muted: boolean) => void;
}

export const useMixerStore = create<MixerState>((set) => ({
  channels: {
    tanpura1: { ...defaultChannel(), pan: -0.3 },
    tanpura2: { ...defaultChannel(), pan: 0.3 },
    tabla: defaultChannel(),
    surpeti: defaultChannel(),
    swarmandal: defaultChannel(),
  },
  masterVolume: 0.8,
  masterMuted: false,

  setVolume: (id, volume) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], volume: Math.max(0, Math.min(1, volume)) },
      },
    })),

  setPan: (id, pan) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], pan: Math.max(-1, Math.min(1, pan)) },
      },
    })),

  toggleMute: (id) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], muted: !state.channels[id].muted },
      },
    })),

  setMuted: (id, muted) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], muted },
      },
    })),

  setMasterVolume: (volume) =>
    set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

  toggleMasterMute: () =>
    set((state) => ({ masterMuted: !state.masterMuted })),

  setMasterMuted: (masterMuted) => set({ masterMuted }),
}));
