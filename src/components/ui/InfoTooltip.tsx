/**
 * A small info icon that shows a tooltip/popover with a description.
 * Click to toggle, click outside or press Escape to dismiss.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 flex items-center justify-center rounded-full
                   text-text-muted hover:text-text-secondary hover:bg-surface-lighter
                   transition-colors text-xs leading-none"
        aria-label="Info"
        title="Info"
      >
        i
      </button>
      {open && (
        <div
          className="absolute right-0 top-7 z-50 w-64 rounded-lg border border-white/10
                     bg-surface-card p-3 text-xs text-text-secondary leading-relaxed shadow-lg"
        >
          {text}
        </div>
      )}
    </div>
  );
}
