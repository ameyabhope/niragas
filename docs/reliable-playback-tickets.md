# Reliable playback and saved sessions — implementation tickets

Source: [spec](specs/reliable-playback-and-saved-sessions.md). Vocabulary: [domain glossary](../CONTEXT.md).

These tickets are stored together at the user's request. They have not been published to an external tracker. Implement one ticket per fresh context, reading its acceptance criteria and the source spec. Start only when its blockers are complete. Update each ticket's status and record validation results when finishing it.

`ready-for-agent` describes ticket readiness; it does not override blocking dependencies. Tickets 01 and 02 can start immediately. Each implementation includes relevant behavioral tests and browser checks; ticket 10 verifies the combined experience.

The current spec takes precedence over the older broad implementation plan and interrupted handoff. Existing data and old exports impose no backward-compatibility requirement. Preserve existing playable features and necessary audio lifecycle safeguards. The inspected baseline had 104 passing tests and a passing production build, with a lint failure in the unfinished session controls; recheck the working tree before implementation.

## 01: Remove unfinished percussion and simplify existing playback code

**What to build:** A practice interface containing only playable instruments, backed by simpler existing playback code with unchanged musical behavior. Perform this prefactoring before changing session ownership.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Remove unused standalone Manjira/metronome prototypes, disabled mixer rows, and associated unused types, configuration, and call sites.
- [x] Retain simple beat patterns playable through tabla and every existing playable instrument, recording, tuner, mixer, and EQ workflow.
- [x] Remove unused alternate audio APIs and unread EQ state after checking application, test, and retained validation-harness references.
- [x] Replace the tabla sample player's artificial note-key adapter with canonical bol identifiers, retaining alias resolution, tuning, scheduling, and source cancellation behavior.
- [x] Simplify tap tempo by checking the inter-tap gap on the next tap, computing average spacing from the first and last timestamps, and removing its unused reset API.
- [x] Derive the taal map from the ordered catalogue without changing available patterns or ordering.
- [x] Remove ineffective callback memoization and comments that merely narrate code. Correct misleading comments; retain explanations of units, musical assumptions, cancellation, resource ownership, and audio timing.
- [x] Resolve the baseline lint failure and leave production build, lint, and relevant tests passing. Verify representative tabla, tanpura, and manual/looping Swar Mandal playback in the browser.

**Validation (2026-09-06):** Production build, lint, typechecking, and all 104 tests in 14 files pass. Existing tabla native-source cancellation test failed with direct bol identifiers before the adapter change and passes after it. Isolated headless Chrome/152.0.7977.77 browser check operated real controls: tabla, tanpura, manual Swar Mandal, looping Swar Mandal (including a later sweep), and Stop silence all passed; tap tempo produced 120 BPM at 500 ms spacing and reset to 80 BPM at 750 ms spacing after inactivity. No uncaught browser errors. See [ticket 01 evidence](validation/ticket01.json). These are browser waveform measurements, not a physical-device listening review. Code review: Standards 0 findings; Spec 0 code findings. Retained `isTablaPlaying` because the existing runtime harness uses it; updated the temporary sample-render harness to canonical bol identifiers.

## 02: Make browser playback checks reproducible

**What to build:** A repeatable developer workflow that operates real playback controls, captures browser audio, and produces useful evidence of playback correctness.

**Blocked by:** None (can start immediately).

**Status:** complete

- [x] Document prerequisites and provide a repeatable way to start an isolated app server/browser and run a representative playback scenario.
- [x] Inspect existing temporary audio-render scenarios before reusing their assumptions or code.
- [x] Operate real UI controls and capture PCM plus timing results sufficient to detect duplicate attacks, timing errors, and silence after Stop and its intentional decay.
- [x] Record a baseline for representative tabla and tanpura playback, restart, and mixed-output peaks.
- [x] Retain representative audio excerpts and numerical reports in a documented location for before/after comparisons.
- [x] Clean up browser/server resources on success and failure without interfering with unrelated running processes.
- [x] Make unavailable prerequisites and failed assertions explicit; a skipped capture must not count as passing audio validation.

**Validation (2026-09-06):** `npm run check:browser` passes 21/21 checks on headless Chrome/152.0.7977.77 at 48 kHz browser PCM: capture availability, control presence, tabla audibility with 12 attacks and no duplicates at 120 BPM, Stop/mixed Stop silence, tanpura audibility, mixed peaks below full scale, retained setup across Stop/restart, and silent fresh-load defaults. Missing Chrome yields `status: skipped` with a non-zero exit; the silent fresh-load fallback is state-verified and recorded explicitly. Baseline report plus WAV excerpts retained at `docs/validation/ticket02/`; workflow documented in [browser playback checks](browser-playback-checks.md).

## 03: Retain the practice session through shared Start/Stop controls

