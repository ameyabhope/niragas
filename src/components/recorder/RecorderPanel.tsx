/**
 * Recording panel: record, pause, stop, playback, download.
 *
 * Recordings exist only in memory for the current session. Users must
 * download them before closing the page, or they will be lost.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRecorderStore } from '@/store/recorder-store';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
    downloadedIds,
    playingId,
    elapsed,
    start,
    pause,
    resume,
    stop,
    cancel,
    toggleMic,
    deleteRecording,
    downloadRecording,
    setPlayingId,
    updateElapsed,
    hasUndownloadedRecordings,
    revokeAll,
  } = useRecorderStore();

  // Warn user before leaving if there are undownloaded recordings
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUndownloadedRecordings()) {
        e.preventDefault();
        // Modern browsers show a generic message; this string is ignored but required
        e.returnValue = 'You have undownloaded recordings that will be lost.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUndownloadedRecordings]);

  // Revoke all blob URLs on unmount (page navigation within SPA)
  useEffect(() => {
    return () => revokeAll();
  }, [revokeAll]);

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
        }
        setPlayingId(null);
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(rec.url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(rec.id);
    },
    [playingId, setPlayingId]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Recorder
        </h2>
        <InfoTooltip text="Record your practice session. Optionally include mic input. Recordings exist only in memory for this session — download as WebM or WAV before closing the page. Nothing is saved to disk or sent anywhere." />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* Recording controls */}
        <div className="flex items-center gap-3">
          {state === 'idle' ? (
            <>
              {/* Record button */}
              <button
                onClick={start}
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
                onClick={state === 'recording' ? pause : resume}
                className="px-3 py-1.5 bg-surface-lighter text-text-secondary text-xs 
                           rounded-lg hover:text-text-primary transition-colors"
              >
                {state === 'recording' ? 'Pause' : 'Resume'}
              </button>

              {/* Stop */}
              <button
                onClick={stop}
                className="px-3 py-1.5 bg-saffron-600 text-white text-xs font-semibold 
                           rounded-lg hover:bg-saffron-500 transition-colors"
              >
                Stop
              </button>

              {/* Cancel */}
              <button
                onClick={cancel}
                className="px-2 py-1.5 text-text-muted text-xs hover:text-accent transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Recordings list */}
        {recordings.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">
                Recordings ({recordings.length})
              </p>
              {hasUndownloadedRecordings() && (
                <p className="text-[10px] text-warning">
                  Not yet downloaded — will be lost on exit
                </p>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {recordings.map((rec) => {
                const isDownloaded = downloadedIds.has(rec.id);
                return (
                  <div
                    key={rec.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isDownloaded
                        ? 'bg-surface-lighter/30 hover:bg-surface-lighter/50'
                        : 'bg-surface-lighter/50 hover:bg-surface-lighter'
                    }`}
                  >
                    {/* Play/Stop */}
                    <button
                      onClick={() => handlePlay(rec)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs
                                 transition-colors ${
                        playingId === rec.id
                          ? 'bg-saffron-600 text-white'
                          : 'bg-surface text-text-secondary hover:text-text-primary'
                      }`}
                      title={playingId === rec.id ? 'Stop' : 'Play'}
                    >
                      {playingId === rec.id ? '\u25A0' : '\u25B6'}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-text-primary truncate">{rec.name}</p>
                        {isDownloaded && (
                          <span className="text-active text-[10px]" title="Downloaded">
                            \u2713
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-muted">
                        {formatTime(rec.duration)}
                      </p>
                    </div>

                    {/* Download WebM */}
                    <button
                      onClick={() => downloadRecording(rec.id, 'webm')}
                      className="px-2 py-1 text-[10px] text-text-muted hover:text-saffron-400 
                                 transition-colors"
                      title="Download as WebM"
                    >
                      WebM
                    </button>

                    {/* Download WAV */}
                    <button
                      onClick={() => downloadRecording(rec.id, 'wav')}
                      className="px-2 py-1 text-[10px] text-text-muted hover:text-saffron-400 
                                 transition-colors"
                      title="Download as WAV"
                    >
                      WAV
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        if (confirm('Delete this recording?')) {
                          if (playingId === rec.id && audioRef.current) {
                            audioRef.current.pause();
                            setPlayingId(null);
                          }
                          deleteRecording(rec.id);
                        }
                      }}
                      className="text-text-muted/40 hover:text-accent text-xs transition-colors"
                      title="Delete"
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
