/**
 * 7-band parametric EQ panel with visual sliders and preset selector.
 */

import { useEffect, useRef } from 'react';
import { useEQStore } from '@/store/eq-store';
import {
  createEQ,
  setEQBandGain,
  applyEQPreset,
  EQ_PRESETS,
  EQ_PRESET_NAMES,
} from '@/audio/eq';

/** Friendly label for each band */
const BAND_LABELS = ['60', '150', '400', '1k', '2.5k', '6k', '15k'];

export function EQPanel() {
  const {
    enabled,
    bands,
    presetName,
    setEnabled,
    setBandGain,
    setPreset,
    resetToFlat,
  } = useEQStore();

  const created = useRef(false);

  // Create EQ on mount (note: EQ needs to be inserted into signal chain by mixer)
  useEffect(() => {
    createEQ();
    created.current = true;
    return () => { created.current = false; };
  }, []);

  const handlePresetChange = (name: string) => {
    const preset = EQ_PRESETS[name];
    if (!preset) return;
    setPreset(name, preset);
    applyEQPreset(name);
  };

  const handleBandGainChange = (index: number, gain: number) => {
    setBandGain(index, gain);
    setEQBandGain(index, gain);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Equalizer
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-3.5 h-3.5 accent-saffron-500"
          />
          <span className="text-xs text-text-muted">
            {enabled ? 'On' : 'Off'}
          </span>
        </label>
      </div>

      {/* Preset selector */}
      <select
        value={presetName}
        onChange={(e) => handlePresetChange(e.target.value)}
        disabled={!enabled}
        className="bg-surface-lighter text-text-primary text-xs rounded-lg px-3 py-1.5
                   border border-white/10 focus:outline-none focus:ring-2 focus:ring-saffron-400
                   disabled:opacity-40"
      >
        {EQ_PRESET_NAMES.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
        {presetName === 'Custom' && (
          <option value="Custom">Custom</option>
        )}
      </select>

      {/* Band sliders - vertical layout */}
      <div className="bg-surface-card rounded-xl border border-white/5 p-3">
        <div className="flex justify-between gap-1">
          {bands.map((band, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              {/* Gain value */}
              <span className="text-[10px] font-mono text-text-muted">
                {band.gain > 0 ? '+' : ''}{band.gain.toFixed(0)}
              </span>

              {/* Vertical slider (rotated range input) */}
              <div className="h-20 flex items-center justify-center">
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.5}
                  value={band.gain}
                  onChange={(e) =>
                    handleBandGainChange(i, parseFloat(e.target.value))
                  }
                  disabled={!enabled}
                  className="h-2 w-20 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                             accent-saffron-500 disabled:opacity-30
                             [writing-mode:vertical-lr] [direction:rtl]"
                  aria-label={`EQ band ${BAND_LABELS[i]} Hz`}
                />
              </div>

              {/* Frequency label */}
              <span className="text-[10px] text-text-muted font-mono">
                {BAND_LABELS[i]}
              </span>
            </div>
          ))}
        </div>

        {/* Reset button */}
        <button
          onClick={resetToFlat}
          disabled={!enabled}
          className="mt-2 w-full text-xs text-text-muted hover:text-text-primary
                     disabled:opacity-30 transition-colors"
        >
          Reset to Flat
        </button>
      </div>
    </div>
  );
}
