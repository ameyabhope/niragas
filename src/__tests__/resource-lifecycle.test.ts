import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRecordingExtension } from '@/audio/recorder';
import { initTuner, stopTuner } from '@/audio/tuner';

afterEach(() => {
  stopTuner();
  vi.unstubAllGlobals();
});

describe('tuner resources', () => {
  it('releases microphone and AudioContext resources on stop', async () => {
    const stopTrack = vi.fn();
    const disconnectSource = vi.fn();
    const disconnectAnalyser = vi.fn();
    const closeContext = vi.fn(async () => undefined);

    class FakeAudioContext {
      state: AudioContextState = 'running';
      sampleRate = 44100;
      createAnalyser() {
        return { fftSize: 0, disconnect: disconnectAnalyser } as unknown as AnalyserNode;
      }
      createMediaStreamSource() {
        return { connect: vi.fn(), disconnect: disconnectSource } as unknown as MediaStreamAudioSourceNode;
      }
      async resume() {}
      async close() {
        this.state = 'closed';
        await closeContext();
      }
    }

    const stream = {
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn(async () => stream) },
    });
    vi.stubGlobal('AudioContext', FakeAudioContext);

    await initTuner();
    stopTuner();

    expect(stopTrack).toHaveBeenCalledOnce();
    expect(disconnectSource).toHaveBeenCalledOnce();
    expect(disconnectAnalyser).toHaveBeenCalledOnce();
    expect(closeContext).toHaveBeenCalledOnce();
  });
});

describe('recording formats', () => {
  it('derives the download extension from the actual MIME type', () => {
    const blob = new Blob();
    expect(getRecordingExtension({ blob, mimeType: 'audio/webm;codecs=opus' })).toBe('webm');
    expect(getRecordingExtension({ blob, mimeType: 'audio/ogg;codecs=opus' })).toBe('ogg');
    expect(getRecordingExtension({ blob, mimeType: 'audio/mp4' })).toBe('m4a');
  });
});
