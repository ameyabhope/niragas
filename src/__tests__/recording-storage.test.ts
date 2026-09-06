import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ openDB: vi.fn() }));
vi.mock('idb', () => ({ openDB: mocks.openDB }));
import { saveRecording } from '@/lib/recording-storage';

beforeEach(() => vi.resetAllMocks());

describe('recording storage commit boundary', () => {
  it('uses a separate database, strips session URLs, and waits for transaction completion', async () => {
    let commit!: () => void;
    const done = new Promise<void>((resolve) => { commit = resolve; });
    const put = vi.fn(async () => undefined);
    const close = vi.fn();
    const transaction = vi.fn(() => ({ store: { put }, done }));
    mocks.openDB.mockResolvedValue({ transaction, close });
    const recording = {
      id: 'rec-1', name: 'Practice', blob: new Blob(['audio']), url: 'blob:temporary',
      duration: 1, createdAt: 123, mimeType: 'audio/webm',
    };
    let saved = false;
    const pending = saveRecording(recording).then(() => { saved = true; });
    await vi.waitFor(() => expect(put).toHaveBeenCalledOnce());
    expect(mocks.openDB).toHaveBeenCalledWith('niragas-recordings', 1, expect.any(Object));
    expect(transaction).toHaveBeenCalledWith('recordings', 'readwrite', { durability: 'strict' });
    expect(put.mock.calls[0]).toEqual([{
      id: recording.id, name: recording.name, blob: recording.blob,
      duration: recording.duration, createdAt: recording.createdAt, mimeType: recording.mimeType,
    }]);
    expect(saved).toBe(false);
    expect(close).not.toHaveBeenCalled();
    commit();
    await pending;
    expect(saved).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });
});
