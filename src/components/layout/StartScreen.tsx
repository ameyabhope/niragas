/**
 * Start screen shown before the audio engine is initialized.
 * Web Audio API requires a user gesture to start -- this provides that gesture.
 */

interface StartScreenProps {
  onStart: () => void;
  loading: boolean;
  error: string | null;
}

export function StartScreen({ onStart, loading, error }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-surface px-4">
      <div className="text-center max-w-md">
        {/* Title */}
        <h1 className="text-5xl font-bold text-saffron-400 mb-2 tracking-tight">
          Niragas
        </h1>
        <p className="text-text-secondary text-lg mb-2">
          Indian Classical Music Practice Companion
        </p>
        <p className="text-text-muted text-sm mb-10">
          Tabla &middot; Tanpura &middot; Sur-Peti &middot; Swar Mandal &middot; Manjira
        </p>

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={loading}
          className="px-10 py-4 bg-saffron-600 hover:bg-saffron-500 disabled:bg-saffron-800
                     text-white text-lg font-semibold rounded-xl
                     transition-colors duration-200 shadow-lg shadow-saffron-900/30
                     focus:outline-none focus:ring-2 focus:ring-saffron-400 focus:ring-offset-2
                     focus:ring-offset-surface"
        >
          {loading ? 'Starting...' : 'Tap to Begin'}
        </button>

        {error && (
          <p className="mt-4 text-accent text-sm">{error}</p>
        )}

        <p className="mt-8 text-text-muted text-xs">
          Audio requires a user interaction to start.
          <br />
          For best results, use headphones or external speakers.
        </p>
      </div>
    </div>
  );
}
