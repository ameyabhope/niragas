import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recording } from '@/audio/recorder';

const mocks = vi.hoisted(() => ({
  load: vi.fn(), save: vi.fn(), remove: vi.fn(), download: vi.fn(),
  callbacks: {} as { onRecordingComplete: (recording: Recording) => void },
}));
vi.mock('@/lib/recording-storage', () => ({
  loadRecordings: mocks.load, saveRecording: mocks.save, removeRecording: mocks.remove,
}));
vi.mock('@/audio/recorder', () => ({
  setRecorderCallbacks: (callbacks: typeof mocks.callbacks) => { mocks.callbacks = callbacks; },
  startRecording: vi.fn(), pauseRecording: vi.fn(), resumeRecording: vi.fn(),
  stopRecording: vi.fn(), cancelRecording: vi.fn(), downloadRecording: mocks.download,
  convertToWAV: vi.fn(), getRecordingDuration: () => 0,
}));
import { useRecorderStore } from '@/store/recorder-store';

const recording: Recording = {
  id: 'test-recording', name: 'Practice', blob: new Blob(['audio'], { type: 'audio/webm' }),
  url: 'blob:session', duration: 4, createdAt: 123, mimeType: 'audio/webm',
};
const store = useRecorderStore;

beforeEach(() => {
  vi.resetAllMocks();
  store.setState({ state: 'idle', starting: false, recordings: [], saveStatus: {},
    loading: false, loaded: false, storageError: null, error: null, playingId: null });
});

describe('recording persistence', () => {
  it('warns until the save commits, even after a download request', async () => {
    let commit!: () => void;
    mocks.save.mockReturnValue(new Promise<void>((resolve) => { commit = resolve; }));
    mocks.callbacks.onRecordingComplete(recording);
    expect(store.getState().saveStatus[recording.id]).toBe('saving');
    await store.getState().downloadRecording(recording.id);
    expect(mocks.download).toHaveBeenCalledWith(recording);
    expect(store.getState().hasUnsavedRecordings()).toBe(true);
    commit();
    await vi.waitFor(() => expect(store.getState().saveStatus[recording.id]).toBe('saved'));
    expect(store.getState().hasUnsavedRecordings()).toBe(false);
  });

  it('keeps failed saves in memory and allows retry', async () => {
    mocks.save.mockRejectedValueOnce(new Error('Quota exceeded'));
    mocks.callbacks.onRecordingComplete(recording);
    await vi.waitFor(() => expect(store.getState().saveStatus[recording.id]).toBe('error'));
    expect(store.getState().recordings).toEqual([recording]);
    expect(store.getState().hasUnsavedRecordings()).toBe(true);
    mocks.save.mockResolvedValueOnce(undefined);
    await store.getState().persist(recording.id);
    expect(store.getState().hasUnsavedRecordings()).toBe(false);
  });

  it('restores blobs with fresh URLs and does not duplicate in-session recordings', async () => {
    mocks.load.mockResolvedValue([recording]);
    await store.getState().load();
    const restored = store.getState().recordings[0];
    expect(restored.url).not.toBe(recording.url);
    expect(restored.blob).toBe(recording.blob);
    expect(store.getState().saveStatus[recording.id]).toBe('saved');
    URL.revokeObjectURL(restored.url);
    store.setState({ loaded: false });
    await store.getState().load();
    expect(store.getState().recordings).toHaveLength(1);
  });

  it('retains recordings when deletion fails and blocks deletion during save', async () => {
    store.setState({ recordings: [recording], saveStatus: { [recording.id]: 'saving' } });
    await store.getState().deleteRecording(recording.id);
    expect(mocks.remove).not.toHaveBeenCalled();
    store.setState({ saveStatus: { [recording.id]: 'saved' } });
    mocks.remove.mockRejectedValueOnce(new Error('unavailable'));
    await store.getState().deleteRecording(recording.id);
    expect(store.getState().recordings).toEqual([recording]);
    expect(store.getState().error).toContain('Could not delete');
    mocks.remove.mockResolvedValueOnce(undefined);
    await store.getState().deleteRecording(recording.id);
    expect(store.getState().recordings).toEqual([]);
  });

  it('warns during starting, recording, and paused states', () => {
    store.setState({ starting: true });
    expect(store.getState().hasUnsavedRecordings()).toBe(true);
    for (const state of ['recording', 'paused'] as const) {
      store.setState({ starting: false, state });
      expect(store.getState().hasUnsavedRecordings()).toBe(true);
    }
  });

  it('reports load failures and can retry', async () => {
    mocks.load.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce([]);
    await store.getState().load();
    expect(store.getState().loaded).toBe(false);
    expect(store.getState().storageError).toContain('Could not load');
    await store.getState().load();
    expect(store.getState().loaded).toBe(true);
    expect(store.getState().storageError).toBeNull();
  });
});
