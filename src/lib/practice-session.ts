import { initialize } from '@/hooks/useAudioEngine';
import { createSessionControls } from './session-controls';

export const practiceSession = createSessionControls(initialize);
