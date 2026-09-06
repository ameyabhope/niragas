import { SimpleFilter, SoundTouch } from 'soundtouchjs';

export function tanpuraPitchRate(baseRate: number, fineCents: number): number {
  return baseRate * 2 ** (fineCents / 1200);
}

/** WSOLA changes duration only; the Player's native resampler supplies exact pitch.
 * Periodic input avoids SoundTouch's truncated EOF, and a short wrap blend keeps
 * the rendered loop continuous without shortening its requested duration.
 */
export async function stretchTanpuraLoop(
  channels: Float32Array[], sampleRate: number, pitchRate: number, speed: number,
  signal?: AbortSignal,
): Promise<Float32Array[]> {
  if (!channels.length || channels.length > 2 || !channels[0].length || channels.some(c => c.length !== channels[0].length) ||
      ![sampleRate, pitchRate, speed].every(v => Number.isFinite(v) && v > 0)) {
    throw new Error('Invalid tanpura processing parameters');
  }
  signal?.throwIfAborted();
  const length = Math.round(channels[0].length * pitchRate / speed);
  const tempo = speed / pitchRate;
  // Bound allocation and WSOLA's search/input requirements for malformed settings.
  if (!Number.isSafeInteger(length) || length < 1 || length > 2 ** 24 || tempo < 0.05 || tempo > 20) {
    throw new Error('Tanpura processing ratio or output length is out of range');
  }
  const warmup = Math.round(sampleRate * 0.3);
  const blend = Math.min(Math.round(sampleRate * 0.03), Math.floor(length / 2));
  const pipe = new SoundTouch();
  pipe.stretch.setParameters(sampleRate, 0, 0, 8);
  pipe.stretch.quickSeek = false;
  pipe.tempo = tempo;
  const left = channels[0], right = channels[1] ?? left;
  const filter = new SimpleFilter({
    extract(target, frames, position) {
      for (let i = 0; i < frames; i++) {
        const index = (position + i) % left.length;
        target[2 * i] = left[index];
        target[2 * i + 1] = right[index];
      }
      return frames;
    },
  }, pipe);
  const output = channels.slice(0, 2).map(() => new Float32Array(length + blend));
  const block = new Float32Array(4096 * 2);
  let position = -warmup;
  let deadline = performance.now() + 12;
  while (position < length + blend) {
    signal?.throwIfAborted();
    const count = filter.extract(block, Math.min(4096, length + blend - position));
    if (!count) throw new Error('Tanpura time stretch stalled');
    for (let i = 0; i < count; i++) {
      if (position + i < 0) continue;
      for (let c = 0; c < output.length; c++) output[c][position + i] = block[2 * i + c];
    }
    position += count;
    if (performance.now() >= deadline) {
      await new Promise(resolve => setTimeout(resolve, 0));
      deadline = performance.now() + 12;
    }
  }
  signal?.throwIfAborted();
  return output.map(channel => {
    for (let i = 0; i < blend; i++) {
      const weight = i / blend;
      channel[i] = channel[length + i] * (1 - weight) + channel[i] * weight;
    }
    return channel.slice(0, length);
  });
}
