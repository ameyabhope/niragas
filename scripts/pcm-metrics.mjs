/** Shared PCM measurements for the browser playback check scripts. */

export function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / samples.length);
}

export function peak(samples) {
  let result = 0;
  for (const value of samples) result = Math.max(result, Math.abs(value));
  return result;
}

export function attacks(samples, sampleRate) {
  const max = peak(samples);
  const threshold = Math.max(0.015, max * 0.18);
  const windowSize = Math.max(64, Math.floor(sampleRate * 0.005));
  const envelope = [];
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let windowPeak = 0;
    for (let i = offset; i < Math.min(offset + windowSize, samples.length); i += 1) {
      windowPeak = Math.max(windowPeak, Math.abs(samples[i]));
    }
    envelope.push(windowPeak);
  }
  const times = [];
  let above = false;
  for (let i = 0; i < envelope.length; i += 1) {
    if (!above && envelope[i] >= threshold) {
      times.push((i * windowSize) / sampleRate);
      above = true;
    } else if (above && envelope[i] < threshold * 0.45) {
      above = false;
    }
  }
  const intervals = times.slice(1).map((time, index) => time - times[index]);
  return { peak: max, rms: rms(samples), attackCount: times.length, attackTimes: times.slice(0, 32), attackIntervals: intervals.slice(0, 32), duplicateAttackIntervals: intervals.filter((interval) => interval < 0.04) };
}
