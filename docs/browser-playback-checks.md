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

The output directory contains `report.json`, a tabla excerpt, a tanpura excerpt, a mixed-output excerpt, and corresponding post-Stop excerpts. WAV files contain mono 32-bit float PCM at the browser context sample rate. Capture modules register through the underlying context's `audioWorklet.addModule`, leaving Tone's cached worklet bundle available for instrument effects. All uncaught browser exceptions fail the checks; none are excluded by error name. The runner owns its Vite server, Chrome process, Chrome profile, temporary port, and output directory; cleanup runs after both successful and failed assertions and does not terminate other browser or server processes.

## What is measured

The runner clicks the global Start/Stop controls and the Tanpura/Tabla controls in the rendered UI. For each excerpt it records frame count, duration, peak, RMS, thresholded attack times, attack intervals, and intervals shorter than 40 ms (a duplicate-attack signal). It checks that tabla and tanpura emit audible PCM, tabla has an attack without duplicate attacks, Stop reaches silence after a bounded decay window, and mixed output remains below full scale. The report records the Chrome version and exact browser PCM sample rate.

`status: passed` is emitted only when every assertion passes. Missing Chrome, an unavailable capture path, a missing control, a failed assertion, or a browser exception produces `status: skipped` or `status: failed` and a non-zero exit code; a skipped capture is never reported as passing audio validation. Inspect `report.json` and listen to the retained excerpts when a numerical result needs musical review.

## Baseline (2026-09-06, ticket 02)

Historical baseline on headless Chrome 152.0.7977.77 at 48 kHz browser PCM (`status: passed`, 21/21 checks). Committed evidence, including WAV excerpts, is retained at `docs/validation/ticket02/` (`report.json` plus `tabla-playing`, `tabla-after-stop`, `tanpura-playing`, `mixed-playing`, `mixed-after-stop`, `restart-playing`, and `fresh-load` excerpts). Key figures for before/after comparisons:

- Tabla (metronome-1, 120 BPM): peak 0.82, RMS 0.11, 12 attacks, no duplicate attacks (< 40 ms), beat cadence median 0.5 s.
- Stop: post-Stop tail peak 0 (tabla and mixed), i.e. silence after the intentional decay window.
- Tanpura 1: peak 0.09, RMS 0.02 over ~9.8 s.
- Mixed (tanpura + tabla): peak 0.83, RMS 0.11, below full scale.
- Restart resumes the retained setup (peak 0.81); stopped tempo edit 120 → 121 BPM retained.
- Fresh hard reload: silent with Tanpura 1 selected and tabla unselected (state-verified; no worklet frames flow with no active source, recorded explicitly in the report rather than claimed as PCM silence).

The retained report and WAVs were refreshed on 2026-09-07 after correcting capture registration; use their measurements for current comparisons. The figures above describe the original run.

Rerun with `npm run check:browser -- --output <dir>` and diff the new `report.json` against this baseline.

## Existing harnesses and scope

The earlier temporary smoke runner established the DOM selectors and waveform thresholds. The temporary `audio-runtime*` files and `tabla-playback.js` are useful for offline sample, pitch, and cancellation experiments, but they control Tone and stores directly, so they are not reused for this end-to-end check. This workflow intentionally keeps those experiments separate from evidence that the actual browser controls produce sound.

## Saved-session persistence

Run `node scripts/saved-sessions-check.mjs` to exercise the named-session form, hard refresh, and explicit reload through a real isolated browser profile, then the full collection workflow: rename, save-as-copy, explicit update, favorites, search, export download with envelope round-trip, delete, duplicate-ID rejection, valid import, and malformed import. Dialogs (rename/copy prompts, delete confirmation) are answered through the DevTools protocol. The runner also injects a failed IndexedDB write, retries, checks exact stored settings across edits/refresh/load, and compares storage before and after rejected imports. It writes the raw report to the printed temporary path for success, failure, or skip. A missing browser is reported as `status: skipped` with a nonzero exit, never as a passing persistence check.