**What to build:** Consistent playback controls that retain the current setup through Stop/Start, allow editing while stopped, and return to silent defaults after a fresh page load.

**Blocked by:** 01 — Remove unfinished percussion and simplify existing playback code.

**Status:** complete

- [x] Route header, mixer, instrument-panel, and keyboard playback actions through a narrow shared command boundary. Consolidate the duplicate header and unfinished session implementations.
- [x] Separate selected/enabled instruments from playback intent. Derive mixer enable indicators instead of maintaining mirrored copies.
- [x] Global Stop retains all musical settings and auto-loop configuration while cancelling pending starts, loops, and manual strums. Recording and microphone capture remain separately controlled and visibly indicated.
- [x] Global Start uses the retained setup, including edits made while stopped; an older snapshot cannot overwrite those edits. Tabla restarts at sam rather than restoring a mid-cycle cursor.
- [x] A fresh page load, including hard refresh, resets current practice configuration to defaults and stays silent. Default Start uses Tanpura 1; refresh does not erase saved setups or recordings.
- [x] Stop does not wait for successful audio initialization. Repeated Start cannot duplicate playback, and repeated Stop cannot erase configuration or allow stale initialization to start sound.
- [x] Manual Swar Mandal enable consistently arms the instrument without an implicit strum. Strum Once produces one sweep; auto-loop starts without a duplicate initial sweep. Idle manual selection alone is not reported as playing accompaniment.
- [x] Preserve existing keyboard targets and interactive-control protections, including Space controlling tabla.
- [x] Exercise shared commands with real stores and controlled asynchronous boundaries. Verify cross-control consistency, rapid commands, retained settings, silent refresh, and recorder/microphone independence in the browser.

**Validation (2026-09-06):** Seven shared-command tests pass, covering retained settings, edited stopped setup, cancelled initialization, failure/retry, repeated Start/Stop, idle manual selection, and recorder/microphone independence. Preset and keyboard regression tests pass; typechecking and lint pass. Browser waveform smoke passed tabla, tanpura, manual/looping Swar Mandal, all Stop-silence checks, hard-reload default state, and rapid Start/Stop during cold preparation. See [ticket 03 evidence](validation/ticket03.json). Instrument enable controls select/arm while stopped; Start plays the selection. Tabla Play and Space share the same command; global Stop remains available for manual-strum cancellation. Physical-phone and combined PCM acceptance remain in ticket 10. Repair pass (2026-09-06): the working-tree implementation had broken `tsc -b` (stale preset-migration import, removed schema fields referenced in tests) and two failing preset tests; fixed by removing the obsolete migration, completing the single-owner mixer change (volume/pan/mute only in mixer, selection only in instrument stores), keeping preset loading silent (disabling clears stale sounding state), and removing unwired wake-lock/media-session code that belongs to tickets 08/09. Re-verified: production build, lint, `tsc -b`, and 111 tests in 15 files pass.

## 04: Make tanpura changes seamless and cancellation reliable

**What to build:** Tanpura changes that keep the previous sound until the latest replacement is ready, recover clearly from failure, and always respect Stop.

**Blocked by:** 03 — Retain the practice session through shared Start/Stop controls.

**Status:** complete

- [x] Continue the prior playable source during replacement preparation, then crossfade into the latest requested replacement.
- [x] Rapid pitch, tuning, speed, and reference-frequency changes cancel or invalidate superseded preparation; stale results cannot replace the final selection.
- [x] Stop during initialization or preparation cancels playback intent immediately. Late completions cannot start or resurrect playback.
- [x] Preparation failure retains the previous usable sound, reports a useful error, and permits retry. Initial-load failure reports accurately when no prior source exists.
- [x] Remove redundant outer synchronization while retaining engine cancellation, source ownership, and audio-clock crossfade retirement.
- [x] Extend existing lifecycle tests with deferred preparation through shared commands. Cover failure, rapid changes, Stop/restart, and disposal.
- [x] Verify real browser audio continuity, absence of stale replacements, and silence after Stop and intentional fade. Use the repeatable workflow if available; this ticket is not blocked on its delivery.

**Validation (2026-09-07):** Engine keeps the old player until the replacement is ready (0.5 s fade crossfade with audio-clock retirement), aborts superseded preparation via AbortController plus staleness guards, gates late completions on live playback intent, and surfaces preparation errors with retry that preserves the selected tuning. Twelve tanpura lifecycle unit tests cover loading/failure retention, stale completions, Stop/dispose races, and shared-command Stop during preparation. `npm run check:browser -- --scenario tanpura` passes 10/10 on headless Chrome/152.0.7977.77 at 48 kHz: initial play, continuity during held replacement, latest-wins without waiting for stale fetch, failure retention with exposed Retry, successful retry, Stop silence after late completion, and restart with retained setup. Evidence retained at `docs/validation/ticket04/`. The scenario's exception check uses the same known-NotSupportedError filter as the baseline. Code review: Standards 0 findings (no documented standards file; no baseline smells); Spec 0 findings.

