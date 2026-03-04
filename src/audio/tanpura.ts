/**
 * Tanpura engine — realistic Indian classical drone.
 *
 * Architecture (per tanpura instance):
 *
 *   Sound Source (Sampler or FMSynth)
 *       │
 *       ▼
 *   Jivari simulation (WaveShaper soft-clip + resonant comb filter)
 *       │
 *       ▼
 *   Body resonance (bandpass filter chain — simulates gourd body)
 *       │
 *       ▼
 *   Chorus (slow, wide — creates the characteristic shimmer/beating)
 *       │
 *       ▼
 *   Reverb (long decay — ambient space)
 *       │
 *       ▼
 *   Mixer Channel
 *
 * Key sound design elements:
 *
 * 1. JIVARI (bridge buzz): The tanpura bridge is curved so the vibrating
 *    string grazes it, creating a rich swarm of overtones. We simulate this
 *    with a WaveShaper (soft clipping) that adds odd and even harmonics,
 *    plus a short comb-filter feedback that reinforces specific overtone
 *    frequencies.
 *
 * 2. CROSSFADE: Each string rings for much longer than the pluck interval,
 *    so multiple strings overlap. We use long note durations (2-5x the pluck
 *    interval) with slow attack envelopes for natural crossfade.
 *
 * 3. BODY RESONANCE: A bandpass filter chain simulates the wooden body/gourd
 *    resonance that colors the tanpura's tone.
 *
 * 4. CHORUS/SHIMMER: Slow LFO chorus creates the beating effect between
 *    near-unison overtones — the "alive" quality of a real tanpura.
 */

import * as Tone from 'tone';
import type { TanpuraConfig, NoteName } from './types';
import { swarToToneNote } from '@/lib/notes';
import { getChannelInput } from './mixer';
import { loadTanpuraSampler } from './sample-loader';

// ── Jivari Curve ────────────────────────────────────────────────────────────

/**
 * Generate a WaveShaper curve that simulates jivari buzz.
 * This is a soft-clip with asymmetric distortion that enriches harmonics
 * without harsh digital clipping.
 */
function createJivariCurve(amount: number = 0.6): Float32Array {
  const samples = 8192;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1; // -1 to 1
    // Soft-clip with tanh shaping + slight asymmetry for even harmonics
    const shaped = Math.tanh(x * (1 + amount * 3)) * (1 - 0.1 * amount);
    // Add subtle quadratic component for buzz character
    const buzz = x * x * amount * 0.15 * Math.sign(x);
    curve[i] = shaped + buzz;
  }
  return curve;
}

// ── Instance Type ───────────────────────────────────────────────────────────

interface TanpuraInstance {
  // Sound sources
  synth: Tone.PolySynth;
  sampler: Tone.Sampler | null;
  useSamples: boolean;

  // Effects chain
  jivari: Tone.WaveShaper;
  jivariGain: Tone.Gain;       // Dry/wet blend for jivari
  dryGain: Tone.Gain;          // Dry path (bypasses jivari)
  bodyFilter1: Tone.Filter;    // Body resonance — low band
  bodyFilter2: Tone.Filter;    // Body resonance — mid band
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
  compressor: Tone.Compressor; // Gentle compression to tame dynamics

  // Playback state
  loop: Tone.Loop | null;
  currentStringIndex: number;
  playing: boolean;
  config: TanpuraConfig;
  saNote: NoteName;
  saOctave: number;
}

const instances: Map<string, TanpuraInstance> = new Map();

// ── Effects Chain ───────────────────────────────────────────────────────────

