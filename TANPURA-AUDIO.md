# Tanpura Processing

The tanpura still uses the existing electronic recordings credited in
`SAMPLE-CREDITS.md`. No new recordings or acoustic-source claims are introduced.

## Signal Path

`soundtouchjs` 0.3.0 supplies offline WSOLA time stretching. Native Web Audio
resampling in `Tone.Player` supplies pitch transposition; `Tone.PitchShift` is not
used. For pitch ratio `r = targetHz / sourceHz * 2^(fineCents/1200)`, WSOLA runs
at tempo `speed / r` and the Player runs at `r`. Thus the loop's playback duration
is `sourceDuration / speed`, independently of pitch. `targetHz` includes the
shared A4 reference and Sa cents. A4-only updates also trigger preparation.

Processing uses the decoded sample rate, a shared stereo alignment search,
periodic input, 300 ms of discarded startup, and a 30 ms wrap blend. The wrap
blend does not shorten the loop. Processing yields between batches and is
abortable; it is not on the audio rendering thread. Only the latest request may
install a buffer. An existing player remains audible during loading and errors.
Prepared replacements crossfade over 500 ms through the existing shared effects.
Stop intent, aborted requests, retired players, and instance disposal are tracked
separately so late completions cannot restart a stopped/disposed instance.
Retirement uses the player's audio clock, with a lookahead margin, rather than
wall-clock timers: suspension cannot dispose an old player before its fade runs.
Disposal cancels those callbacks. Failed settings can be retried unchanged via
`updateTanpura`; partial effects and failed replacement players are disposed while
a healthy existing chain is retained.

## Measured Validation

Revalidated September 6, 2026: Chrome 152 headless on macOS, 48 kHz, using the existing temporary CDP harness
`audio-runtime.mjs`, extended with `tanpura-browser.js` and `tanpura-live.js`.
These are real `OfflineAudioContext` renders, not checks of parameter formulas.
Pitch analysis uses a 131072-point Hann-window FFT with interpolated peaks
(0.366 Hz bin spacing). Tests in the repository additionally exercise WSOLA
at 44.1 and 48 kHz, stereo polarity, cancellation, pulse timing, and lifecycle.

| Measurement | Result |
| --- | --- |
| 220 Hz sine; -12, -7, -1, -0.5, 0, +0.5, +1, +7, +12, +16.17 semitones; each at 0.7/1/1.4x | Maximum absolute measured pitch error 0.162 cents across 30 renders |
| Two-second amplitude pulses, pitch rates 0.5/1/2.5, speeds 0.7/1.4x | Mean spacing error at most 0.275%; expected 2.85714/1.42857 s |
| Pa/Ma/Ni F-sharp recordings to G3, 0.7/1.4x | Sa second harmonic 391.677-391.930 Hz; expected 391.995 Hz |
| Same recordings to E4, A4=432, Sa +23 cents, fine -37 cents, 0.7/1.4x | Sa second harmonic 641.571-642.017 Hz; expected 642.055 Hz |
| Twelve real-sample renders | Prepared-buffer duration divided by native playback rate within 5.27 microseconds of 20/speed seconds; preparation 204-634 ms on this machine |
| Twelve additional one-second sample seam renders | Largest adjacent step within two frames of wrap: 0.0102-0.0618; each below its render's 99th-percentile adjacent step (maximum ratio 0.864) |
| Live engine delayed fetch and crossfade | Old sound remained active; sampled channel RMS 0.0334-0.0827 across preparation/swap, no sampled silence |
| Live forced network failure | Error surfaced; previous player stayed audible |
| Live overlapping updates followed by stop/dispose | No restart; stopped RMS 9.92e-15 after tails settled; disposed status cleared |
| Live 1.4-second suspension during swap, 800 ms lookahead | Audio clock did not advance while suspended; resumed RMS 0.0296-0.0892, no sampled silence |
| Live rapid stop/start/stop | No late restart; RMS 4.69e-13 after 2.5 seconds |

Pitch and tempo are measured from rendered PCM. The microsecond duration result
is buffer-length/rate accounting, not a claim that WSOLA preserves every attack
to microsecond precision. Seam measurements inspect actual native-resampled PCM.
Live RMS is sampled every 20 ms and cannot rule out shorter glitches or establish
perceptual quality; random playback offsets also change its values between runs.

The temporary harness directory is
`/var/folders/rk/bxm9n82s3wsd_hlflmrtw5lc0000gn/T/opencode`.
From that directory, run these sequentially (they share browser/server ports):

```sh
node audio-runtime.mjs tanpura
node audio-runtime.mjs tanpura-live
```

JSON results are `audio-runtime-artifacts/tanpura.json` and `tanpura-live.json`;
the same artifacts directory contains twelve `soundtouch-*.wav` sample excerpts.
The harness throws on sine pitch, mean pulse spacing, sample seam/duration, or
live lifecycle regressions. It is a temporary local tool, not a committed CI test.

Integrated verification: all 104 tests pass, including 20 tanpura tests
(11 lifecycle, 9 processing). Production build and repository ESLint pass.
Build warnings concern stale Browserslist data and Node's `module.register()`
deprecation. Browser audio validation is described separately above; passing
unit tests alone does not establish musical accuracy.

## Limits

- WSOLA can smear attacks and alter timbre, especially at extreme ratios. Local
  pulse timing varies even though average tempo and loop duration are correct.
- Native resampling transposes the spectral envelope too; this is not a
  formant-preserving algorithm.
- Real recordings have detuned partials and evolving envelopes. Their harmonic
  measurements are not a claim that every partial is an exact equal-tempered sine.
- Numerical pitch measurements above are before chorus/tremolo/reverb. The live
  continuity check includes those effects but is not a pitch-accuracy measurement.
- Browser measurements cover three F-sharp source recordings, not all 17 assets,
  and Chrome desktop only. Safari, Firefox, mobile CPU/memory, and subjective
  listening quality have not been validated here.
- Preparation is cooperative main-thread work, not a Worker. Control changes
  take effect after preparation and crossfade, not instantaneously. The decoded
  source is cached per instance, but rendered variants are not retained.
- Processing accepts mono/stereo and caps output at 2^24 frames per channel,
  with WSOLA tempo ratios from 0.05 to 20. These are resource guards, not a claim
  of acceptable sound at those extremes. PCM buffers and copies still consume
  significant memory; mobile profiling remains necessary.

## Dependency License

SoundTouchJS is LGPL-2.1 licensed, independently of this application's MIT code.
Copyright Olli Parviainen, Ryan Berdeen, Jakub Fiala, and Steve 'Cutter' Blades.
The dependency is unmodified. Its license and source are included in the installed
package (`node_modules/soundtouchjs/LICENSE` and `dist/soundtouch.js`) and available
at <https://github.com/cutterbl/SoundTouchJS> and
<https://www.npmjs.com/package/soundtouchjs/v/0.3.0>.
Distributions must preserve its license/notices and provide corresponding source
and the ability to replace/rebuild the library under the LGPL. To rebuild this
application with a modified version, replace the dependency with that version
using pnpm and run `pnpm build`; the processing API is declared in
`src/audio/soundtouchjs.d.ts`.
