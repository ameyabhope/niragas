/**
 * Zustand → audio engine subscriptions.
 *
 * Single source of truth: UI components only update store state;
 * these subscriptions automatically propagate changes to the audio engine.
 * This eliminates the dual-state-sync anti-pattern where every handler
 * had to call both store.setX() and audioEngine.setX() separately.
 */

import { useTablaStore } from '@/store/tabla-store';
import { useMixerStore } from '@/store/mixer-store';
import { useEQStore } from '@/store/eq-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { usePitchStore } from '@/store/pitch-store';
import {
  createTabla,
  setTablaTempo,
  loadTaal,
  startTabla,
  stopTabla,
  setTablaBeatCallback,
  setTablaPitch,
} from './tabla';
import {
  createTanpura,
  startTanpura,
  stopTanpura,
  updateTanpura,
} from './tanpura';
import {
  createSurPeti,
  setSurPetiPitch,
  startSurPeti,
  stopSurPeti,
} from './surpeti';
import {
  createSwarMandal,
  isSwarMandalPlaying,
  startSwarMandalLoop,
  stopSwarMandalLoop,
  updateSwarMandal,
  updateSwarMandalPitch,
} from './swarmandal';
import {
  setChannelVolume,
  setChannelPan,
  setChannelMute,
  setMasterVolume,
  setMasterMute,
  insertEQ,
  bypassEQ,
} from './mixer';
import {
  setEQBand,
  createEQ,
} from './eq';
import { getTaal } from '@/data/taals';
import type { InstrumentId } from './types';
import { log } from './log';

let initialized = false;
let tablaReady = false;
let tablaInitialization: Promise<void> | null = null;
let tablaOperation = Promise.resolve();

type TanpuraId = 'tanpura1' | 'tanpura2';
const readyTanpuras = new Set<TanpuraId>();
const tanpuraInitializations = new Map<TanpuraId, Promise<void>>();
const tanpuraOperations = new Map<TanpuraId, Promise<void>>();

const INSTRUMENT_IDS: InstrumentId[] = [
  'tanpura1', 'tanpura2', 'tabla', 'surpeti',
  'swarmandal', 'manjira', 'metronome',
];

async function ensureTabla(): Promise<void> {
  if (tablaReady) return;
  if (!tablaInitialization) {
    tablaInitialization = createTabla()
      .then(() => {
        tablaReady = true;
      })
      .finally(() => {
        tablaInitialization = null;
      });
  }
  await tablaInitialization;
}

function queueTablaSync(reloadTaal: boolean): void {
  tablaOperation = tablaOperation
    .then(async () => {
      const beforeLoad = useTablaStore.getState();
      if (!beforeLoad.playing && !tablaReady) return;

      await ensureTabla();
      const state = useTablaStore.getState();
      if (!state.playing) {
        stopTabla();
        return;
      }

      if (reloadTaal) {
        loadTaal(getTaal(state.taalId), state.styleId);
      }
      setTablaTempo(state.tempo);
      const pitch = usePitchStore.getState();
      setTablaPitch(pitch.note, pitch.octave, pitch.cents);
      startTabla();
    })
    .catch((err) => console.error('[Subscriptions] Tabla sync failed:', err));
}

async function ensureTanpura(id: TanpuraId): Promise<void> {
  if (readyTanpuras.has(id)) return;
  let initialization = tanpuraInitializations.get(id);
  if (!initialization) {
    const config = useTanpuraStore.getState()[id];
    const pitch = usePitchStore.getState();
    initialization = createTanpura(id, config, pitch.note, pitch.octave, pitch.cents)
      .then(() => {
        readyTanpuras.add(id);
      })
      .finally(() => {
        tanpuraInitializations.delete(id);
      });
    tanpuraInitializations.set(id, initialization);
  }
  await initialization;
}

