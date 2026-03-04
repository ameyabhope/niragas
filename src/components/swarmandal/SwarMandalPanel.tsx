/**
 * Swar Mandal control panel: string grid, play once, auto-loop toggle.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { usePitchStore } from '@/store/pitch-store';
import type { SwarName, SwarVariant } from '@/audio/types';
import {
  createSwarMandal,
  strumSwarMandal,
  startSwarMandalLoop,
  stopSwarMandalLoop,
  updateSwarMandal,
  updateSwarMandalPitch,
} from '@/audio/swarmandal';

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
    toggle,
    toggleString,
    setStringNote,
    setAutoLoop,
    setLoopDuration,
  } = useSwarMandalStore();

  const { note: saNote, octave: saOctave } = usePitchStore();
  const created = useRef(false);
  const prevEnabled = useRef(false);
  const prevAutoLoop = useRef(false);

  // Create on mount
  useEffect(() => {
    createSwarMandal();
    created.current = true;
    return () => { created.current = false; };
  }, []);

  // Update pitch
  useEffect(() => {
    if (!created.current) return;
    updateSwarMandalPitch(saNote, saOctave);
  }, [saNote, saOctave]);

  // Handle enable/disable and auto-loop changes
  useEffect(() => {
    if (!created.current) return;

    updateSwarMandal({ enabled, strings, autoLoop, loopDuration });

    if (enabled && autoLoop && !prevAutoLoop.current) {
      startSwarMandalLoop();
    } else if ((!enabled || !autoLoop) && prevAutoLoop.current) {
      stopSwarMandalLoop();
    }

    prevEnabled.current = enabled;
    prevAutoLoop.current = enabled && autoLoop;
  }, [enabled, autoLoop, strings, loopDuration]);

  const handleStrum = useCallback(() => {
    if (!created.current) return;
    updateSwarMandal({ enabled: true, strings, autoLoop, loopDuration });
    strumSwarMandal();
  }, [strings, autoLoop, loopDuration]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Swar Mandal
        </h2>
        <button
          onClick={toggle}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-active text-white'
              : 'bg-surface-lighter text-text-muted'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* String grid */}
        <div>
          <label className="text-xs text-text-muted mb-2 block">
            Strings ({strings.filter((s) => s.enabled).length} / {strings.length} enabled)
          </label>
          <div className="flex flex-wrap gap-1">
            {strings.map((s, i) => (
              <button
                key={i}
                onClick={() => toggleString(i)}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                  s.enabled
                    ? 'bg-saffron-600/80 text-white'
                    : 'bg-surface-lighter text-text-muted'
                }`}
                title={`String ${i + 1}: ${s.note} (${s.variant}) Oct${s.octaveOffset}`}
              >
                {s.note}
                {s.octaveOffset > 0 ? "'" : s.octaveOffset < 0 ? ',' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Note assignment for selected string (simplified: show first few for quick editing) */}
        <div>
          <label className="text-xs text-text-muted mb-1 block">Quick Tune (first string)</label>
          <div className="flex flex-wrap gap-1">
            {SWARA_OPTIONS.map((opt) => {
              const isActive =
                strings[0]?.note === opt.note &&
                strings[0]?.variant === opt.variant;
              return (
                <button
                  key={`${opt.note}-${opt.variant}`}
                  onClick={() => setStringNote(0, opt.note, opt.variant)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    isActive
                      ? 'bg-saffron-600 text-white'
                      : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Play once button */}
        <button
          onClick={handleStrum}
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
