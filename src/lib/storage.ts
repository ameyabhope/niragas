/**
 * IndexedDB storage layer using idb.
 * Stores presets only. Recordings are kept in-memory (not persisted).
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Preset } from '@/audio/types';
import {
  MAX_PRESET_IMPORT_BYTES,
  parsePreset,
  parsePresetExport,
  serializePresetExport,
} from '@/lib/presets';

const DB_NAME = 'niragas';
const DB_VERSION = 1;
const PRESETS_STORE = 'presets';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PRESETS_STORE)) {
          const store = db.createObjectStore(PRESETS_STORE, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('favorite', 'favorite', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

// ── Preset CRUD ─────────────────────────────────────────────────────────────

/**
 * Get all presets, sorted by name.
 */
export async function getAllPresets(): Promise<Preset[]> {
  const db = await getDB();
  const stored: unknown[] = await db.getAll(PRESETS_STORE);
  const presets: Preset[] = [];
  for (const value of stored) {
    try {
      presets.push(parsePreset(value, 'stored preset'));
    } catch (err) {
      console.warn('[Storage] Ignoring invalid stored preset:', err);
    }
  }
  return presets.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Save a preset (create or update).
 */
export async function savePreset(preset: Preset): Promise<void> {
  const db = await getDB();
  await db.put(PRESETS_STORE, parsePreset(preset));
}

/**
 * Delete a preset by ID.
 */
export async function deletePreset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(PRESETS_STORE, id);
}

/**
 * Save multiple presets at once (for factory import).
 */
export async function savePresets(presets: Preset[]): Promise<void> {
  const validated = presets.map((preset, index) => parsePreset(preset, `presets[${index}]`));
  const db = await getDB();
  const tx = db.transaction(PRESETS_STORE, 'readwrite');
  for (const preset of validated) {
    await tx.store.put(preset);
  }
  await tx.done;
}

/**
 * Export all presets as a JSON string.
 */
export async function exportPresetsJSON(): Promise<string> {
  const presets = await getAllPresets();
  return serializePresetExport(presets);
}

/**
 * Import presets from a JSON string. Merges with existing presets.
 * Existing presets with the same ID are overwritten.
 */
export async function importPresetsJSON(json: string): Promise<number> {
  if (new Blob([json]).size > MAX_PRESET_IMPORT_BYTES) {
    throw new Error('Preset file is larger than 2 MB');
  }
  const presets = parsePresetExport(JSON.parse(json) as unknown);
  await savePresets(presets);
  return presets.length;
}
