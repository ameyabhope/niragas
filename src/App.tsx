/**
 * Root App component.
 * Renders the app shell immediately and initializes audio on first user interaction.
 */

import { useEffect } from 'react';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { AppShell } from '@/components/layout/AppShell';

function App() {
  const { ready, initialize } = useAudioEngine();

  // Initialize audio on first user interaction (click, tap, or keypress)
  useEffect(() => {
    if (ready) return;

    const handleInteraction = () => {
      void initialize();
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
