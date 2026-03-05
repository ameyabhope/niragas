/**
 * Mixer state: per-instrument volume, pan, mute + master.
 */

import { create } from 'zustand';
import type { InstrumentId, ChannelState } from '@/audio/types';

const defaultChannel = (enabled = false): ChannelState => ({
  enabled,
  volume: 0.75,
  pan: 0,
  muted: false,
});

interface MixerState {
  channels: Record<InstrumentId, ChannelState>;
  masterVolume: number;
  masterMuted: boolean;

  /** Toggle an instrument on/off */
  toggleEnabled: (id: InstrumentId) => void;
  /** Set volume for an instrument (0-1) */
  setVolume: (id: InstrumentId, volume: number) => void;
  /** Set pan for an instrument (-1 to 1) */
  setPan: (id: InstrumentId, pan: number) => void;
  /** Toggle mute for an instrument */
  toggleMute: (id: InstrumentId) => void;
  /** Set master volume */
  setMasterVolume: (volume: number) => void;
  /** Toggle master mute */
  toggleMasterMute: () => void;
}

export const useMixerStore = create<MixerState>((set) => ({
  channels: {
    tanpura1: { ...defaultChannel(false), pan: -0.3 },
    tanpura2: { ...defaultChannel(false), pan: 0.3 },
    tabla: defaultChannel(false),
    surpeti: defaultChannel(false),
    swarmandal: defaultChannel(false),
    manjira: defaultChannel(false),
    metronome: defaultChannel(false),
  },
  masterVolume: 0.8,
  masterMuted: false,

  toggleEnabled: (id) =>
    set((state) => ({
      channels: {
        ...state.channels,
        [id]: { ...state.channels[id], enabled: !state.channels[id].enabled },
      },
    })),

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

  setMasterVolume: (volume) =>
    set({ masterVolume: Math.max(0, Math.min(1, volume)) }),

  toggleMasterMute: () =>
    set((state) => ({ masterMuted: !state.masterMuted })),
}));
