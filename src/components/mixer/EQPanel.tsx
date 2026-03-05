/**
 * 7-band parametric EQ panel with visual sliders and preset selector.
 */

import { useEQStore } from '@/store/eq-store';
import {
  EQ_PRESETS,
  EQ_PRESET_NAMES,
} from '@/audio/eq';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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

  const handlePresetChange = (name: string) => {
    const preset = EQ_PRESETS[name];
    if (!preset) return;
    setPreset(name, preset);
  };

  const handleBandGainChange = (index: number, gain: number) => {
    setBandGain(index, gain);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Equalizer
          </h3>
          <InfoTooltip text="7-band parametric EQ applied to the master output. Choose from 22 presets or adjust individual frequency bands manually. Useful for shaping the overall tone of your practice session." align="left" />
        </div>
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
      <div className="bg-surface-card rounded-xl border border-white/5 p-3 overflow-hidden">
        <div className="flex justify-between gap-0.5">
          {bands.map((band, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
              {/* Gain value */}
              <span className="text-[9px] font-mono text-text-muted">
                {band.gain > 0 ? '+' : ''}{band.gain.toFixed(0)}
              </span>

              {/* Vertical slider (rotated horizontal range) */}
              <div className="h-20 w-6 flex items-center justify-center relative">
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
                  className="absolute w-20 h-1.5 bg-surface-lighter rounded-lg appearance-none
                             cursor-pointer accent-saffron-500 disabled:opacity-30
                             origin-center -rotate-90"
                  aria-label={`EQ band ${BAND_LABELS[i]} Hz`}
                />
              </div>

              {/* Frequency label */}
              <span className="text-[9px] text-text-muted font-mono">
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