## 05: Save and revisit a named session after refresh

**What to build:** Save the current setup under a name, refresh into silent defaults, and explicitly reload the saved session without starting sound.

**Blocked by:** 03 — Retain the practice session through shared Start/Stop controls.

**Status:** complete

- [x] Reuse the existing preset capture/load, validation, and IndexedDB capabilities for named saved sessions, rather than adding a parallel persistence system.
- [x] Capture pitch/reference frequency, enabled instruments, both tanpura configurations, tabla taal/style/tempo, Swar Mandal strings and loop settings, mixer/master settings, and EQ.
- [x] Give volume, pan, and mute one owner in the mixer; eliminate duplicate fields in the saved setup. Store selection independently of historical playback state.
- [x] Exclude transport position, pending work, loading/error state, audio resources, microphone permissions, recording state, and wake-lock handles.
- [x] Saving creates an independent snapshot; later changes to the current practice session do not mutate it. Report actual save completion or failure and support retry.
- [x] A refresh resets current practice settings and remains silent while retaining newly saved sessions. Loading one while stopped restores its configuration without autoplay.
- [x] Use one current validated schema. Remove obsolete migrations and unused indexes, with a simple documented reset/rejection policy for incompatible old setup data. Avoid indiscriminate deletion of unrelated storage.
- [x] Extend capture/load and validation tests. Verify save, edit, refresh, explicit reload, and save failure/retry against real browser IndexedDB.
- [x] Keep the existing setup workflow usable while subsequent tickets extend live loading and collection management.

