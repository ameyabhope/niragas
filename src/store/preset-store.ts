/**
 * Preset state: list management, loading, saving, import/export.
 */

import { create } from 'zustand';
import type { Preset } from '@/audio/types';
import {
  getAllPresets,
  savePreset,
  deletePreset as deletePresetDB,
  savePresets,
  exportPresetsJSON,
  importPresetsJSON,
} from '@/lib/storage';
import { FACTORY_PRESETS } from '@/data/raag-presets';
import type { PresetLoadOptions } from '@/lib/preset-state';

/** Which parts of a preset to load */
export type LoadOptions = PresetLoadOptions;

interface PresetState {
  presets: Preset[];
  loading: boolean;
  error: string | null;
  showFavoritesOnly: boolean;
  loadOptions: LoadOptions;
  activePresetId: string | null;

  /** Load all presets from IndexedDB */
  loadPresets: () => Promise<void>;
  /** Load factory presets (merge, don't overwrite custom) */
  loadFactoryPresets: () => Promise<void>;
  /** Save a new preset */
  createPreset: (preset: Preset) => Promise<void>;
  /** Rename a user-created preset without changing its setup. */
  renamePreset: (id: string, name: string) => Promise<void>;
  /** Update an existing preset */
  updatePreset: (preset: Preset) => Promise<void>;
  /** Save an independent copy of a preset. */
  copyPreset: (id: string, name: string) => Promise<void>;
  /** Delete a preset */
  deletePreset: (id: string) => Promise<void>;
  /** Toggle favorite */
  toggleFavorite: (id: string) => Promise<void>;
  /** Toggle favorites filter */
  toggleShowFavorites: () => void;
  /** Set which parts to load */
  setLoadOption: (key: keyof LoadOptions, value: boolean) => void;
  /** Set active preset */
  setActivePresetId: (id: string | null) => void;
  /** Export all presets as JSON string */
  exportAll: () => Promise<string>;
  /** Import presets from JSON string */
  importFromJSON: (json: string) => Promise<number>;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [],
  loading: false,
  error: null,
  showFavoritesOnly: false,
  loadOptions: {
    pitch: true,
    tanpura: true,
    tabla: true,
    surPeti: true,
    swarMandal: true,
    mixer: true,
    eq: true,
  },
  activePresetId: null,

  loadPresets: async () => {
    set({ loading: true, error: null });
    try {
      const presets = await getAllPresets();
      // Incompatible stored setups are already rejected during load; no migration is kept.
      // If no presets at all, load factory ones
      if (presets.length === 0) {
        await savePresets(FACTORY_PRESETS);
        set({ presets: FACTORY_PRESETS, loading: false, error: null });
      } else {
        set({ presets, loading: false, error: null });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load saved sessions from browser storage.';
      console.error('[PresetStore] Failed to load presets:', err);
      set({ loading: false, error: message });
    }
  },

  loadFactoryPresets: async () => {
    set({ loading: true, error: null });
    try {
      await savePresets(FACTORY_PRESETS);
      const presets = await getAllPresets();
      set({ presets, loading: false, error: null });
    } catch (err) {
      console.error('[PresetStore] Failed to load factory presets:', err);
      set({ loading: false, error: err instanceof Error ? err.message : 'Could not save factory presets.' });
    }
  },

  createPreset: async (preset) => {
    try {
      await savePreset(preset);
      const presets = await getAllPresets();
      set({ presets, activePresetId: preset.id, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save the session.';
      set({ error: message });
      throw err;
    }
  },

  renamePreset: async (id, name) => {
    const preset = get().presets.find((item) => item.id === id);
    if (!preset) throw new Error('Saved session was not found');
    if (preset.id.startsWith('factory-')) throw new Error('Factory presets cannot be renamed');
    await savePreset({ ...preset, name: name.trim(), updatedAt: Date.now() });
    set({ presets: await getAllPresets(), error: null });
  },

  updatePreset: async (preset) => {
    if (preset.id.startsWith('factory-')) throw new Error('Factory presets cannot be updated');
    try {
      await savePreset({ ...preset, updatedAt: Date.now() });
      const presets = await getAllPresets();
      set({ presets, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update the saved session.';
      set({ error: message });
      throw err;
    }
  },

  copyPreset: async (id, name) => {
    const source = get().presets.find((item) => item.id === id);
    if (!source) throw new Error('Saved session was not found');
    const now = Date.now();
    const suffix = typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    const copy: Preset = structuredClone({
      ...source,
      id: `custom-${now}-${suffix}`,
      name: name.trim(),
      favorite: false,
      createdAt: now,
      updatedAt: now,
    });
    try {
      await savePreset(copy);
      set({ presets: await getAllPresets(), activePresetId: copy.id, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save a copy.';
      set({ error: message });
      throw err;
    }
  },

  deletePreset: async (id) => {
    if (id.startsWith('factory-')) throw new Error('Factory presets cannot be deleted');
    try {
      await deletePresetDB(id);
      const presets = await getAllPresets();
      set((state) => ({
        presets,
        activePresetId: state.activePresetId === id ? null : state.activePresetId,
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete the saved session.';
      set({ error: message });
      throw err;
    }
  },

  toggleFavorite: async (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    try {
      await savePreset({ ...preset, favorite: !preset.favorite, updatedAt: Date.now() });
      const presets = await getAllPresets();
      set({ presets, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update favorite.';
      set({ error: message });
      throw err;
    }
  },

  toggleShowFavorites: () =>
    set((state) => ({ showFavoritesOnly: !state.showFavoritesOnly })),

  setLoadOption: (key, value) =>
    set((state) => ({
      loadOptions: { ...state.loadOptions, [key]: value },
    })),

  setActivePresetId: (id) => set({ activePresetId: id }),

  exportAll: async () => {
    return exportPresetsJSON();
  },

  importFromJSON: async (json) => {
    try {
      const count = await importPresetsJSON(json);
      const presets = await getAllPresets();
      set({ presets, error: null });
      return count;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not import saved sessions.';
      set({ error: message });
      throw err;
    }
  },
}));
