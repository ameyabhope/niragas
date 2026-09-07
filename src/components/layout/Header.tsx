/**
 * App header: logo, title, global start/stop, theme toggle, and pitch display.
 */

import { PitchDisplay } from '@/components/pitch/PitchDisplay';
import { useThemeStore } from '@/store/theme-store';
import { useRecorderStore } from '@/store/recorder-store';
import { useTunerStore } from '@/store/tuner-store';
import { practiceSession } from '@/lib/practice-session';
import { useSessionStore } from '@/store/session-store';
import { usePracticeSession } from '@/hooks/usePracticeSession';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';

const WAKE_STATUS = {
  disabled: 'Off',
  unsupported: 'Unavailable in this browser',
  idle: 'Waiting for accompaniment',
  requesting: 'Requesting…',
  held: 'Screen will stay awake',
  released: 'Released by the browser',
  hidden: 'Paused while page is hidden',
  denied: 'Permission denied',
} as const;

export function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const requested = useSessionStore((state) => state.requested);
  const recordingState = useRecorderStore((s) => s.state);
  const includeMic = useRecorderStore((s) => s.includeMic);
  const tunerMicActive = useTunerStore((s) => s.micActive);
  const browserPlayback = usePracticeSession();
  const screenWakeLock = useScreenWakeLock();

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
          onClick={() => { void practiceSession.play(); }}
          aria-label="Start instruments"
          aria-pressed={requested}
          className="min-h-11 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors bg-action text-white hover:bg-saffron-800"
          title="Start instruments"
        >
          START
        </button>
        <button
          type="button"
          onClick={() => practiceSession.stop()}
          aria-label="Stop all instruments"
          className="min-h-11 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-colors bg-accent-control text-white hover:bg-accent-muted"
          title="Stop instruments and cancel pending playback"
        >
          STOP
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
      <p className="w-full text-xs text-text-muted">Select instruments, then Start. Stop keeps your setup.</p>
      <label className="flex min-h-11 w-full items-center gap-2 text-xs text-text-muted">
        <input
          type="checkbox"
          checked={screenWakeLock.requested}
          onChange={event => screenWakeLock.setRequested(event.target.checked)}
        />
        <span>Keep screen awake</span>
        <span role="status">{WAKE_STATUS[screenWakeLock.status]}</span>
      </label>
      {browserPlayback.interrupted && (
        <div role="status" className="flex w-full items-center gap-3 text-xs font-semibold text-accent">
          <span>Audio interrupted.</span>
          <button
            type="button"
            onClick={() => { void browserPlayback.resume(); }}
            className="min-h-11 rounded-lg bg-action px-3 text-white hover:bg-saffron-800"
          >
            Resume audio
          </button>
          {browserPlayback.resumeError && <span role="alert">{browserPlayback.resumeError}</span>}
        </div>
      )}
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
