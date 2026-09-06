# Browser playback checks

`npm run check:browser` starts a private Vite server and a private headless Chrome profile, drives the visible practice controls through the Chrome DevTools Protocol, captures the live mixer output as browser PCM, and writes a report plus WAV excerpts to a temporary directory. It does not use the microphone and it does not call the audio engine controls directly.

## Prerequisites

- Node.js and the repository dependencies installed (`npm install` or `pnpm install`).
- Chrome or Chromium. The runner checks `CHROME_BIN`, then `BROWSER_BIN`, and then common macOS/Linux install paths. Set `CHROME_BIN=/path/to/chrome` when the browser is elsewhere.
- A desktop environment is not required; the check uses headless Chrome. Physical phone audio and Safari remain separate manual checks.

Run from the repository root:

```sh
npm run check:browser
```

Use `--output` to retain evidence at a known path:

```sh
npm run check:browser -- --output /tmp/niragas-browser-check
```

The output directory contains `report.json`, a tabla excerpt, a tanpura excerpt, a mixed-output excerpt, and corresponding post-Stop excerpts. WAV files contain mono 32-bit float PCM at the browser context sample rate. The runner owns its Vite server, Chrome process, Chrome profile, temporary port, and output directory; cleanup runs after both successful and failed assertions and does not terminate other browser or server processes.

## What is measured

The runner clicks the global Start/Stop controls and the Tanpura/Tabla controls in the rendered UI. For each excerpt it records frame count, duration, peak, RMS, thresholded attack times, attack intervals, and intervals shorter than 40 ms (a duplicate-attack signal). It checks that tabla and tanpura emit audible PCM, tabla has an attack without duplicate attacks, Stop reaches silence after a bounded decay window, and mixed output remains below full scale. The report records the Chrome version and exact browser PCM sample rate.

`status: passed` is emitted only when every assertion passes. Missing Chrome, an unavailable capture path, a missing control, a failed assertion, or a browser exception produces `status: skipped` or `status: failed` and a non-zero exit code; a skipped capture is never reported as passing audio validation. Inspect `report.json` and listen to the retained excerpts when a numerical result needs musical review.

## Baseline (2026-09-06, ticket 02)

Passing run on headless Chrome 152.0.7977.77 at 48 kHz browser PCM (`status: passed`, 21/21 checks). Committed evidence, including WAV excerpts, is retained at `docs/validation/ticket02/` (`report.json` plus `tabla-playing`, `tabla-after-stop`, `tanpura-playing`, `mixed-playing`, `mixed-after-stop`, `restart-playing`, and `fresh-load` excerpts). Key figures for before/after comparisons:

- Tabla (metronome-1, 120 BPM): peak 0.82, RMS 0.11, 12 attacks, no duplicate attacks (< 40 ms), beat cadence median 0.5 s.
- Stop: post-Stop tail peak 0 (tabla and mixed), i.e. silence after the intentional decay window.
- Tanpura 1: peak 0.09, RMS 0.02 over ~9.8 s.
- Mixed (tanpura + tabla): peak 0.83, RMS 0.11, below full scale.
- Restart resumes the retained setup (peak 0.81); stopped tempo edit 120 → 121 BPM retained.
- Fresh hard reload: silent with Tanpura 1 selected and tabla unselected (state-verified; no worklet frames flow with no active source, recorded explicitly in the report rather than claimed as PCM silence).

Rerun with `npm run check:browser -- --output <dir>` and diff the new `report.json` against this baseline.

## Existing harnesses and scope

The earlier temporary smoke runner established the DOM selectors and waveform thresholds. The temporary `audio-runtime*` files and `tabla-playback.js` are useful for offline sample, pitch, and cancellation experiments, but they control Tone and stores directly, so they are not reused for this end-to-end check. This workflow intentionally keeps those experiments separate from evidence that the actual browser controls produce sound.
