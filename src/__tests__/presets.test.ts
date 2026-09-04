import { describe, expect, it } from 'vitest';
import { FACTORY_PRESETS } from '@/data/raag-presets';
import { applyPresetState, capturePreset, type PresetLoadOptions } from '@/lib/preset-state';
import { parsePreset, parsePresetExport, serializePresetExport } from '@/lib/presets';
import { useEQStore } from '@/store/eq-store';
import { useMixerStore } from '@/store/mixer-store';
import { usePitchStore } from '@/store/pitch-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { useTablaStore } from '@/store/tabla-store';
import { useTanpuraStore } from '@/store/tanpura-store';

const LOAD_ALL: PresetLoadOptions = {
  pitch: true,
  tanpura: true,
  tabla: true,
  surPeti: true,
  swarMandal: true,
  mixer: true,
  eq: true,
};

describe('preset validation', () => {
  it('validates every factory preset', () => {
    for (const preset of FACTORY_PRESETS) {
      expect(parsePreset(preset)).toEqual(preset);
    }
  });

  it('migrates legacy presets with safe defaults', () => {
    const legacy = structuredClone(FACTORY_PRESETS[0]) as unknown as Record<string, unknown>;
    delete legacy.schemaVersion;
    delete legacy.master;
    delete (legacy.pitch as Record<string, unknown>).a4Freq;

    const migrated = parsePreset(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.pitch.a4Freq).toBe(440);
    expect(migrated.master).toEqual({ volume: 0.8, muted: false });
  });

  it('rejects the whole file when any preset is invalid', () => {
    const invalid = structuredClone(FACTORY_PRESETS[0]);
    invalid.mixer.tabla.volume = 4;
    expect(() => parsePresetExport([FACTORY_PRESETS[1], invalid])).toThrow(
      'presets[1].mixer.tabla.volume'
    );
  });

  it('round-trips the versioned export envelope', () => {
    const exported = serializePresetExport(FACTORY_PRESETS.slice(0, 2));
    expect(parsePresetExport(JSON.parse(exported) as unknown)).toEqual(FACTORY_PRESETS.slice(0, 2));
  });
});

describe('preset state round-tripping', () => {
  it('restores all configurable state and captures it again', () => {
    const preset = structuredClone(FACTORY_PRESETS[0]);
    preset.pitch = { note: 'G#', octave: 3, cents: -13, a4Freq: 432 };
    preset.tanpura1 = {
      enabled: true,
      tuning: 'Ma',
      eq: 'bass',
      finePitchCents: 7,
      speed: 0.9,
      volume: 0.4,
      pan: -0.7,
    };
    preset.tanpura2.enabled = false;
    preset.tabla = { taalId: 'keherva', styleId: 'theka', tempo: 128, enabled: true };
    preset.surPeti.enabled = true;
    preset.swarMandal = {
      enabled: true,
      strings: [
        { note: 'Sa', variant: 'shuddha', octaveOffset: 0, enabled: true },
        { note: 'Ga', variant: 'komal', octaveOffset: 1, enabled: false },
      ],
      autoLoop: true,
      loopDuration: 11,
      volume: 0.45,
    };
    preset.mixer.tabla = { enabled: true, volume: 0.42, pan: -0.25, muted: true };
    preset.mixer.surpeti.volume = 0.33;
    preset.mixer.swarmandal.volume = 0.45;
    preset.master = { volume: 0.61, muted: true };
    preset.eq.enabled = false;
    preset.eq.presetName = 'Custom';
    preset.eq.bands[2].gain = 5;
    preset.eq.bands[2].Q = 1.8;

    applyPresetState(preset, LOAD_ALL);

    expect(usePitchStore.getState()).toMatchObject(preset.pitch);
    expect(useTanpuraStore.getState().tanpura1).toEqual(preset.tanpura1);
    expect(useTablaStore.getState()).toMatchObject({
      taalId: 'keherva',
      styleId: 'theka',
      tempo: 128,
      playing: true,
    });
    expect(useSurPetiStore.getState().enabled).toBe(true);
    expect(useSwarMandalStore.getState()).toMatchObject({
      enabled: true,
      strings: preset.swarMandal.strings,
      autoLoop: true,
      loopDuration: 11,
    });
    expect(useMixerStore.getState()).toMatchObject({
      masterVolume: 0.61,
      masterMuted: true,
    });
    expect(useMixerStore.getState().channels.tabla).toMatchObject({
      volume: 0.42,
      pan: -0.25,
      muted: true,
    });
    expect(useEQStore.getState()).toMatchObject({
      enabled: false,
      presetName: 'Custom',
      bands: preset.eq.bands,
    });

    const captured = capturePreset('Full session');
    expect(captured).toMatchObject({
      schemaVersion: 2,
      name: 'Full session',
      pitch: preset.pitch,
      tabla: preset.tabla,
      surPeti: { enabled: true, volume: 0.33 },
      swarMandal: preset.swarMandal,
      master: preset.master,
      eq: preset.eq,
    });
    expect(parsePreset(captured)).toEqual(captured);
  });
});
