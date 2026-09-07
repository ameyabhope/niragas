import { describe, expect, it, vi } from 'vitest';
import { createScreenWakeLockLifecycle } from '@/lib/screen-wake-lock';

function sentinel() {
  const listeners = new Set<() => void>();
  let released = false;
  return {
    value: {
      get released() { return released; },
      release: vi.fn(async () => { released = true; listeners.forEach(listener => listener()); }),
      addEventListener: (_event: 'release', listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: 'release', listener: () => void) => listeners.delete(listener),
    },
    automaticRelease() { released = true; listeners.forEach(listener => listener()); },
  };
}

function dependencies(overrides: Record<string, unknown> = {}) {
  let visible = true;
  let eligible = true;
  const visibilityListeners = new Set<() => void>();
  const eligibilityListeners = new Set<() => void>();
  return {
    visible: () => visible,
    eligible: () => eligible,
    subscribeVisibility: (listener: () => void) => { visibilityListeners.add(listener); return () => visibilityListeners.delete(listener); },
    subscribeEligibility: (listener: () => void) => { eligibilityListeners.add(listener); return () => eligibilityListeners.delete(listener); },
    setVisible(value: boolean) { visible = value; visibilityListeners.forEach(listener => listener()); },
    setEligible(value: boolean) { eligible = value; eligibilityListeners.forEach(listener => listener()); },
    ...overrides,
  };
}

describe('screen wake lock lifecycle', () => {
  it('requests only after opt-in while visible and actually playing', async () => {
    const lock = sentinel();
    const request = vi.fn(async () => lock.value);
    const lifecycle = createScreenWakeLockLifecycle({ ...dependencies(), request });
    lifecycle.start();
    expect(lifecycle.getSnapshot()).toMatchObject({ requested: false, status: 'disabled' });
    lifecycle.setRequested(true);
    await lifecycle.settle();
    expect(request).toHaveBeenCalledOnce();
    expect(lifecycle.getSnapshot().status).toBe('held');
  });

  it('does not request for idle accompaniment and releases when playback loses eligibility', async () => {
    const lock = sentinel();
    const deps = dependencies();
    deps.setEligible(false);
    const request = vi.fn(async () => lock.value);
    const lifecycle = createScreenWakeLockLifecycle({ ...deps, request });
    lifecycle.start();
    lifecycle.setRequested(true);
    await lifecycle.settle();
    expect(request).not.toHaveBeenCalled();
    expect(lifecycle.getSnapshot().status).toBe('idle');
    deps.setEligible(true);
    await lifecycle.settle();
    deps.setEligible(false);
    await lifecycle.settle();
    expect(lock.value.release).toHaveBeenCalledOnce();
  });

  it('releases a stale acquisition delivered after disabling', async () => {
    let deliver!: (value: ReturnType<typeof sentinel>['value']) => void;
    const request = vi.fn(() => new Promise<ReturnType<typeof sentinel>['value']>(resolve => { deliver = resolve; }));
    const lock = sentinel();
    const lifecycle = createScreenWakeLockLifecycle({ ...dependencies(), request });
    lifecycle.start();
    lifecycle.setRequested(true);
    lifecycle.setRequested(false);
    deliver(lock.value);
    await lifecycle.settle();
    expect(lock.value.release).toHaveBeenCalledOnce();
    expect(lifecycle.getSnapshot().status).toBe('disabled');
  });

  it('reports unsupported and denied requests truthfully', async () => {
    const unsupported = createScreenWakeLockLifecycle(dependencies());
    unsupported.start();
    unsupported.setRequested(true);
    expect(unsupported.getSnapshot().status).toBe('unsupported');

    const denied = createScreenWakeLockLifecycle({
      ...dependencies(),
      request: vi.fn(async () => { throw new Error('permission denied'); }),
    });
    denied.start();
    denied.setRequested(true);
    await denied.settle();
    expect(denied.getSnapshot().status).toBe('denied');
  });

  it('releases while hidden, reacquires when visible, and reports automatic release', async () => {
    const first = sentinel();
    const second = sentinel();
    const request = vi.fn()
      .mockResolvedValueOnce(first.value)
      .mockResolvedValueOnce(second.value);
    const deps = dependencies();
    const lifecycle = createScreenWakeLockLifecycle({ ...deps, request });
    lifecycle.start();
    lifecycle.setRequested(true);
    await lifecycle.settle();
    deps.setVisible(false);
    await lifecycle.settle();
    expect(lifecycle.getSnapshot().status).toBe('hidden');
    expect(first.value.release).toHaveBeenCalledOnce();
    deps.setVisible(true);
    await lifecycle.settle();
    expect(request).toHaveBeenCalledTimes(2);
    second.automaticRelease();
    expect(lifecycle.getSnapshot().status).toBe('released');
  });

  it('releases on cleanup and does not reacquire after later browser events', async () => {
    const lock = sentinel();
    const request = vi.fn(async () => lock.value);
    const deps = dependencies();
    const lifecycle = createScreenWakeLockLifecycle({ ...deps, request });
    lifecycle.start();
    lifecycle.setRequested(true);
    await lifecycle.settle();
    lifecycle.stop();
    await lifecycle.settle();
    deps.setVisible(false);
    deps.setVisible(true);
    expect(lock.value.release).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledOnce();
  });

  it('does not let a stale acquisition clear a newer pending request', async () => {
    const deliveries: ((value: ReturnType<typeof sentinel>['value']) => void)[] = [];
    const request = vi.fn(() => new Promise<ReturnType<typeof sentinel>['value']>(resolve => deliveries.push(resolve)));
    const deps = dependencies();
    const lifecycle = createScreenWakeLockLifecycle({ ...deps, request });
    lifecycle.start();
    lifecycle.setRequested(true);
    deps.setVisible(false);
    deps.setVisible(true);
    expect(request).toHaveBeenCalledTimes(2);

    const stale = sentinel();
    deliveries[0](stale.value);
    await Promise.resolve();
    deps.setEligible(true);
    expect(request).toHaveBeenCalledTimes(2);

    const latest = sentinel();
    deliveries[1](latest.value);
    await lifecycle.settle();
    expect(stale.value.release).toHaveBeenCalledOnce();
    expect(lifecycle.getSnapshot().status).toBe('held');
  });
});
