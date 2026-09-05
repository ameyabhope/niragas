/**
 * A small info button that shows a tooltip on hover, focus, or tap.
 *
 * Tooltip opens to the left by default. Pass align="left" to open rightward
 * (useful for items in a narrow left sidebar).
 */

import { useEffect, useId, useRef, useState } from 'react';

interface InfoTooltipProps {
  label: string;
  text: string;
  /** Which side the tooltip aligns to. "right" = right-aligned (default), "left" = left-aligned */
  align?: 'left' | 'right';
}

export function InfoTooltip({ label, text, align = 'right' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        if (document.activeElement !== buttonRef.current) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded-full
                   text-text-muted hover:text-text-secondary hover:bg-surface-lighter
                   transition-colors text-xs leading-none cursor-help select-none"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onFocus={(event) => {
          if (event.currentTarget.matches(':focus-visible')) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        i
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className={`absolute top-12 md:top-8 z-50 w-64 rounded-lg border border-white/10
                   bg-surface-card p-3 text-xs text-text-secondary leading-relaxed shadow-lg
                   transition-all duration-150 pointer-events-none
                   ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}
                   ${align === 'left' ? 'left-0' : 'right-0'}`}
      >
        {text}
      </div>
    </div>
  );
}
