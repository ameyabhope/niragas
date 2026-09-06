/**
 * Taal registry: imports all taal definitions and exports them as a map.
 */

import type { TaalDefinition } from '@/audio/types';
import { METRONOME_TAALS } from './metronome';
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
import {
  farodast,
  jat,
  pashto,
  chanchar,
  tivra,
  dhumali,
  sitarkhani,
  sawari,
  gajJhampa,
  rudra,
  lakshmi,
  brahma,
  vishnu,
  ashtamangal,
  tevra,
  khemta,
  kahervaBhajan,
  roopakSawari,
  yashwant,
  indra,
  surphankhta,
  dipak,
  mani,
  ganesh,
  narayana,
  chandrashekhar,
  shikar,
  basant,
} from './additional2';

/** Ordered list for display in taal selector */
export const TAAL_LIST: TaalDefinition[] = [
  ...METRONOME_TAALS,
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
  farodast,
  jat,
  pashto,
  chanchar,
  tivra,
  dhumali,
  sitarkhani,
  sawari,
  gajJhampa,
  rudra,
  lakshmi,
  brahma,
  vishnu,
  ashtamangal,
  tevra,
  khemta,
  kahervaBhajan,
  roopakSawari,
  yashwant,
  indra,
  surphankhta,
  dipak,
  mani,
  ganesh,
  narayana,
  chandrashekhar,
  shikar,
  basant,
];

export const TAAL_MAP: Record<string, TaalDefinition> = Object.fromEntries(
  TAAL_LIST.map((taal) => [taal.id, taal]),
);

/** Get a taal by ID, with fallback to Teentaal */
export function getTaal(id: string): TaalDefinition {
  return TAAL_MAP[id] ?? teentaal;
}
