/**
 * Presets panel: list, load, save, delete, favorite, import/export.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Preset } from '@/audio/types';
import { usePresetStore, type LoadOptions } from '@/store/preset-store';
import { usePitchStore } from '@/store/pitch-store';
import { useTanpuraStore } from '@/store/tanpura-store';
import { useTablaStore } from '@/store/tabla-store';
import { useMixerStore } from '@/store/mixer-store';
import { useEQStore } from '@/store/eq-store';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    (preset: Preset) => {
      setActivePresetId(preset.id);

      if (loadOptions.pitch) {
        const ps = usePitchStore.getState();
        ps.setPitch(preset.pitch.note, preset.pitch.octave, preset.pitch.cents);
        if (preset.pitch.a4Freq) {
          ps.setA4Freq(preset.pitch.a4Freq as 440 | 432);
        }
      }

      if (loadOptions.tanpura) {
        const ts = useTanpuraStore.getState();
        ts.setTanpuraConfig('tanpura1', preset.tanpura1);
        ts.setTanpuraConfig('tanpura2', preset.tanpura2);
      }

      if (loadOptions.tabla) {
        const tab = useTablaStore.getState();
        tab.setTaalId(preset.tabla.taalId);
        tab.setStyleId(preset.tabla.styleId);
        tab.setTempo(preset.tabla.tempo);
      }

      if (loadOptions.mixer) {
        const mix = useMixerStore.getState();
        for (const [id, ch] of Object.entries(preset.mixer)) {
          mix.setVolume(id as keyof typeof preset.mixer, ch.volume);
          mix.setPan(id as keyof typeof preset.mixer, ch.pan);
        }
        mix.setMasterVolume(0.8);
      }

      if (loadOptions.eq && preset.eq) {
        const eq = useEQStore.getState();
        preset.eq.bands.forEach((band, i) => {
          eq.setBandGain(i, band.gain);
        });
      }
    },
    [loadOptions, setActivePresetId]
  );

  // ── Save current state as preset ──

  const handleSave = useCallback(() => {
    if (!newPresetName.trim()) return;

    const pitch = usePitchStore.getState();
    const tanpura = useTanpuraStore.getState();
    const tabla = useTablaStore.getState();
    const mixer = useMixerStore.getState();
    const eq = useEQStore.getState();

    const now = Date.now();
    const preset: Preset = {
      id: `custom-${now}`,
      name: newPresetName.trim(),
      favorite: false,
      createdAt: now,
      updatedAt: now,
      pitch: { note: pitch.note, octave: pitch.octave, cents: pitch.cents, a4Freq: pitch.a4Freq },
      tanpura1: tanpura.tanpura1,
      tanpura2: tanpura.tanpura2,
      tabla: {
        taalId: tabla.taalId,
        styleId: tabla.styleId,
        tempo: tabla.tempo,
        enabled: tabla.playing,
      },
      surPeti: { enabled: false, volume: 0.75 },
      swarMandal: {
        enabled: false,
        strings: [],
        autoLoop: false,
        loopDuration: 8,
        volume: 0.6,
      },
      manjira: { enabled: false, volume: 0.5 },
      mixer: mixer.channels,
      eq: {
        enabled: eq.enabled,
        bands: eq.bands,
        presetName: eq.presetName,
      },
    };

    createPreset(preset);
    setNewPresetName('');
    setShowSaveDialog(false);
  }, [newPresetName, createPreset]);

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
        const text = await file.text();
        const count = await importFromJSON(text);
        alert(`Imported ${count} presets successfully.`);
      } catch {
        alert('Failed to import presets. Check file format.');
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
        <InfoTooltip text="112 factory raag presets plus custom presets. Each preset stores Sa pitch, tanpura tuning, taal, tempo, mixer, and EQ settings. Use 'Options' to choose which settings to load. Export/import presets as JSON." />
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-card p-4 flex flex-col gap-3">
        {/* Top controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* All / Favorites toggle */}
          <div className="flex bg-surface-lighter rounded-lg overflow-hidden">
            <button
              onClick={() => showFavoritesOnly && toggleShowFavorites()}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                !showFavoritesOnly
                  ? 'bg-saffron-600 text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => !showFavoritesOnly && toggleShowFavorites()}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                showFavoritesOnly
                  ? 'bg-saffron-600 text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Favorites
            </button>
          </div>

          {/* Save new */}
          <button
            onClick={() => setShowSaveDialog(!showSaveDialog)}
            className="px-3 py-1 bg-saffron-600 text-white text-xs rounded-lg font-semibold
                       hover:bg-saffron-500 transition-colors"
          >
            + Save Current
          </button>

          {/* Load options toggle */}
          <button
            onClick={() => setShowLoadOptions(!showLoadOptions)}
            className="px-2 py-1 bg-surface-lighter text-text-muted text-xs rounded-lg
                       hover:text-text-primary transition-colors"
          >
            Options
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Import/Export */}
          <button
            onClick={handleExport}
            className="px-2 py-1 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Export
          </button>
          <button
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
          <div className="flex gap-2 items-center bg-surface-lighter rounded-lg p-2">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 bg-surface text-text-primary text-sm rounded px-2 py-1
                         border border-white/10 focus:outline-none focus:ring-2 focus:ring-saffron-400"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={!newPresetName.trim()}
              className="px-3 py-1 bg-saffron-600 text-white text-xs rounded font-semibold
                         disabled:opacity-40 hover:bg-saffron-500 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-2 py-1 text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Load options */}
        {showLoadOptions && (
          <div className="flex flex-wrap gap-3 bg-surface-lighter rounded-lg p-2">
            {(Object.keys(loadOptions) as (keyof LoadOptions)[]).map((key) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loadOptions[key]}
                  onChange={(e) => setLoadOption(key, e.target.checked)}
                  className="w-3 h-3 accent-saffron-500"
                />
                <span className="text-xs text-text-secondary capitalize">{key}</span>
              </label>
            ))}
          </div>
        )}

        {/* Preset list */}
        {loading ? (
          <p className="text-xs text-text-muted py-4 text-center">Loading presets...</p>
        ) : filteredPresets.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-text-muted">
              {showFavoritesOnly ? 'No favorite presets.' : 'No presets found.'}
            </p>
            <button
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activePresetId === preset.id
                    ? 'bg-saffron-600/20 border border-saffron-500/30'
                    : 'hover:bg-surface-lighter border border-transparent'
                }`}
                onClick={() => applyPreset(preset)}
              >
                {/* Favorite star */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(preset.id);
                  }}
                  className={`text-sm ${
                    preset.favorite ? 'text-warning' : 'text-text-muted/30 hover:text-text-muted'
                  }`}
                >
                  {preset.favorite ? '\u2605' : '\u2606'}
                </button>

                {/* Preset info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{preset.name}</p>
                  <p className="text-[10px] text-text-muted truncate">
                    {preset.pitch.note}{preset.pitch.octave}
                    {' | '}T1:{preset.tanpura1.tuning}
                    {' '}T2:{preset.tanpura2.tuning}
                    {' | '}{preset.tabla.taalId} @ {preset.tabla.tempo}bpm
                  </p>
                </div>

                {/* Delete (only custom presets) */}
                {!preset.id.startsWith('factory-') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${preset.name}"?`)) {
                        deletePreset(preset.id);
                      }
                    }}
                    className="text-text-muted/40 hover:text-accent text-xs transition-colors"
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