function queueTanpuraSync(id: TanpuraId): void {
  const previous = tanpuraOperations.get(id) ?? Promise.resolve();
  const operation = previous
    .then(async () => {
      const initialConfig = useTanpuraStore.getState()[id];
      if (!initialConfig.enabled && !readyTanpuras.has(id)) return;

      await ensureTanpura(id);
      const config = useTanpuraStore.getState()[id];
      const pitch = usePitchStore.getState();
      await updateTanpura(id, config, pitch.note, pitch.octave, pitch.cents);

      if (config.enabled) startTanpura(id);
      else stopTanpura(id);
    })
    .catch((err) => console.error(`[Subscriptions] ${id} sync failed:`, err));
  tanpuraOperations.set(id, operation);
}

function syncSurPeti(): void {
  const pitch = usePitchStore.getState();
  const { enabled } = useSurPetiStore.getState();
  setSurPetiPitch(pitch.note, pitch.octave, pitch.cents);
  if (enabled) startSurPeti(pitch.note, pitch.octave, pitch.cents);
  else stopSurPeti();
}

function syncSwarMandal(): void {
  const state = useSwarMandalStore.getState();
  const pitch = usePitchStore.getState();
  updateSwarMandal({
    enabled: state.enabled,
    strings: state.strings,
    autoLoop: state.autoLoop,
    loopDuration: state.loopDuration,
  });
  updateSwarMandalPitch(pitch.note, pitch.octave, pitch.cents);
  if (state.enabled && state.autoLoop) {
    if (!isSwarMandalPlaying()) startSwarMandalLoop();
  } else if (isSwarMandalPlaying()) {
    stopSwarMandalLoop();
  }
}

/**
 * Set up all Zustand → audio engine subscriptions.
 * Call once after audio engine and mixer are initialized.
 */
