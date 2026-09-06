import { create } from 'zustand';
import type { RecordingState, Recording } from '@/audio/recorder';
import {
  startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording,
  downloadRecording, convertToWAV, setRecorderCallbacks, getRecordingDuration,
} from '@/audio/recorder';
import { loadRecordings, saveRecording, removeRecording } from '@/lib/recording-storage';

type SaveStatus = 'saving' | 'saved' | 'error';
interface RecorderStoreState {
  state: RecordingState;
  starting: boolean;
  includeMic: boolean;
  recordings: Recording[];
  saveStatus: Record<string, SaveStatus>;
  storageError: string | null;
  loading: boolean;
  loaded: boolean;
  playingId: string | null;
  elapsed: number;
  error: string | null;
  load: () => Promise<void>;
  persist: (id: string) => Promise<void>;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  cancel: () => void;
  toggleMic: () => void;
  deleteRecording: (id: string) => Promise<void>;
  downloadRecording: (id: string, format?: 'original' | 'wav') => Promise<void>;
  setPlayingId: (id: string | null) => void;
  setError: (error: string | null) => void;
  updateElapsed: () => void;
  hasUnsavedRecordings: () => boolean;
}

export const useRecorderStore = create<RecorderStoreState>((set, get) => {
  setRecorderCallbacks({
    onStateChange: (state) => set({ state }),
    onRecordingComplete: (recording) => {
      set((s) => ({ recordings: [recording, ...s.recordings] }));
      void get().persist(recording.id);
    },
    onError: (error) => set({ error }),
  });
  return {
    state: 'idle', starting: false, includeMic: false, recordings: [], saveStatus: {},
    storageError: null, loading: false, loaded: false, playingId: null, elapsed: 0, error: null,
    load: async () => {
      if (get().loading || get().loaded) return;
      set({ loading: true, storageError: null });
      try {
        const stored = await loadRecordings();
        set((s) => {
          const existing = new Set(s.recordings.map((r) => r.id));
          const restored = stored.filter((r) => !existing.has(r.id));
          return {
            recordings: [...s.recordings, ...restored.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }))]
              .sort((a, b) => b.createdAt - a.createdAt),
            saveStatus: { ...Object.fromEntries(restored.map((r) => [r.id, 'saved' as const])), ...s.saveStatus },
            loaded: true,
          };
        });
      } catch {
        set({ storageError: 'Could not load recordings from browser storage. Retry to restore saved recordings.' });
      } finally { set({ loading: false }); }
    },
    persist: async (id) => {
      const recording = get().recordings.find((r) => r.id === id);
      if (!recording || get().saveStatus[id] === 'saving') return;
      set((s) => ({ saveStatus: { ...s.saveStatus, [id]: 'saving' } }));
      try {
        await saveRecording(recording);
        set((s) => ({ saveStatus: { ...s.saveStatus, [id]: 'saved' } }));
      } catch {
        set((s) => ({ saveStatus: { ...s.saveStatus, [id]: 'error' } }));
      }
    },
    start: async () => {
      if (get().starting || get().state !== 'idle') return;
      set({ starting: true, error: null, elapsed: 0 });
      try { await startRecording(get().includeMic); }
      catch (err) { set({ error: err instanceof Error ? err.message : 'Failed to start recording.' }); }
      finally { set({ starting: false }); }
    },
    pause: pauseRecording, resume: resumeRecording, stop: stopRecording, cancel: cancelRecording,
    toggleMic: () => set((s) => ({ includeMic: !s.includeMic })),
    deleteRecording: async (id) => {
      if (get().saveStatus[id] === 'saving' || get().loading) return;
      try {
        await removeRecording(id);
        const rec = get().recordings.find((r) => r.id === id);
        if (rec) URL.revokeObjectURL(rec.url);
        set((s) => {
          const saveStatus = { ...s.saveStatus };
          delete saveStatus[id];
          return { recordings: s.recordings.filter((r) => r.id !== id), saveStatus,
            playingId: s.playingId === id ? null : s.playingId };
        });
      } catch { set({ error: 'Could not delete recording from browser storage. Please retry.' }); }
    },
    downloadRecording: async (id, format = 'original') => {
      const rec = get().recordings.find((r) => r.id === id);
      if (!rec) return;
      try {
        if (format === 'original') { downloadRecording(rec); return; }
        const blob = await convertToWAV(rec);
        const url = URL.createObjectURL(blob);
        try {
          const a = document.createElement('a');
          a.href = url;
          a.download = `${rec.name.replace(/[^a-zA-Z0-9 ]/g, '')}.wav`;
          a.click();
        } finally {
          // Give the browser time to consume the URL; a click does not prove a file was saved.
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
        }
      } catch { set({ error: 'Could not export recording. Try downloading the original format.' }); }
    },
    setPlayingId: (playingId) => set({ playingId }),
    setError: (error) => set({ error }),
    updateElapsed: () => set({ elapsed: getRecordingDuration() }),
    hasUnsavedRecordings: () => {
      const s = get();
      return s.starting || s.state !== 'idle' || s.recordings.some((r) => s.saveStatus[r.id] !== 'saved');
    },
  };
});
