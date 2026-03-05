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
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { stopTanpura } from '@/audio/tanpura';
import { stopTabla } from '@/audio/tabla';
import { stopSurPeti } from '@/audio/surpeti';
import { stopSwarMandalLoop } from '@/audio/swarmandal';
import { stopManjira } from '@/audio/manjira';

/** Snapshot of which instruments were active before global stop */
interface ActiveSnapshot {
  tanpura1: boolean;
  tanpura2: boolean;
  tabla: boolean;
  surpeti: boolean;
  swarmandal: boolean;
}

const DEFAULT_SNAPSHOT: ActiveSnapshot = {
  tanpura1: true,
  tanpura2: false,
  tabla: false,
  surpeti: false,
  swarmandal: false,
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

  const anyPlaying = tanpura1Playing || tanpura2Playing || tablaPlaying || surpetiPlaying || swarmandalPlaying;

  const handleGlobalToggle = useCallback(async () => {
    // Ensure audio engine is started (user gesture)
    await initialize();

    if (anyPlaying) {
      // ── STOP ALL ──
      // Snapshot current state before stopping
      snapshotRef.current = {
        tanpura1: tanpura1Playing,
        tanpura2: tanpura2Playing,
        tabla: tablaPlaying,
        surpeti: surpetiPlaying,
        swarmandal: swarmandalPlaying,
      };

      // Stop audio immediately
      stopTanpura('tanpura1');
      stopTanpura('tanpura2');
      stopTabla();
      stopSurPeti();
      stopSwarMandalLoop();
      stopManjira();

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
        swarmandal.setEnabled(true);
        if (!swarmandal.autoLoop) swarmandal.setAutoLoop(true);
      }
    }
  }, [anyPlaying, tanpura1Playing, tanpura2Playing, tablaPlaying, surpetiPlaying, swarmandalPlaying, initialize]);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-surface-light border-b border-white/5">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-saffron-400 tracking-tight">
          Niragas
        </h1>
        <span className="text-xs text-text-muted hidden sm:inline">
          Practice Companion
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Start / Stop */}
        <button
          onClick={handleGlobalToggle}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors ${
            anyPlaying
              ? 'bg-accent text-white hover:bg-accent/80'
              : 'bg-saffron-600 text-white hover:bg-saffron-500'
          }`}
          title={anyPlaying ? 'Stop all instruments' : 'Start instruments'}
        >
          {anyPlaying ? 'STOP' : 'START'}
        </button>

        {/* Theme toggle */}
        <button
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
    </header>
  );
}
