import { describe, expect, it } from 'vitest';
import {
  getKeyboardShortcutAction,
  isEditableShortcutTarget,
  isInteractiveShortcutTarget,
} from '@/lib/keyboard-shortcuts';

function keyEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    altKey: false,
    code: '',
    ctrlKey: false,
    defaultPrevented: false,
    isComposing: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    ...overrides,
  } as KeyboardEvent;
}

describe('keyboard shortcuts', () => {
  it('requires Alt for single-letter shortcuts', () => {
    expect(getKeyboardShortcutAction(keyEvent({ code: 'KeyT' }))).toBeNull();
    expect(getKeyboardShortcutAction(keyEvent({ code: 'KeyT', altKey: true }))).toEqual({
      type: 'toggle-tanpura',
      id: 'tanpura1',
    });
    expect(getKeyboardShortcutAction(keyEvent({ code: 'KeyT', altKey: true, shiftKey: true }))).toEqual({
      type: 'toggle-tanpura',
      id: 'tanpura2',
    });
    expect(getKeyboardShortcutAction(keyEvent({ code: 'KeyM', altKey: true }))).toEqual({
      type: 'toggle-master-mute',
    });
  });

  it('ignores repeated toggles and browser or assistive-technology modifiers', () => {
    expect(getKeyboardShortcutAction(keyEvent({ code: 'Space', repeat: true }))).toBeNull();
    expect(getKeyboardShortcutAction(keyEvent({ code: 'ArrowUp', metaKey: true }))).toBeNull();
    expect(getKeyboardShortcutAction(keyEvent({ code: 'ArrowDown', ctrlKey: true }))).toBeNull();
    expect(getKeyboardShortcutAction(keyEvent({ code: 'ArrowRight', altKey: true }))).toBeNull();
  });

  it('maps tempo and pitch adjustments with Shift variants', () => {
    expect(getKeyboardShortcutAction(keyEvent({ code: 'ArrowUp', shiftKey: true }))).toEqual({
      type: 'adjust-tempo',
      delta: 10,
    });
    expect(getKeyboardShortcutAction(keyEvent({ code: 'ArrowLeft' }))).toEqual({
      type: 'adjust-note',
      delta: -1,
    });
    expect(getKeyboardShortcutAction(keyEvent({ code: 'ArrowRight', shiftKey: true }))).toEqual({
      type: 'adjust-cents',
      delta: 1,
    });
  });

  it('recognizes native and custom interactive targets', () => {
    const interactiveTarget = {
      closest: (selector: string) => selector.split(',').includes('button') ? {} : null,
    } as unknown as EventTarget;
    const pageTarget = {
      closest: () => null,
    } as unknown as EventTarget;

    expect(isInteractiveShortcutTarget(interactiveTarget)).toBe(true);
    expect(isEditableShortcutTarget(interactiveTarget)).toBe(false);
    expect(isInteractiveShortcutTarget(pageTarget)).toBe(false);
  });

  it('recognizes editable targets separately from other controls', () => {
    const inputTarget = {
      closest: (selector: string) => selector.split(',').includes('input') ? {} : null,
    } as unknown as EventTarget;

    expect(isInteractiveShortcutTarget(inputTarget)).toBe(true);
    expect(isEditableShortcutTarget(inputTarget)).toBe(true);
  });
});
