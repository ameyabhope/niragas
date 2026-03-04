/**
 * Controls for a single tanpura: on/off, first-string tuning, cycle speed.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { TanpuraConfig, SwarName } from '@/audio/types';
import { usePitchStore } from '@/store/pitch-store';
import {
  createTanpura,
  startTanpura,
  stopTanpura,
  updateTanpura,
  updateTanpuraPitch,
  isTanpuraPlaying,
} from '@/audio/tanpura';

const FIRST_STRING_OPTIONS: { label: string; note: SwarName }[] = [
  { label: 'Pa', note: 'Pa' },
  { label: 'Ma', note: 'Ma' },
  { label: 'Ni', note: 'Ni' },
  { label: 'Dha', note: 'Dha' },
];

interface TanpuraControlProps {
  id: 'tanpura1' | 'tanpura2';
  label: string;
  config: TanpuraConfig;
  onToggle: () => void;
  onSetFirstString: (note: SwarName) => void;
  onSetCycleSpeed: (speed: number) => void;
}

export function TanpuraControl({
  id,
  label,
  config,
  onToggle,
  onSetFirstString,
  onSetCycleSpeed,
}: TanpuraControlProps) {
  const { note: saNote, octave: saOctave } = usePitchStore();
  const created = useRef(false);
  const prevEnabled = useRef(config.enabled);

  // Create tanpura instance on mount
  useEffect(() => {
    createTanpura(id, config, saNote, saOctave);
    created.current = true;
    return () => {
      created.current = false;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle enable/disable
  useEffect(() => {
    if (!created.current) return;

    if (config.enabled && !prevEnabled.current) {
      // Just turned on
      updateTanpura(id, config, saNote, saOctave);
      startTanpura(id);
    } else if (!config.enabled && prevEnabled.current) {
      // Just turned off
      stopTanpura(id);
    }

    prevEnabled.current = config.enabled;
  }, [config.enabled, id, config, saNote, saOctave]);

  // Update pitch when Sa changes
  useEffect(() => {
    if (!created.current) return;
    updateTanpuraPitch(id, saNote, saOctave);
  }, [id, saNote, saOctave]);

  // Update config when strings/speed change
  const handleConfigChange = useCallback(
    (partial: Partial<TanpuraConfig>) => {
      if (!created.current) return;
      updateTanpura(id, partial, saNote, saOctave);
    },
    [id, saNote, saOctave]
  );

  const firstStringNote = config.strings[0]?.note ?? 'Pa';
  const isPlaying = config.enabled && isTanpuraPlaying(id);

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        config.enabled
          ? 'border-saffron-500/40 bg-surface-card'
          : 'border-white/5 bg-surface-card/50'
      }`}
    >
      {/* Header: label + on/off toggle */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
        <button
          onClick={onToggle}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            config.enabled
              ? 'bg-active text-white'
              : 'bg-surface-lighter text-text-muted'
          }`}
        >
          {config.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* First string tuning */}
      <div className="mb-3">
        <label className="text-xs text-text-muted mb-1 block">First String</label>
        <div className="flex gap-1">
          {FIRST_STRING_OPTIONS.map(({ label: optLabel, note }) => (
            <button
              key={note}
              onClick={() => {
                onSetFirstString(note);
                handleConfigChange({
                  strings: config.strings.map((s, i) =>
                    i === 0 ? { ...s, note } : s
                  ),
                });
              }}
              disabled={!config.enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                firstStringNote === note
                  ? 'bg-saffron-600 text-white'
                  : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {optLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Cycle speed */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">
          Cycle Speed: {config.cycleSpeed.toFixed(1)}s
        </label>
        <input
          type="range"
          min={2}
          max={10}
          step={0.5}
          value={config.cycleSpeed}
          onChange={(e) => {
            const speed = parseFloat(e.target.value);
            onSetCycleSpeed(speed);
            handleConfigChange({ cycleSpeed: speed });
          }}
          disabled={!config.enabled}
          className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-40"
          aria-label="Tanpura cycle speed"
        />
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
          <span className="text-xs text-active">Playing</span>
        </div>
      )}
    </div>
  );
}
