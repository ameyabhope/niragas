/**
 * Tabla control panel: taal selector, style, tempo controls, beat display, play/stop.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTablaStore } from '@/store/tabla-store';
import { TAAL_LIST, getTaal } from '@/data/taals';
import {
  createTabla,
  loadTaal,
  startTabla,
  stopTabla,
  setTablaTempo,
  setTablaBeatCallback,
} from '@/audio/tabla';
import { BeatDisplay } from './BeatDisplay';
import { useTapTempo } from '@/hooks/useTapTempo';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
    setCurrentBeat,
  } = useTablaStore();

  const created = useRef(false);
  const taal = getTaal(taalId);

  // Tap tempo
  const handleTapTempo = useCallback(
    (bpm: number) => {
      setTempo(bpm);
      setTablaTempo(bpm);
    },
    [setTempo]
  );
  const { tap } = useTapTempo(handleTapTempo);

  // Create tabla on mount
  useEffect(() => {
    createTabla().then(() => {
      created.current = true;
    });
    return () => { created.current = false; };
  }, []);

  // Register beat callback
  useEffect(() => {
    setTablaBeatCallback((matra, label) => {
      setCurrentBeat(matra, label);
    });
  }, [setCurrentBeat]);

  // Load taal when selection changes
  useEffect(() => {
    if (!created.current) return;
    loadTaal(taal, styleId);
  }, [taal, styleId]);

  // Handle tempo changes
  useEffect(() => {
    if (!created.current) return;
    setTablaTempo(tempo);
  }, [tempo]);

  // Handle play/stop
  const prevPlaying = useRef(false);
  useEffect(() => {
    if (!created.current) return;

    if (playing && !prevPlaying.current) {
      loadTaal(taal, styleId);
      setTablaTempo(tempo);
      startTabla();
    } else if (!playing && prevPlaying.current) {
      stopTabla();
    }
    prevPlaying.current = playing;
  }, [playing, taal, styleId, tempo]);

  // Get speed range label
  const getSpeedLabel = () => {
    const bp = taal.speedBreakpoints;
    if (bp.atiVilambit && tempo < bp.atiVilambit) return 'Ati-Vilambit';
    if (tempo < bp.vilambit) return 'Vilambit';
    if (tempo < bp.madhya) return 'Madhya';
    if (tempo < bp.drut) return 'Drut';
    return 'Ati-Drut';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Tabla
        </h2>
        <InfoTooltip text="Electronic tabla with 47 taals and real tabla samples. Select a taal and style, adjust tempo with the slider or tap tempo, then press Play. Speed-dependent thekas available for core taals." />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* Taal + Style selectors */}
        <div className="flex flex-wrap gap-3">
          {/* Taal selector */}
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-text-muted mb-1 block">Taal</label>
            <select
              value={taalId}
              onChange={(e) => {
                setTaalId(e.target.value);
                if (playing) {
                  stopTabla();
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

          {/* Style selector */}
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-text-muted mb-1 block">Style</label>
            <select
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
                {getSpeedLabel()}
              </span>
            </div>
          </div>

          {/* Tempo slider */}
          <input
            type="range"
            min={taal.tempoRange.min}
            max={taal.tempoRange.max}
            value={tempo}
            onChange={(e) => {
              const bpm = parseInt(e.target.value, 10);
              setTempo(bpm);
              setTablaTempo(bpm);
            }}
            className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer
                       accent-saffron-500"
            aria-label="Tempo"
          />

          {/* Tempo buttons */}
          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={() => {
                halfTempo();
                setTablaTempo(Math.max(10, Math.round(tempo / 2)));
              }}
              className="px-2 py-1 bg-surface-lighter text-text-secondary text-xs rounded-lg
                         hover:bg-surface-lighter/80 transition-colors"
            >
              x/2
            </button>
            <button
              onClick={() => {
                adjustTempo(-1);
                setTablaTempo(tempo - 1);
              }}
              className="w-8 h-8 bg-surface-lighter text-text-secondary rounded-lg
                         hover:bg-surface-lighter/80 transition-colors font-bold"
            >
              -
            </button>
            <button
              onClick={tap}
              className="px-4 py-2 bg-surface-lighter text-text-primary text-xs font-semibold
                         rounded-lg hover:bg-saffron-700 transition-colors"
            >
              TAP
            </button>
            <button
              onClick={() => {
                adjustTempo(1);
                setTablaTempo(tempo + 1);
              }}
              className="w-8 h-8 bg-surface-lighter text-text-secondary rounded-lg
                         hover:bg-surface-lighter/80 transition-colors font-bold"
            >
              +
            </button>
            <button
              onClick={() => {
                doubleTempo();
                setTablaTempo(Math.min(700, tempo * 2));
              }}
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
            onClick={() => setPlaying(!playing)}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              playing
                ? 'bg-accent text-white hover:bg-accent/80'
                : 'bg-saffron-600 text-white hover:bg-saffron-500'
            }`}
          >
            {playing ? 'Stop' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
}
