/**
 * Panel containing controls for both tanpuras.
 */

import { useTanpuraStore } from '@/store/tanpura-store';
import { TanpuraControl } from './TanpuraControl';

export function TanpuraPanel() {
  const {
    tanpura1,
    tanpura2,
    toggleTanpura,
    setFirstString,
    setCycleSpeed,
  } = useTanpuraStore();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
        Tanpura
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TanpuraControl
          id="tanpura1"
          label="Tanpura 1"
          config={tanpura1}
          onToggle={() => toggleTanpura('tanpura1')}
          onSetFirstString={(note) => setFirstString('tanpura1', note)}
          onSetCycleSpeed={(speed) => setCycleSpeed('tanpura1', speed)}
        />

        <TanpuraControl
          id="tanpura2"
          label="Tanpura 2"
          config={tanpura2}
          onToggle={() => toggleTanpura('tanpura2')}
          onSetFirstString={(note) => setFirstString('tanpura2', note)}
          onSetCycleSpeed={(speed) => setCycleSpeed('tanpura2', speed)}
        />
      </div>
    </div>
  );
}