export function initAudioSubscriptions(): void {
  if (initialized) return;
  initialized = true;

  // ── Tabla store ──

  createSurPeti();
  createSwarMandal();
  setTablaBeatCallback((matra, label) => {
    useTablaStore.getState().setCurrentBeat(matra, label);
  });

  let prevTabla = useTablaStore.getState();
  useTablaStore.subscribe((state) => {
    const taalChanged = state.taalId !== prevTabla.taalId;
    const styleChanged = state.styleId !== prevTabla.styleId;
    const started = state.playing && !prevTabla.playing;

    if (state.playing !== prevTabla.playing || (state.playing && (taalChanged || styleChanged))) {
      queueTablaSync(started || taalChanged || styleChanged);
    } else if (state.tempo !== prevTabla.tempo && tablaReady) {
      setTablaTempo(state.tempo);
    }

    prevTabla = state;
  });

  // ── Instrument stores and shared pitch ──

  useTanpuraStore.subscribe(() => {
    queueTanpuraSync('tanpura1');
    queueTanpuraSync('tanpura2');
  });

  useSurPetiStore.subscribe(syncSurPeti);
  useSwarMandalStore.subscribe(syncSwarMandal);

  let prevPitch = usePitchStore.getState();
  usePitchStore.subscribe((state) => {
    if (
      state.note !== prevPitch.note ||
      state.octave !== prevPitch.octave ||
      state.cents !== prevPitch.cents ||
      state.a4Freq !== prevPitch.a4Freq
    ) {
      queueTanpuraSync('tanpura1');
      queueTanpuraSync('tanpura2');
      syncSurPeti();
      syncSwarMandal();
      if (tablaReady) setTablaPitch(state.note, state.octave, state.cents);
    }
    prevPitch = state;
  });

  // ── Mixer store ──

  let prevMixer = useMixerStore.getState();
  useMixerStore.subscribe((state) => {
    // Channel changes
    for (const id of INSTRUMENT_IDS) {
      const curr = state.channels[id];
      const prev = prevMixer.channels[id];
      if (curr.volume !== prev.volume) {
        setChannelVolume(id, curr.volume);
      }
      if (curr.pan !== prev.pan) {
        setChannelPan(id, curr.pan);
      }
      if (curr.muted !== prev.muted) {
        setChannelMute(id, curr.muted);
      }
    }

    // Master volume
    if (state.masterVolume !== prevMixer.masterVolume) {
      setMasterVolume(state.masterVolume);
    }

    // Master mute
    if (state.masterMuted !== prevMixer.masterMuted) {
      setMasterMute(state.masterMuted);
    }

    prevMixer = state;
  });

  // ── EQ store ──

  let prevEQ = useEQStore.getState();
  useEQStore.subscribe((state) => {
    // Complete band configuration
    for (let i = 0; i < state.bands.length; i++) {
      const current = state.bands[i];
      const previous = prevEQ.bands[i];
      if (
        !previous ||
        current.gain !== previous.gain ||
        current.frequency !== previous.frequency ||
        current.Q !== previous.Q ||
        current.type !== previous.type
      ) {
        setEQBand(i, current);
      }
    }

    // EQ enabled/disabled toggle
    if (state.enabled !== prevEQ.enabled) {
      if (state.enabled) {
        const { input, output } = createEQ();
        // Restore current band configuration
        state.bands.forEach((band, i) => setEQBand(i, band));
        insertEQ(input, output);
      } else {
        bypassEQ();
      }
    }

    prevEQ = state;
  });

  // ── Mixer enabled mirror ──
  // Mixer dots are display-only: instrument stores own on/off.
  // Mirror them here so dots/sliders always reflect engine truth.
  const syncMixerEnabled = (id: InstrumentId, enabled: boolean) => {
    if (useMixerStore.getState().channels[id].enabled !== enabled) {
      useMixerStore.getState().setEnabled(id, enabled);
    }
  };

  useTanpuraStore.subscribe((state) => {
    syncMixerEnabled('tanpura1', state.tanpura1.enabled);
    syncMixerEnabled('tanpura2', state.tanpura2.enabled);
  });

  useTablaStore.subscribe((state) => {
    syncMixerEnabled('tabla', state.playing);
  });

  useSurPetiStore.subscribe((state) => {
    syncMixerEnabled('surpeti', state.enabled);
  });

  useSwarMandalStore.subscribe((state) => {
    syncMixerEnabled('swarmandal', state.enabled);
  });

  // ── Initial mixer state ──
  // Subscriptions only fire on state *changes*, so push the initial
  // volumes/pans/mutes now — otherwise the 75%/80% sliders are fiction
  // until first touched (channels boot at 0dB unmuted).
  const initialMixer = useMixerStore.getState();
  for (const id of INSTRUMENT_IDS) {
    setChannelVolume(id, initialMixer.channels[id].volume);
    setChannelPan(id, initialMixer.channels[id].pan);
    setChannelMute(id, initialMixer.channels[id].muted);
  }
  setMasterVolume(initialMixer.masterVolume);
  setMasterMute(initialMixer.masterMuted);

  // Mirror current engine truth into mixer dots at boot
  const tanpuraInit = useTanpuraStore.getState();
  syncMixerEnabled('tanpura1', tanpuraInit.tanpura1.enabled);
  syncMixerEnabled('tanpura2', tanpuraInit.tanpura2.enabled);
  syncMixerEnabled('tabla', useTablaStore.getState().playing);
  syncMixerEnabled('surpeti', useSurPetiStore.getState().enabled);
  syncMixerEnabled('swarmandal', useSwarMandalStore.getState().enabled);

  syncSurPeti();
  syncSwarMandal();

  // ── Initial EQ state ──
  // If EQ is already enabled at startup, create and insert it now.
  // The subscription above only fires on state *changes*, so it won't
  // catch the initial enabled=true.
  const initialEQ = useEQStore.getState();
  if (initialEQ.enabled) {
    const { input, output } = createEQ();
    initialEQ.bands.forEach((band, i) => setEQBand(i, band));
    insertEQ(input, output);
  }

  log('[Subscriptions] Audio subscriptions initialized');
}
