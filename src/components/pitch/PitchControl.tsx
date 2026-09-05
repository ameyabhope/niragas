/**
 * Pitch control: note up/down buttons + fine-tune slider + A4 reference toggle.
 * Controls the global Sa pitch that all instruments follow.
 */

import { usePitchStore, type A4Reference } from '@/store/pitch-store';
import { PitchDisplay } from './PitchDisplay';

const A4_OPTIONS: A4Reference[] = [440, 432];

export function PitchControl() {
  const { noteDown, noteUp, cents, setCents, adjustCents, a4Freq, setA4Freq } = usePitchStore();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Sa Pitch
        </h2>

        {/* A4 reference toggle */}
        <div className="flex items-center gap-1" role="group" aria-label="A4 reference frequency">
          {A4_OPTIONS.map((freq) => (
            <button
              type="button"
              key={freq}
              onClick={() => setA4Freq(freq)}
              aria-pressed={a4Freq === freq}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                a4Freq === freq
                  ? 'bg-action text-white'
                  : 'bg-surface-lighter text-text-muted hover:text-text-primary'
              }`}
              title={`Set A4 reference to ${freq} Hz`}
            >
              {freq}Hz
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Note down button */}
        <button
          type="button"
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
          type="button"
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
          type="button"
          onClick={() => adjustCents(-1)}
          className="w-10 h-10 text-xs text-tune-flat hover:text-tune-flat/80 rounded-lg"
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
          type="button"
          onClick={() => adjustCents(1)}
          className="w-10 h-10 text-xs text-tune-sharp hover:text-tune-sharp/80 rounded-lg"
          aria-label="Fine-tune up 1 cent"
        >
          &#9839;
        </button>
      </div>
    </div>
  );
}
