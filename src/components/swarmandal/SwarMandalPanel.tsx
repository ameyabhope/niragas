/**
 * Swar Mandal control panel: string grid, play once, auto-loop toggle.
 */

import { useSwarMandalStore } from '@/store/swarmandal-store';
import type { SwarName, SwarVariant } from '@/audio/types';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { practiceSession } from '@/lib/practice-session';

const SWARA_OPTIONS: { note: SwarName; label: string; variant: SwarVariant }[] = [
  { note: 'Sa', label: 'Sa', variant: 'shuddha' },
  { note: 'Re', label: 're', variant: 'komal' },
  { note: 'Re', label: 'Re', variant: 'shuddha' },
  { note: 'Ga', label: 'ga', variant: 'komal' },
  { note: 'Ga', label: 'Ga', variant: 'shuddha' },
  { note: 'Ma', label: 'Ma', variant: 'shuddha' },
  { note: 'Ma', label: 'ma', variant: 'tivra' },
  { note: 'Pa', label: 'Pa', variant: 'shuddha' },
  { note: 'Dha', label: 'dha', variant: 'komal' },
  { note: 'Dha', label: 'Dha', variant: 'shuddha' },
  { note: 'Ni', label: 'ni', variant: 'komal' },
  { note: 'Ni', label: 'Ni', variant: 'shuddha' },
];

export function SwarMandalPanel() {
  const {
    enabled,
    strings,
    autoLoop,
    loopDuration,
    toggleString,
    setStringNote,
    setStringOctave,
    addString,
    removeString,
    setAutoLoop,
    setLoopDuration,
  } = useSwarMandalStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Swar Mandal
          </h2>
          <InfoTooltip label="About Swar Mandal" text="A harp-like instrument with configurable strings tuned to specific swaras. Enable/disable individual strings, strum once, or set auto-loop for repeating glissando. Great for filling harmonic space during practice." />
        </div>
        <button
          type="button"
          onClick={() => practiceSession.toggleInstrument('swarmandal')}
          aria-label={`${enabled ? 'Turn off' : 'Turn on'} Swar Mandal`}
          aria-pressed={enabled}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-active-control text-white'
              : 'bg-surface-lighter text-text-muted'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* String grid */}
        <fieldset>
          <legend className="text-xs text-text-muted mb-2">
            Strings ({strings.filter((s) => s.enabled).length} / {strings.length} enabled)
          </legend>
          <p className="text-xs text-text-muted mb-2">Tune each string for your practice. Octaves are relative to your selected Sa; note sets are starting points, not raag rules.</p>
          {strings.every((s) => s.note === 'Sa') && (
            <p className="text-xs text-text-muted mb-2">Sa-only tuning: no raag inventory assumed. Add or tune strings as needed.</p>
          )}
          <div className="flex flex-col gap-2">
            {strings.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleString(i)}
                aria-label={`Enable string ${i + 1}`}
                aria-pressed={s.enabled}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  s.enabled
                    ? 'bg-action text-white'
                    : 'bg-surface-lighter text-text-muted'
                }`}
              >
                {i + 1}: {s.enabled ? 'On' : 'Off'}
              </button>
              <select
                aria-label={`String ${i + 1} note and variant`}
                value={`${s.note}-${s.variant}`}
                onChange={(event) => {
                  const option = SWARA_OPTIONS.find((opt) => `${opt.note}-${opt.variant}` === event.target.value);
                  if (option) setStringNote(i, option.note, option.variant);
                }}
                className="min-w-0 bg-surface-lighter rounded px-2 py-1 text-xs text-text-primary"
              >
                {!SWARA_OPTIONS.some((opt) => opt.note === s.note && opt.variant === s.variant) && (
                  <option value={`${s.note}-${s.variant}`}>{s.note} ({s.variant}, imported)</option>
                )}
                {SWARA_OPTIONS.map((opt) => (
                  <option key={`${opt.note}-${opt.variant}`} value={`${opt.note}-${opt.variant}`}>
                    {opt.note} ({opt.variant})
                  </option>
                ))}
              </select>
              <select
                aria-label={`String ${i + 1} octave relative to Sa`}
                value={s.octaveOffset}
                onChange={(event) => setStringOctave(i, Number(event.target.value))}
                className="bg-surface-lighter rounded px-2 py-1 text-xs text-text-primary"
              >
                {[-2, -1, 0, 1, 2, 3].map((octave) => (
                  <option key={octave} value={octave}>Sa {octave >= 0 ? '+' : ''}{octave} oct</option>
                ))}
              </select>
              <button type="button" onClick={() => removeString(i)} aria-label={`Remove string ${i + 1}`} className="text-xs text-text-muted">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addString} disabled={strings.length >= 64} className="mt-2 text-xs text-text-secondary disabled:opacity-40">Add Sa string</button>
        </fieldset>

        {/* Play once button */}
        <button
          type="button"
          onClick={() => { void practiceSession.strum(); }}
          className="w-full py-3 bg-surface-lighter text-text-primary text-sm font-semibold
                     rounded-xl hover:bg-saffron-700 transition-colors"
        >
          Strum Once
        </button>

        {/* Auto-loop controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoLoop}
              onChange={(e) => setAutoLoop(e.target.checked)}
              className="w-4 h-4 accent-saffron-500"
            />
            <span className="text-xs text-text-secondary">Auto Loop</span>
          </label>

          {autoLoop && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min={2}
                max={30}
                step={1}
                value={loopDuration}
                onChange={(e) => setLoopDuration(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                           accent-saffron-500"
                aria-label="Loop duration"
              />
              <span className="text-xs text-text-muted font-mono w-8">
                {loopDuration}s
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
