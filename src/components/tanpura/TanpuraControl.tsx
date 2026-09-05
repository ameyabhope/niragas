/**
 * Controls for a single tanpura: on/off, tuning, EQ, fine pitch, speed.
 */

import { useEffect, useState } from 'react';
import type { TanpuraConfig, TanpuraTuning, TanpuraEQ } from '@/audio/types';
import {
  subscribeTanpuraStatus,
  getTanpuraStatus,
  type TanpuraStatus,
} from '@/audio/tanpura';

const TUNING_OPTIONS: { label: string; value: TanpuraTuning }[] = [
  { label: 'Pa', value: 'Pa' },
  { label: 'Ma', value: 'Ma' },
  { label: 'Ni', value: 'Ni' },
];

const EQ_OPTIONS: { label: string; value: TanpuraEQ }[] = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Bass (Pa/C)', value: 'bass' },
  { label: 'Treble (Pa/C)', value: 'treble' },
];

interface TanpuraControlProps {
  id: 'tanpura1' | 'tanpura2';
  label: string;
  config: TanpuraConfig;
  onToggle: () => void;
  onSetTuning: (tuning: TanpuraTuning) => void;
  onSetEQ: (eq: TanpuraEQ) => void;
  onSetFinePitch: (cents: number) => void;
  onSetSpeed: (speed: number) => void;
}

export function TanpuraControl({
  id,
  label,
  config,
  onToggle,
  onSetTuning,
  onSetEQ,
  onSetFinePitch,
  onSetSpeed,
}: TanpuraControlProps) {
  // Reactive engine status (loading / actually sounding / error)
  const [status, setStatus] = useState<TanpuraStatus>(() => getTanpuraStatus(id));
  useEffect(() => subscribeTanpuraStatus(id, setStatus), [id]);

  const isPlaying = status.playing;
  const isLoading = status.loading;

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
          type="button"
          onClick={onToggle}
          aria-label={`${config.enabled ? 'Turn off' : 'Turn on'} ${label}`}
          aria-pressed={config.enabled}
          aria-keyshortcuts={id === 'tanpura1' ? 'Alt+T' : 'Alt+Shift+T'}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            config.enabled
              ? 'bg-active-control text-white'
              : 'bg-surface-lighter text-text-muted'
          }`}
        >
          {config.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Tuning (first string) */}
      <fieldset className="mb-3">
        <legend className="text-xs text-text-muted mb-1">Tuning</legend>
        <div className="flex gap-1">
          {TUNING_OPTIONS.map(({ label: optLabel, value }) => (
            <button
              type="button"
              key={value}
              onClick={() => {
                onSetTuning(value);
              }}
              aria-pressed={config.tuning === value}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                config.tuning === value
                  ? 'bg-action text-white'
                  : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
              }`}
            >
              {optLabel}
            </button>
          ))}
        </div>
      </fieldset>

      {/* EQ variant */}
      <fieldset className="mb-3">
        <legend className="text-xs text-text-muted mb-1">Tone</legend>
        <div className="flex gap-1">
          {EQ_OPTIONS.map(({ label: optLabel, value }) => (
            <button
              type="button"
              key={value}
              onClick={() => {
                onSetEQ(value);
              }}
              aria-pressed={config.eq === value}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                config.eq === value
                  ? 'bg-action text-white'
                  : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
              }`}
            >
              {optLabel}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Fine pitch */}
      <div className="mb-3">
        <label className="text-xs text-text-muted mb-1 block">
          Fine Pitch: {config.finePitchCents > 0 ? '+' : ''}{config.finePitchCents} cents
        </label>
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={config.finePitchCents}
          onChange={(e) => {
            const cents = parseInt(e.target.value, 10);
            onSetFinePitch(cents);
          }}
          className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500"
          aria-label={`${label} fine pitch`}
        />
      </div>

      {/* Speed (pitch-safe tempo) */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">
          Tempo (pitch-safe): {config.speed.toFixed(2)}x
        </label>
        <input
          type="range"
          min={0.7}
          max={1.4}
          step={0.01}
          value={config.speed}
          onChange={(e) => {
            const speed = parseFloat(e.target.value);
            onSetSpeed(speed);
          }}
          className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500"
          aria-label={`${label} tempo (pitch-safe)`}
        />
      </div>

      {/* Status: loading / playing / error (engine truth, not just the toggle) */}
      {isLoading && (
        <div className="mt-2 flex items-center gap-1.5" role="status">
          <span className="w-2 h-2 rounded-full bg-saffron-500 animate-pulse" />
          <span className="text-xs text-text-muted">Loading sample…</span>
        </div>
      )}
      {isPlaying && (
        <div className="mt-2 flex items-center gap-1.5" role="status">
          <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
          <span className="text-xs text-active">Playing</span>
        </div>
      )}
      {status.error && (
        <div className="mt-2 text-xs text-accent" role="alert">
          {status.error}
        </div>
      )}
    </div>
  );
}
