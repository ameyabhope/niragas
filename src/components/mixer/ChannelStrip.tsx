/**
 * A single mixer channel strip: label, on/off toggle, volume slider, pan slider.
 */

import { useCallback } from 'react';
import type { InstrumentId, ChannelState } from '@/audio/types';

const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  tanpura1: 'Tanp1',
  tanpura2: 'Tanp2',
  tabla: 'Tabla',
  surpeti: 'SrPti',
  swarmandal: 'SwMdl',
  manjira: 'Mnjra',
  metronome: 'Metro',
};

const INSTRUMENT_FULL_NAMES: Record<InstrumentId, string> = {
  tanpura1: 'Tanpura 1',
  tanpura2: 'Tanpura 2',
  tabla: 'Tabla',
  surpeti: 'Sur-Peti',
  swarmandal: 'Swar Mandal',
  manjira: 'Manjira',
  metronome: 'Metronome',
};

interface ChannelStripProps {
  id: InstrumentId;
  channel: ChannelState;
  mode: 'volume' | 'pan';
  onToggleEnabled: () => void;
  onSetVolume: (v: number) => void;
  onSetPan: (v: number) => void;
  onToggleMute: () => void;
}

export function ChannelStrip({
  id,
  channel,
  mode,
  onToggleEnabled,
  onSetVolume,
  onSetPan,
  onToggleMute,
}: ChannelStripProps) {
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSetVolume(parseFloat(e.target.value));
    },
    [onSetVolume]
  );

  const handlePanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSetPan(parseFloat(e.target.value));
    },
    [onSetPan]
  );

  return (
    <div className="flex items-center gap-2 py-1.5">
      {/* Enable/disable toggle */}
      <button
        onClick={onToggleEnabled}
        className={`w-2.5 h-2.5 rounded-full border-2 transition-colors flex-shrink-0 ${
          channel.enabled
            ? 'bg-active border-active'
            : 'bg-transparent border-text-muted'
        }`}
        aria-label={`Toggle ${INSTRUMENT_FULL_NAMES[id]}`}
      />

      {/* Label */}
      <span
        className={`text-[10px] font-medium w-9 flex-shrink-0 ${
          channel.enabled ? 'text-text-primary' : 'text-text-muted'
        }`}
        title={INSTRUMENT_FULL_NAMES[id]}
      >
        {INSTRUMENT_LABELS[id]}
      </span>

      {/* Mute button */}
      <button
        onClick={onToggleMute}
        className={`text-[10px] w-5 h-5 flex items-center justify-center rounded font-mono flex-shrink-0 ${
          channel.muted
            ? 'bg-accent text-white'
            : 'bg-surface-lighter text-text-muted hover:text-text-primary'
        }`}
        aria-label={`Mute ${INSTRUMENT_FULL_NAMES[id]}`}
      >
        M
      </button>

      {/* Slider (volume or pan) */}
      {mode === 'volume' ? (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={channel.volume}
          onChange={handleVolumeChange}
          disabled={!channel.enabled}
          className="flex-1 h-1.5 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-30"
          aria-label={`${INSTRUMENT_FULL_NAMES[id]} volume`}
        />
      ) : (
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={channel.pan}
          onChange={handlePanChange}
          disabled={!channel.enabled}
          className="flex-1 h-1.5 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-30"
          aria-label={`${INSTRUMENT_FULL_NAMES[id]} pan`}
        />
      )}

      {/* Value display */}
      <span className="text-[10px] font-mono text-text-muted w-8 text-right flex-shrink-0">
        {mode === 'volume'
          ? `${Math.round(channel.volume * 100)}%`
          : channel.pan === 0
            ? 'C'
            : channel.pan < 0
              ? `L${Math.round(Math.abs(channel.pan) * 100)}`
              : `R${Math.round(channel.pan * 100)}`}
      </span>
    </div>
  );
}