The current exchange format is the versioned `niragas-presets` envelope at schema 3. Imports validate the complete file before writing, reject files over 2 MB, and reject IDs already present in the browser collection; duplicate IDs therefore cannot silently overwrite a saved session. Incompatible stored records are rejected individually when read, while unrelated recording storage remains untouched. The preset database upgrade removes unused collection indexes.

## Interruption and recovery

Run `node scripts/interruption-check.mjs` to suspend the live audio context through real browser controls, verify the interruption status with its explicit Resume action, confirm settings survive interruption, verify Stop-while-interrupted clears intent, and confirm Resume restores audible playback with Media Session metadata intact. A missing browser is reported as `status: skipped`, never as passing. Suspension is triggered through the real `AudioContext.suspend()` path; locked-screen and phone behavior remain manual checks.

## Live setup loading

Run `node scripts/live-load-check.mjs` to apply factory presets while accompaniment runs: a tanpura-only partial load that must leave the sounding tabla untouched, then a full load that applies the requested selection (including a silent tabla) without a global stop. The runner asserts continued attacks without duplicates across the load, beat-display alignment with the sounding pattern, and continued audibility. A missing browser is reported as `status: skipped`.

## Interruption, wake lock, and recording

- `node scripts/interruption-check.mjs` suspends the live audio context, verifies the interruption status with its explicit Resume action, confirms settings survive, verifies Stop-while-interrupted, and confirms Resume restores audible playback with Media Session metadata intact.
- `node scripts/wake-lock-check.mjs` walks the opt-in keep-screen-awake control through Off, Waiting, Held, release on Stop, and back to Off.
- `node scripts/recording-check.mjs` records the live mix during accompaniment, verifies the take survives global Stop, verifies the saved collection entry, and verifies microphone tuner capture stays independent (headless runs use a fake media device).

## Offline samples

Run `node scripts/offline-check.mjs` against a production build (`npm run build` first). It verifies the service worker controls the page, the app shell loads offline from precache, a cached tanpura selection plays offline with zero sample-network hits, an uncached selection fails truthfully while retaining the old sound with Retry, and recovery succeeds. The uncached outage is injected at the static server because page-level network emulation does not reach the worker's own requests; this is recorded in the report.

## Responsive and keyboard operation

Run `node scripts/responsive-check.mjs` to audit 320px, 390px, and desktop widths (every mobile tab at phone widths): no horizontal overflow, every control labelled, 24px minimum touch targets, live-region announcements, Tab focus movement with visible focus indication, and Space operating tabla. It also fixed sub-24px targets (master mute, EQ reset, A4 toggle, string add/remove) and corrected the setup description copy.

## Physical-device acceptance (outstanding)

The recorded runs use desktop headless Chrome. No physical phone or Safari run is recorded, and phone-sized viewport checks do not establish mobile audio or assistive-technology behavior.

For each available real phone and Safari browser, record device model, OS and browser versions, date, and pass/fail evidence for:

- Start, Stop, stopped edits, restart, manual strum, looping, and rapid controls; listen for duplicate attacks and sound after Stop's decay.
- Live saved-setup loading, including another style of the sounding taal; check the beat/bol display follows the audible transition.
- Save a nondefault setup, edit it, refresh into silent defaults, and explicitly reload; verify update versus copy and import/export.
- Background and foreground transitions, explicit Resume, Stop during interruption, and keep-screen-awake support/status. Record unavailable APIs separately; do not infer a background-playback guarantee.
- Expanded forms, touch controls, focus visibility, and screen-reader labels/status announcements; check portrait and landscape overflow.
- Recording and microphone permissions, ensuring accompaniment Stop does not stop independently controlled capture.

Until these observations exist, ticket 10 remains open for physical-device acceptance. Musician listening review is separate from numerical PCM checks.
