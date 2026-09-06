/**
 * Tap tempo hook: averages inter-tap intervals to determine BPM.
 * Resets after 2 seconds of inactivity.
 */

import { useCallback, useRef } from 'react';

const MAX_TAPS = 8;
const TIMEOUT_MS = 2000;

export function useTapTempo(onTempoChange: (bpm: number) => void) {
  const taps = useRef<number[]>([]);

  const tap = useCallback(() => {
    const now = performance.now();

    const lastTap = taps.current.at(-1);
    if (lastTap !== undefined && now - lastTap >= TIMEOUT_MS) {
      taps.current = [];
    }

    taps.current.push(now);

    if (taps.current.length > MAX_TAPS) {
      taps.current = taps.current.slice(-MAX_TAPS);
    }

    if (taps.current.length < 2) return;

    const avgInterval = (now - taps.current[0]) / (taps.current.length - 1);
    const bpm = Math.round(60000 / avgInterval);

    if (bpm >= 10 && bpm <= 700) {
      onTempoChange(bpm);
    }
  }, [onTempoChange]);

  return { tap };
}
