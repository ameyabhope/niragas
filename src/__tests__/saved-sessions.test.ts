import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Preset } from '@/audio/types';
import { FACTORY_PRESETS } from '@/data/raag-presets';
import { capturePreset } from '@/lib/preset-state';
import { filterPresets } from '@/lib/presets';
import { usePitchStore } from '@/store/pitch-store';
import { useTablaStore } from '@/store/tabla-store';
import { useTanpuraStore } from '@/store/tanpura-store';

const storageMocks = vi.hoisted(() => {
  let failWith: Error | null = null;
  let collection: Preset[] = [];
  return {
    setFailure(error: Error | null) { failWith = error; },
    reset(data: Preset[] = []) { failWith = null; collection = [...data]; },
    stored() { return collection; },
    storage: {
      getAllPresets: vi.fn(async (): Promise<Preset[]> => {
        if (failWith) throw failWith;
        return [...collection];
      }),
      savePreset: vi.fn(async (preset: Preset): Promise<void> => {
        if (failWith) throw failWith;
        collection = [...collection.filter((item) => item.id !== preset.id), structuredClone(preset)];
      }),
      deletePreset: vi.fn(async (id: string): Promise<void> => {
        if (failWith) throw failWith;
        collection = collection.filter((item) => item.id !== id);
      }),
      savePresets: vi.fn(async (presets: Preset[]): Promise<void> => {
        if (failWith) throw failWith;
        collection = presets.map((preset) => structuredClone(preset));
      }),
      exportPresetsJSON: vi.fn(async (): Promise<string> => '[]'),
      importPresetsJSON: vi.fn(async (): Promise<number> => 0),
    },
  };
});
vi.mock('@/lib/storage', () => storageMocks.storage);

import { usePresetStore } from '@/store/preset-store';

const store = usePresetStore;

function resetInstrumentStores() {
  usePitchStore.setState(usePitchStore.getInitialState(), true);
  useTablaStore.setState(useTablaStore.getInitialState(), true);
  useTanpuraStore.setState(useTanpuraStore.getInitialState(), true);
}

beforeEach(() => {
  storageMocks.reset();
  storageMocks.storage.getAllPresets.mockClear();
  storageMocks.storage.savePreset.mockClear();
  store.setState({ presets: [], loading: false, error: null, activePresetId: null });
  resetInstrumentStores();
});

describe('saved sessions', () => {
  it('reports save failure without losing the collection and succeeds on retry', async () => {
    const actions = store.getState();
    const preset = capturePreset('Evening riyaz');

    storageMocks.setFailure(new Error('Quota exceeded'));
    await expect(actions.createPreset(preset)).rejects.toThrow('Quota exceeded');
    expect(store.getState()).toMatchObject({ error: 'Quota exceeded', presets: [], activePresetId: null });

    storageMocks.setFailure(null);
    await actions.createPreset(preset);
    expect(store.getState()).toMatchObject({ error: null, activePresetId: preset.id });
    expect(store.getState().presets).toHaveLength(1);
  });

  it('saves an independent snapshot that later edits do not mutate', async () => {
    const actions = store.getState();
    const saved = capturePreset('Morning riyaz');
    await actions.createPreset(saved);

    usePitchStore.getState().setPitch('G', 3, 0);
    useTablaStore.getState().setTempo(180);

    const stored = storageMocks.stored().find((item) => item.id === saved.id)!;
    expect(stored.pitch).toMatchObject(saved.pitch);
    expect(stored.tabla.tempo).toBe(saved.tabla.tempo);
    expect(capturePreset('Changed').tabla.tempo).toBe(180);
  });

  it('updates a session explicitly while a copy leaves the original unchanged', async () => {
    const actions = store.getState();
    const original = capturePreset('Original');
    await actions.createPreset(original);

    useTablaStore.getState().setTempo(150);
    await actions.updatePreset({ ...capturePreset('Original'), id: original.id });
    const updated = storageMocks.stored().find((item) => item.id === original.id)!;
    expect(updated.tabla.tempo).toBe(150);
    expect(updated.createdAt).toBe(original.createdAt);

    await actions.copyPreset(original.id, 'Original copy');
    expect(storageMocks.stored()).toHaveLength(2);
    const copy = storageMocks.stored().find((item) => item.id !== original.id)!;
    expect(copy.name).toBe('Original copy');
    expect(copy.tabla.tempo).toBe(150);
    expect(storageMocks.stored().find((item) => item.id === original.id)?.name).toBe('Original');
  });

  it('refuses to rename, update, or delete factory presets', async () => {
    const actions = store.getState();
    storageMocks.reset([structuredClone(FACTORY_PRESETS[0])]);
    await actions.loadPresets();
    const factoryId = FACTORY_PRESETS[0].id;

    await expect(actions.renamePreset(factoryId, 'New name')).rejects.toThrow('cannot be renamed');
    await expect(actions.updatePreset({ ...capturePreset('X'), id: factoryId })).rejects.toThrow('cannot be updated');
    await expect(actions.deletePreset(factoryId)).rejects.toThrow('cannot be deleted');
    expect(storageMocks.stored()).toHaveLength(1);
  });

  it('clears the active session when it is deleted', async () => {
    const actions = store.getState();
    const preset = capturePreset('Temporary');
    await actions.createPreset(preset);
    expect(store.getState().activePresetId).toBe(preset.id);
    await actions.deletePreset(preset.id);
    expect(store.getState()).toMatchObject({ presets: [], activePresetId: null, error: null });
  });

  it('toggles favorites and reports favorite failures truthfully', async () => {
    const actions = store.getState();
    const preset = capturePreset('Favorite candidate');
    await actions.createPreset(preset);

    await actions.toggleFavorite(preset.id);
    expect(store.getState().presets.find((item) => item.id === preset.id)?.favorite).toBe(true);

    storageMocks.setFailure(new Error('Storage locked'));
    await expect(actions.toggleFavorite(preset.id)).rejects.toThrow('Storage locked');
    expect(store.getState().error).toBe('Storage locked');
    storageMocks.setFailure(null);
  });

  it('propagates import failures without changing the collection', async () => {
    const actions = store.getState();
    storageMocks.storage.importPresetsJSON.mockRejectedValueOnce(new Error('Preset file is not valid JSON'));
    await expect(actions.importFromJSON('not json')).rejects.toThrow('not valid JSON');
    expect(store.getState()).toMatchObject({ error: 'Preset file is not valid JSON', presets: [] });
  });

  it('filters the collection by name, taal, and favorites', () => {
    const first = { ...capturePreset('Evening Desh'), favorite: false };
    first.tabla.taalId = 'keherva';
    const second = { ...capturePreset('Morning Yaman'), favorite: true };
    second.tabla.taalId = 'teentaal';

    expect(filterPresets([first, second], 'desh', false).map((item) => item.name)).toEqual(['Evening Desh']);
    expect(filterPresets([first, second], 'keherva', false).map((item) => item.name)).toEqual(['Evening Desh']);
    expect(filterPresets([first, second], '', true).map((item) => item.name)).toEqual(['Morning Yaman']);
    expect(filterPresets([first, second], '  ', false)).toHaveLength(2);
  });
});
