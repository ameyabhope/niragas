/**
 * A single mixer channel strip: label, on/off toggle, volume slider, pan slider.
 */

import type { InstrumentId, ChannelState } from '@/audio/types';

const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  tanpura1: 'Tanp1',
  tanpura2: 'Tanp2',
  tabla: 'Tabla',
  surpeti: 'SrPti',
  swarmandal: 'SwMdl',
};

const INSTRUMENT_FULL_NAMES: Record<InstrumentId, string> = {
  tanpura1: 'Tanpura 1',
  tanpura2: 'Tanpura 2',
  tabla: 'Tabla',
  surpeti: 'Sur-Peti',
  swarmandal: 'Swar Mandal',
};

interface ChannelStripProps {
  id: InstrumentId;
  channel: ChannelState;
  enabled: boolean;
  mode: 'volume' | 'pan';
  onToggleEnabled: () => void;
  onSetVolume: (v: number) => void;
  onSetPan: (v: number) => void;
  onToggleMute: () => void;
}

export function ChannelStrip({
  id,
  channel,
  enabled,
  mode,
  onToggleEnabled,
  onSetVolume,
  onSetPan,
  onToggleMute,
}: ChannelStripProps) {
  return (
    <div className="flex min-w-0 items-center gap-1 py-1.5">
      <button
        type="button"
        onClick={onToggleEnabled}
        className="w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0"
        aria-label={`${enabled ? 'Disable' : 'Enable'} ${INSTRUMENT_FULL_NAMES[id]}`}
        aria-pressed={enabled}
      >
        <span className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
            enabled
              ? 'bg-active border-active'
              : 'bg-transparent border-text-muted'
          }`}
        />
      </button>

      <span
        className={`text-[10px] font-medium w-9 flex-shrink-0 ${
          enabled ? 'text-text-primary' : 'text-text-muted'
        }`}
        title={INSTRUMENT_FULL_NAMES[id]}
      >
        {INSTRUMENT_LABELS[id]}
      </span>

      <button
        type="button"
        onClick={onToggleMute}
        className={`text-[10px] w-10 h-10 flex items-center justify-center rounded-lg font-mono flex-shrink-0 ${
          channel.muted
            ? 'bg-accent-control text-white'
            : 'bg-surface-lighter text-text-muted hover:text-text-primary'
        }`}
        aria-label={`${channel.muted ? 'Unmute' : 'Mute'} ${INSTRUMENT_FULL_NAMES[id]}`}
        aria-pressed={channel.muted}
      >
        M
      </button>

      {mode === 'volume' ? (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={channel.volume}
          onChange={(e) => onSetVolume(parseFloat(e.target.value))}
          className="min-w-0 w-0 flex-1 h-1.5 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500"
          aria-label={`${INSTRUMENT_FULL_NAMES[id]} volume`}
        />
      ) : (
        <input
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={channel.pan}
          onChange={(e) => onSetPan(parseFloat(e.target.value))}
          className="min-w-0 w-0 flex-1 h-1.5 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                     accent-saffron-500"
          aria-label={`${INSTRUMENT_FULL_NAMES[id]} pan`}
        />
      )}

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
