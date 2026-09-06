/**
 * App header: logo, title, global start/stop, theme toggle, and pitch display.
 */

import { useRef, useCallback } from 'react';
import { PitchDisplay } from '@/components/pitch/PitchDisplay';
import { useThemeStore } from '@/store/theme-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { useTablaStore } from '@/store/tabla-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { useRecorderStore } from '@/store/recorder-store';
import { useTunerStore } from '@/store/tuner-store';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { stopTanpura } from '@/audio/tanpura';
import { stopTabla } from '@/audio/tabla';
import { stopSurPeti } from '@/audio/surpeti';
import { stopSwarMandalLoop } from '@/audio/swarmandal';

/** Snapshot of which instruments were active before global stop */
interface ActiveSnapshot {
  tanpura1: boolean;
  tanpura2: boolean;
  tabla: boolean;
  surpeti: boolean;
  swarmandal: boolean;
  swarmandalAutoLoop: boolean;
}

const DEFAULT_SNAPSHOT: ActiveSnapshot = {
  tanpura1: true,
  tanpura2: false,
  tabla: false,
  surpeti: false,
  swarmandal: false,
  swarmandalAutoLoop: false,
};

export function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const { initialize } = useAudioEngine();
  const snapshotRef = useRef<ActiveSnapshot | null>(null);

  // Derive playing state from actual instrument stores
  const tanpura1Playing = useTanpuraStore((s) => s.tanpura1.enabled);
  const tanpura2Playing = useTanpuraStore((s) => s.tanpura2.enabled);
  const tablaPlaying = useTablaStore((s) => s.playing);
  const surpetiPlaying = useSurPetiStore((s) => s.enabled);
  const swarmandalPlaying = useSwarMandalStore((s) => s.enabled);
  const recordingState = useRecorderStore((s) => s.state);
  const includeMic = useRecorderStore((s) => s.includeMic);
  const tunerMicActive = useTunerStore((s) => s.micActive);

  const anyPlaying = tanpura1Playing || tanpura2Playing || tablaPlaying || surpetiPlaying || swarmandalPlaying;

  const handleGlobalToggle = useCallback(async () => {
    if (anyPlaying) {
      // ── STOP ALL ──
      // Snapshot current state before stopping
      snapshotRef.current = {
        tanpura1: tanpura1Playing,
        tanpura2: tanpura2Playing,
        tabla: tablaPlaying,
        surpeti: surpetiPlaying,
        swarmandal: swarmandalPlaying,
        swarmandalAutoLoop: useSwarMandalStore.getState().autoLoop,
      };

      // Stop audio immediately
      stopTanpura('tanpura1');
      stopTanpura('tanpura2');
      stopTabla();
      stopSurPeti();
      stopSwarMandalLoop();

      // Sync store state
      const tanpura = useTanpuraStore.getState();
      const tabla = useTablaStore.getState();
      const surpeti = useSurPetiStore.getState();
      const swarmandal = useSwarMandalStore.getState();

      if (tanpura.tanpura1.enabled) tanpura.toggleTanpura('tanpura1');
      if (tanpura.tanpura2.enabled) tanpura.toggleTanpura('tanpura2');
      if (tabla.playing) tabla.setPlaying(false);
      if (surpeti.enabled) surpeti.setEnabled(false);
      if (swarmandal.enabled) swarmandal.setEnabled(false);
    } else {
      if (!(await initialize())) return;
      // ── START ──
      const snapshot = snapshotRef.current ?? DEFAULT_SNAPSHOT;

      const tanpura = useTanpuraStore.getState();
      const tabla = useTablaStore.getState();
      const surpeti = useSurPetiStore.getState();
      const swarmandal = useSwarMandalStore.getState();

      // Re-enable from snapshot
      if (snapshot.tanpura1 && !tanpura.tanpura1.enabled) tanpura.toggleTanpura('tanpura1');
      if (snapshot.tanpura2 && !tanpura.tanpura2.enabled) tanpura.toggleTanpura('tanpura2');
      if (snapshot.tabla && !tabla.playing) tabla.setPlaying(true);
      if (snapshot.surpeti && !surpeti.enabled) surpeti.setEnabled(true);
      if (snapshot.swarmandal && !swarmandal.enabled) {
        swarmandal.setAutoLoop(snapshot.swarmandalAutoLoop);
        swarmandal.setEnabled(true);
      }
    }
  }, [anyPlaying, tanpura1Playing, tanpura2Playing, tablaPlaying, surpetiPlaying, swarmandalPlaying, initialize]);

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-2 sm:px-4 py-3 bg-surface-light border-b border-white/5">
      <div className="flex items-center gap-3 shrink-0">
        <h1 className="text-lg sm:text-xl font-bold text-saffron-400 tracking-tight">
          Niragas
        </h1>
        <span className="text-xs text-text-muted hidden sm:inline">
          Practice Companion
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        {/* Global Start / Stop */}
        <button
          type="button"
          onClick={handleGlobalToggle}
          aria-label={anyPlaying ? 'Stop all instruments' : 'Start instruments'}
          aria-pressed={anyPlaying}
          className={`min-h-11 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors ${
            anyPlaying
              ? 'bg-accent-control text-white hover:bg-accent-muted'
              : 'bg-action text-white hover:bg-saffron-800'
          }`}
          title={anyPlaying ? 'Stop all instruments' : 'Start instruments'}
        >
          {anyPlaying ? 'STOP' : 'START'}
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg
                     bg-surface-lighter text-text-secondary hover:text-text-primary
                     transition-colors text-sm"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '\u2600' : '\u263E'}
        </button>
        <PitchDisplay />
      </div>
      {(recordingState !== 'idle' || tunerMicActive) && (
        <p role="status" className="w-full text-xs font-semibold text-accent">
          {recordingState !== 'idle' && (recordingState === 'paused' ? 'Recording paused' : 'Recording active')}
          {recordingState !== 'idle' && includeMic ? ' | Recording mic active' : ''}
          {tunerMicActive ? `${recordingState !== 'idle' ? ' | ' : ''}Tuner mic active` : ''}
          <span className="font-normal text-text-muted"> | Manage in More. STOP affects instruments only.</span>
        </p>
      )}
    </header>
  );
}