**Validation (2026-09-07):** Capture/load round-trip, validation, explicit update versus copy, snapshot independence, factory guards, and delete covered by unit tests; five new saved-session store tests cover save failure (truthful error, collection preserved) with retry success, snapshot independence, explicit update versus copy, factory refusal, and active-session cleanup. `node scripts/saved-sessions-check.mjs` passes 7/7 on headless Chrome/152.0.7977.77 against real browser IndexedDB: save completion, IndexedDB presence, refresh retaining the collection while stopped, explicit reload finding the session, and no autoplay. Evidence retained at `docs/validation/ticket05/report.json`. Code review: Standards 0 findings (store mutations follow the uniform record-error-and-rethrow pattern; tests follow the repo's mocked-storage-boundary pattern); Spec 0 findings.

## 06: Load setups consistently during playback

**What to build:** Saved sessions and factory presets that apply coherently while preserving the current playback intent and optional preserved settings.

**Blocked by:**
- 04 — Make tanpura changes seamless and cancellation reliable.
- 05 — Save and revisit a named session after refresh.

**Status:** ready-for-agent

- [ ] Use the same setup-loading rules for factory presets and saved sessions. Loading while stopped stays silent; loading while running applies the new setup without an unnecessary global stop.
- [ ] Apply related settings coherently so intermediate store updates cannot start stale instruments or schedule transient taal/style combinations.
- [ ] Retain selective section loading and independent preserve-Sa/preserve-tempo options.
- [ ] Retain next-sam taal transitions and next-beat style changes, and keep beat/bol display aligned with the sounding selection.
- [ ] Apply the requested instrument selection; a running session loading a setup with no repeating accompaniment may become silent without inventing a fallback instrument.
- [ ] Tanpura changes follow the latest-request, continuity, failure, and Stop guarantees from ticket 04.
- [ ] Test full/partial loads while stopped and running, rapid consecutive loads, Stop during loading, preserved values, and all-instruments-off setups through the shared command boundary.
- [ ] Demonstrate live loading and sounding-pattern display through actual browser controls and representative audio captures.

## 07: Manage and exchange saved sessions

**What to build:** A manageable saved-session collection with explicit editing and validated import/export.

**Blocked by:** 05 — Save and revisit a named session after refresh.

**Status:** ready-for-agent

- [ ] Provide naming/renaming, search, favorites, explicit update, save-as-copy, and delete for saved sessions, reusing existing collection capabilities where possible.
- [ ] Distinguish user-created saved sessions from factory presets without duplicating the setup model or loading implementation.
- [ ] Updating a saved session is explicit; experimenting with current settings never silently overwrites it. Saving a copy leaves the original unchanged.
- [ ] Current-format export/import round-trips full setups and validates values and file limits before mutation. Invalid imports and persistence failures show truthful errors.
- [ ] Define and communicate current-format duplicate-ID import behavior; obsolete export compatibility is not required.
- [ ] Test update versus copy, snapshot independence, delete, favorites/search, valid round trips, malformed imports, and persistence errors.
- [ ] Verify the collection workflow and expanded forms with keyboard and phone-sized layouts, including loading a saved item without autoplay when stopped.

## 08: Recover from interruptions through shared controls

**What to build:** Clear interruption status and deliberate recovery that retains the current setup, with consistent supported operating-system media controls.

**Blocked by:** 03 — Retain the practice session through shared Start/Stop controls.

**Status:** ready-for-agent

- [ ] Observe audio-context state and show suspended/interrupted status with an explicit user-gesture Resume action.
- [ ] Preserve current settings through interruption. Resume respects the latest playback intent, including a Stop issued while interrupted or while resume is pending.
- [ ] Do not force audio to resume in the background or start sound after a cancelled resume request.
- [ ] Supported Media Session play/pause/stop actions use shared commands. Metadata reflects current Sa and sounding taal; playback status accounts for interruption and idle manual selection.
- [ ] Clean up handlers and stale asynchronous work. Unsupported actions/APIs degrade without breaking ordinary controls; do not add seek controls.
- [ ] Test suspension, resume failure/retry, Stop during recovery, repeated media commands, unsupported APIs, and cleanup through controlled browser boundaries.
- [ ] Verify available real-browser interruption/recovery behavior and explicitly record device coverage without claiming locked-screen playback guarantees.

## 09: Keep the screen awake during foreground practice

**What to build:** An optional keep-screen-awake control that truthfully reflects browser support and holds a wake lock only during eligible accompaniment.

**Blocked by:** 08 — Recover from interruptions through shared controls.

**Status:** ready-for-agent

- [ ] Expose an opt-in control and understandable status for unsupported, idle, requesting, held, released, hidden, and denied conditions as appropriate.
- [ ] Request a screen wake lock only when requested, visible, and playing accompaniment has a running audio context. Idle manual Swar Mandal alone is ineligible.
- [ ] Release on Stop, disabling, hiding, loss of eligibility, or unmount. Safely release sentinels delivered after cancellation or cleanup.
- [ ] Reacquire on visibility return only when still requested and eligible. Handle automatic release without stale status or duplicate ownership.
- [ ] Keep wake-lock resources out of saved-session data and avoid implying that screen wake lock guarantees locked-screen/background audio.
- [ ] Test denied/unsupported paths, automatic release, visibility transitions, context interruption, stale acquisition, and cleanup.
- [ ] Verify the control and truthful status in supporting and non-supporting browser conditions; record actual phone testing when available.

## 10: Complete desktop and phone acceptance

**What to build:** A verified combined practice workflow that works with touch, keyboard, and assistive controls on desktop and phone-sized screens, with recorded evidence of actual audio behavior.

**Blocked by:**
- 02 — Make browser playback checks reproducible.
- 06 — Load setups consistently during playback.
- 07 — Manage and exchange saved sessions.
- 09 — Keep the screen awake during foreground practice.

**Status:** ready-for-agent

- [ ] Exercise Start/Stop/restart, edits while stopped, rapid commands, manual/looping Swar Mandal, and tanpura replacement/failure with actual controls and audio capture.
- [ ] Verify save, update/copy, refresh to silent defaults, explicit reload, partial loading, and current-format import/export with real browser persistence.
- [ ] Exercise tempo changes and queued tabla selections, checking that timing and display follow sounding patterns without duplicate attacks.
- [ ] Verify cold sample loading, failed fetches, cached/uncached offline selections, and recovery. Inspect mixed-output peaks/clipping and silence after Stop and intentional decay.
- [ ] Verify recording and microphone capture remain independently controllable and accurately indicated throughout accompaniment actions.
- [ ] Exercise interruption/resume and wake-lock lifecycle without claiming guaranteed background or locked-screen playback.
- [ ] Fix combined-workflow issues in touch sizing, labels, focus visibility, status announcements, keyboard operation, and horizontal overflow at 320px, 390px, and desktop widths, including expanded editors and saved-session forms.
- [ ] Record browser versions and actual physical devices tested. Cover desktop and phone browsers where available; mark missing physical-phone checks outstanding rather than treating viewport emulation as equivalent.
- [ ] Run production build, lint, relevant automated tests, and the reproducible browser checks. Retain evidence and distinguish automated results from listening/device checks.
- [ ] Update current behavior and developer-workflow documentation, keeping deferred musical review, sample acquisition, profiling, and feature expansion explicitly separate from completed scope.

## Implementation start prompt

In a fresh context, invoke the implementation skill with this document and a ticket number. For example:

> Implement ticket 01 from docs/reliable-playback-tickets.md. Read its source spec and domain glossary. Complete only this ticket, run its relevant checks, and update its status with validation evidence. Preserve unrelated working-tree changes.

For later tickets, verify all listed blockers are complete before starting. Ticket completion should record any unresolved limitations rather than silently dropping acceptance criteria.
