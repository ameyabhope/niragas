/**
 * Sur-Peti (Shruti Box) on/off control.
 * A simple toggle with a playing indicator.
 */

import { useEffect, useRef } from 'react';
import { useSurPetiStore } from '@/store/surpeti-store';
import { usePitchStore } from '@/store/pitch-store';
import {
  createSurPeti,
  startSurPeti,
  stopSurPeti,
  setSurPetiPitch,
} from '@/audio/surpeti';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function SurPetiControl() {
  const { enabled, toggle } = useSurPetiStore();
  const { note, octave, cents, a4Freq } = usePitchStore();
  const created = useRef(false);
  const prevEnabled = useRef(false);

  // Create on mount
  useEffect(() => {
    createSurPeti();
    created.current = true;
    return () => { created.current = false; };
  }, []);

  // Handle enable/disable
  useEffect(() => {
    if (!created.current) return;

    if (enabled && !prevEnabled.current) {
      startSurPeti(note, octave, cents);
    } else if (!enabled && prevEnabled.current) {
      stopSurPeti();
    }
    prevEnabled.current = enabled;
  }, [enabled, note, octave, cents]);

  // Follow pitch changes while playing (including A4 reference changes)
  useEffect(() => {
    if (!created.current || !enabled) return;
    setSurPetiPitch(note, octave, cents);
  }, [note, octave, cents, enabled, a4Freq]);

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        enabled
          ? 'border-saffron-500/40 bg-surface-card'
          : 'border-white/5 bg-surface-card/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Sur-Peti</h3>
            <p className="text-xs text-text-muted">Shruti Box Drone</p>
          </div>
          <InfoTooltip text="A shruti box (sur-peti) drone that plays a continuous pitch matching the current Sa. Useful as a simpler alternative to the tanpura for vocal practice. Toggle on/off to start/stop." align="left" />
        </div>

        <button
          onClick={toggle}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-active text-white'
              : 'bg-surface-lighter text-text-muted'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
          <span className="text-xs text-active">Droning</span>
        </div>
      )}
    </div>
  );
}
