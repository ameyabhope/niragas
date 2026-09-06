import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaalDefinition } from '@/audio/types';

const audio = vi.hoisted(() => {
  const events = new Map<number, { callback: (time: number) => void; interval?: string; at: string }>();
  const sources: { buffer: unknown; playbackRate: { value: number }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended: (() => void) | null }[] = [];
  let id = 0;
  return {
    events, sources, draws: [] as (() => void)[], failLoad: false,
    transport: {
      ticks: 0, PPQ: 192, state: 'started',
      bpm: { value: 120, rampTo: vi.fn() },
      getTicksAtTime: vi.fn(() => 1000),
      scheduleRepeat: vi.fn((callback: (time: number) => void, interval: string, at: string) => {
        events.set(++id, { callback, interval, at }); return id;
      }),
      scheduleOnce: vi.fn((callback: (time: number) => void, at: string) => {
        events.set(++id, { callback, at }); return id;
      }),
      clear: vi.fn((eventId: number) => events.delete(eventId)),
      start: vi.fn(),
    },
  };
});

vi.mock('tone', () => {
  class Node {
    gain = { setValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() };
    connect() { return this; }
    dispose = vi.fn();
    triggerAttackRelease = vi.fn();
  }
  return {
    Gain: Node, MembraneSynth: Node, NoiseSynth: Node,
    ToneAudioBuffer: class {
      url = '';
      async load(url: string) { this.url = url; if (audio.failLoad) throw Error('missing'); }
      get() { return this.url; }
      dispose() {}
    },
    connect: vi.fn(), immediate: () => 0,
    getContext: () => ({
      createBufferSource: () => {
        const source = { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
        audio.sources.push(source); return source;
      },
      createGain: () => ({ gain: { value: 1 }, disconnect: vi.fn() }),
    }),
    getTransport: () => audio.transport,
    getDraw: () => ({ schedule: (cb: () => void) => audio.draws.push(cb) }),
  };
});
vi.mock('@/audio/mixer', () => ({ getChannelInput: vi.fn(() => ({})) }));

import { createTabla, disposeTabla, expandTablaBols, loadTaal, setTablaBeatCallback, setTablaPitch, setTablaTempo, startTabla, stopTabla } from '@/audio/tabla';
import { getBolPlaybackRate, getBolSample, loadTablaSampler, TABLA_SAMPLE_ROOT_HZ } from '@/audio/sample-loader';
import { noteToFreq, setA4Freq } from '@/lib/notes';
import { ektaal } from '@/data/taals/ektaal';

function taal(id = 'test', matras = 4): TaalDefinition {
  return {
    ...ektaal, id, matras,
    styles: [
      { id: 'a', name: 'A', thekas: { madhya: [{ name: 'Dhin', position: 1 }, { name: 'Trkt', position: 2 }, { name: 'Na', position: 3 }, { name: 'Dhi', position: 4 }] } },
      { id: 'b', name: 'B', thekas: { madhya: [{ name: 'Ge', position: 2 }, { name: 'Ka', position: 3 }] } },
    ],
  };
}

function beat(time = 1) {
  const repeat = [...audio.events.values()].find(event => event.interval);
  expect(repeat).toBeDefined();
  repeat!.callback(time);
}

beforeEach(async () => {
  audio.events.clear(); audio.sources.length = 0; audio.draws.length = 0;
  audio.failLoad = false;
  vi.clearAllMocks();
  await createTabla();
  loadTaal(taal());
});
afterEach(() => { disposeTabla(); setA4Freq(440); });

describe('tabla sample tuning and lifetime', () => {
  it('uses measured per-stroke rates with cents and A4, leaving bass and closed strokes alone', () => {
    setA4Freq(432);
    const target = noteToFreq('E', 4, 37);
    for (const [bol, root] of Object.entries(TABLA_SAMPLE_ROOT_HZ)) {
      expect(getBolPlaybackRate(bol, target) * root).toBeCloseTo(target, 8);
    }
    for (const bol of ['Ge', 'Ghe', 'Ka', 'Ke', 'Ti', 'Re', 'Tu', 'Te', 'Kat']) {
      expect(getBolPlaybackRate(bol, target)).toBe(1);
    }
    setTablaPitch('E', 4, 37);
    startTabla(); beat();
    expect(audio.sources.map(source => source.buffer)).toEqual(['/samples/tabla/Ge.wav', '/samples/tabla/Tin.wav']);
    expect(audio.sources[0].playbackRate.value).toBe(1);
    expect(audio.sources[1].playbackRate.value).toBeCloseTo(target / 311.5);
  });

  it('composes Dhi as bass plus Tin as well', () => {
    const data = taal();
    data.styles[0].thekas.madhya = [{ name: 'Dhi', position: 1 }];
    loadTaal(data); startTabla(); beat();
    expect(audio.sources.map(source => source.buffer)).toEqual(['/samples/tabla/Ge.wav', '/samples/tabla/Tin.wav']);
  });

  it('stops and disconnects native sources even when their start is in the future', async () => {
    const player = await loadTablaSampler({} as Parameters<typeof loadTablaSampler>[0]);
    player!.triggerAttack('Tin', 50, .7, 0.5);
    const source = audio.sources.at(-1)!;
    expect(source.start).toHaveBeenCalledWith(50);
    player!.stopAll();
    expect(source.stop).toHaveBeenCalledWith(0);
    expect(source.disconnect).toHaveBeenCalledOnce();
    player!.dispose();
    expect(source.stop).toHaveBeenCalledOnce();
  });

  it('returns synthesis fallback on load failure', async () => {
    audio.failLoad = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await loadTablaSampler({} as Parameters<typeof loadTablaSampler>[0])).toBeNull();
    warn.mockRestore();
  });
});

