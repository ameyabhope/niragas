import { beforeEach, expect, it } from 'vitest';
import { useTablaStore } from '@/store/tabla-store';
import { applyPresetState, capturePreset } from '@/lib/preset-state';

const store = useTablaStore;
beforeEach(() => store.setState(store.getInitialState(), true));

it('preserves the sounding beat and style until an audio draw confirms the selection', () => {
  const actions = store.getState();
  actions.setPlaying(true);
  actions.setCurrentBeat(9, '0', 'teentaal', 'theka');
  actions.setTaalId('keherva');
  expect(store.getState()).toMatchObject({
    taalId: 'keherva', activeTaalId: 'teentaal', activeStyleId: 'theka',
    currentMatra: 9, currentDivisionLabel: '0',
  });
  actions.setCurrentBeat(1, 'X', 'keherva', 'theka');
  expect(store.getState()).toMatchObject({ activeTaalId: 'keherva', currentMatra: 1 });
});

it('reselecting the sounding taal restores its style and cancels the pending choice', () => {
  const actions = store.getState();
  actions.setPlaying(true);
  actions.setCurrentBeat(5, null, 'teentaal', 'theka');
  actions.setTaalId('keherva');
  actions.setTaalId('teentaal');
  expect(store.getState()).toMatchObject({ taalId: 'teentaal', styleId: 'theka', currentMatra: 5 });
});

it('clears active IDs on stop, ignores stopped draws, and waits for a fresh beat on restart', () => {
  const actions = store.getState();
  actions.setPlaying(true);
  actions.setCurrentBeat(8, null, 'teentaal', 'theka');
  actions.setTaalId('keherva');
  actions.togglePlaying();
  actions.setCurrentBeat(9, null, 'teentaal', 'theka');
  expect(store.getState()).toMatchObject({ playing: false, activeTaalId: null, activeStyleId: null, currentMatra: 1, taalId: 'keherva' });
  actions.togglePlaying();
  expect(store.getState().activeTaalId).toBeNull();
  actions.setCurrentBeat(1, 'X', 'keherva', 'theka');
  expect(store.getState().activeTaalId).toBe('keherva');
});

it('loads playing presets as pending, saves only selected IDs, and clears active state for stopped presets', () => {
  const actions = store.getState();
  actions.setPlaying(true);
  actions.setCurrentBeat(12, null, 'teentaal', 'theka');
  const preset = capturePreset('Tabla selection');
  preset.tabla = { taalId: 'keherva', styleId: 'theka', tempo: 180, enabled: true };
  const options = { tabla: true, pitch: false, tanpura: false, surPeti: false, swarMandal: false, mixer: false, eq: false };
  applyPresetState(preset, options);
  expect(store.getState()).toMatchObject({ taalId: 'keherva', activeTaalId: 'teentaal', currentMatra: 12 });
  expect(capturePreset('Pending').tabla).toEqual(preset.tabla);
  preset.tabla.enabled = false;
  applyPresetState(preset, options);
  expect(store.getState()).toMatchObject({ playing: false, activeTaalId: null, currentMatra: 1 });
});

it('loads a same-taal style change for the next beat while retaining the sounding style', () => {
  const actions = store.getState();
  actions.setPlaying(true);
  actions.setCurrentBeat(5, null, 'teentaal', 'theka');
  const preset = capturePreset('Tabla style change');
  preset.tabla = { taalId: 'teentaal', styleId: 'variation1', tempo: 120, enabled: true };
  const options = { tabla: true, pitch: false, tanpura: false, surPeti: false, swarMandal: false, mixer: false, eq: false };

  applyPresetState(preset, options);

  expect(store.getState()).toMatchObject({
    taalId: 'teentaal', styleId: 'variation1', activeTaalId: 'teentaal', activeStyleId: 'theka', currentMatra: 5,
  });
  actions.setCurrentBeat(6, null, 'teentaal', 'variation1');
  expect(store.getState()).toMatchObject({ activeTaalId: 'teentaal', activeStyleId: 'variation1', currentMatra: 6 });
});
