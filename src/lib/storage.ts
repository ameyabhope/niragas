/**
 * IndexedDB storage layer using idb.
 * Stores presets only. Recordings are kept in-memory (not persisted).
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Preset } from '@/audio/types';

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
  const presets = await db.getAll(PRESETS_STORE);
  return presets.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Save a preset (create or update).
 */
export async function savePreset(preset: Preset): Promise<void> {
  const db = await getDB();
  await db.put(PRESETS_STORE, preset);
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
  const db = await getDB();
  const tx = db.transaction(PRESETS_STORE, 'readwrite');
  for (const preset of presets) {
    await tx.store.put(preset);
  }
  await tx.done;
}

/**
 * Export all presets as a JSON string.
 */
export async function exportPresetsJSON(): Promise<string> {
  const presets = await getAllPresets();
  return JSON.stringify(presets, null, 2);
}

/**
 * Import presets from a JSON string. Merges with existing presets.
 * Existing presets with the same ID are overwritten.
 */
export async function importPresetsJSON(json: string): Promise<number> {
  const presets: Preset[] = JSON.parse(json);
  if (!Array.isArray(presets)) throw new Error('Invalid preset file format');
  await savePresets(presets);
  return presets.length;
}
