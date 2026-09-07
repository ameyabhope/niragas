# Code-review findings fix batch

## Problem Statement

A whole-repo review against the reliable-playback spec found the implementation conforming almost everywhere, with one real behavior gap and a handful of small robustness issues. A musician whose audio is interrupted (suspended context) while the practice session is still active gets no feedback and no configuration change when loading a saved session or factory preset: the load is silently dropped. Separately, the review surfaced dead or fragile code shapes that could mislead the next change: an audio-state variant that can never occur, an EQ insert path that assumes symmetric use, and a retry path that depends on an implicit store-notification behavior.

## Solution

Make setup loading independent of audio initialization so it applies in every playback state and always reports what happened, remove the unreachable audio-state variant, guard the EQ insert path against double insertion, and make the tanpura retry path explicit rather than implicit. Leave deliberate design trade-offs (sample fallback strategy, native dialogs, evidence retention) documented and unchanged.

## User Stories

1. As a musician with interrupted audio and an active practice session, I want loading a saved session to still apply its configuration, so that my setup change is not silently lost.
2. As a musician with interrupted audio, I want a truthful result when loading a setup, so that I know whether to resume audio or retry.
3. As a musician, I want the tanpura Retry control to keep working the same way, so that failed sample preparation remains recoverable without changing my selected tuning.
4. As a musician, I want no change to the sound, timing, or controls of existing playback, so that this maintenance batch cannot regress practice.
5. As a maintainer, I want no unreachable audio states in the engine boundary, so that future interruption handling cannot branch on a state that never occurs.
6. As a maintainer, I want EQ insertion to tolerate repeated calls, so that a future caller cannot corrupt the mix bus by inserting twice.
7. As a maintainer, I want the tanpura retry to name what it does, so that the next reader does not need to know store-notification internals.

## Implementation Decisions

- Setup loading (factory presets and saved sessions alike) applies its configuration through the shared session command boundary regardless of audio-initialization outcome. Audio initialization remains a best-effort step for sounding the new setup, never a precondition for configuring it.
- When audio initialization fails during a load while the session is active, the configuration is still applied and the interface reports that sound could not start, reusing the existing error/announcement surfaces rather than adding new ones.
- The audio-context state boundary exposes only states the underlying context can actually produce; interruption remains a derived condition (playback requested while the context is not running), owned by the browser playback lifecycle.
- EQ insertion becomes idempotent: inserting while already inserted is a no-op, keeping the single pre-master path intact.
- The tanpura retry path gains an explicit named action at the session command boundary that re-runs preparation for the currently selected configuration. The panels use it instead of re-setting an unchanged value.
- No changes to sample fallback strategy, dialog surfaces, evidence retention, scheduling, tuning, or mixing behavior.

## Testing Decisions

- A good test asserts observable configuration, status, and persistence behavior through the shared command seam with controlled asynchronous boundaries; it does not assert private queues, notification counts, or incidental call order.
- Extend the live setup-loading tests for the interrupted-while-active case: configuration applies, playback intent is preserved, and the failure is reported. Prior art: the shared-command tests and the live-load tests.
- Extend the tanpura lifecycle tests so the explicit retry action is covered at the engine boundary. Prior art: the existing retry and failure-retention tests.
- Re-run the reproducible browser checks (baseline playback and live loading) to confirm no audible or timing change. Browser waveform evidence is not required to re-prove unchanged behavior beyond the green suite, consistent with prior repair passes.
- Complete production build, lint, typechecking, and the full automated suite.

## Out of Scope

- Per-bol sample fallback instead of the current all-or-nothing strategy.
- Replacing native rename/copy prompts and the delete confirmation with custom dialogs.
- Moving committed WAV evidence to external storage.
- New instruments, fills, sample acquisition, musician review, profiling, phone testing, and background-audio guarantees.

## Further Notes

- Source: whole-repo code review of the `main` state after the ten reliable-playback tickets. Standards axis: 7 minor findings (no documented standards file; all judgement calls). Spec axis: 1 finding — the interrupted-while-active load drop fixed here.
- The remaining standards notes (untyped third-party casts, detached-anchor export click, console wrapper consistency) are deliberately untouched: they are contained, tested, and out of proportion to change.
- No issue tracker is configured in this environment, so this spec is published as a repo document following the project's existing convention; run `/setup-matt-pocock-skills` to establish tracker publishing.
