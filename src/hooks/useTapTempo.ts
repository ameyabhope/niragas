/**
 * Tap tempo hook: averages inter-tap intervals to determine BPM.
 * Resets after 2 seconds of inactivity.
 */

import { useCallback, useRef } from 'react';

const MAX_TAPS = 8;
const TIMEOUT_MS = 2000;

export function useTapTempo(onTempoChange: (bpm: number) => void) {
  const taps = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = useCallback(() => {
    const now = performance.now();

    // Reset if too long since last tap
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      taps.current = [];
    }, TIMEOUT_MS);

    taps.current.push(now);

    // Keep only recent taps
    if (taps.current.length > MAX_TAPS) {
      taps.current = taps.current.slice(-MAX_TAPS);
    }

    // Need at least 2 taps to calculate interval
    if (taps.current.length < 2) return;

    // Calculate average interval
    const intervals: number[] = [];
    for (let i = 1; i < taps.current.length; i++) {
      intervals.push(taps.current[i] - taps.current[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avgInterval);

    // Clamp to reasonable range
    if (bpm >= 10 && bpm <= 700) {
      onTempoChange(bpm);
    }
  }, [onTempoChange]);

  const reset = useCallback(() => {
    taps.current = [];
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { tap, reset, tapCount: taps.current.length };
}
