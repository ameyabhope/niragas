import { describe, it, expect, beforeEach } from 'vitest';
import {
  noteToFreq,
  freqToNote,
  noteToSwar,
  swarToToneNote,
  setA4Freq,
} from '@/lib/notes';

beforeEach(() => {
  setA4Freq(440);
});

describe('noteToFreq', () => {
  it('returns 440 Hz for A4', () => {
    expect(noteToFreq('A', 4)).toBeCloseTo(440, 1);
  });

  it('returns 261.63 Hz for C4 (middle C)', () => {
    expect(noteToFreq('C', 4)).toBeCloseTo(261.63, 0);
  });

  it('returns 130.81 Hz for C3', () => {
    expect(noteToFreq('C', 3)).toBeCloseTo(130.81, 0);
  });

  it('returns 880 Hz for A5', () => {
    expect(noteToFreq('A', 5)).toBeCloseTo(880, 1);
  });

  it('respects cents offset', () => {
    const base = noteToFreq('A', 4);
    const up50 = noteToFreq('A', 4, 50);
    // 50 cents = half a semitone up
    expect(up50).toBeGreaterThan(base);
    expect(up50).toBeCloseTo(base * Math.pow(2, 50 / 1200), 2);
  });

  it('uses 432 Hz when A4 is reconfigured', () => {
    setA4Freq(432);
    expect(noteToFreq('A', 4)).toBeCloseTo(432, 1);
  });

  it('throws for invalid note', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => noteToFreq('X' as any, 4)).toThrow('Invalid note');
  });
});

describe('freqToNote', () => {
  it('returns A4 for 440 Hz', () => {
    const result = freqToNote(440);
    expect(result.note).toBe('A');
    expect(result.octave).toBe(4);
    expect(result.cents).toBe(0);
  });

  it('returns C4 for ~261.63 Hz', () => {
    const result = freqToNote(261.63);
    expect(result.note).toBe('C');
    expect(result.octave).toBe(4);
    expect(Math.abs(result.cents)).toBeLessThanOrEqual(1);
  });

  it('round-trips correctly', () => {
    const freq = noteToFreq('F#', 3);
    const result = freqToNote(freq);
    expect(result.note).toBe('F#');
    expect(result.octave).toBe(3);
    expect(result.cents).toBe(0);
  });
});

describe('noteToSwar', () => {
  it('returns Sa when note equals Sa', () => {
    expect(noteToSwar('C#', 'C#')).toBe('Sa');
  });

  it('returns Pa for 7 semitones above Sa', () => {
    // C# + 7 = G#
    expect(noteToSwar('G#', 'C#')).toBe('Pa');
  });

  it('returns Ma for 5 semitones above Sa', () => {
    // C# + 5 = F#
    expect(noteToSwar('F#', 'C#')).toBe('Ma');
  });

  it('returns komal re for 1 semitone above Sa', () => {
    // C# + 1 = D
    expect(noteToSwar('D', 'C#')).toBe('re');
  });

  it('wraps around correctly', () => {
    // Sa = G#, so G# → G# = Sa
    expect(noteToSwar('G#', 'G#')).toBe('Sa');
  });
});

describe('swarToToneNote', () => {
  it('returns Sa correctly', () => {
    expect(swarToToneNote('C#', 3, 'Sa')).toBe('C#3');
  });

  it('returns Pa correctly', () => {
    // C# + 7 semitones = G#
    expect(swarToToneNote('C#', 3, 'Pa')).toBe('G#3');
  });

  it('handles komal Re', () => {
    // C# + 1 = D
    expect(swarToToneNote('C#', 3, 'Re', 'komal')).toBe('D3');
  });

  it('handles tivra Ma', () => {
    // C# + 6 = G
    expect(swarToToneNote('C#', 3, 'Ma', 'tivra')).toBe('G3');
  });

  it('handles octave offset', () => {
    expect(swarToToneNote('C#', 3, 'Sa', 'shuddha', 1)).toBe('C#4');
  });

  it('wraps note names across octave boundary', () => {
    // Sa=B3, Pa = B+7 = F#4
    expect(swarToToneNote('B', 3, 'Pa')).toBe('F#4');
  });
});
