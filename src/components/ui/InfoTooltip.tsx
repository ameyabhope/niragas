/**
 * A small info icon that shows a tooltip on hover.
 * On touch devices, focus (tap) to show.
 *
 * Tooltip opens to the left by default. Pass align="left" to open rightward
 * (useful for items in a narrow left sidebar).
 */

interface InfoTooltipProps {
  text: string;
  /** Which side the tooltip aligns to. "right" = right-aligned (default), "left" = left-aligned */
  align?: 'left' | 'right';
}

export function InfoTooltip({ text, align = 'right' }: InfoTooltipProps) {
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
        className={`absolute top-7 z-50 w-64 rounded-lg border border-white/10
                   bg-surface-card p-3 text-xs text-text-secondary leading-relaxed shadow-lg
                   opacity-0 invisible group-hover:opacity-100 group-hover:visible
                   group-focus-within:opacity-100 group-focus-within:visible
                   transition-all duration-150 pointer-events-none group-hover:pointer-events-auto
                   ${align === 'left' ? 'left-0' : 'right-0'}`}
      >
        {text}
      </div>
    </div>
  );
}
