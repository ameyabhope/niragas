/**
 * Tabla control panel: taal selector, style, tempo controls, beat display, play/stop.
 */

import { useCallback } from 'react';
import { useTablaStore } from '@/store/tabla-store';
import { TAAL_LIST, getTaal } from '@/data/taals';
import { BeatDisplay } from './BeatDisplay';
import { useTapTempo } from '@/hooks/useTapTempo';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { getSpeedLabel } from '@/lib/taal';

export function TablaPanel() {
  const {
    taalId,
    styleId,
    tempo,
    playing,
    currentMatra,
    setTaalId,
    setStyleId,
    setTempo,
    adjustTempo,
    halfTempo,
    doubleTempo,
    setPlaying,
  } = useTablaStore();

  const taal = getTaal(taalId);
  const { initialize } = useAudioEngine();

  // Tap tempo — just updates the store, subscription propagates to audio
  const handleTapTempo = useCallback(
    (bpm: number) => {
      setTempo(bpm);
    },
    [setTempo]
  );
  const { tap } = useTapTempo(handleTapTempo);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Tabla
        </h2>
        <InfoTooltip label="About Tabla" text="Electronic tabla with 47 named taals and nine simple beat patterns. Select a taal and style, adjust tempo with the slider or tap tempo, then press Play. Speed-dependent thekas are available for selected taals." />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* Taal + Style selectors */}
        <div className="flex flex-wrap gap-3">
          {/* Taal selector */}
          <div className="flex-1 min-w-[140px]">
            <label htmlFor="tabla-taal" className="text-xs text-text-muted mb-1 block">Taal</label>
            <select
              id="tabla-taal"
              value={taalId}
              onChange={(e) => {
                setTaalId(e.target.value);
                if (playing) {
                  setPlaying(false);
                }
              }}
              className="w-full bg-surface-lighter text-text-primary text-sm rounded-lg px-3 py-2
                         border border-white/10 focus:outline-none focus:ring-2 focus:ring-saffron-400"
            >
              {TAAL_LIST.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.matras})
                </option>
              ))}
            </select>
          </div>

          {/* Style selector — only shown when taal has multiple styles */}
          {taal.styles.length > 1 && (
            <div className="flex-1 min-w-[120px]">
              <label htmlFor="tabla-style" className="text-xs text-text-muted mb-1 block">Style</label>
              <select
                id="tabla-style"
                value={styleId}
                onChange={(e) => setStyleId(e.target.value)}
                className="w-full bg-surface-lighter text-text-primary text-sm rounded-lg px-3 py-2
                           border border-white/10 focus:outline-none focus:ring-2 focus:ring-saffron-400"
              >
                {taal.styles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Beat display */}
        <BeatDisplay
          taal={taal}
          currentMatra={currentMatra}
          playing={playing}
        />

        {/* Tempo controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Tempo</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-text-primary font-mono">
                {tempo}
              </span>
              <span className="text-xs text-text-muted">BPM</span>
              <span className="text-xs text-saffron-400 ml-1">
                {getSpeedLabel(taal, tempo)}
              </span>
            </div>
          </div>

          {/* Tempo slider */}
          <input
            type="range"
            min={taal.tempoRange.min}
            max={taal.tempoRange.max}
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                       accent-saffron-500"
            aria-label="Tempo"
          />

          {/* Tempo buttons */}
          <div className="flex items-center gap-2 justify-center">
            <button
              type="button"
              onClick={halfTempo}
              className="px-2 py-1 bg-surface-lighter text-text-secondary text-xs rounded-lg
                         hover:bg-surface-lighter/80 transition-colors"
            >
              x/2
            </button>
            <button
              type="button"
              onClick={() => adjustTempo(-1)}
              aria-label="Decrease tempo by 1 BPM"
              className="w-8 h-8 bg-surface-lighter text-text-secondary rounded-lg
                         hover:bg-surface-lighter/80 transition-colors font-bold"
            >
              -
            </button>
            <button
              type="button"
              onClick={tap}
              className="px-4 py-2 bg-surface-lighter text-text-primary text-xs font-semibold
                         rounded-lg hover:bg-saffron-700 transition-colors"
            >
              TAP
            </button>
            <button
              type="button"
              onClick={() => adjustTempo(1)}
              aria-label="Increase tempo by 1 BPM"
              className="w-8 h-8 bg-surface-lighter text-text-secondary rounded-lg
                         hover:bg-surface-lighter/80 transition-colors font-bold"
            >
              +
            </button>
            <button
              type="button"
              onClick={doubleTempo}
              className="px-2 py-1 bg-surface-lighter text-text-secondary text-xs rounded-lg
                         hover:bg-surface-lighter/80 transition-colors"
            >
              2x
            </button>
          </div>
        </div>

        {/* Play / Stop buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              void initialize().then((ready) => {
                if (ready) setPlaying(true);
              });
            }}
            aria-pressed={playing}
            aria-keyshortcuts="Space"
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              playing
                ? 'bg-accent-control text-white hover:bg-accent-muted'
                : 'bg-action text-white hover:bg-saffron-800'
            }`}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
