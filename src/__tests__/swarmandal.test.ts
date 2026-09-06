import { afterEach, describe, expect, it, vi } from 'vitest';

const audio = vi.hoisted(() => ({
  clocks: [] as { callback: (time: number, tick: number) => void; frequency: number; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[],
  attacks: [] as ReturnType<typeof vi.fn>[],
  disposals: [] as ReturnType<typeof vi.fn>[],
}));

vi.mock('tone', () => ({
  now: () => 10,
  Reverb: class {
    connect() { return this; }
    dispose() {}
  },
  PluckSynth: class {
    volume = { value: 0 };
    triggerAttack = vi.fn();
    constructor() { audio.attacks.push(this.triggerAttack); audio.disposals.push(this.dispose); }
    connect() { return this; }
    triggerRelease() {}
    dispose = vi.fn();
  },
  Clock: class {
    callback: (time: number, tick: number) => void;
    frequency: number;
    start = vi.fn();
    stop = vi.fn();
    dispose = vi.fn();
    constructor(callback: (time: number, tick: number) => void, frequency: number) {
      this.callback = callback;
      this.frequency = frequency;
      audio.clocks.push(this);
    }
  },
  // No transport: the scheduler must not consult tabla BPM or start transport.
}));
vi.mock('@/audio/mixer', () => ({ getChannelInput: vi.fn() }));

import { createSwarMandal, disposeSwarMandal, startSwarMandalLoop, stopSwarMandalLoop, updateSwarMandal, isSwarMandalPlaying, strumSwarMandal } from '@/audio/swarmandal';

afterEach(() => {
  disposeSwarMandal();
  audio.clocks.length = 0;
  audio.attacks.length = 0;
  audio.disposals.length = 0;
});

describe('Swar Mandal seconds scheduler', () => {
  it('uses a BPM-independent frequency and the scheduled audio time for each pluck', () => {
    createSwarMandal();
    updateSwarMandal({ enabled: true, autoLoop: true, loopDuration: 8, strings: [
      { note: 'Sa', variant: 'shuddha', octaveOffset: 0, enabled: true },
      { note: 'Ma', variant: 'tivra', octaveOffset: 0, enabled: false },
      { note: 'Ni', variant: 'shuddha', octaveOffset: 1, enabled: true },
    ] });
    startSwarMandalLoop();
    startSwarMandalLoop();
    expect(audio.clocks).toHaveLength(1);
    const clock = audio.clocks[0];
    expect(clock.frequency).toBe(1 / 8);
    expect(clock.start).toHaveBeenCalledWith(10);
    clock.callback(42, 0);
    clock.callback(42.00000000000001, 0);
    expect(audio.attacks[0]).toHaveBeenCalledWith(expect.any(Number), 42);
    expect(audio.attacks[0]).toHaveBeenCalledOnce();
    expect(audio.attacks[1]).toHaveBeenCalledWith(expect.any(Number), 42.035);
    updateSwarMandal({ loopDuration: 5 });
    expect(clock.dispose).toHaveBeenCalledOnce();
    expect(audio.clocks[1].frequency).toBe(1 / 5);
    stopSwarMandalLoop();
    expect(audio.clocks[1].dispose).toHaveBeenCalledOnce();
    expect(isSwarMandalPlaying()).toBe(false);
  });

  it('supports 64 independent strings, rapid strums, and cancelling/restarting a one-shot', () => {
    createSwarMandal();
    updateSwarMandal({ enabled: true, strings: Array.from({ length: 64 }, () => ({
      note: 'Sa', variant: 'shuddha', octaveOffset: 0, enabled: true,
    })) });
    strumSwarMandal(10);
    strumSwarMandal(10);
    expect(audio.attacks).toHaveLength(64);
    expect(audio.attacks[63]).toHaveBeenNthCalledWith(1, expect.any(Number), 10 + 63 * 0.035);
    expect(audio.attacks[63].mock.calls[1][1]).toBeGreaterThan(audio.attacks[63].mock.calls[0][1]);
    updateSwarMandal({ strings: Array.from({ length: 64 }, (_, index) => ({
      note: 'Sa', variant: 'shuddha', octaveOffset: 0, enabled: index === 63,
    })) });
    strumSwarMandal(10.1);
    expect(audio.attacks[63].mock.calls[2][1]).toBeGreaterThan(audio.attacks[63].mock.calls[1][1]);
    updateSwarMandal({ enabled: false });
    for (const dispose of audio.disposals) expect(dispose).toHaveBeenCalledOnce();
    updateSwarMandal({ enabled: true });
    strumSwarMandal(11);
    expect(audio.attacks).toHaveLength(65);
    expect(audio.attacks[64]).toHaveBeenCalledWith(expect.any(Number), 11);
  });
});
