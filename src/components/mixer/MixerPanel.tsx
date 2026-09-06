/**
 * Mixer panel: all channel strips + master volume.
 * Toggle between volume and pan mode.
 */

import { useState } from 'react';
import type { InstrumentId } from '@/audio/types';
import { useMixerStore } from '@/store/mixer-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { useTablaStore } from '@/store/tabla-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { practiceSession } from '@/lib/practice-session';
import { ChannelStrip } from './ChannelStrip';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

const INSTRUMENT_ORDER: InstrumentId[] = [
  'tanpura1',
  'tanpura2',
  'tabla',
  'surpeti',
  'swarmandal',
];

export function MixerPanel() {
  const [mode, setMode] = useState<'volume' | 'pan'>('volume');
  const {
    channels,
    masterVolume,
    masterMuted,
    setVolume,
    setPan,
    toggleMute,
    setMasterVolume,
    toggleMasterMute,
  } = useMixerStore();
  const enabled: Record<InstrumentId, boolean> = {
    tanpura1: useTanpuraStore((state) => state.tanpura1.enabled),
    tanpura2: useTanpuraStore((state) => state.tanpura2.enabled),
    tabla: useTablaStore((state) => state.enabled),
    surpeti: useSurPetiStore((state) => state.enabled),
    swarmandal: useSwarMandalStore((state) => state.enabled),
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Mixer
          </h2>
          <InfoTooltip label="About the mixer" text="Control volume and stereo pan for each instrument independently. Toggle between Volume and Pan modes. Use the master fader to control overall output level." align="left" />
        </div>

        <div className="flex bg-surface-lighter rounded-lg overflow-hidden" role="group" aria-label="Mixer adjustment">
          <button
            type="button"
            onClick={() => setMode('volume')}
            aria-pressed={mode === 'volume'}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'volume'
                ? 'bg-action text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() => setMode('pan')}
            aria-pressed={mode === 'pan'}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'pan'
                ? 'bg-action text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Pan
          </button>
        </div>
      </div>

      <div className="bg-surface-card rounded-xl border border-white/5 px-3 py-1">
        {INSTRUMENT_ORDER.map((id) => (
          <ChannelStrip
            key={id}
            id={id}
            channel={channels[id]}
            enabled={enabled[id]}
            mode={mode}
            onToggleEnabled={() => practiceSession.toggleInstrument(id)}
            onSetVolume={(v) => setVolume(id, v)}
            onSetPan={(v) => setPan(id, v)}
            onToggleMute={() => toggleMute(id)}
          />
        ))}

        <div className="border-t border-white/5 my-1" />

        <div className="flex items-center gap-2 py-1.5">
          <button
            type="button"
            onClick={toggleMasterMute}
            aria-label={masterMuted ? 'Unmute master output' : 'Mute master output'}
            aria-pressed={masterMuted}
            aria-keyshortcuts="Alt+M"
            className={`text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0 ${
              masterMuted
                ? 'bg-accent-control text-white'
                : 'bg-action text-white'
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
            onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                       accent-saffron-500"
            aria-label="Master volume"
          />

          <span className="text-[10px] font-mono text-text-muted w-8 text-right flex-shrink-0">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
