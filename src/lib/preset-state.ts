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
  channels.tanpura1.enabled = tanpura.tanpura1.enabled;
  channels.tanpura2.enabled = tanpura.tanpura2.enabled;
  channels.tabla.enabled = tabla.playing;
  channels.surpeti.enabled = surPeti.enabled;
  channels.swarmandal.enabled = swarMandal.enabled;

  const uniqueId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  return {
    schemaVersion: 2,
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
      enabled: tabla.playing,
    },
    surPeti: {
      enabled: surPeti.enabled,
      volume: mixer.channels.surpeti.volume,
    },
    swarMandal: {
      enabled: swarMandal.enabled,
      strings: swarMandal.strings.map((string) => ({ ...string })),
      autoLoop: swarMandal.autoLoop,
      loopDuration: swarMandal.loopDuration,
      volume: mixer.channels.swarmandal.volume,
    },
    manjira: {
      enabled: mixer.channels.manjira.enabled,
      volume: mixer.channels.manjira.volume,
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
    tabla.setTaalId(preset.tabla.taalId);
    tabla.setStyleId(preset.tabla.styleId);
    tabla.setTempo(tempo);
    tabla.setPlaying(preset.tabla.enabled);
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
