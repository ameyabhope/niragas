/**
 * Music theory utilities: note names, frequencies, swara-to-semitone mapping.
 *
 * The A4 reference frequency is configurable (440 Hz or 432 Hz).
 * All frequency calculations use the current reference.
 */

import type { NoteName, SwarName, SwarVariant } from '@/audio/types';

/** All 12 western note names in chromatic order */
export const NOTE_NAMES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** A4 reference frequency — configurable (440 or 432 Hz) */
let a4Freq = 440;
const A4_MIDI = 69;

/** Get the current A4 reference frequency. */
export function getA4Freq(): number {
  return a4Freq;
}

/** Set the A4 reference frequency (e.g., 440 or 432). */
export function setA4Freq(freq: number): void {
  a4Freq = freq;
}

/**
 * Convert a note name + octave to frequency in Hz.
 * Uses the current A4 reference frequency.
 * @param note - Western note name (e.g., "C#")
 * @param octave - Octave number (e.g., 3)
 * @param cents - Fine-tune offset in cents (default 0)
 */
export function noteToFreq(note: NoteName, octave: number, cents = 0): number {
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) throw new Error(`Invalid note: ${note}`);
  const midi = (octave + 1) * 12 + noteIndex;
  return a4Freq * Math.pow(2, (midi - A4_MIDI + cents / 100) / 12);
}

/**
 * Convert a frequency to the nearest note name, octave, and cent offset.
 * Uses the current A4 reference frequency.
 */
export function freqToNote(freq: number): { note: NoteName; octave: number; cents: number } {
  const midiFloat = 12 * Math.log2(freq / a4Freq) + A4_MIDI;
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return { note: NOTE_NAMES[noteIndex], octave, cents };
}

/**
 * Swara-to-semitone offset from Sa.
 * Shuddha values are the default. Komal lowers by 1 semitone.
 * Tivra raises by 1 semitone (only Ma has tivra).
 */
const SWARA_SEMITONES: Record<SwarName, number> = {
  Sa: 0,
  Re: 2,   // shuddha Re = major 2nd
  Ga: 4,   // shuddha Ga = major 3rd
  Ma: 5,   // shuddha Ma = perfect 4th
  Pa: 7,   // Pa = perfect 5th (no variant)
  Dha: 9,  // shuddha Dha = major 6th
  Ni: 11,  // shuddha Ni = major 7th
};

/**
 * Get the semitone offset of a swara from Sa.
 */
function swarToSemitones(
  note: SwarName,
  variant: SwarVariant = 'shuddha'
): number {
  let semitones = SWARA_SEMITONES[note];

  // Pa and Sa have no variants
  if (note === 'Sa' || note === 'Pa') return semitones;

  if (variant === 'komal') {
    semitones -= 1;
  } else if (variant === 'tivra' && note === 'Ma') {
    semitones += 1;
  }

  return semitones;
}

/**
 * Get the MIDI-style note name for a swara given a Sa root.
 * Returns a string like "G3" that Tone.js can understand.
 */
export function swarToToneNote(
  saNote: NoteName,
  saOctave: number,
  swar: SwarName,
  variant: SwarVariant = 'shuddha',
  octaveOffset = 0
): string {
  const saIndex = NOTE_NAMES.indexOf(saNote);
  const semitones = swarToSemitones(swar, variant);
  const totalSemitones = saIndex + semitones + octaveOffset * 12;
  const noteIndex = ((totalSemitones % 12) + 12) % 12;
  const octave = saOctave + Math.floor(totalSemitones / 12);
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}
