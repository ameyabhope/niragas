import type {
  ChannelState,
  EQBand,
  InstrumentId,
  NoteName,
  Preset,
  SwarMandalStringConfig,
  SwarName,
  SwarVariant,
  TanpuraConfig,
  TanpuraEQ,
  TanpuraTuning,
} from '@/audio/types';
import { NOTE_NAMES } from '@/lib/notes';
import { TAAL_MAP } from '@/data/taals';
import { EQ_PRESET_NAMES } from '@/audio/eq';

export const PRESET_SCHEMA_VERSION = 3;
const MAX_PRESETS_PER_IMPORT = 500;
export const MAX_PRESET_IMPORT_BYTES = 2 * 1024 * 1024;

const INSTRUMENT_IDS: InstrumentId[] = [
  'tanpura1', 'tanpura2', 'tabla', 'surpeti', 'swarmandal',
];
const TANPURA_TUNINGS: TanpuraTuning[] = ['Pa', 'Ma', 'Ni'];
const TANPURA_EQS: TanpuraEQ[] = ['neutral', 'bass', 'treble'];
const SWAR_NAMES: SwarName[] = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];
const SWAR_VARIANTS: SwarVariant[] = ['shuddha', 'komal', 'tivra'];
const FILTER_TYPES: BiquadFilterType[] = [
  'lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf',
  'peaking', 'notch', 'allpass',
];

type UnknownRecord = Record<string, unknown>;

function record(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as UnknownRecord;
}

function string(value: unknown, path: string, maxLength = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`${path} must be a non-empty string of at most ${maxLength} characters`);
  }
  return value.trim();
}

function number(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${path} must be between ${min} and ${max}`);
  }
  return value;
}

function integer(value: unknown, path: string, min: number, max: number): number {
  const result = number(value, path, min, max);
  if (!Number.isInteger(result)) throw new Error(`${path} must be an integer`);
  return result;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${path} must be a boolean`);
  return value;
}

function oneOf<T extends string>(value: unknown, values: readonly T[], path: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new Error(`${path} has an unsupported value`);
  }
  return value as T;
}

function parseTanpura(value: unknown, path: string): TanpuraConfig {
  const input = record(value, path);
  return {
    enabled: boolean(input.enabled, `${path}.enabled`),
    tuning: oneOf(input.tuning, TANPURA_TUNINGS, `${path}.tuning`),
    eq: oneOf(input.eq, TANPURA_EQS, `${path}.eq`),
    finePitchCents: number(input.finePitchCents, `${path}.finePitchCents`, -50, 50),
    speed: number(input.speed, `${path}.speed`, 0.7, 1.4),
  };
}

function parseChannel(value: unknown, path: string): ChannelState {
  const input = record(value, path);
  return {
    volume: number(input.volume, `${path}.volume`, 0, 1),
    pan: number(input.pan, `${path}.pan`, -1, 1),
    muted: boolean(input.muted, `${path}.muted`),
  };
}

function parseString(value: unknown, path: string): SwarMandalStringConfig {
  const input = record(value, path);
  return {
    note: oneOf(input.note, SWAR_NAMES, `${path}.note`),
    variant: oneOf(input.variant, SWAR_VARIANTS, `${path}.variant`),
    octaveOffset: integer(input.octaveOffset, `${path}.octaveOffset`, -2, 3),
    enabled: boolean(input.enabled, `${path}.enabled`),
  };
}

function parseEQBand(value: unknown, path: string): EQBand {
  const input = record(value, path);
  return {
    frequency: number(input.frequency, `${path}.frequency`, 20, 24000),
    gain: number(input.gain, `${path}.gain`, -12, 12),
    Q: number(input.Q, `${path}.Q`, 0.1, 10),
    type: oneOf(input.type, FILTER_TYPES, `${path}.type`),
  };
}

