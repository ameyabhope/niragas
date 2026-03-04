/**
 * App header: logo, title, and pitch display.
 */

import { PitchDisplay } from '@/components/pitch/PitchDisplay';

export function Header() {
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

      <PitchDisplay />
    </header>
  );
}
