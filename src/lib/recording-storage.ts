import { openDB, type DBSchema } from 'idb';
import type { Recording } from '@/audio/recorder';

type StoredRecording = Omit<Recording, 'url'>;
interface RecordingDatabase extends DBSchema {
  recordings: { key: string; value: StoredRecording };
}

async function openRecordingDB() {
  return openDB<RecordingDatabase>('niragas-recordings', 1, {
    upgrade(db) { db.createObjectStore('recordings', { keyPath: 'id' }); },
  });
}

export async function loadRecordings(): Promise<StoredRecording[]> {
  const db = await openRecordingDB();
  try { return await db.getAll('recordings'); }
  finally { db.close(); }
}

export async function saveRecording(recording: Recording): Promise<void> {
  const db = await openRecordingDB();
  try {
    const { url: _url, ...stored } = recording;
    void _url;
    const tx = db.transaction('recordings', 'readwrite', { durability: 'strict' });
    await Promise.all([tx.store.put(stored), tx.done]);
  } finally { db.close(); }
}

export async function removeRecording(id: string): Promise<void> {
  const db = await openRecordingDB();
  try { await db.delete('recordings', id); }
  finally { db.close(); }
}
