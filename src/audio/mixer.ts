/**
 * Audio mixer: per-instrument channel strips (gain + pan) routed to a master bus.
 *
 * Signal flow:
 *   Instrument → Channel Volume (Gain) → Channel Pan (Panner) → Master Volume → Destination
 */

import * as Tone from 'tone';
import type { InstrumentId } from './types';

interface Channel {
  volume: Tone.Volume;
  panner: Tone.Panner;
}

/** All instrument channel strips */
const channels: Map<InstrumentId, Channel> = new Map();

/** Master volume node */
let masterVolume: Tone.Volume | null = null;

/**
 * Create the mixer: one channel strip per instrument + master volume.
 * Call this once after initAudioEngine().
 */
export function createMixer(): void {
  if (masterVolume) return; // already created

  masterVolume = new Tone.Volume(0).toDestination();

  const instrumentIds: InstrumentId[] = [
    'tanpura1', 'tanpura2', 'tabla', 'surpeti',
    'swarmandal', 'manjira', 'metronome',
  ];

  for (const id of instrumentIds) {
    const panner = new Tone.Panner(0).connect(masterVolume);
    const volume = new Tone.Volume(0).connect(panner);
    channels.set(id, { volume, panner });
  }

  console.log('[Mixer] Created', channels.size, 'channel strips');
}

/**
 * Get the input node for an instrument. Connect your instrument output to this.
 */
export function getChannelInput(id: InstrumentId): Tone.Volume {
  const channel = channels.get(id);
  if (!channel) throw new Error(`Mixer channel not found: ${id}`);
  return channel.volume;
}

/**
 * Set volume for an instrument channel.
 * @param id - Instrument identifier
 * @param value - Linear volume 0-1
 */
export function setChannelVolume(id: InstrumentId, value: number): void {
  const channel = channels.get(id);
  if (!channel) return;
  // Convert linear 0-1 to dB. 0 = -Infinity, 1 = 0dB
  channel.volume.volume.value = value <= 0 ? -Infinity : 20 * Math.log10(value);
}

/**
 * Set pan for an instrument channel.
 * @param id - Instrument identifier
 * @param value - -1 (left) to 1 (right)
 */
export function setChannelPan(id: InstrumentId, value: number): void {
  const channel = channels.get(id);
  if (!channel) return;
  channel.panner.pan.value = value;
}

/**
 * Set master volume.
 * @param value - Linear volume 0-1
 */
export function setMasterVolume(value: number): void {
  if (!masterVolume) return;
  masterVolume.volume.value = value <= 0 ? -Infinity : 20 * Math.log10(value);
}

/**
 * Mute/unmute master.
 */
export function setMasterMute(muted: boolean): void {
  if (!masterVolume) return;
  masterVolume.mute = muted;
}

/**
 * Mute/unmute a specific channel.
 */
export function setChannelMute(id: InstrumentId, muted: boolean): void {
  const channel = channels.get(id);
  if (!channel) return;
  channel.volume.mute = muted;
}

/**
 * Dispose all mixer nodes (cleanup).
 */
export function disposeMixer(): void {
  for (const [, channel] of channels) {
    channel.volume.dispose();
    channel.panner.dispose();
  }
  channels.clear();
  masterVolume?.dispose();
  masterVolume = null;
}
