# Niragas

Free, open-source Indian Classical music practice companion. A web app with electronic Tabla, Tanpura, Sur-Peti, Swar Mandal, Manjira, and more — no install required.

**Live:** [niragas.pages.dev](https://niragas.pages.dev)

> This app is entirely vibe coded.

## Features

- **Tanpura** — Real electronic tanpura samples (Pa/Ma/Ni tuning, 5 pitch keys, 3 tone variants, fine pitch and speed controls)
- **Tabla** — 47 taals with real bol samples, vilambit/drut thekas for core taals, tap tempo
- **Sur-Peti** — Additive synthesis shruti box drone
- **Swar Mandal** — 15-string harp with configurable tuning and auto-strum loop
- **Manjira** — Cymbal accents synced to taal
- **Metronome** — Click track with accent on sam
- **7-Band EQ** — 22 presets including Indian classical instrument profiles (Khayal Vocal, Sitar/Sarod, Bansuri, Santoor, etc.)
- **Auto-Tuner** — Microphone pitch detection for tuning instruments to Sa
- **112 Raag Presets** — Factory presets for morning/afternoon/evening/night raags, women's pitch (G#), Carnatic, taal pairings
- **Preset System** — Save/load custom presets, import/export JSON, IndexedDB storage
- **Recording** — Record sessions with mic input, export WebM/WAV
- **432 Hz Support** — Toggle between A4 = 440 Hz and 432 Hz reference
- **PWA** — Installable, works offline after first visit
- **Keyboard Shortcuts** — Space (tabla), T (tanpura), arrow keys (pitch), M (metronome)

## Tech Stack

- TypeScript + React 19 + Vite
- Tone.js (Web Audio)
- Tailwind CSS v4
- Zustand (state management)
- IndexedDB via idb (persistence)
- VitePWA (service worker + offline)

## Development

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # production build in dist/
pnpm preview    # preview production build
```

## Audio Samples

Tanpura samples from [sankalp's Electronic Tanpura](https://freesound.org/people/sankalp/packs/9600/) (CC BY 4.0). Tabla samples from [mmiron's tabla bols](https://freesound.org/people/mmiron/packs/8058/) (CC0). See [SAMPLE-CREDITS.md](SAMPLE-CREDITS.md) for full attribution.

## License

MIT