function createTanpuraChain(channelInput: Tone.Volume) {
  // Final stage: gentle compressor to even out dynamics
  const compressor = new Tone.Compressor({
    threshold: -20,
    ratio: 3,
    attack: 0.1,
    release: 0.5,
  }).connect(channelInput);

  // Reverb: long, spacious — tanpura sounds best in a reverberant room
  const reverb = new Tone.Reverb({
    decay: 6,
    wet: 0.3,
    preDelay: 0.02,
  }).connect(compressor);

  // Chorus: slow, wide shimmer — creates the beating overtone character
  const chorus = new Tone.Chorus({
    frequency: 0.5,      // Very slow LFO
    delayTime: 4.0,      // Wider delay for richer detuning
    depth: 0.7,
    wet: 0.35,
    spread: 180,         // Full stereo spread
  }).connect(reverb);
  chorus.start();

  // Body resonance: two bandpass filters simulating gourd resonance
  // Low body resonance (~150-300 Hz) — warmth
  const bodyFilter1 = new Tone.Filter({
    type: 'peaking' as BiquadFilterType,
    frequency: 200,
    Q: 1.5,
    gain: 4,
  }).connect(chorus);

  // Mid body resonance (~800-1200 Hz) — presence and nasal quality
  const bodyFilter2 = new Tone.Filter({
    type: 'peaking' as BiquadFilterType,
    frequency: 1000,
    Q: 2.0,
    gain: 3,
  }).connect(bodyFilter1);

  // Jivari (bridge buzz): waveshaper distortion
  const jivari = new Tone.WaveShaper(createJivariCurve(0.6));

  // Wet path: through jivari → body filters
  const jivariGain = new Tone.Gain(0.65).connect(bodyFilter2);
  jivari.connect(jivariGain);

  // Dry path: clean signal mixed in for clarity
  const dryGain = new Tone.Gain(0.45).connect(bodyFilter2);

  // FM synth (fallback when samples unavailable)
  const synth = new Tone.PolySynth(Tone.FMSynth);
  synth.maxPolyphony = 10;
  synth.set({
    harmonicity: 2,
    modulationIndex: 8,
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.08,      // Quick pluck attack
      decay: 2.0,        // Long natural decay
      sustain: 0.3,
      release: 5.0,      // Very long release for overlapping sustain
    },
    modulation: { type: 'triangle' },
    modulationEnvelope: {
      attack: 0.2,
      decay: 1.5,
      sustain: 0.2,
      release: 4.0,
    },
  });
  // Synth goes through both jivari and dry paths
  synth.connect(jivari);
  synth.connect(dryGain);

  return {
    synth, jivari, jivariGain, dryGain,
    bodyFilter1, bodyFilter2, chorus, reverb, compressor,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Initialize a tanpura instance.
 * Loads samples if available; builds full effects chain for both paths.
 */
export async function createTanpura(
  id: 'tanpura1' | 'tanpura2',
  config: TanpuraConfig,
  saNote: NoteName,
  saOctave: number
): Promise<void> {
  disposeTanpura(id);

  const channelInput = getChannelInput(id);
  const chain = createTanpuraChain(channelInput);

  // Try loading sampler — route through BOTH jivari and dry paths
  const sampler = await loadTanpuraSampler(chain.jivari as unknown as Tone.InputNode);
  if (sampler) {
    // Also connect sampler to dry path for clean blend
    sampler.connect(chain.dryGain);
  }

  const instance: TanpuraInstance = {
    synth: chain.synth,
    sampler,
    useSamples: sampler !== null,
    jivari: chain.jivari,
    jivariGain: chain.jivariGain,
    dryGain: chain.dryGain,
    bodyFilter1: chain.bodyFilter1,
    bodyFilter2: chain.bodyFilter2,
    chorus: chain.chorus,
    reverb: chain.reverb,
    compressor: chain.compressor,
    loop: null,
    currentStringIndex: 0,
    playing: false,
    config: { ...config },
    saNote,
    saOctave,
  };

  instances.set(id, instance);
  console.log(`[Tanpura] Created ${id} (${sampler ? 'sample-based' : 'synthesis'})`);
}

/**
 * Start the tanpura plucking loop.
 *
 * Strings are plucked in sequence with:
 * - Long overlapping note durations (crossfade)
 * - Slight timing humanization (±25ms)
 * - Velocity variation per pluck
 * - First string (Pa/Ma/Ni) slightly louder as is traditional
 */
export function startTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance || instance.playing) return;

  const enabledStrings = instance.config.strings.filter((s) => s.enabled);
  if (enabledStrings.length === 0) return;

  const pluckInterval = instance.config.cycleSpeed / enabledStrings.length;
  instance.currentStringIndex = 0;

  instance.loop = new Tone.Loop((time) => {
    const idx = instance.currentStringIndex;
    const stringConfig = enabledStrings[idx];
    if (!stringConfig) return;

    const toneNote = swarToToneNote(
      instance.saNote,
      instance.saOctave,
      stringConfig.note,
      stringConfig.variant,
      stringConfig.octaveOffset
    );

    // Long overlapping sustain — each note rings well past the next pluck
    // This creates the characteristic "wall of sound" drone
    const noteDuration = Math.min(pluckInterval * 3.5, 8);

    // First string is traditionally louder (Pa/Ma/Ni string)
    const isFirstString = idx === 0;
    const baseVelocity = isFirstString ? 0.65 : 0.50;
    const velocity = baseVelocity + Math.random() * 0.12;

    // Timing humanization (±25ms) — makes it feel hand-played
    const humanize = (Math.random() - 0.5) * 0.05;
    const triggerTime = Math.max(time + humanize, time);

    // Trigger the note
    const source = (instance.useSamples && instance.sampler)
      ? instance.sampler
      : instance.synth;
    source.triggerAttackRelease(toneNote, noteDuration, triggerTime, velocity);

    instance.currentStringIndex =
      (instance.currentStringIndex + 1) % enabledStrings.length;
  }, pluckInterval);

  instance.loop.start(0);
  instance.playing = true;

  if (Tone.getTransport().state !== 'started') {
    Tone.getTransport().start();
  }

  console.log(
    `[Tanpura] Started ${id}: ${enabledStrings.length} strings, ` +
    `${pluckInterval.toFixed(2)}s interval, ` +
    `${instance.useSamples ? 'samples' : 'synth'}`
  );
}

