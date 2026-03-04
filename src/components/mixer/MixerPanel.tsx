/**
 * Mixer panel: all channel strips + master volume.
 * Toggle between volume and pan mode.
 */

import { useState } from 'react';
import type { InstrumentId } from '@/audio/types';
import { useMixerStore } from '@/store/mixer-store';
import { setMasterVolume as setMasterVolumeAudio, setMasterMute } from '@/audio/mixer';
import { ChannelStrip } from './ChannelStrip';

const INSTRUMENT_ORDER: InstrumentId[] = [
  'tanpura1',
  'tanpura2',
  'tabla',
  'surpeti',
  'swarmandal',
  'manjira',
  'metronome',
];

export function MixerPanel() {
  const [mode, setMode] = useState<'volume' | 'pan'>('volume');
  const {
    channels,
    masterVolume,
    masterMuted,
    toggleEnabled,
    setVolume,
    setPan,
    toggleMute,
    setMasterVolume,
    toggleMasterMute,
  } = useMixerStore();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Mixer
        </h2>

        {/* Volume / Pan mode toggle */}
        <div className="flex bg-surface-lighter rounded-lg overflow-hidden">
          <button
            onClick={() => setMode('volume')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'volume'
                ? 'bg-saffron-600 text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Volume
          </button>
          <button
            onClick={() => setMode('pan')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'pan'
                ? 'bg-saffron-600 text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Pan
          </button>
        </div>
      </div>

      {/* Channel strips */}
      <div className="bg-surface-card rounded-xl border border-white/5 px-4 py-2">
        {INSTRUMENT_ORDER.map((id) => (
          <ChannelStrip
            key={id}
            id={id}
            channel={channels[id]}
            mode={mode}
            onToggleEnabled={() => toggleEnabled(id)}
            onSetVolume={(v) => setVolume(id, v)}
            onSetPan={(v) => setPan(id, v)}
            onToggleMute={() => toggleMute(id)}
          />
        ))}

        {/* Separator */}
        <div className="border-t border-white/5 my-2" />

        {/* Master */}
        <div className="flex items-center gap-3 py-2">
          <button
            onClick={() => {
              toggleMasterMute();
              setMasterMute(!masterMuted);
            }}
            className={`text-xs px-2 py-1 rounded font-semibold ${
              masterMuted
                ? 'bg-accent text-white'
                : 'bg-saffron-600 text-white'
            }`}
          >
            {masterMuted ? 'MUTED' : 'MASTER'}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setMasterVolume(v);
              setMasterVolumeAudio(v);
            }}
            className="flex-1 h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                       accent-saffron-500"
            aria-label="Master volume"
          />

          <span className="text-xs font-mono text-text-muted w-10 text-right">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