export function parsePreset(value: unknown, path = 'preset'): Preset {
  const input = record(value, path);
  const schemaVersion = input.schemaVersion;
  if (schemaVersion !== PRESET_SCHEMA_VERSION) {
    throw new Error(`${path}.schemaVersion is not supported`);
  }

  const pitch = record(input.pitch, `${path}.pitch`);
  const note = oneOf(pitch.note, NOTE_NAMES, `${path}.pitch.note`) as NoteName;
  const octave = integer(pitch.octave, `${path}.pitch.octave`, 2, 4);
  const midi = (octave + 1) * 12 + NOTE_NAMES.indexOf(note);
  if (midi < 45 || midi > 64) throw new Error(`${path}.pitch must be between A2 and E4`);
  const a4Freq = pitch.a4Freq ?? 440;
  if (a4Freq !== 440 && a4Freq !== 432) {
    throw new Error(`${path}.pitch.a4Freq must be 440 or 432`);
  }

  const tabla = record(input.tabla, `${path}.tabla`);
  const taalId = string(tabla.taalId, `${path}.tabla.taalId`, 80);
  const taal = TAAL_MAP[taalId];
  if (!taal) throw new Error(`${path}.tabla.taalId is unknown`);
  const styleId = string(tabla.styleId, `${path}.tabla.styleId`, 80);
  if (!taal.styles.some((style) => style.id === styleId)) {
    throw new Error(`${path}.tabla.styleId is not available for ${taalId}`);
  }

  const surPeti = record(input.surPeti, `${path}.surPeti`);
  const swarMandal = record(input.swarMandal, `${path}.swarMandal`);
  if (!Array.isArray(swarMandal.strings) || swarMandal.strings.length > 64) {
    throw new Error(`${path}.swarMandal.strings must contain at most 64 strings`);
  }
  const mixer = record(input.mixer, `${path}.mixer`);
  const channels = {} as Record<InstrumentId, ChannelState>;
  for (const id of INSTRUMENT_IDS) {
    channels[id] = parseChannel(mixer[id], `${path}.mixer.${id}`);
  }

  const masterInput = record(input.master, `${path}.master`);
  const eq = record(input.eq, `${path}.eq`);
  if (!Array.isArray(eq.bands) || eq.bands.length !== 7) {
    throw new Error(`${path}.eq.bands must contain exactly 7 bands`);
  }

  const presetName = eq.presetName === null
    ? null
    : oneOf(eq.presetName, [...EQ_PRESET_NAMES, 'Custom'], `${path}.eq.presetName`);

  return {
    schemaVersion: PRESET_SCHEMA_VERSION,
    id: string(input.id, `${path}.id`, 160),
    name: string(input.name, `${path}.name`),
    favorite: boolean(input.favorite, `${path}.favorite`),
    createdAt: number(input.createdAt, `${path}.createdAt`, 0, Number.MAX_SAFE_INTEGER),
    updatedAt: number(input.updatedAt, `${path}.updatedAt`, 0, Number.MAX_SAFE_INTEGER),
    pitch: {
      note,
      octave,
      cents: number(pitch.cents, `${path}.pitch.cents`, -50, 50),
      a4Freq,
    },
    tanpura1: parseTanpura(input.tanpura1, `${path}.tanpura1`),
    tanpura2: parseTanpura(input.tanpura2, `${path}.tanpura2`),
    tabla: {
      taalId,
      styleId,
      tempo: number(tabla.tempo, `${path}.tabla.tempo`, taal.tempoRange.min, taal.tempoRange.max),
      enabled: boolean(tabla.enabled, `${path}.tabla.enabled`),
    },
    surPeti: {
      enabled: boolean(surPeti.enabled, `${path}.surPeti.enabled`),
    },
    swarMandal: {
      enabled: boolean(swarMandal.enabled, `${path}.swarMandal.enabled`),
      strings: swarMandal.strings.map((item, index) => parseString(item, `${path}.swarMandal.strings[${index}]`)),
      autoLoop: boolean(swarMandal.autoLoop, `${path}.swarMandal.autoLoop`),
      loopDuration: number(swarMandal.loopDuration, `${path}.swarMandal.loopDuration`, 2, 30),
    },
    mixer: channels,
    master: {
      volume: number(masterInput.volume, `${path}.master.volume`, 0, 1),
      muted: boolean(masterInput.muted, `${path}.master.muted`),
    },
    eq: {
      enabled: boolean(eq.enabled, `${path}.eq.enabled`),
      bands: eq.bands.map((band, index) => parseEQBand(band, `${path}.eq.bands[${index}]`)),
      presetName,
    },
  };
}

export function parsePresetExport(value: unknown): Preset[] {
  let values: unknown;
  if (Array.isArray(value)) {
    values = value;
  } else {
    const envelope = record(value, 'preset file');
    if (envelope.format !== 'niragas-presets' || envelope.schemaVersion !== PRESET_SCHEMA_VERSION) {
      throw new Error('Preset file format or schema version is not supported');
    }
    values = envelope.presets;
  }

  if (!Array.isArray(values) || values.length > MAX_PRESETS_PER_IMPORT) {
    throw new Error(`Preset file must contain at most ${MAX_PRESETS_PER_IMPORT} presets`);
  }

  const presets = values.map((preset, index) => parsePreset(preset, `presets[${index}]`));
  const ids = new Set(presets.map((preset) => preset.id));
  if (ids.size !== presets.length) throw new Error('Preset file contains duplicate IDs');
  return presets;
}

export function serializePresetExport(presets: Preset[]): string {
  return JSON.stringify({
    format: 'niragas-presets',
    schemaVersion: PRESET_SCHEMA_VERSION,
    presets,
  }, null, 2);
}
