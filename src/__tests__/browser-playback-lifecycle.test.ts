import { describe, expect, it, vi } from 'vitest';
import { createBrowserPlaybackLifecycle } from '@/lib/browser-playback-lifecycle';

function contextBoundary(initial: AudioContextState | 'interrupted' = 'running') {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    change(next: AudioContextState | 'interrupted') { state = next; listeners.forEach(listener => listener()); },
    listenerCount: () => listeners.size,
  };
}

function mediaSessionBoundary() {
  const handlers = new Map<string, (() => void) | null>();
  return {
    mediaSession: {
      metadata: null as MediaMetadata | null,
      playbackState: 'none' as MediaSessionPlaybackState,
      setActionHandler: vi.fn((action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
        handlers.set(action, handler as (() => void) | null);
      }),
    },
    invoke(action: string) { handlers.get(action)?.(); },
    handlers,
  };
}

describe('browser playback lifecycle', () => {
  it('reports an interruption and only resumes after the explicit recovery command', async () => {
    const context = contextBoundary('suspended');
    const resume = vi.fn(async () => true);
    const lifecycle = createBrowserPlaybackLifecycle({
      context,
      commands: { play: vi.fn(async () => {}), resume, stop: vi.fn() },
      getRequested: () => true,
      isPlayingAccompaniment: () => true,
      subscribeSession: () => () => {},
      getMetadata: () => ({ title: 'Sa C#3', artist: 'Niragas' }),
      createMetadata: value => value as MediaMetadata,
    });

    lifecycle.start();
    expect(lifecycle.getSnapshot().interrupted).toBe(true);
    expect(resume).not.toHaveBeenCalled();
    await lifecycle.resume();
    expect(resume).toHaveBeenCalledOnce();
    lifecycle.stop();
  });

  it('routes supported media actions through shared commands and cleans handlers up', () => {
    const context = contextBoundary();
    const media = mediaSessionBoundary();
    const commands = { play: vi.fn(async () => {}), resume: vi.fn(async () => true), stop: vi.fn() };
    const lifecycle = createBrowserPlaybackLifecycle({
      context, mediaSession: media.mediaSession, commands,
      getRequested: () => false,
      isPlayingAccompaniment: () => false,
      subscribeSession: () => () => {},
      getMetadata: () => ({ title: 'Sa D3 · Teentaal', artist: 'Niragas' }),
      createMetadata: value => value as MediaMetadata,
    });

    lifecycle.start();
    media.invoke('play');
    media.invoke('pause');
    media.invoke('stop');
    expect(commands.play).toHaveBeenCalledOnce();
    expect(commands.stop).toHaveBeenCalledTimes(2);
    expect(media.mediaSession.metadata).toMatchObject({ title: 'Sa D3 · Teentaal' });
    lifecycle.stop();
    expect(context.listenerCount()).toBe(0);
    expect(media.handlers.get('play')).toBeNull();
    expect(media.handlers.has('seekforward')).toBe(false);
  });

  it('survives missing Media Session support', () => {
    const lifecycle = createBrowserPlaybackLifecycle({
      context: contextBoundary(),
      commands: { play: vi.fn(async () => {}), resume: vi.fn(async () => true), stop: vi.fn() },
      getRequested: () => false,
      isPlayingAccompaniment: () => false,
      subscribeSession: () => () => {},
      getMetadata: () => ({ title: 'Sa C#3', artist: 'Niragas' }),
      createMetadata: value => value as MediaMetadata,
    });
    expect(() => { lifecycle.start(); lifecycle.stop(); }).not.toThrow();
  });

  it('cancels pending shared recovery work during cleanup', () => {
    const cancelPending = vi.fn();
    const lifecycle = createBrowserPlaybackLifecycle({
      context: contextBoundary('suspended'),
      commands: { play: vi.fn(async () => {}), resume: vi.fn(async () => true), stop: vi.fn(), cancelPending },
      getRequested: () => true,
      isPlayingAccompaniment: () => true,
      subscribeSession: () => () => {},
      getMetadata: () => ({ title: 'Sa C#3', artist: 'Niragas' }),
      createMetadata: value => value as MediaMetadata,
    });
    lifecycle.start();
    lifecycle.stop();
    expect(cancelPending).toHaveBeenCalledOnce();
  });
});
