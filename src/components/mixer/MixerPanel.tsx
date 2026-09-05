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
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { ChannelStrip } from './ChannelStrip';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
    setVolume,
    setPan,
    toggleMute,
    setMasterVolume,
    toggleMasterMute,
  } = useMixerStore();
  const { initialize } = useAudioEngine();

  // Mixer dots delegate to the instrument stores — the single source of
  // truth for on/off. Manjira/metronome have no start path yet, so their
  // dots stay disabled instead of lying about engine state.
  const handleToggleEnabled = (id: InstrumentId) => {
    switch (id) {
      case 'tanpura1':
      case 'tanpura2':
        void initialize().then((ready) => {
          if (ready) useTanpuraStore.getState().toggleTanpura(id);
        });
        break;
      case 'tabla':
        void initialize().then((ready) => {
          if (ready) useTablaStore.getState().togglePlaying();
        });
        break;
      case 'surpeti':
        void initialize().then((ready) => {
          if (ready) useSurPetiStore.getState().toggle();
        });
        break;
      case 'swarmandal':
        void initialize().then((ready) => {
          if (ready) useSwarMandalStore.getState().toggle();
        });
        break;
      case 'manjira':
      case 'metronome':
        break;
    }
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

        {/* Volume / Pan mode toggle */}
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

      {/* Channel strips */}
      <div className="bg-surface-card rounded-xl border border-white/5 px-3 py-1">
        {INSTRUMENT_ORDER.map((id) => (
          <ChannelStrip
            key={id}
            id={id}
            channel={channels[id]}
            mode={mode}
            onToggleEnabled={() => handleToggleEnabled(id)}
            toggleDisabled={id === 'manjira' || id === 'metronome'}
            toggleTitle={
              id === 'manjira' || id === 'metronome'
                ? 'Not yet playable — engine has no start path'
                : undefined
            }
            onSetVolume={(v) => setVolume(id, v)}
            onSetPan={(v) => setPan(id, v)}
            onToggleMute={() => toggleMute(id)}
          />
        ))}

        {/* Separator */}
        <div className="border-t border-white/5 my-1" />

        {/* Master */}
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
