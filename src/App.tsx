/**
 * Root App component.
 * Renders the app shell immediately and initializes audio on first user interaction.
 */

import { useEffect, useRef } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { AppShell } from '@/components/layout/AppShell';

function App() {
  const { ready, initialize } = useAudioEngine();
  const initAttempted = useRef(false);

  // Initialize audio on first user interaction (click, tap, or keypress)
  useEffect(() => {
    if (ready || initAttempted.current) return;

    const handleInteraction = () => {
      if (initAttempted.current) return;
      initAttempted.current = true;
      initialize();
      // Clean up listeners after first interaction
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [ready, initialize]);

  return <AppShell />;
}

export default App;
