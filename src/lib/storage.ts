/**
 * IndexedDB storage layer using idb.
 * Stores presets. Recordings use a separate IndexedDB database in recording-storage.ts.
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
// Version 2 removes the name/favorite/updatedAt indexes. Collection sizes are
// small and reads are validated and sorted in memory, so these indexes only
// added upgrade and mutation work without providing a query seam.
const DB_VERSION = 2;
const PRESETS_STORE = 'presets';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    const opening = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains(PRESETS_STORE)) {
          db.createObjectStore(PRESETS_STORE, { keyPath: 'id' });
        } else {
          const store = transaction.objectStore(PRESETS_STORE);
          for (const index of ['name', 'favorite', 'updatedAt']) {
            if (store.indexNames.contains(index)) store.deleteIndex(index);
          }
        }
      },
    });
    dbPromise = opening.catch((error) => {
      // A blocked/failed open must be retryable after the user resolves the
      // browser storage problem; do not cache a rejected promise forever.
      dbPromise = null;
      throw error;
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
 * Existing IDs are rejected so importing cannot silently overwrite a session.
 */
export async function importPresetsJSON(json: string): Promise<number> {
  if (typeof json !== 'string') throw new Error('Preset file must be JSON text');
  if (new Blob([json]).size > MAX_PRESET_IMPORT_BYTES) {
    throw new Error('Preset file is larger than 2 MB');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw new Error('Preset file is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Preset file format or schema version is not supported');
  }
  const envelope = parsed as Record<string, unknown>;
  if (envelope.format !== 'niragas-presets' || envelope.schemaVersion !== 3) {
    throw new Error('Preset file format or schema version is not supported');
  }
  const presets = parsePresetExport(parsed);
  const existing = await getAllPresets();
  const existingIds = new Set(existing.map((preset) => preset.id));
  const collision = presets.find((preset) => existingIds.has(preset.id));
  if (collision) {
    throw new Error(`Preset ID "${collision.id}" already exists; remove it or import with a new ID`);
  }
  await savePresets(presets);
  return presets.length;
}
