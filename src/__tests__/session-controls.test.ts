import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/store/session-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { useTablaStore } from '@/store/tabla-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useRecorderStore } from '@/store/recorder-store';
import { useTunerStore } from '@/store/tuner-store';
import { createSessionControls, isSessionActive } from '@/lib/session-controls';

beforeEach(() => {
  useSessionStore.setState({ requested: false, running: false });
  useTanpuraStore.setState(useTanpuraStore.getInitialState());
  useTablaStore.setState(useTablaStore.getInitialState());
  useSwarMandalStore.setState(useSwarMandalStore.getInitialState());
  useSurPetiStore.setState(useSurPetiStore.getInitialState());
  useRecorderStore.setState(useRecorderStore.getInitialState());
  useTunerStore.setState(useTunerStore.getInitialState());
});

describe('practice session commands', () => {
  it('retains setup through Stop and uses settings edited while stopped', async () => {
    const controls = createSessionControls(async () => true);
    await controls.play();
    useTanpuraStore.getState().setSpeed('tanpura1', 0.8);
    controls.stop();
    expect(useTanpuraStore.getState().tanpura1.enabled).toBe(true);
    expect(useSessionStore.getState().running).toBe(false);
    useTanpuraStore.getState().setSpeed('tanpura1', 1.2);
    await controls.play();
    expect(useSessionStore.getState().running).toBe(true);
    expect(useTanpuraStore.getState().tanpura1.speed).toBe(1.2);
  });

  it('cancels a Start still awaiting the browser audio context', async () => {
    let ready!: (value: boolean) => void;
    const controls = createSessionControls(() => new Promise(resolve => { ready = resolve; }));
    const start = controls.play();
    controls.stop();
    ready(true);
    await start;
    expect(useSessionStore.getState().running).toBe(false);
    expect(useSessionStore.getState().requested).toBe(false);
  });

  it('does not initialize audio for Stop', () => {
    const initialize = vi.fn(async () => true);
    createSessionControls(initialize).stop();
    expect(initialize).not.toHaveBeenCalled();
  });

  it('reports a failed Start as stopped and permits retry', async () => {
    let ready = false;
    const controls = createSessionControls(async () => ready);
    await controls.play();
    expect(useSessionStore.getState()).toMatchObject({ requested: false, running: false });
    ready = true;
    await controls.play();
    expect(useSessionStore.getState().running).toBe(true);
  });

  it('can select instruments while stopped and treats idle manual selection as silent', async () => {
    const controls = createSessionControls(async () => true);
    controls.setEnabled('tanpura1', false);
    controls.toggleInstrument('swarmandal');
    expect(useSwarMandalStore.getState().enabled).toBe(true);
    expect(useSessionStore.getState().requested).toBe(false);
    await controls.play();
    expect(isSessionActive()).toBe(false);
    useSwarMandalStore.getState().setAutoLoop(true);
    expect(isSessionActive()).toBe(true);
    controls.stop();
    controls.stop();
    expect(useSwarMandalStore.getState()).toMatchObject({ enabled: true, autoLoop: true });
    expect(isSessionActive()).toBe(false);
  });

  it('shares a pending Start and ignores its completion after a newer Stop/Start', async () => {
    const requests: ((ready: boolean) => void)[] = [];
    const initialize = vi.fn(() => new Promise<boolean>(resolve => requests.push(resolve)));
    const controls = createSessionControls(initialize);
    const first = controls.play();
    const repeated = controls.play();
    expect(initialize).toHaveBeenCalledTimes(1);
    controls.stop();
    const latest = controls.play();
    requests[0](true);
    await Promise.all([first, repeated]);
    expect(useSessionStore.getState().running).toBe(false);
    requests[1](true);
    await latest;
    expect(useSessionStore.getState()).toMatchObject({ requested: true, running: true });
  });

  it('leaves recorder and microphone intent independent of accompaniment', async () => {
    useRecorderStore.setState({ state: 'recording', includeMic: true });
    useTunerStore.setState({ micActive: true });
    const controls = createSessionControls(async () => true);
    await controls.play();
    controls.stop();
    expect(useRecorderStore.getState()).toMatchObject({ state: 'recording', includeMic: true });
    expect(useTunerStore.getState().micActive).toBe(true);
  });

  it('resumes interrupted requested playback and lets Stop cancel a pending resume', async () => {
    const requests: ((ready: boolean) => void)[] = [];
    const controls = createSessionControls(() => new Promise<boolean>(resolve => requests.push(resolve)));
    useSessionStore.setState({ requested: true, running: true });

    const resume = controls.resume();
    controls.stop();
    requests[0](true);
    await resume;

    expect(useSessionStore.getState()).toMatchObject({ requested: false, running: false });
  });

  it('retains playback intent after resume failure and permits retry', async () => {
    let ready = false;
    const controls = createSessionControls(async () => ready);
    useSessionStore.setState({ requested: true, running: true });

    expect(await controls.resume()).toBe(false);
    expect(useSessionStore.getState()).toMatchObject({ requested: true, running: true });
    ready = true;
    expect(await controls.resume()).toBe(true);
  });

  it('does not retain stale command promises when Start and Resume supersede each other', async () => {
    const requests: ((ready: boolean) => void)[] = [];
    const controls = createSessionControls(() => new Promise<boolean>(resolve => requests.push(resolve)));
    useSessionStore.setState({ requested: true, running: true });

    const oldResume = controls.resume();
    const latestStart = controls.play();
    requests[0](true);
    requests[1](true);
    await Promise.all([oldResume, latestStart]);

    const latestResume = controls.resume();
    expect(requests).toHaveLength(3);
    requests[2](true);
    await latestResume;
  });
});
