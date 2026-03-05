/**
 * Audio mixer: per-instrument channel strips (gain + pan) routed to a master bus.
 *
 * Signal flow:
 *   Instrument → Channel Volume (Gain) → Channel Pan (Panner) → preMasterGain
 *     → [EQ input → EQ output] → masterVolume → Destination
 *
 * When EQ is bypassed, preMasterGain connects directly to masterVolume.
 */

import * as Tone from 'tone';
import type { InstrumentId } from './types';
import { log } from './log';

interface Channel {
  volume: Tone.Volume;
  panner: Tone.Panner;
}

/** All instrument channel strips */
const channels: Map<InstrumentId, Channel> = new Map();

/** Pre-master gain — feeds into EQ or directly into masterVolume */
let preMasterGain: Tone.Gain | null = null;

/** Master volume node */
let masterVolume: Tone.Volume | null = null;

/** Currently inserted EQ nodes */
let eqInput: Tone.Gain | null = null;
let eqOutput: Tone.Gain | null = null;

/**
 * Create the mixer: one channel strip per instrument + master volume.
 * Call this once after initAudioEngine().
 */
export function createMixer(): void {
  if (masterVolume) return; // already created

  masterVolume = new Tone.Volume(0).toDestination();
  preMasterGain = new Tone.Gain(1).connect(masterVolume);

  const instrumentIds: InstrumentId[] = [
    'tanpura1', 'tanpura2', 'tabla', 'surpeti',
    'swarmandal', 'manjira', 'metronome',
  ];

  for (const id of instrumentIds) {
    const panner = new Tone.Panner(0).connect(preMasterGain);
    const volume = new Tone.Volume(0).connect(panner);
    channels.set(id, { volume, panner });
  }

  log('[Mixer] Created', channels.size, 'channel strips');
}

/**
 * Insert the EQ between preMasterGain and masterVolume.
 * Disconnects the direct path and routes through the EQ chain.
 */
export function insertEQ(input: Tone.Gain, output: Tone.Gain): void {
  if (!preMasterGain || !masterVolume) return;

  // Disconnect the direct path
  preMasterGain.disconnect(masterVolume);

  // Route through EQ: preMasterGain → EQ input → ... → EQ output → masterVolume
  preMasterGain.connect(input);
  output.connect(masterVolume);

  eqInput = input;
  eqOutput = output;

  log('[Mixer] EQ inserted into signal chain');
}

/**
 * Bypass (remove) the EQ — reconnect preMasterGain directly to masterVolume.
 */
export function bypassEQ(): void {
  if (!preMasterGain || !masterVolume) return;

  // Disconnect EQ if it was connected
  if (eqInput) {
    try { preMasterGain.disconnect(eqInput); } catch { /* already disconnected */ }
  }
  if (eqOutput) {
    try { eqOutput.disconnect(masterVolume); } catch { /* already disconnected */ }
  }

  // Reconnect direct path
  preMasterGain.connect(masterVolume);

  eqInput = null;
  eqOutput = null;

  log('[Mixer] EQ bypassed');
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
 * Get the master volume node (for recording tap).
 */
export function getMasterNode(): Tone.Volume | null {
  return masterVolume;
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
  preMasterGain?.dispose();
  preMasterGain = null;
  eqInput = null;
  eqOutput = null;
  masterVolume?.dispose();
  masterVolume = null;
}

/**
 * Check if the mixer has been created.
 */
export function isMixerReady(): boolean {
  return masterVolume !== null;
}
