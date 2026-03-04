/**
 * Recording state management.
 */

import { create } from 'zustand';
import type { RecordingState, Recording } from '@/audio/recorder';
import {
  startRecording as startRec,
  pauseRecording as pauseRec,
  resumeRecording as resumeRec,
  stopRecording as stopRec,
  cancelRecording as cancelRec,
  downloadRecording as downloadRec,
  convertToWAV,
  setRecorderCallbacks,
  getRecordingDuration,
} from '@/audio/recorder';

interface RecorderStoreState {
  /** Current recording state */
  state: RecordingState;
  /** Whether to include microphone in recording */
  includeMic: boolean;
  /** Completed recordings */
  recordings: Recording[];
  /** Currently playing recording ID */
  playingId: string | null;
  /** Current recording elapsed time in seconds */
  elapsed: number;

  // Actions
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  cancel: () => void;
  toggleMic: () => void;
  deleteRecording: (id: string) => void;
  downloadRecording: (id: string, format?: 'webm' | 'wav') => Promise<void>;
  setPlayingId: (id: string | null) => void;
  updateElapsed: () => void;
}

export const useRecorderStore = create<RecorderStoreState>((set, get) => {
  // Register callbacks from the recorder engine
  setRecorderCallbacks({
    onStateChange: (state) => set({ state }),
    onRecordingComplete: (recording) =>
      set((s) => ({ recordings: [recording, ...s.recordings] })),
  });

  return {
    state: 'idle',
    includeMic: false,
    recordings: [],
    playingId: null,
    elapsed: 0,

    start: async () => {
      const { includeMic } = get();
      try {
        await startRec(includeMic);
      } catch (err) {
        console.error('[RecorderStore] Failed to start recording:', err);
      }
    },

    pause: () => pauseRec(),
    resume: () => resumeRec(),
    stop: () => stopRec(),
    cancel: () => cancelRec(),

    toggleMic: () => set((s) => ({ includeMic: !s.includeMic })),

    deleteRecording: (id) =>
      set((s) => {
        const rec = s.recordings.find((r) => r.id === id);
        if (rec) URL.revokeObjectURL(rec.url);
        return { recordings: s.recordings.filter((r) => r.id !== id) };
      }),

    downloadRecording: async (id, format = 'webm') => {
      const rec = get().recordings.find((r) => r.id === id);
      if (!rec) return;

      if (format === 'wav') {
        try {
          const wavBlob = await convertToWAV(rec);
          const url = URL.createObjectURL(wavBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${rec.name.replace(/[^a-zA-Z0-9 ]/g, '')}.wav`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('[RecorderStore] WAV conversion failed:', err);
          // Fallback to WebM
          downloadRec(rec);
        }
      } else {
        downloadRec(rec);
      }
    },

    setPlayingId: (id) => set({ playingId: id }),

    updateElapsed: () => {
      set({ elapsed: getRecordingDuration() });
    },
  };
});
