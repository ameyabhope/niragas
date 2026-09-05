export type KeyboardShortcutAction =
  | { type: 'toggle-tabla' }
  | { type: 'toggle-tanpura'; id: 'tanpura1' | 'tanpura2' }
  | { type: 'adjust-tempo'; delta: number }
  | { type: 'adjust-note'; delta: -1 | 1 }
  | { type: 'adjust-cents'; delta: -1 | 1 }
  | { type: 'toggle-master-mute' };

type ShortcutEvent = Pick<
  KeyboardEvent,
  | 'altKey'
  | 'code'
  | 'ctrlKey'
  | 'defaultPrevented'
  | 'isComposing'
  | 'metaKey'
  | 'repeat'
  | 'shiftKey'
>;

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="switch"]',
  '[role="tab"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const EDITABLE_SELECTOR = [
  'input',
  'select',
  'textarea',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="textbox"]',
].join(',');

function closestMatches(target: EventTarget | null, selector: string): boolean {
  const candidate = target as { closest?: (selectors: string) => unknown } | null;
  return typeof candidate?.closest === 'function' && Boolean(candidate.closest(selector));
}

export function isInteractiveShortcutTarget(target: EventTarget | null): boolean {
  return closestMatches(target, INTERACTIVE_SELECTOR);
}

export function isEditableShortcutTarget(target: EventTarget | null): boolean {
  return closestMatches(target, EDITABLE_SELECTOR);
}

export function getKeyboardShortcutAction(event: ShortcutEvent): KeyboardShortcutAction | null {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey) return null;

  switch (event.code) {
    case 'Space':
      return !event.altKey && !event.shiftKey && !event.repeat ? { type: 'toggle-tabla' } : null;
    case 'KeyT':
      return event.altKey && !event.repeat
        ? { type: 'toggle-tanpura', id: event.shiftKey ? 'tanpura2' : 'tanpura1' }
        : null;
    case 'KeyM':
      return event.altKey && !event.shiftKey && !event.repeat
        ? { type: 'toggle-master-mute' }
        : null;
    case 'ArrowUp':
      return !event.altKey
        ? { type: 'adjust-tempo', delta: event.shiftKey ? 10 : 1 }
        : null;
    case 'ArrowDown':
      return !event.altKey
        ? { type: 'adjust-tempo', delta: event.shiftKey ? -10 : -1 }
        : null;
    case 'ArrowLeft':
      return !event.altKey
        ? event.shiftKey
          ? { type: 'adjust-cents', delta: -1 }
          : { type: 'adjust-note', delta: -1 }
        : null;
    case 'ArrowRight':
      return !event.altKey
        ? event.shiftKey
          ? { type: 'adjust-cents', delta: 1 }
          : { type: 'adjust-note', delta: 1 }
        : null;
    default:
      return null;
  }
}
