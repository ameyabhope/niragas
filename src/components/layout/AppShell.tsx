/**
 * Main app shell: header + content panels.
 * Desktop: side-by-side layout (mixer left, controls right).
 * Mobile: tabbed layout.
 */

import { useState } from 'react';
import { Header } from './Header';
import { PitchControl } from '@/components/pitch/PitchControl';
import { MixerPanel } from '@/components/mixer/MixerPanel';
import { TanpuraPanel } from '@/components/tanpura/TanpuraPanel';
import { TablaPanel } from '@/components/tabla/TablaPanel';
import { SurPetiControl } from '@/components/surpeti/SurPetiControl';

type Tab = 'mixer' | 'controls' | 'presets' | 'swarmandal' | 'more';

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('controls');

  return (
    <div className="flex flex-col h-dvh bg-surface">
      <Header />

      {/* Desktop layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left panel: Mixer */}
        <aside className="w-80 border-r border-white/5 overflow-y-auto p-4 flex flex-col gap-6">
          <PitchControl />
          <MixerPanel />
        </aside>

        {/* Right panel: Controls */}
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <TanpuraPanel />
          <SurPetiControl />
          <TablaPanel />

          {/* Placeholder for future panels */}
          <div className="rounded-xl border border-white/5 bg-surface-card p-4">
            <h2 className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-2">
              Swar Mandal
            </h2>
            <p className="text-text-muted text-sm">
              Swar Mandal controls will be added in the next phase.
            </p>
          </div>
        </main>
      </div>

      {/* Mobile layout: tabbed */}
      <div className="flex flex-col flex-1 md:hidden">
        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {activeTab === 'mixer' && (
            <>
              <PitchControl />
              <MixerPanel />
            </>
          )}
          {activeTab === 'controls' && (
            <>
              <TanpuraPanel />
              <SurPetiControl />
              <TablaPanel />
            </>
          )}
          {activeTab === 'presets' && (
            <p className="text-text-muted text-sm">Presets coming in Phase 12.</p>
          )}
          {activeTab === 'swarmandal' && (
            <p className="text-text-muted text-sm">Swar Mandal coming in Phase 5.</p>
          )}
          {activeTab === 'more' && (
            <p className="text-text-muted text-sm">Tuner, Recorder, Settings coming soon.</p>
          )}
        </main>

        {/* Tab bar */}
        <nav className="flex border-t border-white/5 bg-surface-light">
          {(
            [
              { id: 'mixer', label: 'Mixer' },
              { id: 'controls', label: 'Controls' },
              { id: 'presets', label: 'Presets' },
              { id: 'swarmandal', label: 'Swar Mdl' },
              { id: 'more', label: 'More' },
            ] as { id: Tab; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'text-saffron-400 border-t-2 border-saffron-400 -mt-px'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
