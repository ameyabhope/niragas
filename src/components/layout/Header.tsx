/**
 * App header: logo, title, global start/stop, theme toggle, and pitch display.
 */

import { useRef, useCallback, useState } from 'react';
import { PitchDisplay } from '@/components/pitch/PitchDisplay';
import { useThemeStore } from '@/store/theme-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { useTablaStore } from '@/store/tabla-store';
import { useSurPetiStore } from '@/store/surpeti-store';
import { useSwarMandalStore } from '@/store/swarmandal-store';
import { useAudioEngine } from '@/hooks/useAudioEngine';

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
  const [globalPlaying, setGlobalPlaying] = useState(false);
  const snapshotRef = useRef<ActiveSnapshot | null>(null);

  const handleGlobalToggle = useCallback(async () => {
    // Ensure audio engine is started (user gesture)
    await initialize();

    if (globalPlaying) {
      // ── STOP ALL ──
      // Snapshot current state
      const tanpura = useTanpuraStore.getState();
      const tabla = useTablaStore.getState();
      const surpeti = useSurPetiStore.getState();
      const swarmandal = useSwarMandalStore.getState();

      snapshotRef.current = {
        tanpura1: tanpura.tanpura1.enabled,
        tanpura2: tanpura.tanpura2.enabled,
        tabla: tabla.playing,
        surpeti: surpeti.enabled,
        swarmandal: swarmandal.enabled && swarmandal.autoLoop,
      };

      // Disable everything
      if (tanpura.tanpura1.enabled) tanpura.toggleTanpura('tanpura1');
      if (tanpura.tanpura2.enabled) tanpura.toggleTanpura('tanpura2');
      if (tabla.playing) tabla.setPlaying(false);
      if (surpeti.enabled) surpeti.setEnabled(false);
      if (swarmandal.enabled) swarmandal.setEnabled(false);

      setGlobalPlaying(false);
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

      setGlobalPlaying(true);
    }
  }, [globalPlaying, initialize]);

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
            globalPlaying
              ? 'bg-accent text-white hover:bg-accent/80'
              : 'bg-saffron-600 text-white hover:bg-saffron-500'
          }`}
          title={globalPlaying ? 'Stop all instruments' : 'Start instruments'}
        >
          {globalPlaying ? 'STOP' : 'START'}
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
