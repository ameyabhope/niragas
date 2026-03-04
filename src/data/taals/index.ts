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
import {
  deepchandi,
  dhamar,
  chautaal,
  jhoomra,
  tilwada,
  adaChautaal,
  sooltaal,
  panchamSawari,
  mattaTaal,
  bhajani,
  addha,
  punjabi,
  chartalKiSawari,
} from './additional';

/** All available taals, keyed by ID */
export const TAAL_MAP: Record<string, TaalDefinition> = {
  teentaal,
  jhaptaal,
  ektaal,
  rupak,
  dadra,
  keherva,
  [deepchandi.id]: deepchandi,
  [dhamar.id]: dhamar,
  [chautaal.id]: chautaal,
  [jhoomra.id]: jhoomra,
  [tilwada.id]: tilwada,
  [adaChautaal.id]: adaChautaal,
  [sooltaal.id]: sooltaal,
  [panchamSawari.id]: panchamSawari,
  [mattaTaal.id]: mattaTaal,
  [bhajani.id]: bhajani,
  [addha.id]: addha,
  [punjabi.id]: punjabi,
  [chartalKiSawari.id]: chartalKiSawari,
};

/** Ordered list for display in taal selector */
export const TAAL_LIST: TaalDefinition[] = [
  teentaal,
  jhaptaal,
  ektaal,
  rupak,
  dadra,
  keherva,
  deepchandi,
  dhamar,
  chautaal,
  jhoomra,
  tilwada,
  adaChautaal,
  sooltaal,
  panchamSawari,
  mattaTaal,
  bhajani,
  addha,
  punjabi,
  chartalKiSawari,
];

/** Get a taal by ID, with fallback to Teentaal */
export function getTaal(id: string): TaalDefinition {
  return TAAL_MAP[id] ?? teentaal;
}
