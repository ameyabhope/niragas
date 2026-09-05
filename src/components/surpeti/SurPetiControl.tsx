/**
 * Sur-Peti (Shruti Box) on/off control.
 * A simple toggle with a playing indicator.
 */

import { useSurPetiStore } from '@/store/surpeti-store';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useAudioEngine } from '@/hooks/useAudioEngine';

export function SurPetiControl() {
  const { enabled, toggle } = useSurPetiStore();
  const { initialize } = useAudioEngine();

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
          <InfoTooltip label="About Sur-Peti" text="A shruti box (sur-peti) drone that plays a continuous pitch matching the current Sa. Useful as a simpler alternative to the tanpura for vocal practice. Toggle on/off to start/stop." align="left" />
        </div>

        <button
          type="button"
          onClick={() => {
            if (enabled) {
              toggle();
              return;
            }
            void initialize().then((ready) => {
              if (ready) toggle();
            });
          }}
          aria-label={`${enabled ? 'Turn off' : 'Turn on'} Sur-Peti`}
          aria-pressed={enabled}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            enabled
              ? 'bg-active-control text-white'
              : 'bg-surface-lighter text-text-muted'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {enabled && (
        <div className="mt-2 flex items-center gap-1.5" role="status">
          <span className="w-2 h-2 rounded-full bg-active animate-pulse" />
          <span className="text-xs text-active">Droning</span>
        </div>
      )}
    </div>
  );
}
