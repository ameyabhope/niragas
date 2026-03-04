# Niragas - Indian Classical Music Practice Companion

A web application replicating the full feature set of iTabla Pro: a realistic electronic
tabla, tanpura, sur-peti, swar mandal, and manjira player for Indian Classical music
practice (riyaaz).

---

## Table of Contents

1. [Goal](#goal)
2. [Feature Parity with iTabla Pro](#feature-parity-with-itabla-pro)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Phase Plan](#phase-plan)
6. [Data Models](#data-models)
7. [Audio Engine Design](#audio-engine-design)
8. [Sample Requirements](#sample-requirements)
9. [UI Layout](#ui-layout)
10. [Risks & Mitigations](#risks--mitigations)

---

## Goal

Build a free, open-source web app that provides Indian Classical musicians with a
practice companion featuring:
- Realistic tanpura drone (sample-based via Tone.js)
- Tabla accompaniment with 47 taals, multiple styles, and tempo ranges
- Sur-Peti (shruti box), Swar Mandal, and Manjira
- Full mixer with per-instrument volume, panning, and 7-band EQ
- Integrated chromatic tuner (mic-based)
- Recording with mic input and reverb
- Preset system with 100+ raag presets
- Responsive UI (desktop + mobile), installable as PWA

---

## Feature Parity with iTabla Pro

### Instruments (6)

| # | Instrument | Description |
|---|-----------|-------------|
| 1 | **Tabla** | Percussion. Plays thekas (rhythmic patterns) for 47 taals. Multiple styles per taal. Different thekas for vilambit/madhya/drut. "Sur" mode for bass. Expert mode. |
| 2 | **Tanpura 1** | 5-string drone. Each string assignable to Pa/Ma/Ni/Dha/custom. Stereo pannable. |
| 3 | **Tanpura 2** | Independent second tanpura with identical controls. |
| 4 | **Sur-Peti** | Continuous shruti box drone, pitch follows Sa. |
| 5 | **Swar Mandal** | 15-20 strings, each assignable to a swara. Play once or auto-loop with configurable interval. |
| 6 | **Manjira** | Small cymbals. Auto-plays synced to taal for bhajan taals (Bhajani, Dadra, Keherva, Rupak, etc.). |

### Taal System

- **47 taals** with full bol sequences (see Appendix A)
- **Multiple styles** per taal (variations in bol patterns)
- **Speed-dependent thekas**: different bol patterns for ati-vilambit, vilambit, madhya, drut, ati-drut
- **Expert mode**: interactive variations, mukhada/tihai insertions
- **Laggi**: special rhythmic flourishes for specific taals
- **Beat display**: current matra number, sam/taali/khaali markers
- **Metronome mode**: standard time signatures (2/4, 3/4, 4/4, 5/4, 6/8, 7/8, etc.)

### Tempo & Timing

- Range: **10 - 700 BPM** (taal-dependent range auto-adjustment)
- Precision: **1ms scheduling accuracy** (Web Audio API hardware clock)
- **Tap tempo**: averages inter-tap intervals
- **x/2 and 2x** buttons
- **+/- 1 BPM** fine control
- **Automatic speed range labeling**: ati-vilambit / vilambit / madhya / drut / ati-drut

### Pitch & Tuning

- Range: **A2 to E4** (1.5 octaves)
- Fine-tuning: **1 cent** (1/100th semitone) precision
- **Unified Sa control** -- all instruments follow the same pitch
- Display: note name, octave number, cent offset, color-coded indicator
- **Auto-tuner** (microphone): detect external pitch, capture as new Sa, octave shift

### Mixer

- Per-instrument: **volume slider**, **stereo pan**, **mute/solo**
- **Master volume** and **master mute**
- **7-band parametric EQ** with 22+ presets
- Frequency bands: ~60Hz, 150Hz, 400Hz, 1kHz, 2.5kHz, 6kHz, 15kHz
- Each band: gain (-12 to +12 dB), Q factor

### Presets

- **Save/Load** named presets containing: pitch, fine-tune, taal, style, tempo, tanpura tunings, swar mandal config, mixer settings, EQ settings
- **100+ built-in raag presets** (factory)
- **Unlimited custom presets**
- **Favorites** (star/unstar)
- **Selective loading**: toggle which parts of a preset to apply
- **Import/export** as JSON files

### Recording

- **Mic input** via `getUserMedia` with gain control
- **Monitor** mic through speakers (requires headphones to avoid feedback)
- **Reverb** with presets (ConvolverNode with impulse responses)
- **Record** all instruments + mic to a single mix-down
- **Export** as WAV or WebM/OGG
- **File management**: list, rename, play, delete recordings (stored in IndexedDB)

### Other

- **Background audio**: continues playing when tab is not focused
- **PWA**: installable, works offline once samples are cached
- **Keyboard shortcuts**: space = play/stop, arrows for tempo, etc.
- **Responsive**: desktop shows all controls, mobile uses tabbed layout

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Build tool | **Vite** | Fast dev server, good audio worklet support |
| Language | **TypeScript** | Type safety for complex audio state |
| UI framework | **React 18+** | Component-based UI |
| Styling | **Tailwind CSS 4** | Utility-first CSS |
| UI components | **shadcn/ui** | Pre-built accessible sliders, toggles, dialogs, tabs |
| Audio engine | **Tone.js 14+** | Sample playback, scheduling, transport, effects |
| Pitch detection | **pitchy** | Autocorrelation-based pitch detection for tuner |
| Local storage | **idb** (IndexedDB wrapper) | Presets, recordings, cached samples |
| State management | **Zustand** | Lightweight, works well with audio callbacks |
| Package manager | **pnpm** | Fast, disk-efficient |

### Why these choices

- **Tone.js over raw Web Audio API**: Tone.js provides `Transport` (sample-accurate scheduling), `Sampler` (multi-sample pitch interpolation), `Loop`, and effect nodes. Building these from scratch would take weeks.
- **Zustand over Redux**: Less boilerplate, easier to call from outside React (e.g., from Tone.js callbacks). Audio state updates happen at high frequency -- Zustand handles this without re-render storms.
- **shadcn/ui**: Gives us accessible slider, toggle, select, dialog, tabs components out of the box. Critical for the mixer and control panels.
- **pitchy over PitchFinder**: Actively maintained, TypeScript-native, small bundle size.

---

## Architecture

```
src/
  audio/                    # Audio engine (framework-agnostic, no React)
    engine.ts               # Master audio engine: init, start, stop, routing
    mixer.ts                # Channel strips, master bus, gain/pan nodes
    eq.ts                   # 7-band parametric EQ
    tanpura.ts              # Tanpura engine (Tone.Sampler + Loop)
    tabla.ts                # Tabla engine (scheduling + sample triggering)
    surpeti.ts              # Sur-Peti (looped drone)
    swarmandal.ts           # Swar Mandal (multi-string triggered playback)
    manjira.ts              # Manjira (rhythmic cymbal sync)
    metronome.ts            # Metronome (click track)
    tuner.ts                # Mic input + pitch detection
    recorder.ts             # MediaRecorder + mix-down
    pitch.ts                # Global pitch/Sa management, note math
    types.ts                # Shared audio types

  data/
    taals/                  # One file per taal with bol sequences
      teentaal.ts
      jhaptaal.ts
      ...
    raag-presets.json        # 100+ factory raag presets
    eq-presets.json          # EQ preset definitions

  store/
    pitch-store.ts           # Global pitch state (Zustand)
    tanpura-store.ts         # Tanpura config state
    tabla-store.ts           # Taal, style, tempo state
    mixer-store.ts           # Volume, pan, mute per instrument
    preset-store.ts          # Preset CRUD
    recorder-store.ts        # Recording state
    ui-store.ts              # UI state (active tab, modals, etc.)

  components/
    layout/
      AppShell.tsx           # Main layout with tabs (mobile) or panels (desktop)
      Header.tsx             # App title, pitch display, info button
    pitch/
      PitchControl.tsx       # Sa note selector + fine-tune slider
      PitchDisplay.tsx       # Note name, octave, cent offset (color-coded)
    mixer/
      MixerPanel.tsx         # All channel strips
      ChannelStrip.tsx       # Single instrument: toggle, volume, pan
      MasterStrip.tsx        # Master volume + mute
      EQPanel.tsx            # 7-band EQ with preset selector
    tanpura/
      TanpuraPanel.tsx       # Controls for both tanpuras
      TanpuraControl.tsx     # Single tanpura: string tuning, on/off
      StringTuner.tsx        # Individual string note selector
    tabla/
      TablaPanel.tsx         # Taal selector, style, tempo, play/stop
      TaalSelector.tsx       # Dropdown/picker for 47 taals
      TempoControl.tsx       # Slider + tap tempo + x/2 + 2x
      BeatDisplay.tsx        # Current matra, sam/taali/khaali indicator
    swarmandal/
      SwarMandalPanel.tsx    # String assignment, play once, auto-loop
    tuner/
      TunerPanel.tsx         # Mic pitch display, capture button
    recorder/
      RecorderPanel.tsx      # Record, playback, file list
    presets/
      PresetPanel.tsx        # List, save, load, delete, import/export
      PresetCard.tsx         # Single preset row with details

  hooks/
    useAudioEngine.ts        # Initialize and access audio engine
    useTapTempo.ts           # Tap tempo logic
    useMediaDevices.ts       # Mic access
    useKeyboardShortcuts.ts  # Global keyboard bindings

  lib/
    notes.ts                 # Note names, frequencies, cent math
    storage.ts               # IndexedDB via idb (presets, recordings)
    export.ts                # JSON export/import, WAV encoding

  public/
    samples/
      tanpura/               # Tanpura string samples at multiple pitches
      tabla/                 # Tabla bol samples (Dha, Dhin, Na, etc.)
      surpeti/               # Sur-Peti drone loop
      swarmandal/            # Swar Mandal string pluck samples
      manjira/               # Manjira hit samples
      metronome/             # Click samples
```

### Key Architectural Decisions

1. **Audio engine is framework-agnostic**: `src/audio/` has zero React imports. It exposes a pure TypeScript API. This makes it testable and reusable.
2. **Zustand stores bridge audio ↔ UI**: Stores subscribe to audio engine events and call audio engine methods. React components only talk to stores.
3. **Samples loaded lazily**: Only load samples for instruments that are turned on. Tanpura samples load on first use, tabla samples load when a taal is selected.
4. **Scheduling uses Tone.Transport**: All rhythmic instruments (tabla, manjira, metronome) share the same transport for sync.
5. **Tanpura runs independently**: Tanpura uses its own `Tone.Loop` since it's not beat-synced to the tabla.

---

## Phase Plan

### Phase 1: Project Scaffold (Commit 1)
- [x] Initialize git repo
- [ ] Vite + React + TypeScript scaffold
- [ ] Install core deps: Tone.js, Tailwind CSS, shadcn/ui, Zustand, pitchy, idb
- [ ] Basic app shell with tab navigation
- [ ] This PLAN.md file

### Phase 2: Audio Engine Core (Commit 2)
- [ ] `engine.ts`: Initialize Tone.js, AudioContext resume on user gesture
- [ ] `mixer.ts`: Create gain + panner nodes per instrument, master bus
- [ ] `pitch.ts`: Note frequency calculations, Sa management, cent offset math
- [ ] Zustand stores: pitch-store, mixer-store
- [ ] Placeholder UI: start/stop button, pitch selector, volume sliders

### Phase 3: Tanpura Engine (Commit 3)
- [ ] `tanpura.ts`: Tone.Sampler setup with placeholder oscillator sounds
- [ ] 5-string plucking loop with configurable interval
- [ ] Dual tanpura support (independent instances)
- [ ] String tuning: Pa, Ma, Ni, Dha, custom
- [ ] Zustand store: tanpura-store
- [ ] UI: TanpuraPanel with string tuning controls, on/off, pluck speed

### Phase 4: Pitch Control System (Commit 4)
- [ ] PitchControl component: note up/down buttons, fine-tune slider
- [ ] PitchDisplay: note name, octave, cent offset with color coding
- [ ] All instruments respond to pitch changes
- [ ] Double-tap slider for picker wheel (shadcn dialog + number input)

### Phase 5: Sur-Peti & Swar Mandal (Commit 5)
- [ ] `surpeti.ts`: Looped drone sample, pitch follows Sa
- [ ] `swarmandal.ts`: 15-20 string triggers, note assignment per string
- [ ] Auto-loop with configurable duration
- [ ] UI: SwarMandalPanel with string grid, play once button, loop toggle

### Phase 6: Tabla Engine - Core (Commit 6)
- [ ] `tabla.ts`: Taal data model, bol-to-sample mapping
- [ ] Scheduling engine: schedule bols on Tone.Transport
- [ ] Start with 5 core taals: Teentaal, Jhaptaal, Ektaal, Rupak, Dadra
- [ ] Single style per taal initially
- [ ] BeatDisplay: matra counter, sam/taali/khaali markers
- [ ] Tabla play/stop controls

### Phase 7: Tabla Engine - Full (Commit 7)
- [ ] Remaining 42 taals
- [ ] Multiple styles per taal
- [ ] Speed-dependent thekas (vilambit/madhya/drut auto-switching)
- [ ] Tempo range auto-adjustment per taal
- [ ] Expert mode & laggi

### Phase 8: Tempo Controls (Commit 8)
- [ ] TempoControl: slider, +/- buttons, x/2, 2x
- [ ] Tap tempo (useTapTempo hook)
- [ ] Speed range labels (ati-vilambit through ati-drut)
- [ ] Tempo display with BPM and range name

### Phase 9: Manjira & Metronome (Commit 9)
- [ ] `manjira.ts`: Cymbal hits synced to Tone.Transport, per-taal patterns
- [ ] `metronome.ts`: Click track with time signature selection
- [ ] Manjira toggle button (per-taal availability)

### Phase 10: Mixer & EQ (Commit 10)
- [ ] MixerPanel: all channel strips with volume/pan mode toggle
- [ ] EQPanel: 7-band EQ with frequency/gain/Q controls per band
- [ ] 22+ EQ presets
- [ ] Master volume, master mute

### Phase 11: Auto-Tuner (Commit 11)
- [ ] `tuner.ts`: Mic input via getUserMedia, pitch detection via pitchy
- [ ] TunerPanel: app pitch display, mic pitch display, offset indicator
- [ ] Capture button: set Sa from mic input
- [ ] Octave up/down adjustment

### Phase 12: Presets System (Commit 12)
- [ ] `storage.ts`: IndexedDB via idb for preset CRUD
- [ ] PresetPanel: list, create, rename, delete, favorite
- [ ] Selective loading toggles (pitch, taal, tempo, tanpura, etc.)
- [ ] 100+ factory raag presets (JSON)
- [ ] Import/export as JSON file download/upload

### Phase 13: Recording (Commit 13)
- [ ] `recorder.ts`: MediaRecorder on MediaStreamDestination
- [ ] Mic monitoring with reverb (ConvolverNode)
- [ ] RecorderPanel: record/stop, file list, playback, delete
- [ ] Export as WAV (audiobuffer-to-wav) and WebM

### Phase 14: Polish & PWA (Commit 14)
- [ ] Responsive layout: desktop panels vs mobile tabs
- [ ] Keyboard shortcuts (useKeyboardShortcuts hook)
- [ ] Visual polish: beat animations, color-coded displays
- [ ] Service worker for offline + PWA manifest
- [ ] Performance profiling on mobile

---

## Data Models

### Taal Definition

```typescript
interface TaalDefinition {
  id: string;                    // e.g., "teentaal"
  name: string;                  // e.g., "Teentaal"
  matras: number;                // e.g., 16
  divisions: Division[];         // sam, taali, khaali positions
  styles: TaalStyle[];           // one or more styles
  manjiraSupported: boolean;     // whether manjira can play with this taal
  tempoRange: { min: number; max: number }; // allowed BPM range
  speedBreakpoints: {           // BPM thresholds for switching thekas
    atiVilambit?: number;
    vilambit: number;
    madhya: number;
    drut: number;
    atiDrut?: number;
  };
}

interface Division {
  matra: number;                 // 1-indexed position
  type: 'sam' | 'taali' | 'khaali';
  label: string;                 // display label (e.g., "X", "2", "0", "3")
}

interface TaalStyle {
  id: string;
  name: string;
  thekas: {
    [speedRange: string]: Bol[]; // "vilambit" | "madhya" | "drut" etc.
  };
}

interface Bol {
  name: string;                  // e.g., "Dha", "Dhin", "Na"
  position: number;              // beat position (can be fractional for subdivisions)
  velocity?: number;             // 0-1, for accented vs unaccented
  variant?: string;              // sample variant (e.g., "open", "closed")
}
```

### Tanpura Configuration

```typescript
interface TanpuraConfig {
  enabled: boolean;
  strings: TanpuraString[];      // 5 strings
  pan: number;                   // -1 (left) to 1 (right)
  volume: number;                // 0-1
  cycleSpeed: number;            // seconds per full cycle
}

interface TanpuraString {
  note: SwarName;                // 'Sa' | 'Re' | 'Ga' | 'Ma' | 'Pa' | 'Dha' | 'Ni'
  variant: 'shuddha' | 'komal' | 'tivra'; // for Re, Ga, Ma, Dha, Ni
  octaveOffset: number;          // -1, 0, or +1 relative to Sa
  customCents: number;           // fine-tune offset in cents
  enabled: boolean;
}
```

### Preset

```typescript
interface Preset {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
  pitch: {
    note: string;                // "C#", "D", etc.
    octave: number;
    cents: number;
  };
  tanpura1: TanpuraConfig;
  tanpura2: TanpuraConfig;
  tabla: {
    taalId: string;
    styleId: string;
    tempo: number;
  };
  surPeti: { enabled: boolean; volume: number };
  swarMandal: SwarMandalConfig;
  manjira: { enabled: boolean };
  mixer: MixerState;
  eq: EQState;
}
```

### Swar Mandal Configuration

```typescript
interface SwarMandalConfig {
  enabled: boolean;
  strings: SwarMandalString[];   // 15-20 strings
  autoLoop: boolean;
  loopDuration: number;          // seconds
  volume: number;
}

interface SwarMandalString {
  note: SwarName;
  variant: 'shuddha' | 'komal' | 'tivra';
  octaveOffset: number;
  enabled: boolean;
}
```

---

## Audio Engine Design

### Signal Flow

```
                          ┌──────────────┐
                          │  Master Bus  │──→ Speakers / Recording
                          │  (GainNode)  │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │             │
              ┌─────┴─────┐ ┌───┴───┐   ┌────┴─────┐
              │  7-Band   │ │Master │   │MediaStream│
              │    EQ     │ │ Mute  │   │   Dest   │
              └─────┬─────┘ └───────┘   │(Recording)│
                    │                    └───────────┘
        ┌───────────┼───────────┬───────────┬────────────┐
        │           │           │           │            │
   ┌────┴───┐  ┌───┴────┐ ┌───┴────┐ ┌───┴────┐  ┌───┴────┐
   │Tanpura │  │Tanpura │ │ Tabla  │ │Sur-Peti│  │  Swar  │
   │   1    │  │   2    │ │        │ │        │  │ Mandal │
   │Channel │  │Channel │ │Channel │ │Channel │  │Channel │
   └────┬───┘  └───┬────┘ └───┬────┘ └───┬────┘  └───┬────┘
        │          │          │          │           │
   [Vol+Pan]  [Vol+Pan]  [Vol+Pan]  [Vol+Pan]   [Vol+Pan]
        │          │          │          │           │
   Tone.Sampler  Sampler   Sampler   Player     Sampler
   (5 strings)  (5 str)  (bol map)  (loop)    (15-20 str)

   ┌────────┐  ┌─────────┐
   │Manjira │  │Metronome│   (also routed to Master Bus)
   │Channel │  │ Channel │
   └───┬────┘  └────┬────┘
   [Vol+Pan]    [Vol+Pan]
       │            │
    Sampler      Sampler

   ┌──────────┐
   │ Mic Input│   (Recording mode only, routed to Master Bus)
   │ + Reverb │
   └──────────┘
```

### Scheduling Strategy

**Tabla / Manjira / Metronome** (beat-synced):
- Use `Tone.Transport` as the master clock
- Schedule bols using `Transport.scheduleRepeat()` or `Transport.schedule()`
- On tempo change: `Transport.bpm.value = newBpm`
- On taal change: clear all scheduled events, re-schedule new taal pattern

**Tanpura** (free-running):
- NOT synced to Transport (tanpura doesn't follow beats)
- Uses independent `Tone.Loop` instances per tanpura
- Each loop triggers the next string in the 5-string sequence
- Loop interval = cycleSpeed / numberOfActiveStrings

**Swar Mandal** (trigger-based):
- Play once: trigger all enabled strings in rapid succession (staggered ~30ms apart)
- Auto-loop: `setInterval` or `Tone.Loop` at the configured loop duration

### Pitch Management

All instruments share a global "Sa" pitch. When Sa changes:

1. Calculate new Sa frequency: `baseFreq = noteToFreq(noteName, octave) * Math.pow(2, cents/1200)`
2. **Tanpura**: Re-map Tone.Sampler notes. Strings are defined as intervals from Sa (e.g., Pa = Sa + 7 semitones). Trigger notes change.
3. **Tabla**: Tabla samples are pitched-shifted via `detune` property on the sampler.
4. **Sur-Peti**: Adjust `Player.playbackRate` to match new Sa.
5. **Swar Mandal**: Each string is an interval from Sa; re-map like tanpura.

---

## Sample Requirements

### Tanpura Samples (Priority: CRITICAL)

| Sample | Notes | Format | Count |
|--------|-------|--------|-------|
| Individual string plucks | C3, E3, G#3, B3 (4 root pitches) | WAV 44.1kHz 16bit | 4-8 per string type |
| String types needed | Sa (tonic), Pa (fifth), Ma (fourth), Ni (seventh) | | |
| Duration | 3-5 seconds per pluck with natural decay | | |
| Total | ~16-32 files | | ~2-4 MB |

Tone.Sampler interpolates between these root pitches to cover A2-E4 without artifacts.

### Tabla Samples (Priority: HIGH)

| Bol | Description | Variants needed |
|-----|-------------|-----------------|
| Dha | Open bass + treble | soft, medium, hard |
| Dhin | Closed bass + treble | soft, medium, hard |
| Na / Ta | Treble only (open) | soft, medium, hard |
| Tin / Tun | Treble only (closed) | soft, medium |
| Ge / Ghe / Ke | Bass only | soft, medium, hard |
| Ti / Te | Light treble tap | soft, medium |
| Dhi | Variant of Dhin | medium |
| Tit | Quick treble | medium |

~30-50 individual samples, ~1-2 MB total.

### Other Instruments

| Instrument | Samples needed | Size |
|-----------|---------------|------|
| Sur-Peti | 1 looped drone at multiple pitches (4) | ~500KB |
| Swar Mandal | String pluck at 4 root pitches | ~500KB |
| Manjira | 2-3 cymbal hit variants | ~100KB |
| Metronome | 2 click sounds (accent + normal) | ~50KB |

### Sample Sourcing Options

1. **Record from real instruments** (best quality, most effort)
2. **Freesound.org** -- search for "tanpura", "tabla", "manjira" (check CC licenses)
3. **Synthesize placeholders** -- use Tone.js oscillators initially, replace with real samples later
4. **Extract from YouTube** -- tanpura drone videos, isolated tabla recordings (license concerns)

---

## UI Layout

### Desktop (>1024px)

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Niragas          [Sa: C#4 +12c]     [?] [Settings] │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│  MIXER   │   CONTROLS                                   │
│          │                                              │
│ Tanp 1 ■─╋── ┌─────────────────────────────────────┐   │
│ Tanp 2 ■─╋── │  TANPURA                            │   │
│ Tabla  ■─╋── │  [Tanp1: Pa ● ● ● Sa Sa]  Speed:── │   │
│ SurPeti■─╋── │  [Tanp2: Ni ● ● ● Sa Sa]  Speed:── │   │
│ SwrMdl ■─╋── ├─────────────────────────────────────┤   │
│ Manjira■─╋── │  TABLA                               │   │
│          │   │  Taal: [Teentaal ▼]  Style: [1 ▼]   │   │
│ Master ■─╋── │  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐│   │
│          │   │  │1│2│3│4│5│6│7│8│9│.│.│.│.│.│.│16││   │
│  [EQ]    │   │  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘│   │
│          │   │  Tempo: ──●── 80 BPM [Madhya]        │   │
│          │   │  [x/2] [-] [Tap] [+] [2x]  [▶ Play] │   │
│          │   ├─────────────────────────────────────┤   │
│          │   │  SWAR MANDAL / TUNER / RECORDER      │   │
│          │   │  (tabbed sub-panel)                   │   │
│          │   └─────────────────────────────────────┘   │
├──────────┴──────────────────────────────────────────────┤
│  [Presets ▼]  ★ Yaman  ★ Bhairav  ★ Malkauns  ...      │
└─────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

Tabbed interface:
- **Tab 1: Mixer** -- pitch control + channel strips
- **Tab 2: Controls** -- tanpura tuning + tabla controls + tempo
- **Tab 3: Presets** -- preset list + save/load
- **Tab 4: Swar Mandal** -- string configuration
- **Tab 5: More** -- tuner, recorder, settings, info

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Web Audio latency on mobile** | Audible delay, poor UX | Test early on iOS Safari. Use `Tone.start()` on user gesture. Keep buffer sizes small. |
| **iOS Safari AudioContext quirks** | No sound at all | Must call `Tone.start()` inside a click/touch handler. Show explicit "Tap to Start" screen. |
| **Sample download size** | Slow first load | Lazy-load samples per instrument. Use OGG compression. Service worker caches after first load. |
| **47 taals data entry** | Weeks of manual work | Start with 5 core taals. Use a JSON schema so others can contribute. Consider scraping bol sequences from reference books. |
| **Tanpura realism** | Sounds synthetic without good samples | Start with oscillator placeholders. Architecture supports drop-in sample replacement. |
| **Mobile CPU with 6 instruments** | Audio glitches, dropped frames | Profile with Chrome DevTools. Disable unused instruments. Consider AudioWorklet for heavy processing. |
| **Browser compatibility** | Inconsistent behavior | Target Chrome 90+, Firefox 90+, Safari 15+. Use Tone.js which handles most cross-browser issues. |

---

## Appendix A: Complete Taal List (47)

| # | Taal | Matras | Divisions |
|---|------|--------|-----------|
| 1 | Ada Chautaal | 14 | X 2 0 3 0 4 0 |
| 2 | Ardha Jai Taal | 6.5 | |
| 3 | Ardha Jhaptaal | 5 | X 2 0 |
| 4 | Ardha Shikhar | 8.5 | |
| 5 | Ashta Jhaptaal | 8.5 | |
| 6 | Bhajani | 8 | X 0 2 0 |
| 7 | Chachar | 16 | |
| 8 | Chartal-ki-Sawari | 11 | X 0 2 0 3 0 |
| 9 | Chautaal | 12 | X 0 2 0 3 4 |
| 10 | Dadra | 6 | X 0 |
| 11 | Dakshinatya Rupak | 6 | |
| 12 | Deepchandi | 14 | X 2 0 3 0 4 0 |
| 13 | Dhamar | 14 | X 2 0 3 |
| 14 | Ektaal | 12 | X 0 2 0 3 4 |
| 15 | Farodust/Firdost | 14 | |
| 16 | Gajamukha | 16 | |
| 17 | Jai Taal | 13 | |
| 18 | Jat Taal | 8 | |
| 19 | Jhampak | 5 | |
| 20 | Jhaptaal | 10 | X 2 0 3 |
| 21 | Jhoomra | 14 | X 2 0 3 |
| 22 | Kalawati | 9.5 | |
| 23 | Keherva | 8 | X 0 |
| 24 | Matta Taal | 9 | |
| 25 | Moghuli | 7 | |
| 26 | Neel Taal | 7.5 | |
| 27 | Pancham Sawari | 15 | |
| 28 | Pashto | 7 | |
| 29 | Pauri/Paudi | 4 | |
| 30 | Punjabi / Sitarkhani | 16 | X 2 0 3 |
| 31 | Rudra Taal | 11 | |
| 32 | Rupak | 7 | 0 2 3 |
| 33 | Saatva | 7 | |
| 34 | Sadra | 10 | |
| 35 | Sardha Rupak | 10.5 | |
| 36 | Sasthi | 6 | |
| 37 | Shashanka | 5.5 | |
| 38 | Shikhar | 17 | |
| 39 | Shiva Taal | 9 | |
| 40 | Soolfaak | 10 | |
| 41 | Soolfakhta | 5 | |
| 42 | Sooltaal | 10 | |
| 43 | Sunand | 9.5 | |
| 44 | Teentaal | 16 | X 2 0 3 |
| 45 | Teevra | 7 | |
| 46 | Tilwada | 16 | X 2 0 3 |
| 47 | Yamuna | 5 | |

---

## Appendix B: Keyboard Shortcuts (Planned)

| Key | Action |
|-----|--------|
| Space | Toggle tabla play/stop |
| T | Toggle tanpura 1 |
| Shift+T | Toggle tanpura 2 |
| Up/Down | Tempo +/- 1 BPM |
| Shift+Up/Down | Tempo +/- 10 BPM |
| Left/Right | Pitch +/- 1 semitone |
| Shift+Left/Right | Pitch +/- 1 cent |
| M | Toggle master mute |
| R | Toggle recording |
| 1-6 | Mute/unmute instrument 1-6 |
| P | Open presets panel |
| ? | Open help |
