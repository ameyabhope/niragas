/**
 * Controls for a single tanpura: on/off, tuning, EQ, fine pitch, speed.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { TanpuraConfig, TanpuraTuning, TanpuraEQ } from '@/audio/types';
import { usePitchStore } from '@/store/pitch-store';
import {
  createTanpura,
  startTanpura,
  stopTanpura,
  updateTanpura,
  updateTanpuraPitch,
  isTanpuraPlaying,
} from '@/audio/tanpura';

const TUNING_OPTIONS: { label: string; value: TanpuraTuning }[] = [
  { label: 'Pa', value: 'Pa' },
  { label: 'Ma', value: 'Ma' },
  { label: 'Ni', value: 'Ni' },
];

const EQ_OPTIONS: { label: string; value: TanpuraEQ }[] = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Bass', value: 'bass' },
  { label: 'Treble', value: 'treble' },
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
  const { note: saNote, octave: saOctave, cents: saCents } = usePitchStore();
  const created = useRef(false);
  const prevEnabled = useRef(config.enabled);

  // Create tanpura instance on mount
  useEffect(() => {
    createTanpura(id, config, saNote, saOctave, saCents).then(() => {
      created.current = true;
    });
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
      updateTanpura(id, config, saNote, saOctave, saCents);
      startTanpura(id);
    } else if (!config.enabled && prevEnabled.current) {
      // Just turned off
      stopTanpura(id);
    }

    prevEnabled.current = config.enabled;
  }, [config.enabled, id, config, saNote, saOctave, saCents]);

  // Update pitch when Sa changes
  useEffect(() => {
    if (!created.current) return;
    updateTanpuraPitch(id, saNote, saOctave, saCents);
  }, [id, saNote, saOctave, saCents]);

  // Update config when tuning/eq/speed/finePitch change
  const handleConfigChange = useCallback(
    (partial: Partial<TanpuraConfig>) => {
      if (!created.current) return;
      updateTanpura(id, partial, saNote, saOctave, saCents);
    },
    [id, saNote, saOctave, saCents]
  );

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

      {/* Tuning (first string) */}
      <div className="mb-3">
        <label className="text-xs text-text-muted mb-1 block">Tuning</label>
        <div className="flex gap-1">
          {TUNING_OPTIONS.map(({ label: optLabel, value }) => (
            <button
              key={value}
              onClick={() => {
                onSetTuning(value);
                handleConfigChange({ tuning: value });
              }}
              disabled={!config.enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                config.tuning === value
                  ? 'bg-saffron-600 text-white'
                  : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {optLabel}
            </button>
          ))}
        </div>
      </div>

      {/* EQ variant */}
      <div className="mb-3">
        <label className="text-xs text-text-muted mb-1 block">Tone</label>
        <div className="flex gap-1">
          {EQ_OPTIONS.map(({ label: optLabel, value }) => (
            <button
              key={value}
              onClick={() => {
                onSetEQ(value);
                handleConfigChange({ eq: value });
              }}
              disabled={!config.enabled}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                config.eq === value
                  ? 'bg-saffron-600 text-white'
                  : 'bg-surface-lighter text-text-secondary hover:text-text-primary'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {optLabel}
            </button>
          ))}
        </div>
      </div>

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
            handleConfigChange({ finePitchCents: cents });
          }}
          disabled={!config.enabled}
          className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-40"
          aria-label="Tanpura fine pitch"
        />
      </div>

      {/* Speed */}
      <div>
        <label className="text-xs text-text-muted mb-1 block">
          Speed: {config.speed.toFixed(2)}x
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
            handleConfigChange({ speed });
          }}
          disabled={!config.enabled}
          className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-40"
          aria-label="Tanpura speed"
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
