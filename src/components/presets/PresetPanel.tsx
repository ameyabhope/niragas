/**
 * Presets panel: list, load, save, delete, favorite, import/export.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Preset } from '@/audio/types';
import { usePresetStore, type LoadOptions } from '@/store/preset-store';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { applyPresetState, capturePreset } from '@/lib/preset-state';
import { MAX_PRESET_IMPORT_BYTES } from '@/lib/presets';
import { useAudioEngine } from '@/hooks/useAudioEngine';

export function PresetPanel() {
  const {
    presets,
    loading,
    showFavoritesOnly,
    loadOptions,
    activePresetId,
    loadPresets,
    loadFactoryPresets,
    createPreset,
    deletePreset,
    toggleFavorite,
    toggleShowFavorites,
    setLoadOption,
    setActivePresetId,
    exportAll,
    importFromJSON,
  } = usePresetStore();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [showLoadOptions, setShowLoadOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const applyRequestRef = useRef(0);
  const { initialize } = useAudioEngine();

  // Load presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Filtered presets
  const filteredPresets = showFavoritesOnly
    ? presets.filter((p) => p.favorite)
    : presets;

  // ── Apply preset to app state ──

  const applyPreset = useCallback(
    async (preset: Preset) => {
      const requestId = ++applyRequestRef.current;
      const startsPlayback =
        (loadOptions.tanpura && (preset.tanpura1.enabled || preset.tanpura2.enabled)) ||
        (loadOptions.tabla && preset.tabla.enabled) ||
        (loadOptions.surPeti && preset.surPeti.enabled) ||
        (loadOptions.swarMandal && preset.swarMandal.enabled);
      if (startsPlayback && !(await initialize())) return;
      if (requestId !== applyRequestRef.current) return;

      setActivePresetId(preset.id);
      applyPresetState(preset, loadOptions);
      setAnnouncement(`Loaded preset ${preset.name}.`);
    },
    [initialize, loadOptions, setActivePresetId]
  );

  // ── Save current state as preset ──

  const closeSaveDialog = useCallback(() => {
    setShowSaveDialog(false);
    window.requestAnimationFrame(() => saveButtonRef.current?.focus());
  }, []);

  const handleSave = useCallback(async () => {
    if (!newPresetName.trim()) return;

    const preset = capturePreset(newPresetName);

    try {
      setError(null);
      setSaving(true);
      await createPreset(preset);
      setNewPresetName('');
      closeSaveDialog();
      setAnnouncement(`Saved preset ${preset.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset.');
    } finally {
      setSaving(false);
    }
  }, [newPresetName, createPreset, closeSaveDialog]);

  // ── Export ──

  const handleExport = useCallback(async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `niragas-presets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportAll]);

  // ── Import ──

  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        if (file.size > MAX_PRESET_IMPORT_BYTES) {
          throw new Error('Preset file is larger than 2 MB');
        }
        const text = await file.text();
        const count = await importFromJSON(text);
        alert(`Imported ${count} presets successfully.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown import error';
        alert(`Failed to import presets: ${message}`);
      }

      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [importFromJSON]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Presets
        </h2>
        <InfoTooltip label="About presets" text="Factory raag presets plus custom presets. Each preset stores pitch, instruments, playback state, mixer, and EQ settings. Use Options to choose which sections to load. Imports are validated before anything is saved." />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-3">
        {error && <p className="text-xs text-accent" role="alert">{error}</p>}
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {/* Top controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* All / Favorites toggle */}
          <div className="flex bg-surface-lighter rounded-lg overflow-hidden" role="group" aria-label="Filter presets">
            <button
              type="button"
              onClick={() => showFavoritesOnly && toggleShowFavorites()}
              aria-pressed={!showFavoritesOnly}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                !showFavoritesOnly
                  ? 'bg-action text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => !showFavoritesOnly && toggleShowFavorites()}
              aria-pressed={showFavoritesOnly}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                showFavoritesOnly
                  ? 'bg-action text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Favorites
            </button>
          </div>

          {/* Save new */}
          <button
            ref={saveButtonRef}
            type="button"
            onClick={() => showSaveDialog ? closeSaveDialog() : setShowSaveDialog(true)}
            aria-expanded={showSaveDialog}
            aria-controls="save-preset-dialog"
            className="px-3 py-1 bg-action text-white text-xs rounded-lg font-semibold
                       hover:bg-saffron-800 transition-colors"
          >
            + Save Current
          </button>

          {/* Load options toggle */}
          <button
            type="button"
            onClick={() => setShowLoadOptions(!showLoadOptions)}
            aria-expanded={showLoadOptions}
            aria-controls="preset-load-options"
            className="px-2 py-1 bg-surface-lighter text-text-muted text-xs rounded-lg
                       hover:text-text-primary transition-colors"
          >
            Options
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Import/Export */}
          <button
            type="button"
            onClick={handleExport}
            className="px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {/* Save dialog */}
        {showSaveDialog && (
          <form
            id="save-preset-dialog"
            role="dialog"
            aria-labelledby="save-preset-title"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                closeSaveDialog();
              }
            }}
            className="flex gap-2 items-center bg-surface-lighter rounded-lg p-2"
          >
            <span id="save-preset-title" className="sr-only">Save current settings as a preset</span>
            <label htmlFor="preset-name" className="sr-only">Preset name</label>
            <input
              id="preset-name"
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 bg-surface text-text-primary text-sm rounded px-2 py-1
                         border border-white/10 focus:outline-none focus:ring-2 focus:ring-saffron-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newPresetName.trim() || saving}
              className="px-3 py-1 bg-action text-white text-xs rounded font-semibold
                         disabled:opacity-40 hover:bg-saffron-800 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={closeSaveDialog}
              className="px-2 py-1 text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Load options */}
        {showLoadOptions && (
          <div id="preset-load-options" className="flex flex-wrap gap-3 bg-surface-lighter rounded-lg p-2">
            {(Object.keys(loadOptions) as (keyof LoadOptions)[]).map((key) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loadOptions[key]}
                  onChange={(e) => setLoadOption(key, e.target.checked)}
                  className="w-3 h-3 accent-saffron-500"
                />
                <span className="text-xs text-text-secondary">
                  {key === 'surPeti' ? 'Sur-Peti' : key === 'swarMandal' ? 'Swar Mandal' : key[0].toUpperCase() + key.slice(1)}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Preset list */}
        {loading ? (
          <p className="text-xs text-text-muted py-4 text-center" role="status">Loading presets...</p>
        ) : filteredPresets.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-text-muted">
              {showFavoritesOnly ? 'No favorite presets.' : 'No presets found.'}
            </p>
            <button
              type="button"
              onClick={loadFactoryPresets}
              className="mt-2 text-xs text-saffron-400 hover:text-saffron-300 transition-colors"
            >
              Load factory presets
            </button>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto flex flex-col gap-1">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center gap-1 rounded-lg transition-colors ${
                  activePresetId === preset.id
                    ? 'bg-saffron-600/20 border border-saffron-500/30'
                    : 'hover:bg-surface-lighter border border-transparent'
                }`}
              >
                {/* Favorite star */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(preset.id)}
                  aria-label={`${preset.favorite ? 'Remove' : 'Add'} ${preset.name} ${preset.favorite ? 'from' : 'to'} favorites`}
                  aria-pressed={preset.favorite}
                  className={`w-11 h-11 shrink-0 text-sm ${
                    preset.favorite ? 'text-warning' : 'text-text-muted/30 hover:text-text-muted'
                  }`}
                >
                  {preset.favorite ? '\u2605' : '\u2606'}
                </button>

                {/* Preset info */}
                <button
                  type="button"
                  onClick={() => void applyPreset(preset)}
                  aria-current={activePresetId === preset.id ? 'true' : undefined}
                  className="flex-1 min-w-0 py-2 text-left"
                >
                  <p className="text-sm text-text-primary truncate">{preset.name}</p>
                  <p className="text-[10px] text-text-muted truncate">
                    {preset.pitch.note}{preset.pitch.octave}
                    {' | '}T1:{preset.tanpura1.tuning}
                    {' '}T2:{preset.tanpura2.tuning}
                    {' | '}{preset.tabla.taalId} @ {preset.tabla.tempo}bpm
                  </p>
                </button>

                {/* Delete (only custom presets) */}
                {!preset.id.startsWith('factory-') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete "${preset.name}"?`)) {
                        deletePreset(preset.id);
                      }
                    }}
                    aria-label={`Delete preset ${preset.name}`}
                    className="w-11 h-11 shrink-0 text-text-muted/40 hover:text-accent text-xs transition-colors"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
