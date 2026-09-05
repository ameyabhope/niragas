/**
 * Root App component.
 * Renders the app shell and reports shared audio-engine status.
 */

import { useAudioEngine } from '@/hooks/useAudioEngine';
import { AppShell } from '@/components/layout/AppShell';

function App() {
  const { loading, error } = useAudioEngine();

  return (
    <>
      <AppShell />
      {loading && (
        <p className="fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-surface-card px-4 py-2 text-sm text-text-primary shadow-lg" role="status">
          Starting audio...
        </p>
      )}
      {error && (
        <p className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 rounded-lg bg-accent-control px-4 py-2 text-sm text-white shadow-lg" role="alert">
          Audio could not start: {error}. Try the playback control again.
        </p>
      )}
    </>
  );
}

export default App;
