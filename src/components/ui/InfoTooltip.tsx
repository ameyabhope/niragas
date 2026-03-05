/**
 * A small info icon that shows a tooltip on hover.
 * On touch devices, tap to toggle.
 */

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <div className="relative inline-flex group">
      <span
        className="w-5 h-5 flex items-center justify-center rounded-full
                   text-text-muted hover:text-text-secondary hover:bg-surface-lighter
                   transition-colors text-xs leading-none cursor-help select-none"
        aria-label="Info"
        tabIndex={0}
      >
        i
      </span>
      <div
        className="absolute right-0 top-7 z-50 w-64 rounded-lg border border-white/10
                   bg-surface-card p-3 text-xs text-text-secondary leading-relaxed shadow-lg
                   opacity-0 invisible group-hover:opacity-100 group-hover:visible
                   group-focus-within:opacity-100 group-focus-within:visible
                   transition-all duration-150 pointer-events-none group-hover:pointer-events-auto"
      >
        {text}
      </div>
    </div>
  );
}
