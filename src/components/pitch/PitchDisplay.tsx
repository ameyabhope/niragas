/**
 * Displays the current Sa pitch: note name, octave, and cent offset.
 * Color-coded: green = centered, yellow = flat, cyan = sharp.
 */

import { usePitchStore } from '@/store/pitch-store';

export function PitchDisplay() {
  const { note, octave, cents } = usePitchStore();

  // Color based on cent offset
  const centColor =
    cents === 0
      ? 'text-tune-center'
      : cents < 0
        ? 'text-tune-flat'
        : 'text-tune-sharp';

  const centLabel =
    cents === 0 ? '0' : cents > 0 ? `+${cents}` : `${cents}`;

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-surface-card rounded-lg px-2 sm:px-4 py-2 border border-white/10">
      {/* Cent offset */}
      <span className={`text-xs font-mono ${centColor}`}>
        {centLabel}c
      </span>

      {/* Main note display */}
      <div className="text-center min-w-8 sm:min-w-12">
        <span className="text-xl sm:text-2xl font-bold text-text-primary">
          {note}
        </span>
      </div>

      {/* Octave */}
      <span className="text-xs font-mono text-text-secondary">
        {octave}
      </span>
    </div>
  );
}
