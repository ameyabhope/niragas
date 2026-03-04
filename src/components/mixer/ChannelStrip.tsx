/**
 * A single mixer channel strip: label, on/off toggle, volume slider, pan slider.
 */

import { useCallback } from 'react';
import type { InstrumentId, ChannelState } from '@/audio/types';
import { setChannelVolume, setChannelPan, setChannelMute } from '@/audio/mixer';

const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  tanpura1: 'Tanp 1',
  tanpura2: 'Tanp 2',
  tabla: 'Tabla',
  surpeti: 'Sur-Peti',
  swarmandal: 'Swar Mdl',
  manjira: 'Manjira',
  metronome: 'Metro',
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
      const value = parseFloat(e.target.value);
      onSetVolume(value);
      setChannelVolume(id, value);
    },
    [id, onSetVolume]
  );

  const handlePanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(e.target.value);
      onSetPan(value);
      setChannelPan(id, value);
    },
    [id, onSetPan]
  );

  const handleMuteToggle = useCallback(() => {
    onToggleMute();
    setChannelMute(id, !channel.muted);
  }, [id, channel.muted, onToggleMute]);

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Enable/disable toggle */}
      <button
        onClick={onToggleEnabled}
        className={`w-3 h-3 rounded-full border-2 transition-colors flex-shrink-0 ${
          channel.enabled
            ? 'bg-active border-active'
            : 'bg-transparent border-text-muted'
        }`}
        aria-label={`Toggle ${INSTRUMENT_LABELS[id]}`}
      />

      {/* Label */}
      <span
        className={`text-xs font-medium w-16 truncate ${
          channel.enabled ? 'text-text-primary' : 'text-text-muted'
        }`}
      >
        {INSTRUMENT_LABELS[id]}
      </span>

      {/* Mute button */}
      <button
        onClick={handleMuteToggle}
        className={`text-xs px-1.5 py-0.5 rounded font-mono ${
          channel.muted
            ? 'bg-accent text-white'
            : 'bg-surface-lighter text-text-muted hover:text-text-primary'
        }`}
        aria-label={`Mute ${INSTRUMENT_LABELS[id]}`}
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
          className="flex-1 h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-30"
          aria-label={`${INSTRUMENT_LABELS[id]} volume`}
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
          className="flex-1 h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500 disabled:opacity-30"
          aria-label={`${INSTRUMENT_LABELS[id]} pan`}
        />
      )}

      {/* Value display */}
      <span className="text-xs font-mono text-text-muted w-10 text-right">
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
