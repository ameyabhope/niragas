export type BrowserAudioContextState = AudioContextState;

interface AudioContextBoundary {
  getState(): BrowserAudioContextState;
  subscribe(listener: () => void): () => void;
}

interface PlaybackCommands {
  play(): Promise<void>;
  resume(): Promise<boolean>;
  stop(): void;
  cancelPending?(): void;
}

interface MetadataDescription {
  title: string;
  artist: string;
  album?: string;
}

interface MediaSessionBoundary {
  metadata: MediaMetadata | null;
  playbackState: MediaSessionPlaybackState;
  setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null): void;
}

interface BrowserPlaybackDependencies {
  context: AudioContextBoundary;
  commands: PlaybackCommands;
  mediaSession?: MediaSessionBoundary;
  getRequested(): boolean;
  isPlayingAccompaniment(): boolean;
  subscribeSession(listener: () => void): () => void;
  getMetadata(): MetadataDescription;
  createMetadata(value: MetadataDescription): MediaMetadata;
}

export interface BrowserPlaybackSnapshot {
  contextState: BrowserAudioContextState;
  interrupted: boolean;
  playingAccompaniment: boolean;
  resumeError: string | null;
}

export function createBrowserPlaybackLifecycle(dependencies: BrowserPlaybackDependencies) {
  const listeners = new Set<() => void>();
  let cleanup: (() => void)[] = [];
  let started = false;
  let resumeRequest = 0;
  let snapshot: BrowserPlaybackSnapshot = readSnapshot(null);

  function readSnapshot(resumeError: string | null): BrowserPlaybackSnapshot {
    const contextState = dependencies.context.getState();
    return {
      contextState,
      interrupted: dependencies.getRequested() && contextState !== 'running',
      playingAccompaniment: contextState === 'running' && dependencies.isPlayingAccompaniment(),
      resumeError,
    };
  }

  function publish(resumeError = snapshot.resumeError): void {
    const next = readSnapshot(resumeError);
    if (
      next.contextState !== snapshot.contextState ||
      next.interrupted !== snapshot.interrupted ||
      next.playingAccompaniment !== snapshot.playingAccompaniment ||
      next.resumeError !== snapshot.resumeError
    ) {
      snapshot = next;
      listeners.forEach(listener => listener());
    }
    updateMediaSession();
  }

  function updateMediaSession(): void {
    const mediaSession = dependencies.mediaSession;
    if (!mediaSession) return;
    try {
      mediaSession.metadata = dependencies.createMetadata(dependencies.getMetadata());
      mediaSession.playbackState = snapshot.interrupted
        ? 'paused'
        : snapshot.playingAccompaniment
          ? 'playing'
          : 'none';
    } catch {
      // Partial implementations must not disable ordinary playback controls.
    }
  }

  function setMediaHandler(action: 'play' | 'pause' | 'stop', handler: MediaSessionActionHandler | null): void {
    try {
      dependencies.mediaSession?.setActionHandler(action, handler);
    } catch {
      // Some browsers expose Media Session but reject individual actions.
    }
  }

  async function resume(): Promise<boolean> {
    const request = ++resumeRequest;
    const ready = await dependencies.commands.resume();
    if (request !== resumeRequest) return false;
    publish(ready ? null : 'Audio could not resume. Try again.');
    return ready;
  }

  return {
    start(): void {
      if (started) return;
      started = true;
      const contextCleanup = dependencies.context.subscribe(() => publish(null));
      const sessionCleanup = dependencies.subscribeSession(() => publish());
      cleanup = [contextCleanup, sessionCleanup];
      setMediaHandler('play', () => {
        if (dependencies.getRequested()) void resume();
        else void dependencies.commands.play();
      });
      setMediaHandler('pause', () => dependencies.commands.stop());
      setMediaHandler('stop', () => dependencies.commands.stop());
      publish();
    },
    stop(): void {
      if (!started) return;
      started = false;
      ++resumeRequest;
      dependencies.commands.cancelPending?.();
      cleanup.forEach(dispose => dispose());
      cleanup = [];
      setMediaHandler('play', null);
      setMediaHandler('pause', null);
      setMediaHandler('stop', null);
      if (dependencies.mediaSession) {
        try { dependencies.mediaSession.playbackState = 'none'; } catch { /* unsupported assignment */ }
        try { dependencies.mediaSession.metadata = null; } catch { /* unsupported assignment */ }
      }
    },
    resume,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
