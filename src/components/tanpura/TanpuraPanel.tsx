/**
 * Panel containing controls for both tanpuras.
 */

import { useTanpuraStore } from '@/store/tanpura-store';
import { TanpuraControl } from './TanpuraControl';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export function TanpuraPanel() {
  const {
    tanpura1,
    tanpura2,
    toggleTanpura,
    setTuning,
    setEQ,
    setFinePitch,
    setSpeed,
  } = useTanpuraStore();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Tanpura
        </h2>
        <InfoTooltip text="An electronic tanpura providing a continuous drone. Two independent tanpuras with Pa/Ma/Ni tuning, EQ variants, fine pitch, and speed control. Toggle each on/off independently." />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TanpuraControl
          id="tanpura1"
          label="Tanpura 1"
          config={tanpura1}
          onToggle={() => toggleTanpura('tanpura1')}
          onSetTuning={(t) => setTuning('tanpura1', t)}
          onSetEQ={(eq) => setEQ('tanpura1', eq)}
          onSetFinePitch={(c) => setFinePitch('tanpura1', c)}
          onSetSpeed={(s) => setSpeed('tanpura1', s)}
        />

        <TanpuraControl
          id="tanpura2"
          label="Tanpura 2"
          config={tanpura2}
          onToggle={() => toggleTanpura('tanpura2')}
          onSetTuning={(t) => setTuning('tanpura2', t)}
          onSetEQ={(eq) => setEQ('tanpura2', eq)}
          onSetFinePitch={(c) => setFinePitch('tanpura2', c)}
          onSetSpeed={(s) => setSpeed('tanpura2', s)}
        />
      </div>
    </div>
  );
}
