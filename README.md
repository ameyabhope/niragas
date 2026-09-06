# Niragas

Free, open-source Indian classical music practice companion. A web app with electronic Tabla, Tanpura, Sur-Peti, Swar Mandal, tuning, and recording tools - no install required.

**Live:** [niragas.pages.dev](https://niragas.pages.dev)

> This app is entirely vibe coded.

## Features

- **Tanpura** - Two independent sample-loop Tanpuras with Pa/Ma/Ni first-string tuning, five source pitches shifted across Sa A2-E4, +/-50-cent fine tuning, and 0.7-1.4x pitch-safe tempo. Bass/treble source variants apply only to Pa/C.
- **Tabla** - 47 named taals plus nine 1-9-beat patterns, using recorded Tabla strokes with synthesis fallback, tap tempo, and speed-dependent thekas for selected taals.
- **Sur-Peti** - Additive-synthesis shruti box drone that follows the current Sa.
- **Swar Mandal** - Synthesized harp with per-string note, variant, and octave editing, plus one-shot or BPM-independent auto-loop strumming. Selected raags have starter note inventories; other factory presets use an explicit Sa-only fallback.
- **Mixer** - Enable, mute, volume, and stereo pan controls for playable instruments, with master volume and mute.
- **7-Band EQ** - 22 presets including Indian classical instrument profiles such as Khayal Vocal, Sitar/Sarod, Bansuri, and Santoor.
- **Microphone Tuner** - Detect pitch in real time, compare it with the current Sa, and capture the detected pitch as Sa.
- **111 Factory Practice Presets** - Configurations named for Hindustani and Carnatic raags, including G# pitch variants and alternate-taal pairings.
- **Preset System** - Search, save favorites and custom presets, preserve Sa or tempo while loading, selectively load sections, import/export validated JSON, and persist data in IndexedDB.
- **Recording** - Record the app mix for up to 30 minutes, optionally with microphone input. Completed takes are saved in browser storage with save/retry status. Download the browser-native format (WebM, Ogg, or M4A) or convert to WAV. Browser storage can be cleared or evicted, so export important takes.
- **Practice Layout** - Mobile-first Sa, taal, numeric tempo, and playback controls; vibhag-grouped bol display follows the sounding taal while changes wait for the next sam.
- **432 Hz Support** - Toggle between A4 = 440 Hz and 432 Hz reference.
- **PWA** - Installable. The app shell works offline after service-worker installation; each audio sample becomes available offline after it has been fetched at least once.
- **Keyboard Shortcuts** - Playback, tempo, pitch, and master-mute controls; see below.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Start or stop Tabla |
| `Alt+T` | Start or stop Tanpura 1 |
| `Alt+Shift+T` | Start or stop Tanpura 2 |
| `Up` / `Down` | Change tempo by 1 BPM (`Shift`: 10 BPM) |
| `Left` / `Right` | Change Sa by one semitone (`Shift`: fine tune by 1 cent) |
| `Alt+M` | Mute or unmute the master output |

Shortcuts do not override text fields, selectors, sliders, or unrelated focused controls.

## Tech Stack

- TypeScript + React 19 + Vite
- Tone.js (Web Audio), SoundTouchJS (tanpura time stretching)
- Tailwind CSS v4
- Zustand (state management)
- IndexedDB via idb (persistence)
- VitePWA (service worker + offline)

## Development

Requires Node.js 20.19+ in the 20.x release line, or Node.js 22.12+, and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # production build in dist/
pnpm lint       # run ESLint
pnpm test       # run Vitest unit and data tests
pnpm preview    # preview production build
```

## Audio Samples

Tanpura samples from [sankalp's Electronic Tanpura](https://freesound.org/people/sankalp/packs/9600/) (CC BY 4.0). Tabla samples from [mmiron's tabla bols](https://freesound.org/people/mmiron/packs/8162/) (CC0). See [public/SAMPLE-CREDITS.md](public/SAMPLE-CREDITS.md) for full attribution.

## License

The source code is available under the [MIT License](LICENSE). Bundled audio samples retain their CC0 1.0 and CC BY 4.0 licenses; see [public/SAMPLE-CREDITS.md](public/SAMPLE-CREDITS.md).

SoundTouchJS is separately licensed under LGPL-2.1. See [TANPURA-AUDIO.md](TANPURA-AUDIO.md) for dependency notices, rebuild instructions, actual browser audio measurements, and processing limitations. The musical presets remain editable practice starting points, not musician-certified performance prescriptions.
