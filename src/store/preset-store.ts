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

/** Which parts of a preset to load */
export interface LoadOptions {
  pitch: boolean;
  tanpura: boolean;
  tabla: boolean;
  mixer: boolean;
  eq: boolean;
}

interface PresetState {
  presets: Preset[];
  loading: boolean;
  showFavoritesOnly: boolean;
  loadOptions: LoadOptions;
  activePresetId: string | null;

  /** Load all presets from IndexedDB */
  loadPresets: () => Promise<void>;
  /** Load factory presets (merge, don't overwrite custom) */
  loadFactoryPresets: () => Promise<void>;
  /** Save a new preset */
  createPreset: (preset: Preset) => Promise<void>;
  /** Update an existing preset */
  updatePreset: (preset: Preset) => Promise<void>;
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
  showFavoritesOnly: false,
  loadOptions: {
    pitch: true,
    tanpura: true,
    tabla: true,
    mixer: true,
    eq: true,
  },
  activePresetId: null,

  loadPresets: async () => {
    set({ loading: true });
    try {
      const presets = await getAllPresets();
      // If no presets at all, load factory ones
      if (presets.length === 0) {
        await savePresets(FACTORY_PRESETS);
        set({ presets: FACTORY_PRESETS, loading: false });
      } else {
        set({ presets, loading: false });
      }
    } catch (err) {
      console.error('[PresetStore] Failed to load presets:', err);
      set({ loading: false });
    }
  },

  loadFactoryPresets: async () => {
    set({ loading: true });
    try {
      await savePresets(FACTORY_PRESETS);
      const presets = await getAllPresets();
      set({ presets, loading: false });
    } catch (err) {
      console.error('[PresetStore] Failed to load factory presets:', err);
      set({ loading: false });
    }
  },

  createPreset: async (preset) => {
    await savePreset(preset);
    const presets = await getAllPresets();
    set({ presets, activePresetId: preset.id });
  },

  updatePreset: async (preset) => {
    await savePreset({ ...preset, updatedAt: Date.now() });
    const presets = await getAllPresets();
    set({ presets });
  },

  deletePreset: async (id) => {
    await deletePresetDB(id);
    const presets = await getAllPresets();
    set((state) => ({
      presets,
      activePresetId: state.activePresetId === id ? null : state.activePresetId,
    }));
  },

  toggleFavorite: async (id) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;
    await savePreset({ ...preset, favorite: !preset.favorite, updatedAt: Date.now() });
    const presets = await getAllPresets();
    set({ presets });
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
    const count = await importPresetsJSON(json);
    const presets = await getAllPresets();
    set({ presets });
    return count;
  },
}));
