/**
 * Tuner panel: displays app pitch vs detected mic pitch.
 * Allows capturing the mic pitch as the new Sa.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePitchStore } from '@/store/pitch-store';
import type { NoteName } from '@/audio/types';
import { noteToFreq, noteToSwar } from '@/lib/notes';
import {
  initTuner,
  startTuner,
  stopTuner,
  setTunerCallback,
  isTunerRunning,
} from '@/audio/tuner';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function TunerPanel() {
  const { note: appNote, octave: appOctave, cents: appCents, a4Freq: _a4Freq, setPitch } = usePitchStore();
  // _a4Freq is destructured to trigger re-render when A4 reference changes
  // (noteToFreq reads the updated module-level a4Freq internally)
  void _a4Freq;

  const [tunerActive, setTunerActive] = useState(false);
  const [micNote, setMicNote] = useState<NoteName | null>(null);
  const [micOctave, setMicOctave] = useState(0);
  const [micCents, setMicCents] = useState(0);
  const [micFreq, setMicFreq] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const initRef = useRef(false);

  const appFreq = noteToFreq(appNote, appOctave, appCents);

  // Cents offset from the ideal frequency of the detected note (chromatic tuner)
  // micCents is already this value from freqToNote() in the tuner engine
  const noteOffsetCents = micCents;

  // Ideal frequency of the detected note (what it should be at current A4 ref)
  const idealMicFreq = micNote ? noteToFreq(micNote, micOctave, 0) : 0;

  // Interval offset from Sa in semitones (for reference)
  const offsetFromSaCents =
    micFreq > 0 ? Math.round(1200 * Math.log2(micFreq / appFreq)) : 0;

  const handleToggle = useCallback(async () => {
    if (tunerActive) {
      stopTuner();
      setTunerActive(false);
      return;
    }

    try {
      setError(null);
      if (!initRef.current) {
        await initTuner();
        initRef.current = true;
      }

      setTunerCallback((freq, note, octave, cents, clar) => {
        setMicFreq(freq);
        setMicNote(note);
        setMicOctave(octave);
        setMicCents(cents);
        setClarity(clar);
      });

      startTuner();
      setTunerActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
    }
  }, [tunerActive]);

  // Capture: set app pitch to detected mic pitch
  const handleCapture = useCallback(() => {
    if (!micNote) return;
    setPitch(micNote, micOctave, micCents);
  }, [micNote, micOctave, micCents, setPitch]);

  // Octave shift the captured pitch
  const handleOctaveShift = useCallback(
    (delta: number) => {
      if (!micNote) return;
      setPitch(micNote, Math.max(2, Math.min(4, micOctave + delta)), micCents);
    },
    [micNote, micOctave, micCents, setPitch]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTunerRunning()) {
        stopTuner();
      }
    };
  }, []);

  // Color for note accuracy indicator
  const noteAccuracyColor =
    Math.abs(noteOffsetCents) <= 5
      ? 'text-tune-center'
      : noteOffsetCents < 0
        ? 'text-tune-flat'
        : 'text-tune-sharp';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Tuner
        </h2>
        <InfoTooltip text="Uses your microphone to detect pitch in real-time. Compares your voice/instrument to the current Sa and shows the offset in cents. Use 'Capture as Sa' to set your detected pitch as the new reference." align="left" />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-4">
        {/* Toggle button */}
        <button
          onClick={handleToggle}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            tunerActive
              ? 'bg-accent text-white hover:bg-accent/80'
              : 'bg-saffron-600 text-white hover:bg-saffron-500'
          }`}
        >
          {tunerActive ? 'Stop Tuner' : 'Start Tuner'}
        </button>

        {error && (
          <p className="text-xs text-accent">{error}</p>
        )}

        {/* Pitch comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* App pitch */}
          <div className="text-center">
            <p className="text-xs text-text-muted mb-1">App (Sa)</p>
            <p className="text-3xl font-bold text-text-primary">{appNote}</p>
            <p className="text-sm text-saffron-400 font-semibold">Sa</p>
            <p className="text-xs text-text-muted">
              {appOctave} {appCents !== 0 ? `(${appCents > 0 ? '+' : ''}${appCents}c)` : ''}
            </p>
            <p className="text-xs text-text-muted font-mono">{appFreq.toFixed(1)} Hz</p>
          </div>

          {/* Mic pitch */}
          <div className="text-center">
            <p className="text-xs text-text-muted mb-1">Microphone</p>
            {tunerActive && micNote ? (
              <>
                <p className="text-3xl font-bold text-saffron-400">{micNote}</p>
                <p className="text-sm text-saffron-300 font-semibold">
                  {noteToSwar(micNote, appNote)}
                </p>
                <p className="text-xs text-text-muted font-mono">{micFreq.toFixed(1)} Hz</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-text-muted">--</p>
                <p className="text-xs text-text-muted">
                  {tunerActive ? 'Listening...' : 'Not active'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Note accuracy — cents off from ideal frequency of detected note */}
        {tunerActive && micNote && (
          <div className="text-center">
            <p className="text-xs text-text-muted mb-1">
              Accuracy ({noteToSwar(micNote, appNote)} = {micNote}{micOctave} ideal {idealMicFreq.toFixed(1)} Hz)
            </p>
            <p className={`text-2xl font-bold font-mono ${noteAccuracyColor}`}>
              {noteOffsetCents > 0 ? '+' : ''}{noteOffsetCents} cents
            </p>
            {/* Visual bar */}
            <div className="relative h-3 bg-surface-lighter rounded-full mt-2 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-text-muted"
                style={{ left: '50%' }}
              />
              <div
                className={`absolute top-0 bottom-0 w-2 rounded-full transition-all duration-100 ${
                  Math.abs(noteOffsetCents) <= 5
                    ? 'bg-tune-center'
                    : noteOffsetCents < 0
                      ? 'bg-tune-flat'
                      : 'bg-tune-sharp'
                }`}
                style={{
                  left: `${Math.max(5, Math.min(95, 50 + noteOffsetCents))}%`,
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-text-muted">
                Clarity: {(clarity * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] text-text-muted">
                From Sa: {offsetFromSaCents > 0 ? '+' : ''}{offsetFromSaCents}c
              </p>
            </div>
          </div>
        )}

        {/* Capture + Octave buttons */}
        {tunerActive && micNote && (
          <div className="flex gap-2">
            <button
              onClick={() => handleOctaveShift(-1)}
              className="px-3 py-2 bg-surface-lighter text-text-secondary text-xs rounded-lg
                         hover:bg-surface-lighter/80 transition-colors"
            >
              Oct -
            </button>
            <button
              onClick={handleCapture}
              className="flex-1 py-2 bg-saffron-600 text-white text-sm font-semibold rounded-lg
                         hover:bg-saffron-500 transition-colors"
            >
              Capture as Sa
            </button>
            <button
              onClick={() => handleOctaveShift(1)}
              className="px-3 py-2 bg-surface-lighter text-text-secondary text-xs rounded-lg
                         hover:bg-surface-lighter/80 transition-colors"
            >
              Oct +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
