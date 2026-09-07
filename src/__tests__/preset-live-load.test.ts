import { beforeEach, describe, expect, it } from 'vitest';
import { FACTORY_PRESETS } from '@/data/raag-presets';
import { applyPresetState, capturePreset, type PresetLoadOptions } from '@/lib/preset-state';
import { createSessionControls } from '@/lib/session-controls';
import { useSessionStore } from '@/store/session-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { useTablaStore } from '@/store/tabla-store';
import { useTanpuraStore } from '@/store/tanpura-store';

const LOAD_ALL: PresetLoadOptions = {
  pitch: true, tanpura: true, tabla: true, surPeti: true, swarMandal: true, mixer: true, eq: true,
};

function resetStores() {
  useSessionStore.setState({ requested: false, running: false });
  useTanpuraStore.setState(useTanpuraStore.getInitialState(), true);
  useTablaStore.setState(useTablaStore.getInitialState(), true);
  useSwarMandalStore.setState(useSwarMandalStore.getInitialState(), true);
  useSurPetiStore.setState(useSurPetiStore.getInitialState(), true);
}

beforeEach(resetStores);

function runningSession() {
  useSessionStore.setState({ requested: true, running: true });
}

describe('live setup loading', () => {
  it('loads a full setup while stopped without starting sound', () => {
    const preset = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'keherva', styleId: 'theka', tempo: 100, enabled: true } };
    applyPresetState(preset, LOAD_ALL);

    expect(useSessionStore.getState()).toMatchObject({ requested: false, running: false });
    expect(useTablaStore.getState()).toMatchObject({ taalId: 'keherva', tempo: 100, enabled: true, playing: false });
    expect(useTanpuraStore.getState().tanpura1.enabled).toBe(true);
  });

  it('applies a running selection without touching playback intent', () => {
    runningSession();
    useTablaStore.getState().setPlaying(true);
    const preset = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'keherva', styleId: 'theka', tempo: 132, enabled: true } };
    applyPresetState(preset, LOAD_ALL);

    expect(useSessionStore.getState()).toMatchObject({ requested: true, running: true });
    expect(useTablaStore.getState()).toMatchObject({ taalId: 'keherva', tempo: 132, enabled: true, playing: true });
  });

  it('never exposes a transient taal/style pair to subscribers', () => {
    runningSession();
    const seen: Array<[string, string]> = [];
    const stop = useTablaStore.subscribe((state) => { seen.push([state.taalId, state.styleId]); });
    const preset = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'jhaptaal', styleId: 'theka', tempo: 60, enabled: true } };
    applyPresetState(preset, LOAD_ALL);
    stop();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(['jhaptaal', 'theka']);
  });

  it('lets rapid consecutive loads resolve to the latest setup', () => {
    runningSession();
    const first = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'keherva', styleId: 'theka', tempo: 120, enabled: true } };
    const second = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'jhaptaal', styleId: 'theka', tempo: 60, enabled: true } };
    applyPresetState(first, LOAD_ALL);
    applyPresetState(second, LOAD_ALL);

    expect(useTablaStore.getState()).toMatchObject({ taalId: 'jhaptaal', tempo: 60 });
  });

  it('keeps retained settings through Stop after a live load', async () => {
    const controls = createSessionControls(async () => true);
    runningSession();
    const preset = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'keherva', styleId: 'theka', tempo: 110, enabled: true } };
    applyPresetState(preset, LOAD_ALL);
    controls.stop();

    expect(useSessionStore.getState()).toMatchObject({ requested: false, running: false });
    expect(useTablaStore.getState()).toMatchObject({ taalId: 'keherva', tempo: 110, enabled: true });
  });

  it('applies an all-instruments-off setup while running without inventing a fallback', () => {
    runningSession();
    useTablaStore.getState().setPlaying(true);
    const preset = structuredClone(FACTORY_PRESETS[0]);
    preset.tanpura1.enabled = false;
    preset.tanpura2.enabled = false;
    preset.tabla.enabled = false;
    preset.surPeti.enabled = false;
    preset.swarMandal.enabled = false;
    applyPresetState(preset, LOAD_ALL);

    expect(useSessionStore.getState().running).toBe(true);
    expect(useTablaStore.getState()).toMatchObject({ enabled: false, playing: false });
    expect(useTanpuraStore.getState().tanpura1.enabled).toBe(false);
    expect(useTanpuraStore.getState().tanpura2.enabled).toBe(false);
    expect(useSurPetiStore.getState().enabled).toBe(false);
    expect(useSwarMandalStore.getState().enabled).toBe(false);
  });

  it('honors preserve-tempo while running and keeps partial loads scoped', () => {
    runningSession();
    useTablaStore.getState().setTempo(95);
    const preset = { ...structuredClone(FACTORY_PRESETS[0]), tabla: { taalId: 'keherva', styleId: 'theka', tempo: 120, enabled: true } };
    applyPresetState(preset, { ...LOAD_ALL, tanpura: false, preserveTempo: true });

    expect(useTablaStore.getState()).toMatchObject({ taalId: 'keherva', tempo: 95 });
    expect(useTanpuraStore.getState().tanpura1.tuning).toBe(useTanpuraStore.getInitialState().tanpura1.tuning);
    expect(capturePreset('x').tabla.tempo).toBe(95);
  });
});
