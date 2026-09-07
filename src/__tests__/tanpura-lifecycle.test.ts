import { afterEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  players: [] as { state: string; dispose: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[],
  effects: [] as { dispose: ReturnType<typeof vi.fn> }[],
  timers: new Map<number, () => void>(),
  nextTimer: 0,
  failConnect: false,
  renders: [] as { signal: AbortSignal; resolve: (pcm: Float32Array[]) => void; reject: (error: Error) => void }[],
}));
vi.mock('@/audio/mixer', () => ({ getChannelInput: () => ({}) }));
vi.mock('@/audio/tanpura-processing', () => ({
  tanpuraPitchRate: (base: number, cents: number) => base * 2 ** (cents / 1200),
  stretchTanpuraLoop: (_channels: unknown, _sampleRate: number, _rate: number, _speed: number, signal: AbortSignal) =>
    new Promise((resolve, reject) => mock.renders.push({ signal, resolve, reject })),
}));
vi.mock('tone', () => {
  class Node {
    context = {
      lookAhead: 0.1,
      setTimeout: (cb: () => void) => { const id = ++mock.nextTimer; mock.timers.set(id, cb); return id; },
      clearTimeout: (id: number) => mock.timers.delete(id),
    };
    connect() { if (mock.failConnect) throw new Error('connect failed'); return this; }
    start() { return this; }
    dispose = vi.fn();
  }
  class Effect extends Node { constructor() { super(); mock.effects.push(this); } }
  class Player extends Node {
    state = 'stopped';
    volume = { value: 0 };
    buffer = { duration: 20 };
    start = vi.fn(() => { this.state = 'started'; return this; });
    stop = vi.fn(() => { this.state = 'stopped'; return this; });
    constructor() { super(); mock.players.push(this); }
  }
  return { Player, Chorus: Effect, Tremolo: Effect, Freeverb: Effect, now: () => 1,
    getContext: () => ({ decodeAudioData: async () => ({ numberOfChannels: 1, sampleRate: 48000, getChannelData: () => new Float32Array(10) }),
      createBuffer: () => ({ duration: 20, getChannelData: () => new Float32Array(10) }) }) };
});
import { createTanpura, DEFAULT_TANPURA_CONFIG, disposeTanpura, getTanpuraStatus, retryTanpura, startTanpura, stopTanpura, updateTanpura } from '@/audio/tanpura';
import { setA4Freq } from '@/lib/notes';
import { createSessionControls } from '@/lib/session-controls';
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function ready() {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })));
  const pending = createTanpura('tanpura1', DEFAULT_TANPURA_CONFIG, 'C', 3);
  startTanpura('tanpura1');
  await flush();
  mock.renders.shift()!.resolve([new Float32Array(10)]);
  await pending;
}
afterEach(() => {
  disposeTanpura('tanpura1');
  expect(mock.timers.size).toBe(0);
  setA4Freq(440);
  mock.players.length = 0; mock.effects.length = 0; mock.renders.length = 0; mock.failConnect = false;
  vi.unstubAllGlobals(); vi.useRealTimers();
});
describe('tanpura source ownership', () => {
  it('reprocesses an A4-only reference change through updateTanpura', async () => {
    await ready();
    setA4Freq(432);
    const pending = updateTanpura('tanpura1', {}, 'C', 3, 0);
    expect(mock.renders).toHaveLength(1);
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await pending;
    expect(mock.players).toHaveLength(2);
  });
  it('retains the old sound through loading and failure, then fades a successful replacement', async () => {
    vi.useFakeTimers();
    await ready();
    const old = mock.players[0];
    const failed = updateTanpura('tanpura1', { speed: 0.7 });
    expect(getTanpuraStatus('tanpura1')).toMatchObject({ playing: true, loading: true });
    expect(old.stop).not.toHaveBeenCalled();
    mock.renders.shift()!.reject(new Error('processing failed'));
    await failed;
    expect(getTanpuraStatus('tanpura1')).toMatchObject({ playing: true, loading: false });
    expect(getTanpuraStatus('tanpura1').error).toContain('processing failed');
    const next = updateTanpura('tanpura1', { speed: 1.4 });
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await next;
    expect(old.stop).toHaveBeenCalled();
    expect(old.dispose).not.toHaveBeenCalled();
    expect(mock.players[1].start).toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(old.dispose).not.toHaveBeenCalled();
    for (const [id, cb] of mock.timers) { mock.timers.delete(id); cb(); }
    expect(old.dispose).toHaveBeenCalledOnce();
  });
  it('ignores stale completions and honors stop during processing', async () => {
    await ready();
    const first = updateTanpura('tanpura1', { speed: 0.7 });
    const second = updateTanpura('tanpura1', { speed: 1.4 });
    expect(mock.renders[0].signal.aborted).toBe(true);
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await first;
    expect(getTanpuraStatus('tanpura1').loading).toBe(true);
    expect(mock.players).toHaveLength(1);
    stopTanpura('tanpura1');
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await second;
    expect(mock.players[1].start).not.toHaveBeenCalled();
    expect(getTanpuraStatus('tanpura1')).toEqual({ playing: false, loading: false, error: null });
  });
  it('does not resurrect a disposed instance', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { finePitchCents: 30 });
    disposeTanpura('tanpura1');
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await pending;
    expect(mock.players).toHaveLength(1);
    expect(mock.players[0].dispose).toHaveBeenCalledOnce();
    expect(getTanpuraStatus('tanpura1')).toEqual({ playing: false, loading: false, error: null });
  });
  it('retries the same settings after failure without losing the old player', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { speed: 0.7 });
    mock.renders.shift()!.reject(new Error('temporary failure'));
    await pending;
    const retry = updateTanpura('tanpura1', { speed: 0.7 });
    expect(mock.renders).toHaveLength(1);
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await retry;
    expect(getTanpuraStatus('tanpura1')).toEqual({ playing: true, loading: false, error: null });
  });
  it('retries a failed load explicitly without changing the selection', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { speed: 0.7 });
    mock.renders.shift()!.reject(new Error('temporary failure'));
    await pending;
    expect(getTanpuraStatus('tanpura1').error).toMatch(/temporary failure/);
    retryTanpura('tanpura1');
    expect(mock.renders).toHaveLength(1);
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await flush();
    expect(getTanpuraStatus('tanpura1')).toEqual({ playing: true, loading: false, error: null });
  });
  it('ignores an explicit retry when nothing failed', async () => {
    await ready();
    retryTanpura('tanpura1');
    await flush();
    expect(mock.renders).toHaveLength(0);
    expect(getTanpuraStatus('tanpura1').error).toBeNull();
  });
  it('keeps a recreated instance independent of a stale rejection', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { speed: 0.7 });
    const stale = mock.renders.shift()!;
    const recreated = createTanpura('tanpura1', DEFAULT_TANPURA_CONFIG, 'C', 3);
    await flush();
    stale.reject(new Error('stale failure'));
    await pending;
    expect(getTanpuraStatus('tanpura1')).toEqual({ playing: false, loading: true, error: null });
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await recreated;
    expect(mock.players[1].start).not.toHaveBeenCalled();
  });
  it('honors disable during preparation and frees retired players on dispose', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { speed: 0.7 });
    await updateTanpura('tanpura1', { enabled: false });
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await pending;
    expect(mock.players[1].start).not.toHaveBeenCalled();
    disposeTanpura('tanpura1');
    expect(mock.players.every(p => p.dispose.mock.calls.length === 1)).toBe(true);
    expect(mock.effects.every(p => p.dispose.mock.calls.length === 1)).toBe(true);
  });
  it('cleans up a partially connected effect chain and can retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })));
    const pending = createTanpura('tanpura1', DEFAULT_TANPURA_CONFIG, 'C', 3);
    await flush();
    mock.failConnect = true;
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await pending;
    expect(mock.effects).toHaveLength(3);
    expect(mock.effects.every(p => p.dispose.mock.calls.length === 1)).toBe(true);
    mock.failConnect = false;
    const retry = updateTanpura('tanpura1', {});
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await retry;
    expect(getTanpuraStatus('tanpura1').error).toBeNull();
    expect(mock.effects).toHaveLength(6);
  });
  it('stops a pending start even if Tone reports stopped', async () => {
    await ready();
    mock.players[0].state = 'stopped';
    stopTanpura('tanpura1');
    expect(mock.players[0].stop).toHaveBeenCalledOnce();
  });

  it('honors shared Stop while a replacement is still preparing', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { speed: 0.8 });
    const controls = createSessionControls(async () => true);
    controls.stop();
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await pending;
    expect(mock.players.every(player => player.state === 'stopped')).toBe(true);
    expect(getTanpuraStatus('tanpura1').playing).toBe(false);
  });
  it('ignores a late fetch from a superseded request without decoding or rendering it', async () => {
    await ready();
    let release!: (response: unknown) => void;
    const body = vi.fn(async () => new ArrayBuffer(0));
    const fetchMock = vi.fn(() => new Promise(resolve => { release = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const first = updateTanpura('tanpura1', { tuning: 'Ma' });
    const second = updateTanpura('tanpura1', { tuning: 'Pa', speed: 0.7 });
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await second;
    release({ ok: true, arrayBuffer: body });
    await first;
    expect(mock.renders).toHaveLength(0);
    expect(mock.players).toHaveLength(2);
    expect(getTanpuraStatus('tanpura1')).toEqual({ playing: true, loading: false, error: null });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(body).not.toHaveBeenCalled();
  });
  it('disposes a failed replacement but retains its shared effects and active player', async () => {
    await ready();
    const pending = updateTanpura('tanpura1', { speed: 0.7 });
    mock.failConnect = true;
    mock.renders.shift()!.resolve([new Float32Array(10)]);
    await pending;
    expect(mock.players[1].dispose).toHaveBeenCalledOnce();
    expect(mock.players[0].stop).not.toHaveBeenCalled();
    expect(mock.effects.every(p => p.dispose.mock.calls.length === 0)).toBe(true);
    expect(getTanpuraStatus('tanpura1')).toMatchObject({ playing: true, loading: false });
  });
});
