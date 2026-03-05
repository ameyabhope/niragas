/**
 * Recording engine.
 *
 * Captures audio from the instrument mix bus (and optionally the microphone)
 * using the Web Audio API + MediaRecorder.
 *
 * Signal flow:
 *   Master Volume Node ──┐
 *                         ├─► MediaStreamDestination ──► MediaRecorder ──► Blob
 *   Mic (optional) ──────┘
 *
 * Output format: WebM/Opus (browser-native, widely supported).
 * For WAV export we convert the recorded Blob in a second pass.
 */

import * as Tone from 'tone';
import { getMasterNode } from './mixer';

export type RecordingState = 'idle' | 'recording' | 'paused';

export interface Recording {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  duration: number; // seconds
  createdAt: number;
}

// ── Internal state ──────────────────────────────────────────────────────────

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let streamDestination: MediaStreamAudioDestinationNode | null = null;
let micStream: MediaStream | null = null;
let micSource: MediaStreamAudioSourceNode | null = null;
let recordingStartTime = 0;
let pausedDuration = 0;
let pauseStartTime = 0;

// Callbacks
let onStateChange: ((state: RecordingState) => void) | null = null;
let onRecordingComplete: ((recording: Recording) => void) | null = null;

/**
 * Register callbacks for state changes and recording completion.
 */
export function setRecorderCallbacks(callbacks: {
  onStateChange?: (state: RecordingState) => void;
  onRecordingComplete?: (recording: Recording) => void;
}): void {
  onStateChange = callbacks.onStateChange ?? null;
  onRecordingComplete = callbacks.onRecordingComplete ?? null;
}

/**
 * Start recording. Captures the master bus output.
 * @param includeMic - Whether to also capture microphone input.
 */
export async function startRecording(includeMic = false): Promise<void> {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    console.warn('[Recorder] Already recording');
    return;
  }

  const masterNode = getMasterNode();
  if (!masterNode) {
    throw new Error('Mixer not initialized. Cannot record.');
  }

  // Get the raw AudioContext from Tone.js
  const ctx = Tone.getContext();
  const rawCtx = (ctx as unknown as { rawContext: AudioContext }).rawContext;

  // Create a MediaStreamDestination to capture audio
  streamDestination = rawCtx.createMediaStreamDestination();

  // Connect the master bus to the stream destination
  // We need to access Tone.js's internal node
  const masterOutput = (masterNode as unknown as { output: AudioNode }).output;
  if (masterOutput) {
    masterOutput.connect(streamDestination);
  } else {
    // Fallback: connect via Tone's connect method
    // Create a native gain node as bridge
    const bridge = rawCtx.createGain();
    bridge.connect(streamDestination);
    masterNode.connect(new Tone.Gain().connect(Tone.getDestination()));
  }

  // Optionally add mic input
  if (includeMic) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micSource = rawCtx.createMediaStreamSource(micStream);
      micSource.connect(streamDestination);
    } catch (err) {
      console.warn('[Recorder] Could not access microphone:', err);
      // Continue recording without mic
    }
  }

  // Determine supported MIME type
  const mimeType = getSupportedMimeType();

  recordedChunks = [];
  mediaRecorder = new MediaRecorder(streamDestination.stream, {
    mimeType,
    audioBitsPerSecond: 128000,
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const duration = (performance.now() - recordingStartTime - pausedDuration) / 1000;
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);

    const recording: Recording = {
      id: `rec-${Date.now()}`,
      name: `Recording ${new Date().toLocaleTimeString()}`,
      blob,
      url,
      duration,
      createdAt: Date.now(),
    };

    // Cleanup connections
    cleanupConnections();

    onRecordingComplete?.(recording);
    onStateChange?.('idle');
  };

  // Request data every second for progressive capture
  mediaRecorder.start(1000);
  recordingStartTime = performance.now();
  pausedDuration = 0;

  onStateChange?.('recording');
}

/**
 * Pause recording.
 */
export function pauseRecording(): void {
  if (mediaRecorder?.state === 'recording') {
    mediaRecorder.pause();
    pauseStartTime = performance.now();
    onStateChange?.('paused');
  }
}

/**
 * Resume recording.
 */
export function resumeRecording(): void {
  if (mediaRecorder?.state === 'paused') {
    mediaRecorder.resume();
    pausedDuration += performance.now() - pauseStartTime;
    onStateChange?.('recording');
  }
}

/**
 * Stop recording and finalize the file.
 */
export function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

/**
 * Cancel recording without saving.
 */
export function cancelRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    // Remove the onstop handler to prevent saving
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  cleanupConnections();
  recordedChunks = [];
  onStateChange?.('idle');
}

/**
 * Get the current recording duration in seconds.
 */
export function getRecordingDuration(): number {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return 0;
  const now = performance.now();
  const currentPause = mediaRecorder.state === 'paused' ? now - pauseStartTime : 0;
  return (now - recordingStartTime - pausedDuration - currentPause) / 1000;
}

/**
 * Download a recording as a file.
 */
export function downloadRecording(recording: Recording, filename?: string): void {
  const name = filename ?? `${recording.name.replace(/[^a-zA-Z0-9 ]/g, '')}.webm`;
  const a = document.createElement('a');
  a.href = recording.url;
  a.download = name;
  a.click();
}

/**
 * Convert a recording blob to WAV format.
 * Uses OfflineAudioContext to decode and re-encode.
 */
export async function convertToWAV(recording: Recording): Promise<Blob> {
  const arrayBuffer = await recording.blob.arrayBuffer();
  const audioCtx = new AudioContext();

  // Decode the audio
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  // Create WAV from AudioBuffer
  return audioBufferToWAV(audioBuffer);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function cleanupConnections(): void {
  if (micSource) {
    micSource.disconnect();
    micSource = null;
  }
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  if (streamDestination) {
    // Disconnect the master node from the stream destination
    try {
      const masterNode = getMasterNode();
      if (masterNode) {
        const masterOutput = (masterNode as unknown as { output: AudioNode }).output;
        if (masterOutput) {
          masterOutput.disconnect(streamDestination);
        }
      }
    } catch {
      // May already be disconnected
    }
    streamDestination = null;
  }
  mediaRecorder = null;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

/**
 * Encode an AudioBuffer as a WAV Blob.
 */
function audioBufferToWAV(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;

  // Interleave channels
  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      interleaved[i * 2] = left[i];
      interleaved[i * 2 + 1] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const dataLength = interleaved.length * (bitsPerSample / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