describe('tabla transport', () => {
  it('expands full and half-matra Trkt without overrunning the next beat', () => {
    expect(expandTablaBols([{ name: 'Trkt', position: 4 }]).map(bol => [bol.name, bol.position])).toEqual([
      ['Ti', 4], ['Re', 4.25], ['Ka', 4.5], ['Ta', 4.75],
    ]);
    expect(expandTablaBols([{ name: 'Trkt', position: 2.5 }]).map(bol => bol.position)).toEqual([2.5, 2.625, 2.75, 2.875]);
    expect(getBolSample('Re')).toBe(getBolSample('Te'));
  });

  it('retains subdivisions in ticks through tempo changes, using callback audio times', () => {
    startTabla(); beat(); beat(2);
    const subdivisions = [...audio.events.values()].filter(event => !event.interval);
    expect(subdivisions.map(event => event.at)).toEqual(['1048i', '1096i', '1144i']);
    expect(audio.sources).toHaveLength(3); // Ge+Tin, then only the first Trkt stroke
    setTablaTempo(180);
    expect(audio.transport.bpm.rampTo).toHaveBeenCalledWith(180, .3);
    subdivisions[0].callback(2.17);
    expect(audio.sources.at(-1)!.buffer).toBe('/samples/tabla/Te.wav');
    expect(audio.sources.at(-1)!.start).toHaveBeenCalledWith(2.17);
  });

  it('preserves phase for styles and switches taal only at the next sam', () => {
    const onBeat = vi.fn(); setTablaBeatCallback(onBeat);
    startTabla(); beat();
    loadTaal(taal(), 'b'); beat();
    expect(audio.sources.at(-1)!.buffer).toBe('/samples/tabla/Ge.wav');
    loadTaal(taal('next', 3));
    beat(); beat(); beat();
    expect(onBeat).not.toHaveBeenCalled();
    audio.draws.forEach(draw => draw());
    expect(onBeat.mock.calls.map(call => call[0])).toEqual([1, 2, 3, 4, 1]);
    expect(onBeat.mock.calls.map(call => call.slice(2))).toEqual([
      ['test', 'a'], ['test', 'b'], ['test', 'b'], ['test', 'b'], ['next', 'a'],
    ]);
    expect(audio.transport.scheduleRepeat).toHaveBeenCalledOnce();
    expect(audio.sources.at(-1)!.buffer).toBe('/samples/tabla/Tin.wav');
  });

  it('clears pending callbacks and submitted attacks, including stale UI draws after restart', () => {
    const onBeat = vi.fn(); setTablaBeatCallback(onBeat);
    startTabla(); beat(); beat();
    const callbacks = [...audio.events.values()];
    const sources = [...audio.sources];
    stopTabla();
    expect(audio.events.size).toBe(0);
    sources.forEach(source => expect(source.stop).toHaveBeenCalledOnce());
    startTabla();
    callbacks.forEach(event => event.callback(4));
    audio.draws.forEach(draw => draw());
    expect(audio.sources).toHaveLength(sources.length);
    expect(onBeat).not.toHaveBeenCalled();
    beat();
    expect(audio.sources).toHaveLength(sources.length + 2);
  });

  it('replaces pending selections and cancels a switch when the active taal is reselected', () => {
    startTabla(); beat();
    loadTaal(taal('next', 3));
    loadTaal(taal(), 'b');
    beat(); beat(); beat();
    const count = audio.sources.length;
    beat(); // style B has no bol at sam
    expect(audio.sources).toHaveLength(count);
    loadTaal(taal('next', 3));
    loadTaal(taal('latest', 2), 'b');
    stopTabla(); startTabla(); beat();
    expect(audio.sources).toHaveLength(count);
    beat();
    expect(audio.sources.at(-1)!.buffer).toBe('/samples/tabla/Ge.wav');
  });

  it('does not resurrect an instance disposed while samples are loading', async () => {
    const creating = createTabla();
    disposeTabla();
    await creating;
    loadTaal(taal()); startTabla();
    expect(audio.events.size).toBe(0);
  });

  it('keeps the Ektaal phrase positions consistent at every available speed', () => {
    const patterns = Object.values(ektaal.styles[0].thekas).map(theka => theka!.map(({ name, position }) => [name, position]));
    expect(patterns[1]).toEqual(patterns[0]);
    expect(patterns[2]).toEqual(patterns[0]);
    for (const theka of Object.values(ektaal.styles[0].thekas)) {
      expect(theka!.filter(bol => bol.name === 'Trkt').map(bol => bol.position)).toEqual([4, 10]);
    }
  });
});
