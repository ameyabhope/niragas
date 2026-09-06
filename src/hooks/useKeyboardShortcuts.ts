/**
 * Global keyboard shortcuts for the app.
 */

import { useEffect, useState } from 'react';
import { usePitchStore } from '@/store/pitch-store';
import { useMixerStore } from '@/store/mixer-store';
import { useTablaStore } from '@/store/tabla-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { practiceSession } from '@/lib/practice-session';
import {
  getKeyboardShortcutAction,
  isEditableShortcutTarget,
  isInteractiveShortcutTarget,
} from '@/lib/keyboard-shortcuts';

export function useKeyboardShortcuts() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    let active = true;

    function announce(message: string) {
      if (active) setAnnouncement(message);
    }

    async function handleKeyDown(e: KeyboardEvent) {
      const action = getKeyboardShortcutAction(e);
      if (!action) return;
      if (isEditableShortcutTarget(e.target)) return;
      if (
        isInteractiveShortcutTarget(e.target) &&
        action.type !== 'toggle-tanpura' &&
        action.type !== 'toggle-master-mute'
      ) {
        return;
      }
      e.preventDefault();

      switch (action.type) {
        case 'toggle-tabla': {
          await practiceSession.toggleTabla();
          announce(`Tabla ${useTablaStore.getState().enabled ? 'enabled' : 'disabled'}.`);
          break;
        }
        case 'toggle-tanpura': {
          practiceSession.toggleInstrument(action.id);
          const enabled = useTanpuraStore.getState()[action.id].enabled;
          announce(`Tanpura ${action.id === 'tanpura1' ? '1' : '2'} ${enabled ? 'enabled' : 'disabled'}.`);
          break;
        }
        case 'adjust-tempo': {
          useTablaStore.getState().adjustTempo(action.delta);
          announce(`Tempo ${useTablaStore.getState().tempo} BPM.`);
          break;
        }
        case 'adjust-note': {
          const pitch = usePitchStore.getState();
          if (action.delta < 0) pitch.noteDown();
          else pitch.noteUp();
          const nextPitch = usePitchStore.getState();
          announce(`Sa ${nextPitch.note}${nextPitch.octave}.`);
          break;
        }
        case 'adjust-cents': {
          usePitchStore.getState().adjustCents(action.delta);
          announce(`Sa fine tuning ${usePitchStore.getState().cents} cents.`);
          break;
        }
        case 'toggle-master-mute': {
          useMixerStore.getState().toggleMasterMute();
          announce(`Master ${useMixerStore.getState().masterMuted ? 'muted' : 'unmuted'}.`);
          break;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      active = false;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return announcement;
}
