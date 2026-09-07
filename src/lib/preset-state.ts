import type { InstrumentId, Preset } from '@/audio/types';
import { useEQStore } from '@/store/eq-store';
import { useMixerStore } from '@/store/mixer-store';
import { usePitchStore } from '@/store/pitch-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { useTablaStore } from '@/store/tabla-store';
import { useTanpuraStore } from '@/store/tanpura-store';

export interface PresetLoadOptions {
  pitch: boolean;
  tanpura: boolean;
  tabla: boolean;
  surPeti: boolean;
  swarMandal: boolean;
  mixer: boolean;
  eq: boolean;
  preserveSa?: boolean;
  preserveTempo?: boolean;
}

export function capturePreset(name: string): Preset {
  const pitch = usePitchStore.getState();
  const tanpura = useTanpuraStore.getState();
  const tabla = useTablaStore.getState();
  const surPeti = useSurPetiStore.getState();
  const swarMandal = useSwarMandalStore.getState();
  const mixer = useMixerStore.getState();
  const eq = useEQStore.getState();
  const now = Date.now();

  const channels = {} as Preset['mixer'];
  for (const [id, channel] of Object.entries(mixer.channels)) {
    channels[id as InstrumentId] = { ...channel };
  }

  const uniqueId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return {
    schemaVersion: 3,
    id: `custom-${now}-${uniqueId}`,
    name: name.trim(),
    favorite: false,
    createdAt: now,
    updatedAt: now,
    pitch: {
      note: pitch.note,
      octave: pitch.octave,
      cents: pitch.cents,
      a4Freq: pitch.a4Freq,
    },
    tanpura1: { ...tanpura.tanpura1 },
    tanpura2: { ...tanpura.tanpura2 },
    tabla: {
      taalId: tabla.taalId,
      styleId: tabla.styleId,
      tempo: tabla.tempo,
      enabled: tabla.enabled,
    },
    surPeti: {
      enabled: surPeti.enabled,
    },
    swarMandal: {
      enabled: swarMandal.enabled,
      strings: swarMandal.strings.map((string) => ({ ...string })),
      autoLoop: swarMandal.autoLoop,
      loopDuration: swarMandal.loopDuration,
    },
    mixer: channels,
    master: {
      volume: mixer.masterVolume,
      muted: mixer.masterMuted,
    },
    eq: {
      enabled: eq.enabled,
      bands: eq.bands.map((band) => ({ ...band })),
      presetName: eq.presetName,
    },
  };
}

export function applyPresetState(preset: Preset, options: PresetLoadOptions): void {
  if (options.pitch && !options.preserveSa) {
    const pitch = usePitchStore.getState();
    pitch.setA4Freq(preset.pitch.a4Freq);
    pitch.setPitch(preset.pitch.note, preset.pitch.octave, preset.pitch.cents);
  }

  if (options.tanpura) {
    const tanpura = useTanpuraStore.getState();
    tanpura.setTanpuraConfig('tanpura1', { ...preset.tanpura1 });
    tanpura.setTanpuraConfig('tanpura2', { ...preset.tanpura2 });
  }

  if (options.tabla) {
    const tabla = useTablaStore.getState();
    const tempo = options.preserveTempo ? tabla.tempo : preset.tabla.tempo;
    // One store update: subscribers never see a transient taal/style pair,
    // and loading stays silent unless the live session is already running.
    tabla.applySetup({ taalId: preset.tabla.taalId, styleId: preset.tabla.styleId, tempo, enabled: preset.tabla.enabled });
  }

  if (options.surPeti) {
    useSurPetiStore.getState().setEnabled(preset.surPeti.enabled);
  }

  if (options.swarMandal) {
    useSwarMandalStore.getState().setConfig(preset.swarMandal);
  }

  if (options.mixer) {
    const mixer = useMixerStore.getState();
    for (const [id, channel] of Object.entries(preset.mixer)) {
      const instrumentId = id as InstrumentId;
      mixer.setVolume(instrumentId, channel.volume);
      mixer.setPan(instrumentId, channel.pan);
      mixer.setMuted(instrumentId, channel.muted);
    }
    mixer.setMasterVolume(preset.master.volume);
    mixer.setMasterMuted(preset.master.muted);
  }

  if (options.eq) {
    const eq = useEQStore.getState();
    eq.setPreset(preset.eq.presetName ?? 'Custom', preset.eq.bands);
    eq.setEnabled(preset.eq.enabled);
  }
}

export interface PresetLoadOutcome {
  applied: boolean;
  audioReady: boolean;
}

/**
 * Load a setup with audio initialization as a best effort, never a gate.
 * Configuration always applies (unless superseded by a newer request);
 * audio readiness only decides whether the new setup can sound yet.
 */
export async function applyPresetWithAudio(
  preset: Preset,
  options: PresetLoadOptions,
  dependencies: {
    sessionActive: boolean;
    initialize: () => Promise<boolean>;
    isStale: () => boolean;
  },
): Promise<PresetLoadOutcome> {
  if (dependencies.isStale()) return { applied: false, audioReady: false };
  const startsPlayback =
    (options.tanpura && (preset.tanpura1.enabled || preset.tanpura2.enabled)) ||
    (options.tabla && preset.tabla.enabled) ||
    (options.surPeti && preset.surPeti.enabled) ||
    (options.swarMandal && preset.swarMandal.enabled);
  const needsAudio = startsPlayback && dependencies.sessionActive;
  const audioReady = !needsAudio || (await dependencies.initialize());
  if (dependencies.isStale()) return { applied: false, audioReady };
  applyPresetState(preset, options);
  return { applied: true, audioReady };
}
