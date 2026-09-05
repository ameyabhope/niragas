/**
 * Main app shell: header + content panels.
 * Desktop: side-by-side layout (mixer left, controls right).
 * Mobile: tabbed layout.
 */

import { useState } from 'react';
import { Header } from './Header';
import { PitchControl } from '@/components/pitch/PitchControl';
import { MixerPanel } from '@/components/mixer/MixerPanel';
import { EQPanel } from '@/components/mixer/EQPanel';
import { TanpuraPanel } from '@/components/tanpura/TanpuraPanel';
import { TablaPanel } from '@/components/tabla/TablaPanel';
import { SurPetiControl } from '@/components/surpeti/SurPetiControl';
import { SwarMandalPanel } from '@/components/swarmandal/SwarMandalPanel';
import { TunerPanel } from '@/components/tuner/TunerPanel';
import { PresetPanel } from '@/components/presets/PresetPanel';
import { RecorderPanel } from '@/components/recorder/RecorderPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type Tab = 'mixer' | 'controls' | 'presets' | 'swarmandal' | 'more';

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('controls');
  const [viewAnnouncement, setViewAnnouncement] = useState('');

  const shortcutAnnouncement = useKeyboardShortcuts();

  const selectTab = (id: Tab, label: string) => {
    setActiveTab(id);
    setViewAnnouncement(`${label} view selected.`);
  };

  return (
    <div className="flex flex-col h-dvh bg-surface">
      <Header />

      {/* One component tree serves both layouts so audio-adjacent panels never mount twice. */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        <aside
          id="panel-mixer"
          aria-label="Mixer"
          className={`${activeTab === 'mixer' ? 'flex flex-1' : 'hidden'} md:flex md:flex-none md:w-80 border-r border-white/5 overflow-y-auto p-4 flex-col gap-6`}
        >
          <PitchControl />
          <MixerPanel />
          <EQPanel />
        </aside>

        <main className={`${activeTab === 'mixer' ? 'hidden' : 'block'} md:block flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6`}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <section
              id="panel-controls"
              aria-label="Instrument controls"
              className={`${activeTab === 'controls' ? 'contents' : 'hidden'} md:contents`}
            >
              <div className="flex flex-col gap-6">
                <TanpuraPanel />
                <SurPetiControl />
              </div>
              <div className="flex flex-col gap-6">
                <TablaPanel />
              </div>
            </section>
            <section id="panel-presets" aria-label="Presets" className={`${activeTab === 'presets' ? 'block' : 'hidden'} md:block`}>
              <PresetPanel />
            </section>
            <section id="panel-swarmandal" aria-label="Swar Mandal" className={`${activeTab === 'swarmandal' ? 'block' : 'hidden'} md:block`}>
              <SwarMandalPanel />
            </section>
            <section id="panel-more" aria-label="Tuner and recorder" className={`${activeTab === 'more' ? 'contents' : 'hidden'} md:contents`}>
              <div><TunerPanel /></div>
              <div><RecorderPanel /></div>
            </section>
          </div>
          <footer className="mt-8 text-center">
            <a
              href="/SAMPLE-CREDITS.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-xs text-text-muted underline underline-offset-4 hover:text-text-primary"
            >
              Audio sample credits and licenses
            </a>
          </footer>
        </main>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{shortcutAnnouncement}</p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{viewAnnouncement}</p>

      <nav aria-label="Mobile sections" className="flex shrink-0 md:hidden border-t border-white/5 bg-surface-light pb-[env(safe-area-inset-bottom)]">
          {(
            [
              { id: 'mixer', label: 'Mixer' },
              { id: 'controls', label: 'Controls' },
              { id: 'presets', label: 'Presets' },
              { id: 'swarmandal', label: 'Swar Mandal', shortLabel: 'Swar Mdl' },
              { id: 'more', label: 'More' },
            ] as { id: Tab; label: string; shortLabel?: string }[]
          ).map(({ id, label, shortLabel }) => (
            <button
              key={id}
              id={`tab-${id}`}
              onClick={() => selectTab(id, label)}
              aria-controls={`panel-${id}`}
              aria-label={label}
              aria-pressed={activeTab === id}
              className={`flex-1 min-h-11 py-3 text-xs font-medium transition-colors ${
                activeTab === id
                  ? 'text-saffron-400 border-t-2 border-saffron-400 -mt-px'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {shortLabel ?? label}
            </button>
          ))}
      </nav>
    </div>
  );
}
