import { create } from 'zustand';
import type { NoteName } from '@/audio/types';

export const TUNER_SIGNAL_TTL_MS = 500;

export interface TunerPitch {
  freq: number;
  note: NoteName;
  octave: number;
  cents: number;
  clarity: number;
  detectedAt: number;
}

export const useTunerStore = create<{
  micActive: boolean;
  pitch: TunerPitch | null;
}>(() => ({ micActive: false, pitch: null }));

export function getFreshTunerPitch(): TunerPitch | null {
  const { micActive, pitch } = useTunerStore.getState();
  return micActive && pitch && performance.now() - pitch.detectedAt < TUNER_SIGNAL_TTL_MS
    ? pitch : null;
}
