/**
 * App header: logo, title, theme toggle, and pitch display.
 */

import { PitchDisplay } from '@/components/pitch/PitchDisplay';
import { useThemeStore } from '@/store/theme-store';

export function Header() {
  const { theme, toggleTheme } = useThemeStore();

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