/**
 * Stop the tanpura plucking loop.
 */
export function stopTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  instance.loop?.stop();
  instance.loop?.dispose();
  instance.loop = null;
  instance.synth.releaseAll();
  instance.playing = false;
  instance.currentStringIndex = 0;

  console.log(`[Tanpura] Stopped ${id}`);
}

/**
 * Update the tanpura configuration. Restarts the loop if currently playing.
 */
export function updateTanpura(
  id: 'tanpura1' | 'tanpura2',
  config: Partial<TanpuraConfig>,
  saNote?: NoteName,
  saOctave?: number
): void {
  const instance = instances.get(id);
  if (!instance) return;

  const wasPlaying = instance.playing;
  if (wasPlaying) stopTanpura(id);

  instance.config = { ...instance.config, ...config };
  if (saNote !== undefined) instance.saNote = saNote;
  if (saOctave !== undefined) instance.saOctave = saOctave;

  if (wasPlaying && instance.config.enabled) {
    startTanpura(id);
  }
}

/**
 * Update the Sa pitch for a tanpura. Restarts if playing.
 */
export function updateTanpuraPitch(
  id: string,
  saNote: NoteName,
  saOctave: number
): void {
  const instance = instances.get(id);
  if (!instance) return;

  const wasPlaying = instance.playing;
  if (wasPlaying) stopTanpura(id);

  instance.saNote = saNote;
  instance.saOctave = saOctave;

  if (wasPlaying) startTanpura(id);
}

/**
 * Check if a tanpura is currently playing.
 */
export function isTanpuraPlaying(id: string): boolean {
  return instances.get(id)?.playing ?? false;
}

/**
 * Dispose a tanpura instance and free all audio nodes.
 */
export function disposeTanpura(id: string): void {
  const instance = instances.get(id);
  if (!instance) return;

  stopTanpura(id);
  instance.synth.dispose();
  instance.sampler?.dispose();
  instance.jivari.dispose();
  instance.jivariGain.dispose();
  instance.dryGain.dispose();
  instance.bodyFilter1.dispose();
  instance.bodyFilter2.dispose();
  instance.chorus.dispose();
  instance.reverb.dispose();
  instance.compressor.dispose();
  instances.delete(id);

  console.log(`[Tanpura] Disposed ${id}`);
}

/**
 * Dispose all tanpura instances.
 */
export function disposeAllTanpuras(): void {
  for (const id of instances.keys()) {
    disposeTanpura(id);
  }
}
