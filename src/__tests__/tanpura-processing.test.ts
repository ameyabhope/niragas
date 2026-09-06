import { describe, expect, it } from 'vitest';
import { stretchTanpuraLoop, tanpuraPitchRate } from '@/audio/tanpura-processing';
import { noteToFreq, setA4Freq } from '@/lib/notes';
import { resolveTanpuraSample } from '@/audio/tanpura';

describe('tanpura WSOLA', () => {
  for (const sampleRate of [44100, 48000]) {
    for (const [rate, speed] of [[0.5, 1.4], [1, 0.7], [2.5, 0.7]]) {
      it(`preserves sine pitch and stereo at ${sampleRate} Hz, rate ${rate}, speed ${speed}`, async () => {
        const input = Float32Array.from({ length: sampleRate * 2 }, (_, i) => 0.25 * Math.sin(2 * Math.PI * 220 * i / sampleRate));
        const [left, right] = await stretchTanpuraLoop([input, input.map(v => -v)], sampleRate, rate, speed);
        expect(left.length).toBe(Math.round(input.length * rate / speed));
        const crossings: number[] = [];
        for (let i = Math.round(sampleRate * 0.1); i < left.length - 1; i++) {
          if (left[i] <= 0 && left[i + 1] > 0) crossings.push(i - left[i] / (left[i + 1] - left[i]));
        }
        const hz = (crossings.length - 1) * sampleRate / (crossings.at(-1)! - crossings[0]);
        expect(Math.abs(1200 * Math.log2(hz / 220))).toBeLessThan(1);
        expect(left.every(Number.isFinite)).toBe(true);
        expect(right.every((v, i) => v === -left[i])).toBe(true);
        expect(Math.abs(left[0] - left.at(-1)!)).toBeLessThan(0.02);
      });
    }
  }
  it('applies shared A4, Sa cents, and fine cents without a speed term', () => {
    try {
      setA4Freq(432);
      const target = noteToFreq('E', 4, 23);
      const source = resolveTanpuraSample('Pa', 'neutral', target);
      expect(tanpuraPitchRate(source.baseRate, -37) * 185).toBeCloseTo(321.027742909327, 8);
    } finally { setA4Freq(440); }
  });
  it('changes measured pulse spacing independently of pitch rate', async () => {
    const sampleRate = 44100;
    const input = Float32Array.from({ length: sampleRate * 10 }, (_, i) => {
      const t = i / sampleRate;
      return Math.sin(2 * Math.PI * 220 * t) * Math.exp(-((t % 2 - 0.5) ** 2) / 0.01);
    });
    for (const rate of [0.5, 2.5]) for (const speed of [0.7, 1.4]) {
      const [pcm] = await stretchTanpuraLoop([input], sampleRate, rate, speed);
      const hop = 441;
      const envelope = [];
      for (let i = 0; i + hop <= pcm.length; i += hop) {
        let sum = 0;
        for (let j = i; j < i + hop; j++) sum += pcm[j] ** 2;
        envelope.push(Math.sqrt(sum / hop));
      }
      const peaks: number[] = [];
      for (let i = 1; i < envelope.length - 1; i++) {
        const t = i * hop / sampleRate / rate;
        if (envelope[i] > 0.4 && envelope[i] > envelope[i - 1] && envelope[i] > envelope[i + 1] &&
            (!peaks.length || t - peaks.at(-1)! > 0.6)) peaks.push(t);
      }
      expect(peaks.length).toBeGreaterThanOrEqual(4);
      const interval = (peaks.at(-1)! - peaks[0]) / (peaks.length - 1);
      expect(Math.abs(interval / (2 / speed) - 1)).toBeLessThan(0.015);
    }
  });
  it('rejects invalid parameters and cancels ongoing work', async () => {
    await expect(stretchTanpuraLoop([], 48000, 1, 1)).rejects.toThrow();
    await expect(stretchTanpuraLoop([new Float32Array(10)], 48000, 1, 0)).rejects.toThrow();
    await expect(stretchTanpuraLoop([new Float32Array(10)], 48000, 1e300, 1)).rejects.toThrow();
    await expect(stretchTanpuraLoop([new Float32Array(1)], 48000, 0.1, 1)).rejects.toThrow();
    await expect(stretchTanpuraLoop(Array.from({ length: 3 }, () => new Float32Array(10)), 48000, 1, 1)).rejects.toThrow();
    const abort = new AbortController();
    const pending = stretchTanpuraLoop([new Float32Array(48000 * 20)], 48000, 2, 0.7, abort.signal);
    abort.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
