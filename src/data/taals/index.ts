/**
 * Taal registry: imports all taal definitions and exports them as a map.
 */

import type { TaalDefinition } from '@/audio/types';
import { teentaal } from './teentaal';
import { jhaptaal } from './jhaptaal';
import { ektaal } from './ektaal';
import { rupak } from './rupak';
import { dadra } from './dadra';
import { keherva } from './keherva';

/** All available taals, keyed by ID */
export const TAAL_MAP: Record<string, TaalDefinition> = {
  teentaal,
  jhaptaal,
  ektaal,
  rupak,
  dadra,
  keherva,
};

/** Ordered list for display in taal selector */
export const TAAL_LIST: TaalDefinition[] = [
  teentaal,
  jhaptaal,
  ektaal,
  rupak,
  dadra,
  keherva,
];

/** Get a taal by ID, with fallback to Teentaal */
export function getTaal(id: string): TaalDefinition {
  return TAAL_MAP[id] ?? teentaal;
}
