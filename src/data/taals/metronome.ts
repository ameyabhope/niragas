import type { TaalDefinition, Bol } from '@/audio/types';

/**
 * Metronome taals (1–9 beats) — simple click-style beat patterns.
 *
 * Beat 1 (sam) uses "Dha" (bass+treble, accented).
 * All other beats use "Na" (treble only, lighter).
 *
 * One taal per beat count since TaalDefinition has a fixed matra count.
 */

/** Build a basic metronome theka for N beats. */
function metronomeTheka(beats: number): Bol[] {
  return Array.from({ length: beats }, (_, i) => ({
    name: i === 0 ? 'Dha' : 'Na',
    position: i + 1,
    velocity: i === 0 ? 1.0 : 0.7,
  }));
}

const COMMON_TEMPO = { min: 20, max: 600 };
const COMMON_BREAKPOINTS = {
  vilambit: 60,
  madhya: 120,
  drut: 240,
};

/** Factory to create a metronome taal for a given beat count. */
function createMetronomeTaal(beats: number): TaalDefinition {
  return {
    id: `metronome-${beats}`,
    name: `Metronome (${beats})`,
    matras: beats,
    divisions: [{ matra: 1, type: 'sam', label: 'X' }],
    manjiraSupported: false,
    tempoRange: COMMON_TEMPO,
    speedBreakpoints: COMMON_BREAKPOINTS,
    styles: [
      {
        id: 'theka',
        name: 'Theka',
        thekas: { madhya: metronomeTheka(beats) },
      },
    ],
  };
}

export const metronome1 = createMetronomeTaal(1);
export const metronome2 = createMetronomeTaal(2);
export const metronome3 = createMetronomeTaal(3);
export const metronome4 = createMetronomeTaal(4);
export const metronome5 = createMetronomeTaal(5);
export const metronome6 = createMetronomeTaal(6);
export const metronome7 = createMetronomeTaal(7);
export const metronome8 = createMetronomeTaal(8);
export const metronome9 = createMetronomeTaal(9);

/** All metronome taals in order, for convenience. */
export const METRONOME_TAALS = [
  metronome1, metronome2, metronome3, metronome4, metronome5,
  metronome6, metronome7, metronome8, metronome9,
];
