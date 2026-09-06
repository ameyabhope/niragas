/**
 * A small info button that shows a tooltip on hover, focus, or tap.
 *
 * Tooltip opens to the left by default. Pass align="left" to open rightward
 * (useful for items in a narrow left sidebar).
 */

import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const button = buttonRef.current;
      const tooltip = tooltipRef.current;
      if (!button || !tooltip) return;
      const rect = button.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      tooltip.style.maxWidth = `${Math.max(0, width - 16)}px`;
      tooltip.style.maxHeight = `${Math.max(0, height - 16)}px`;
      const box = tooltip.getBoundingClientRect();
      const x = align === 'left' ? rect.left : rect.right - box.width;
      const y = rect.bottom + 8 + box.height <= top + height - 8 ? rect.bottom + 8 : rect.top - box.height - 8;
      tooltip.style.left = `${Math.max(left + 8, Math.min(x, left + width - box.width - 8))}px`;
      tooltip.style.top = `${Math.max(top + 8, Math.min(y, top + height - box.height - 8))}px`;
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open, align, text]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !tooltipRef.current?.contains(event.target as Node)) setOpen(false);
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
        aria-describedby={open ? tooltipId : undefined}
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
      {open && createPortal(<div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className="fixed z-50 w-64 overflow-y-auto break-words rounded-lg border border-white/10
                   bg-surface-card p-3 text-xs text-text-secondary leading-relaxed shadow-lg
                    "
      >
        {text}
      </div>, document.body)}
    </div>
  );
}
