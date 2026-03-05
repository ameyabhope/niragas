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
import {
  setTablaTempo,
  loadTaal,
  startTabla,
  stopTabla,
} from './tabla';
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
  setEQBandGain,
  applyEQPreset,
  createEQ,
} from './eq';
import { getTaal } from '@/data/taals';
import type { InstrumentId } from './types';
import { log } from './log';

let initialized = false;

const INSTRUMENT_IDS: InstrumentId[] = [
  'tanpura1', 'tanpura2', 'tabla', 'surpeti',
  'swarmandal', 'manjira', 'metronome',
];

/**
 * Set up all Zustand → audio engine subscriptions.
 * Call once after audio engine and mixer are initialized.
 */
export function initAudioSubscriptions(): void {
  if (initialized) return;
  initialized = true;

  // ── Tabla store ──

  let prevTabla = useTablaStore.getState();
  useTablaStore.subscribe((state) => {
    if (state.tempo !== prevTabla.tempo) {
      setTablaTempo(state.tempo);
    }

    if (state.playing !== prevTabla.playing) {
      if (state.playing) {
        const taal = getTaal(state.taalId);
        loadTaal(taal, state.styleId);
        setTablaTempo(state.tempo);
        startTabla();
      } else {
        stopTabla();
      }
    }

    prevTabla = state;
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
    // Band gains
    for (let i = 0; i < state.bands.length; i++) {
      if (state.bands[i].gain !== prevEQ.bands[i]?.gain) {
        setEQBandGain(i, state.bands[i].gain);
      }
    }

    // Preset applied
    if (state.presetName !== prevEQ.presetName && state.presetName !== 'Custom') {
      applyEQPreset(state.presetName);
    }

    // EQ enabled/disabled toggle
    if (state.enabled !== prevEQ.enabled) {
      if (state.enabled) {
        const { input, output } = createEQ();
        // Restore current band gains
        if (state.presetName !== 'Flat' && state.presetName !== 'Custom') {
          applyEQPreset(state.presetName);
        } else {
          state.bands.forEach((band, i) => setEQBandGain(i, band.gain));
        }
        insertEQ(input, output);
      } else {
        bypassEQ();
      }
    }

    prevEQ = state;
  });

  // ── Initial EQ state ──
  // If EQ is already enabled at startup, create and insert it now.
  // The subscription above only fires on state *changes*, so it won't
  // catch the initial enabled=true.
  const initialEQ = useEQStore.getState();
  if (initialEQ.enabled) {
    const { input, output } = createEQ();
    if (initialEQ.presetName !== 'Flat' && initialEQ.presetName !== 'Custom') {
      applyEQPreset(initialEQ.presetName);
    } else {
      initialEQ.bands.forEach((band, i) => setEQBandGain(i, band.gain));
    }
    insertEQ(input, output);
  }

  log('[Subscriptions] Audio subscriptions initialized');
}
