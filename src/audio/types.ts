/**
 * Shared types for the audio engine.
 * The audio layer is framework-agnostic -- no React imports here.
 */

/** Swara (note) names in Indian Classical music */
export type SwarName = 'Sa' | 'Re' | 'Ga' | 'Ma' | 'Pa' | 'Dha' | 'Ni';

/** Swara variants */
export type SwarVariant = 'shuddha' | 'komal' | 'tivra';

/** Western note names */
export type NoteName =
  | 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F'
  | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/** Instrument identifiers */
export type InstrumentId =
  | 'tanpura1'
  | 'tanpura2'
  | 'tabla'
  | 'surpeti'
  | 'swarmandal';

/** Tanpura tuning type (first string) */
export type TanpuraTuning = 'Pa' | 'Ma' | 'Ni';

/** Tanpura EQ variant */
export type TanpuraEQ = 'neutral' | 'bass' | 'treble';

/** Full tanpura configuration (loop-based) */
export interface TanpuraConfig {
  enabled: boolean;
  tuning: TanpuraTuning;     // First string: Pa, Ma, or Ni
  eq: TanpuraEQ;             // EQ variant (only affects Pa+C samples)
  finePitchCents: number;    // -50 to +50 cents
  speed: number;             // 0.7 to 1.4 (1.0 = normal)
}

/** Speed range labels for tabla */
export type SpeedRange =
  | 'ati-vilambit'
  | 'vilambit'
  | 'madhya'
  | 'drut'
  | 'ati-drut';

/** Beat division types */
export type DivisionType = 'sam' | 'taali' | 'khaali';

/** A single division marker in a taal */
export interface Division {
  matra: number;
  type: DivisionType;
  label: string; // display label: "X", "2", "0", "3", etc.
}

/** A single bol (tabla syllable) in a theka */
export interface Bol {
  name: string;        // e.g., "Dha", "Dhin", "Na"
  position: number;    // beat position (can be fractional)
  velocity?: number;   // 0-1
  variant?: string;    // sample variant
}

/** A style (variation) for a taal */
export interface TaalStyle {
  id: string;
  name: string;
  thekas: Partial<Record<SpeedRange, Bol[]>>;
}

/** Full taal definition */
export interface TaalDefinition {
  id: string;
  name: string;
  matras: number;
  divisions: Division[];
  styles: TaalStyle[];
  tempoRange: { min: number; max: number };
  speedBreakpoints: {
    atiVilambit?: number;
    vilambit: number;
    madhya: number;
    drut: number;
    atiDrut?: number;
  };
}

/** Mixer channel state */
export interface ChannelState {
  volume: number;   // 0 to 1
  pan: number;      // -1 to 1
  muted: boolean;
}

/** 7-band EQ state */
export interface EQBand {
  frequency: number;  // Hz
  gain: number;       // -12 to +12 dB
  Q: number;          // quality factor
  type: BiquadFilterType;
}

export interface EQState {
  enabled: boolean;
  bands: EQBand[];
  presetName: string | null;
}

/** Swar Mandal string config */
export interface SwarMandalStringConfig {
  note: SwarName;
  variant: SwarVariant;
  octaveOffset: number;
  enabled: boolean;
}

export interface SwarMandalConfig {
  enabled: boolean;
  strings: SwarMandalStringConfig[];
  autoLoop: boolean;
  loopDuration: number; // seconds
}

/** Preset data */
export interface Preset {
  schemaVersion: 3;
  id: string;
  name: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  pitch: {
    note: NoteName;
    octave: number;
    cents: number;
    a4Freq: 440 | 432;
  };
  tanpura1: TanpuraConfig;
  tanpura2: TanpuraConfig;
  tabla: {
    taalId: string;
    styleId: string;
    tempo: number;
    enabled: boolean;
  };
  surPeti: { enabled: boolean };
  swarMandal: SwarMandalConfig;
  mixer: Record<InstrumentId, ChannelState>;
  master: { volume: number; muted: boolean };
  eq: EQState;
}
