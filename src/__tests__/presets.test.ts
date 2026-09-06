import { describe, expect, it } from 'vitest';
import { FACTORY_PRESETS, hasRaagSwarMandal, migrateFactoryRaagPreset } from '@/data/raag-presets';
import type { SwarName } from '@/audio/types';
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
  it('uses explicit raag variants and Sa-only fallbacks, including pitch/taal aliases', () => {
    const inventory = (id: string) => FACTORY_PRESETS.find((p) => p.id === `factory-${id}`)!.swarMandal.strings;
    expect(inventory('yaman')).toContainEqual({ note: 'Ma', variant: 'tivra', octaveOffset: 0, enabled: true });
    expect(inventory('yaman').some((s) => s.note === 'Ma' && s.variant === 'shuddha')).toBe(false);
    expect(inventory('malkauns').map((s) => `${s.note}:${s.variant}`)).toEqual([
      'Sa:shuddha', 'Ga:komal', 'Ma:shuddha', 'Dha:komal', 'Ni:komal', 'Sa:shuddha',
    ]);
    expect(inventory('bhairav').filter((s) => s.variant === 'komal').map((s) => s.note)).toEqual(['Re', 'Dha']);
    expect(inventory('yaman-women')).toEqual(inventory('yaman'));
    expect(inventory('malkauns-jhaptaal')).toEqual(inventory('malkauns'));
    expect(FACTORY_PRESETS.find((p) => p.id === 'factory-bageshri')!.tanpura2.tuning).toBe('Ma');
    expect(FACTORY_PRESETS.find((p) => p.id === 'factory-darbari-ektaal')!.tanpura2.tuning).toBe('Pa');
    expect(FACTORY_PRESETS.find((p) => p.id === 'factory-gujari-todi')!.tanpura1.tuning).toBe('Ni');
    for (const preset of FACTORY_PRESETS) {
      if (!hasRaagSwarMandal(preset.id)) {
        expect(preset.swarMandal.strings.every((s) => s.note === 'Sa' && s.variant === 'shuddha')).toBe(true);
      } else {
        for (const tanpura of [preset.tanpura1, preset.tanpura2]) {
          expect(preset.swarMandal.strings.some((s) => s.note === tanpura.tuning && s.variant === 'shuddha')).toBe(true);
        }
      }
    }
  });

  it('migrates shipped factory strings and unsupported drones without losing user metadata', () => {
    const old = structuredClone(FACTORY_PRESETS.find((p) => p.id === 'factory-malkauns')!);
    old.swarMandal.strings = (['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa'] as SwarName[]).map((note, i) => ({
      note, variant: 'shuddha', octaveOffset: i === 7 ? 1 : 0, enabled: true,
    }));
    old.tanpura2.tuning = 'Ni';
    old.favorite = true;
    old.pitch.cents = 12;
    const migrated = migrateFactoryRaagPreset(old);
    expect(migrated.tanpura2.tuning).toBe('Ma');
    expect(migrated).toMatchObject({ favorite: true, pitch: old.pitch, createdAt: old.createdAt, updatedAt: old.updatedAt });
    expect(migrateFactoryRaagPreset(migrated)).toBe(migrated);
    expect(parsePreset(migrated)).toEqual(migrated);
    const custom = { ...old, id: 'custom-saved-malkauns' };
    expect(migrateFactoryRaagPreset(custom)).toBe(custom);
    old.swarMandal.strings[0].enabled = false;
    expect(migrateFactoryRaagPreset(old)).toBe(old);
  });

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
  it('edits every string independently and round-trips variants and octave bounds', () => {
    useSwarMandalStore.getState().setConfig(FACTORY_PRESETS[0].swarMandal);
    const before = structuredClone(useSwarMandalStore.getState().strings);
    const store = useSwarMandalStore.getState();
    store.setStringNote(3, 'Ga', 'komal');
    store.setStringOctave(3, -2);
    store.setStringOctave(4, 3);
    store.setStringOctave(4, 4);
    expect(useSwarMandalStore.getState().strings[0]).toEqual(before[0]);
    expect(useSwarMandalStore.getState().strings[3]).toMatchObject({ note: 'Ga', variant: 'komal', octaveOffset: -2 });
    expect(useSwarMandalStore.getState().strings[4].octaveOffset).toBe(3);
    store.addString();
    store.removeString(1);
    const saved = capturePreset('Edited strings');
    expect(parsePresetExport(JSON.parse(serializePresetExport([saved])))[0].swarMandal).toEqual(saved.swarMandal);
  });

  it('preserves Sa and tempo independently while loading other preset sections', () => {
    const preset = FACTORY_PRESETS[0];
    usePitchStore.getState().setPitch('G#', 3, 11);
    usePitchStore.getState().setA4Freq(432);
    useTablaStore.getState().setTaalId('teentaal');
    useTablaStore.getState().setTempo(120);
    applyPresetState(preset, { ...LOAD_ALL, preserveSa: true });
    expect(usePitchStore.getState()).toMatchObject({ note: 'G#', cents: 11, a4Freq: 432 });
    expect(useTablaStore.getState().tempo).toBe(preset.tabla.tempo);
    useTablaStore.getState().setTempo(120);
    applyPresetState(preset, { ...LOAD_ALL, preserveTempo: true });
    expect(usePitchStore.getState()).toMatchObject(preset.pitch);
    expect(useTablaStore.getState().tempo).toBe(120);
    expect(useSwarMandalStore.getState().strings).toEqual(preset.swarMandal.strings);
  });

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
