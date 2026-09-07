export type ScreenWakeLockStatus =
  | 'disabled' | 'unsupported' | 'idle' | 'requesting' | 'held'
  | 'released' | 'hidden' | 'denied';

export interface ScreenWakeLockSnapshot {
  requested: boolean;
  status: ScreenWakeLockStatus;
}

interface WakeLockSentinelBoundary {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(event: 'release', listener: () => void): void;
  removeEventListener(event: 'release', listener: () => void): void;
}

interface ScreenWakeLockDependencies {
  request?: () => Promise<WakeLockSentinelBoundary>;
  visible(): boolean;
  eligible(): boolean;
  subscribeVisibility(listener: () => void): () => void;
  subscribeEligibility(listener: () => void): () => void;
}

export function createScreenWakeLockLifecycle(dependencies: ScreenWakeLockDependencies) {
  const listeners = new Set<() => void>();
  const operations = new Set<Promise<unknown>>();
  let cleanup: (() => void)[] = [];
  let sentinel: WakeLockSentinelBoundary | null = null;
  let sentinelReleaseListener: (() => void) | null = null;
  let started = false;
  let generation = 0;
  let pending = false;
  let snapshot: ScreenWakeLockSnapshot = { requested: false, status: 'disabled' };

  function publish(status: ScreenWakeLockStatus): void {
    if (snapshot.status === status) return;
    snapshot = { ...snapshot, status };
    listeners.forEach(listener => listener());
  }

  function track<T>(operation: Promise<T>): Promise<T> {
    operations.add(operation);
    void operation.finally(() => operations.delete(operation));
    return operation;
  }

  function detachSentinel(): void {
    if (sentinel && sentinelReleaseListener) sentinel.removeEventListener('release', sentinelReleaseListener);
    sentinel = null;
    sentinelReleaseListener = null;
  }

  function desiredStatus(): ScreenWakeLockStatus {
    if (!snapshot.requested) return 'disabled';
    if (!dependencies.visible()) return 'hidden';
    if (!dependencies.eligible()) return 'idle';
    if (!dependencies.request) return 'unsupported';
    return 'requesting';
  }

  function releaseHeld(status: ScreenWakeLockStatus): void {
    const held = sentinel;
    detachSentinel();
    publish(status);
    if (held && !held.released) track(held.release().catch(() => {}));
  }

  function reconcile(): void {
    const status = desiredStatus();
    if (status !== 'requesting') {
      ++generation;
      pending = false;
      releaseHeld(status);
      return;
    }
    if (sentinel && !sentinel.released) {
      publish('held');
      return;
    }
    if (pending) return;

    const requestGeneration = ++generation;
    pending = true;
    publish('requesting');
    const acquisition = dependencies.request!()
      .then(async acquired => {
        if (requestGeneration === generation) pending = false;
        if (!started || requestGeneration !== generation || desiredStatus() !== 'requesting') {
          if (!acquired.released) await acquired.release().catch(() => {});
          return;
        }
        sentinel = acquired;
        sentinelReleaseListener = () => {
          if (sentinel !== acquired) return;
          detachSentinel();
          publish(desiredStatus() === 'requesting' ? 'released' : desiredStatus());
        };
        acquired.addEventListener('release', sentinelReleaseListener);
        publish('held');
      })
      .catch(() => {
        if (requestGeneration === generation) {
          pending = false;
          if (started) publish('denied');
        }
      });
    track(acquisition);
  }

  return {
    start(): void {
      if (started) return;
      started = true;
      cleanup = [
        dependencies.subscribeVisibility(reconcile),
        dependencies.subscribeEligibility(reconcile),
      ];
      reconcile();
    },
    stop(): void {
      if (!started) return;
      started = false;
      ++generation;
      pending = false;
      cleanup.forEach(dispose => dispose());
      cleanup = [];
      releaseHeld(snapshot.requested ? 'released' : 'disabled');
    },
    setRequested(requested: boolean): void {
      if (snapshot.requested === requested) return;
      snapshot = { ...snapshot, requested };
      listeners.forEach(listener => listener());
      reconcile();
    },
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async settle(): Promise<void> {
      while (operations.size) await Promise.all([...operations]);
    },
  };
}
