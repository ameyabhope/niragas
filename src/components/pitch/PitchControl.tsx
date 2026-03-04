/**
 * Pitch control: note up/down buttons + fine-tune slider.
 * Controls the global Sa pitch that all instruments follow.
 */

import { usePitchStore } from '@/store/pitch-store';
import { PitchDisplay } from './PitchDisplay';

export function PitchControl() {
  const { noteDown, noteUp, cents, setCents, adjustCents } = usePitchStore();

  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs text-text-muted uppercase tracking-wider font-semibold">
        Sa Pitch
      </label>

      <div className="flex items-center gap-3">
        {/* Note down button */}
        <button
          onClick={noteDown}
          className="w-10 h-10 rounded-lg bg-surface-lighter text-text-primary
                     hover:bg-saffron-700 transition-colors text-lg font-bold
                     focus:outline-none focus:ring-2 focus:ring-saffron-400"
          aria-label="Pitch down one semitone"
        >
          -
        </button>

        {/* Note display */}
        <PitchDisplay />

        {/* Note up button */}
        <button
          onClick={noteUp}
          className="w-10 h-10 rounded-lg bg-surface-lighter text-text-primary
                     hover:bg-saffron-700 transition-colors text-lg font-bold
                     focus:outline-none focus:ring-2 focus:ring-saffron-400"
          aria-label="Pitch up one semitone"
        >
          +
        </button>
      </div>

      {/* Fine-tune slider */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => adjustCents(-1)}
          className="text-xs text-tune-flat hover:text-tune-flat/80 px-1 py-0.5
                     focus:outline-none"
          aria-label="Fine-tune down 1 cent"
        >
          &#9837;
        </button>

        <input
          type="range"
          min={-50}
          max={50}
          value={cents}
          onChange={(e) => setCents(parseInt(e.target.value, 10))}
          className="flex-1 h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500"
          aria-label="Fine-tune in cents"
        />

        <button
          onClick={() => adjustCents(1)}
          className="text-xs text-tune-sharp hover:text-tune-sharp/80 px-1 py-0.5
                     focus:outline-none"
          aria-label="Fine-tune up 1 cent"
        >
          &#9839;
        </button>
      </div>
    </div>
  );
}
