/**
 * Auto-tuner engine.
 *
 * Uses the browser microphone to detect the pitch of an external instrument
 * or voice. Can either:
 * - Display the detected pitch alongside the app's current Sa for manual matching
 * - "Capture" the detected pitch and set it as the new Sa
 *
 * Uses the pitchy library for autocorrelation-based pitch detection.
 */

import { PitchDetector } from 'pitchy';
import { freqToNote } from '@/lib/notes';
import type { NoteName } from './types';
import { log } from './log';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPitchDetector = PitchDetector<any>;

interface TunerInstance {
  audioContext: AudioContext;
  analyserNode: AnalyserNode;
  sourceNode: MediaStreamAudioSourceNode | null;
  stream: MediaStream | null;
  detector: AnyPitchDetector;
  buffer: Float32Array;
  running: boolean;
  animationFrameId: number | null;
  onPitchDetected: ((freq: number, note: NoteName, octave: number, cents: number, clarity: number) => void) | null;
}

let instance: TunerInstance | null = null;

/**
 * Initialize the tuner: request microphone access and set up the analyser.
 */
export async function initTuner(): Promise<void> {
  if (instance?.running) return;

  // Request microphone access
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  const audioContext = new AudioContext();
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 4096; // larger FFT for better low-frequency resolution

  const sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyserNode);
  // Do NOT connect analyser to destination (we don't want to hear the mic echo)

  const bufferSize = analyserNode.fftSize;
  const buffer = new Float32Array(bufferSize);
  const detector = PitchDetector.forFloat32Array(bufferSize);

  instance = {
    audioContext,
    analyserNode,
    sourceNode,
    stream,
    detector,
    buffer,
    running: false,
    animationFrameId: null,
    onPitchDetected: null,
  };

  log('[Tuner] Initialized with mic access');
}

/**
 * Set the callback for pitch detection results.
 */
export function setTunerCallback(
  cb: (freq: number, note: NoteName, octave: number, cents: number, clarity: number) => void
): void {
  if (instance) instance.onPitchDetected = cb;
}

/**
 * Start the pitch detection loop.
 */
export function startTuner(): void {
  if (!instance || instance.running) return;

  instance.running = true;

  function detect() {
    if (!instance || !instance.running) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (instance.analyserNode as any).getFloatTimeDomainData(instance.buffer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pitch, clarity] = (instance.detector as any).findPitch(instance.buffer, instance.audioContext.sampleRate) as [number, number];

    // Only report if clarity is good enough (>0.9 is very clear)
    if (clarity > 0.85 && pitch > 50 && pitch < 2000) {
      const { note, octave, cents } = freqToNote(pitch);
      instance.onPitchDetected?.(pitch, note, octave, cents, clarity);
    }

    instance.animationFrameId = requestAnimationFrame(detect);
  }

  detect();
  log('[Tuner] Started pitch detection');
}

/**
 * Stop the pitch detection loop.
 */
export function stopTuner(): void {
  if (!instance) return;

  instance.running = false;
  if (instance.animationFrameId !== null) {
    cancelAnimationFrame(instance.animationFrameId);
    instance.animationFrameId = null;
  }

  log('[Tuner] Stopped pitch detection');
}

/**
 * Check if the tuner is running.
 */
export function isTunerRunning(): boolean {
  return instance?.running ?? false;
}

/**
 * Dispose the tuner: stop detection, close mic, release resources.
 */
export function disposeTuner(): void {
  if (!instance) return;

  stopTuner();

  // Stop all mic tracks
  instance.stream?.getTracks().forEach((track) => track.stop());

  instance.sourceNode?.disconnect();
  instance.analyserNode.disconnect();
  instance.audioContext.close();

  instance = null;
  log('[Tuner] Disposed');
}
