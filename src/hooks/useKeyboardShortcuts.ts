/**
 * Global keyboard shortcuts for the app.
 */

import { useEffect } from 'react';
import { useTablaStore } from '@/store/tabla-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { usePitchStore } from '@/store/pitch-store';
import { useMixerStore } from '@/store/mixer-store';

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      const { togglePlaying, adjustTempo } = useTablaStore.getState();
      const { toggleTanpura } = useTanpuraStore.getState();
      const { noteUp, noteDown, adjustCents } = usePitchStore.getState();
      const { toggleMasterMute } = useMixerStore.getState();

      switch (e.code) {
        // Space: toggle tabla play/stop
        case 'Space':
          e.preventDefault();
          togglePlaying();
          break;

        // T: toggle tanpura 1
        case 'KeyT':
          if (e.shiftKey) {
            toggleTanpura('tanpura2');
          } else {
            toggleTanpura('tanpura1');
          }
          break;

        // Up/Down: tempo (uses adjustTempo for atomic updates)
        case 'ArrowUp':
          e.preventDefault();
          adjustTempo(e.shiftKey ? 10 : 1);
          break;

        case 'ArrowDown':
          e.preventDefault();
          adjustTempo(e.shiftKey ? -10 : -1);
          break;

        // Left/Right: pitch
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            adjustCents(-1);
          } else {
            noteDown();
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            adjustCents(1);
          } else {
            noteUp();
          }
          break;

        // M: master mute
        case 'KeyM':
          toggleMasterMute();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
