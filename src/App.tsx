/**
 * Root App component.
 * Shows the start screen until the audio engine is initialized,
 * then shows the main app shell.
 */

import { useAudioEngine } from '@/hooks/useAudioEngine';
import { StartScreen } from '@/components/layout/StartScreen';
import { AppShell } from '@/components/layout/AppShell';

function App() {
  const { ready, loading, error, initialize } = useAudioEngine();

  if (!ready) {
    return (
      <StartScreen
        onStart={initialize}
        loading={loading}
        error={error}
      />
    );
  }

  return <AppShell />;
}

export default App;
