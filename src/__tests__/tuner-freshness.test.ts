import { afterEach, describe, expect, it, vi } from 'vitest';
import { PitchDetector } from 'pitchy';
import { initTuner, startTuner, stopTuner } from '@/audio/tuner';
import { getFreshTunerPitch, TUNER_SIGNAL_TTL_MS, useTunerStore } from '@/store/tuner-store';

afterEach(() => {
  stopTuner();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('tuner freshness', () => {
  it('clears expired signal and rejects capture even before the timer runs', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop: vi.fn() }] }) } });
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      sampleRate = 44100;
      createAnalyser() { return { fftSize: 4096, getFloatTimeDomainData: vi.fn(), disconnect: vi.fn() }; }
      createMediaStreamSource() { return { connect: vi.fn(), disconnect: vi.fn() }; }
      close = vi.fn();
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(PitchDetector.prototype, 'findPitch').mockReturnValue([220, 0.99]);
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    await initTuner();
    expect(useTunerStore.getState().micActive).toBe(true);
    startTuner();
    expect(getFreshTunerPitch()?.freq).toBe(220);
    now.mockReturnValue(TUNER_SIGNAL_TTL_MS);
    expect(getFreshTunerPitch()).toBeNull();
    vi.advanceTimersByTime(TUNER_SIGNAL_TTL_MS);
    expect(useTunerStore.getState().pitch).toBeNull();
    stopTuner();
    expect(useTunerStore.getState().micActive).toBe(false);
  });

  it('releases a microphone granted after stop without activating it', async () => {
    const stop = vi.fn();
    let grant!: (stream: unknown) => void;
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise((resolve) => { grant = resolve; }) } });
    const pending = initTuner();
    stopTuner();
    grant({ getTracks: () => [{ stop }] });
    expect(await pending).toBe(false);
    expect(stop).toHaveBeenCalledOnce();
    expect(useTunerStore.getState().micActive).toBe(false);
  });
});
