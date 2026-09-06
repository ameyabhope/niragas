/**
 * Recording panel: record, pause, stop, playback, download.
 *
 * Completed recordings are saved locally in IndexedDB.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRecorderStore } from '@/store/recorder-store';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { getRecordingExtension } from '@/audio/recorder';
import { useAudioEngine } from '@/hooks/useAudioEngine';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecorderPanel() {
  const {
    state,
    includeMic,
    recordings,
    saveStatus,
    starting,
    storageError,
    loading,
    load,
    persist,
    playingId,
    elapsed,
    error,
    start,
    pause,
    resume,
    stop,
    cancel,
    toggleMic,
    deleteRecording,
    downloadRecording,
    setPlayingId,
    setError,
    updateElapsed,
    hasUnsavedRecordings,
  } = useRecorderStore();
  const { initialize } = useAudioEngine();

  const handleStart = useCallback(async () => {
    if (await initialize()) await start();
  }, [initialize, start]);

  useEffect(() => { void load(); }, [load]);

  // Never depend on a download click as evidence that a recording is safe.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRecordings()) {
        e.preventDefault();
        // Modern browsers show a generic message; this string is ignored but required
        e.returnValue = 'Recording or saving is still in progress, or a recording could not be saved.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedRecordings]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number>(0);

  // Elapsed time ticker
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = window.setInterval(updateElapsed, 200);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [state, updateElapsed]);

  // Playback handlers
  const handlePlay = useCallback(
    (rec: { id: string; url: string }) => {
      if (playingId === rec.id) {
        // Stop playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current = null;
        }
        setPlayingId(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(rec.url);
      audio.onended = () => {
        if (audioRef.current === audio) setPlayingId(null);
      };
      audioRef.current = audio;
      setPlayingId(rec.id);
      setError(null);
      const fail = () => {
        if (audioRef.current !== audio) return;
        audio.pause();
        audioRef.current = null;
        setPlayingId(null);
        setError('Could not play this recording. Try downloading the original format.');
      };
      audio.onerror = fail;
      void audio.play().catch(fail);
    },
    [playingId, setPlayingId, setError]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    };
  }, [setPlayingId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Recorder
        </h2>
        <InfoTooltip label="About recording" text="Record up to 30 minutes, optionally with mic input. Completed recordings are saved in this browser, not uploaded. Browser storage can be cleared or evicted; download important recordings as a backup. Wait for Saved in browser before leaving." />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* Recording controls */}
        <div className="flex items-center gap-3">
          {state === 'idle' ? (
            <>
              {/* Record button */}
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={starting}
                aria-label="Start recording"
                className="w-12 h-12 rounded-full bg-accent hover:bg-accent/80 
                           flex items-center justify-center transition-colors shadow-lg"
                title="Start recording"
              >
                <div className="w-4 h-4 rounded-full bg-white" />
              </button>

              {/* Mic toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMic}
                  disabled={starting}
                  onChange={toggleMic}
                  className="w-3.5 h-3.5 accent-saffron-500"
                />
                <span className="text-xs text-text-secondary">Include mic</span>
              </label>
            </>
          ) : (
            <>
              {/* Active recording controls */}
              <div className="flex items-center gap-2">
                {/* Recording indicator */}
                <div
                  className={`w-3 h-3 rounded-full ${
                    state === 'recording'
                      ? 'bg-accent animate-pulse'
                      : 'bg-warning'
                  }`}
                />
                <span className="text-sm text-text-primary font-mono tabular-nums min-w-[4ch]">
                  {formatTime(elapsed)}
                </span>
              </div>

              {/* Pause / Resume */}
              <button
                type="button"
                onClick={state === 'recording' ? pause : resume}
                className="px-3 py-1.5 bg-surface-lighter text-text-secondary text-xs 
                           rounded-lg hover:text-text-primary transition-colors"
              >
                {state === 'recording' ? 'Pause' : 'Resume'}
              </button>

              {/* Stop */}
              <button
                type="button"
                onClick={stop}
                className="px-3 py-1.5 bg-action text-white text-xs font-semibold
                           rounded-lg hover:bg-saffron-800 transition-colors"
              >
                Stop
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Discard the active recording? This cannot be undone.')) cancel();
                }}
                className="px-2 py-1.5 text-text-muted text-xs hover:text-accent transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="text-xs text-accent" role="alert">{error}</p>
        )}
        {starting && <p className="text-xs text-text-muted" role="status">Starting recording...</p>}
        {loading && <p className="text-xs text-text-muted" role="status">Loading recordings...</p>}
        {storageError && (
          <div className="text-xs text-accent" role="alert">
            {storageError} <button type="button" onClick={() => void load()} className="underline">Retry</button>
          </div>
        )}

        {/* Recordings list */}
        {recordings.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Recordings ({recordings.length})
              </p>
              {hasUnsavedRecordings() && (
                <p className="text-[10px] text-warning">
                  Unsaved audio: keep this page open
                </p>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {recordings.map((rec) => {
                const isSaved = saveStatus[rec.id] === 'saved';
                const originalFormat = getRecordingExtension(rec).toUpperCase();
                return (
                  <div
                    key={rec.id}
                    className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isSaved
                        ? 'bg-surface-lighter/30 hover:bg-surface-lighter/50'
                        : 'bg-surface-lighter/50 hover:bg-surface-lighter'
                    }`}
                  >
                    {/* Play/Stop */}
                    <button
                      type="button"
                      onClick={() => handlePlay(rec)}
                      aria-label={`${playingId === rec.id ? 'Stop' : 'Play'} ${rec.name}`}
                      aria-pressed={playingId === rec.id}
                      className={`row-span-2 w-10 h-10 rounded-full flex items-center justify-center text-xs
                                 transition-colors ${
                        playingId === rec.id
                          ? 'bg-action text-white'
                          : 'bg-surface text-text-secondary hover:text-text-primary'
                      }`}
                      title={playingId === rec.id ? 'Stop' : 'Play'}
                    >
                      {playingId === rec.id ? '\u25A0' : '\u25B6'}
                    </button>

                    {/* Info */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-text-primary truncate">{rec.name}</p>
                      </div>
                      <p className="text-[10px] text-text-muted">
                        {formatTime(rec.duration)}
                      </p>
                      <p className={`text-[10px] ${isSaved ? 'text-active' : 'text-warning'}`} role="status">
                        {isSaved ? 'Saved in browser' : saveStatus[rec.id] === 'error' ? 'Save failed. Download a backup or retry.' : 'Saving...'}
                      </p>
                      {saveStatus[rec.id] === 'error' && (
                        <button type="button" onClick={() => void persist(rec.id)} className="text-xs underline text-warning">Retry save</button>
                      )}
                    </div>

                    {/* Download browser-native format */}
                    <button
                      type="button"
                      onClick={() => downloadRecording(rec.id, 'original')}
                      className="col-start-2 justify-self-end px-2 py-1 text-[10px] text-text-muted hover:text-saffron-400
                                 transition-colors"
                      title={`Download as ${originalFormat}`}
                      aria-label={`Download ${rec.name} as ${originalFormat}`}
                    >
                      {originalFormat}
                    </button>

                    {/* Download WAV */}
                    <button
                      type="button"
                      onClick={() => downloadRecording(rec.id, 'wav')}
                      className="px-2 py-1 text-[10px] text-text-muted hover:text-saffron-400 
                                 transition-colors"
                      title="Download as WAV"
                      aria-label={`Download ${rec.name} as WAV`}
                    >
                      WAV
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      disabled={saveStatus[rec.id] === 'saving' || loading}
                      onClick={() => {
                        if (confirm('Delete this recording?')) {
                          if (playingId === rec.id && audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current = null;
                            setPlayingId(null);
                          }
                          deleteRecording(rec.id);
                        }
                      }}
                      className="w-10 h-10 text-text-muted/40 hover:text-accent text-xs transition-colors"
                      title="Delete"
                      aria-label={`Delete ${rec.name}`}
                    >
                      x
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
