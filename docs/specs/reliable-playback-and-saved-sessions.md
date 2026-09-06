# Reliable playback, shared controls, and saved sessions

## Problem Statement

Musicians need accompaniment that starts, stops, and resumes predictably while they practise on a desktop or phone. Today, playback commands are distributed across the header, instrument panels, mixer, keyboard handling, and an unfinished session implementation. An instrument can appear enabled while silent, and pending tanpura preparation can act on an outdated playback request. Loading a preset also conflates selecting a setup with starting sound.

Players need to stop without losing their current settings, deliberately save a setup to revisit later, and return to a clean default setup after refreshing the page. Existing preset functionality provides much of the necessary storage and editing capability, but these session lifetimes and playback rules are not explicit.

Unused feature prototypes, duplicated state, obsolete compatibility paths, and misleading comments increase maintenance work before the next instrument has even been integrated.

## Solution

Make existing playback reliable through shared commands and an explicit distinction between a practice session, a saved session, and playing accompaniment. Global Stop retains the current setup; Start resumes it. A fresh page load returns to defaults and stays silent. Explicitly saved sessions survive refresh and can be loaded on demand.

Use one setup model for saved sessions and factory presets. Loading a setup changes musical configuration while preserving the current playback intent. Keep existing audio playing during tanpura preparation until the latest requested replacement is ready, and make Stop override all pending work.

Deliver an accessible website for desktop and phone browsers, with optional screen wake lock during playing accompaniment and clear recovery from interruptions. Remove unfinished percussion surfaces and unnecessary code before expanding features.

## User Stories

1. As a musician, I want global Stop to silence accompaniment, so that I can pause practice immediately.
2. As a musician, I want Stop to retain my instrument selections and settings, so that I do not need to rebuild my setup.
3. As a musician, I want Start to resume my current setup, so that I can continue practice with the same sound and tempo.
4. As a musician, I want repeated Start or Stop actions to be safe, so that accidental taps do not create duplicate playback or lose my setup.
5. As a musician, I want Stop to cancel pending starts, so that sound does not begin after I have stopped.
6. As a musician, I want to edit my setup while stopped, so that the next Start uses those edits.
7. As a musician, I want a refreshed page to use defaults and remain silent, so that reopening the website gives me a predictable starting point.
8. As a musician, I want to save my setup under a name, so that I can revisit it later.
9. As a musician, I want saved sessions to remain available after refresh, so that saving is meaningfully different from pausing.
10. As a musician, I want to update a saved session or save a separate copy, so that I can refine or retain variations of a setup.
11. As a musician, I want to find and load saved sessions, so that I can return to a familiar practice configuration quickly.
12. As a musician, I want to delete saved sessions I no longer need, so that my collection remains manageable.
13. As a musician, I want changes to the current session to leave saved sessions unchanged until I save, so that experimentation does not overwrite my setups.
14. As a musician, I want saving a session to report success or failure accurately, so that I know whether it will be available later.
15. As a musician, I want saved sessions to include pitch, instrument selections, tuning, rhythm, mixer, EQ, and Swar Mandal settings, so that loading restores the intended setup.
16. As a musician, I want loading a saved session while stopped to remain silent, so that selecting a setup does not unexpectedly start sound.
17. As a musician, I want loading a setup during playback to apply its settings without an unnecessary global stop, so that I can change my practice configuration in place.
18. As a musician, I want factory presets and saved sessions to follow the same loading rules, so that I only have one workflow to learn.
19. As a musician, I want the existing preserve-Sa, preserve-tempo, and selective-loading options to remain available, so that I can reuse part of a setup.
20. As a musician, I want setup import and export to work with the new format, so that I can retain copies outside browser storage.
21. As a musician, I want the header, mixer, instrument controls, and keyboard shortcuts to use consistent playback rules, so that the same action has the same effect everywhere.
22. As a musician, I want a manual Swar Mandal to remain available between strums without being described as playing, so that its status matches what I hear.
23. As a musician, I want Strum Once to produce one sweep and auto-loop to repeat at my chosen interval, so that these actions remain distinct.
24. As a musician, I want Stop to cancel pending strums while retaining the auto-loop setting, so that restarting does not change my arrangement.
25. As a musician, I want the old tanpura sound to continue while a replacement is prepared, so that changing tuning does not create an avoidable gap.
26. As a musician, I want only the latest rapid tuning change to take effect, so that stale requests do not replace my final selection.
27. As a musician, I want failed sample preparation to retain the previous sound and show a useful error, so that I can recover without guessing what happened.
28. As a musician, I want the beat display to follow the sounding tabla pattern, so that queued changes do not mislead me.
29. As a phone user, I want touch controls, readable status, and layouts that fit the screen, so that I can practise without horizontal scrolling or precise tapping.
30. As a keyboard or assistive-technology user, I want labelled controls, visible focus, and announced loading/error states, so that I can operate the same practice workflow.
31. As a phone user, I want an optional keep-screen-awake setting during playing accompaniment, so that visible-page practice can continue without repeated screen touches.
32. As a phone user, I want interruption status and an explicit Resume action, so that I can recover when the browser suspends audio.
33. As a musician, I want global accompaniment controls to leave recording and microphone capture under their own controls, so that stopping the instruments does not unexpectedly end a take.
34. As a musician, I want only playable instruments in the mixer, so that unavailable prototypes do not clutter the practice interface.
35. As a maintainer, I want one owner for each setting and a small shared playback boundary, so that fixes apply consistently across the website.
36. As a maintainer, I want repeatable browser checks of sound and controls, so that a passing unit test is not mistaken for working playback.

## Implementation Decisions

- Prioritize existing playback reliability and shared controls. Keep the existing playable instruments, musical catalogue, recording, tuner, mixer, EQ, and setup workflows. Additional percussion and fills remain future work.
- Model the current practice session as temporary page-lifetime configuration and playback intent. Stop changes playback intent without resetting configuration. Settings edited while stopped become the setup used by the next Start; an older snapshot must not overwrite them.
- A fresh page load, including hard refresh, resets the current practice session to defaults and does not autoplay or automatically load the last saved session. Saved sessions remain in persistent browser storage. This reset concerns practice configuration, not deletion of the saved-session collection or recordings.
- Default Start uses Tanpura 1, following the existing default-start behavior; retain the established defaults for other musical settings. Start after Stop uses the current retained setup.
- Interpret resume as resuming the setup, without preserving sample offsets or a mid-cycle transport cursor. Restart tabla at sam. This is the concrete interpretation used by this spec; it follows the earlier recommendation and the user's emphasis on previous settings.
- A saved session is a named snapshot of configuration. Capture pitch and reference frequency; enabled instruments; both tanpura tunings, source variants, fine pitch and speed; tabla taal, style and tempo; Swar Mandal string configuration and auto-loop interval; mixer and master settings; and EQ configuration.
- Exclude transient playback state, pending changes, loading/error states, audio buffers, microphone permissions, recording state, transport position, and wake-lock handles from saved sessions. Saving during playback must not encode an instruction to autoplay later.
- Reuse the existing preset capture/load, validation, and IndexedDB capabilities for saved sessions. Present user-created setups as saved sessions and supplied setups as factory presets. Do not build a second parallel persistence system. Keep save, explicit update, save-as-copy, naming, search, favorites, delete, and validated import/export capabilities together.
- Loading a factory preset or saved session preserves current playback intent. While stopped, it configures without starting sound. While running, it applies the requested setup through shared playback commands. A setup with no repeating accompaniment can become silent without inventing a fallback instrument. Preserve selective loading and independent preserve-Sa/preserve-tempo choices.
- Apply related setup fields coherently so intermediate updates cannot start an outdated instrument or schedule a transient taal/style combination. Existing next-sam taal transitions and next-beat style changes remain; the display follows the sounding selection.
- Use a narrow shared session/instrument command boundary for global controls, instrument toggles, mixer toggles, keyboard actions, and supported Media Session play/pause/stop actions. Retain shortcut targets unless a change is necessary for consistency: Space continues to control tabla. Consolidate the unfinished session implementation with the existing header logic rather than keeping both.
- Make Stop synchronous with respect to cancellation intent, safe during initialization and sample preparation, and independent of successful audio initialization. Repeated Start must not duplicate schedulers or nodes. Repeated Stop must not erase retained configuration. New explicit commands supersede stale asynchronous requests.
- Enabled means selected and available. Playing accompaniment means an ongoing drone or repeating pattern. An idle enabled manual Swar Mandal does not alone drive playing status or hold a wake lock. Enabling manual mode consistently arms the instrument; Strum Once triggers the manual sound. Avoid duplicate initial strums when enabling auto-loop.
- Global Stop cancels queued starts and one-shot strums as well as loops. Allow the intentional short stop fade/decay, then require silence without later attacks. Recording and microphone capture remain separately controlled and visibly indicated.
- During tanpura replacement, continue the previous sound until the latest replacement is ready and crossfade into it. Cancel or ignore superseded preparation. On failure, retain the prior playable source, surface the error, and permit retry. Stop overrides both the old source and replacement requests. Preserve engine cancellation, source ownership, and audio-clock retirement safeguards while removing redundant outer synchronization.
- Give instrument selection to instrument/session configuration and volume, pan, and mute to the mixer. Derive displayed enable state instead of persisting mirrors. Remove duplicate configuration fields that exist only to reconcile copies.
- Existing saved data and old exports impose no backward-compatibility requirement. Adopt one current validated schema, remove obsolete migration logic and unused indexes, and define a simple incompatible-data reset/rejection policy. Preserve validation of new data and truthful failures. The authorization to break compatibility does not require indiscriminate deletion of unrelated data.
- Remove unused Manjira/metronome engine prototypes, disabled mixer rows, and their unused configuration/types/call sites. Retain the existing simple beat patterns that are playable through tabla; they are distinct from the unfinished standalone metronome.
- Delete unused alternate audio APIs after checking application, test, and retained validation-harness references. Remove unused EQ state and replace the tabla sample loader's artificial note-key adapter with canonical bol identifiers while retaining bol aliases and tuning behavior.
- Simplify tap tempo by checking the gap on the next tap, using average spacing from first/last timestamps, and removing its unused reset API. Derive the taal map from the ordered catalogue. Remove ineffective callback memoization and other proven dead code.
- Remove comments that restate names or visible markup; correct misleading persistence, loop-ownership, sample-loader, and metronome claims. Retain comments explaining musical assumptions, units, asynchronous ownership, cancellation, and audio timing. Avoid introducing a generic instrument plugin framework or a replacement application-wide state architecture.
- Provide optional screen wake lock only while requested, visible, and accompaniment is playing with a running audio context. Release on stop, hiding, disabling, or unmount; safely release stale asynchronous acquisitions. Reacquire on visibility return only when still eligible. Report unsupported, denied, released, and held states accurately.
- Show suspended/interrupted audio status and offer user-gesture Resume. Preserve the current setup through interruption. Do not forcibly resume in the background. Where supported, Media Session metadata reflects current Sa and sounding taal, its handlers use shared commands, and handlers are cleaned up without seek controls.
- Use the new spec as the current implementation authority. Mark the older broad plan and interrupted implementation handoff as historical where they conflict. Keep future musical review, sample acquisition, profiling, and feature expansion visible as deferred work.

## Testing Decisions

- Prefer one primary integration seam: the shared practice-session commands and observable session state. Exercise real setup/instrument stores through this seam, controlling asynchronous audio preparation and browser APIs at external boundaries. Check audible scheduling, resulting configuration, status, and persistence behavior; avoid assertions about private queues, map layout, setter counts, or incidental function order.
- The testing seam is proposed here from the existing code and accepted product behavior. It has not received a separate user review; the user's request to synthesize without further interview takes precedence over an additional seam-confirmation round.
- Cover Start/Stop/restart, rapid repeated commands, Stop during initialization, Stop during replacement, editing settings while stopped, and consistent actions from different controls. Assert no duplicate loops or stale starts and that retained settings survive until refresh.
- Cover manual Swar Mandal enabled-but-idle state, one-shot cancellation, first-strum deduplication, auto-loop restoration, and the absence of wake lock for idle manual selection.
- Extend existing preset capture/load and validation tests for saved-session round trips, snapshot independence, explicit update versus copy, silent loading while stopped, loading while playing, partial loads, preserve-Sa/preserve-tempo, and invalid current-format imports. Replace tests whose sole purpose is preserving deliberately removed legacy behavior.
- Test actual IndexedDB persistence in the browser: save a setup, modify the current session, refresh, verify default silent configuration, and explicitly reload the saved setup. Include save failure and retry. Hard refresh must not erase newly saved sessions.
- Extend existing tanpura lifecycle tests with deferred preparation to force latest-request wins, failure retention, and Stop races through the shared command boundary. Keep existing processing, tabla selection/timing, Swar Mandal, recorder persistence, tuner freshness, and resource-lifecycle tests as regression coverage.
- Use controllable browser API boundaries for wake-lock denial, lack of support, visibility changes, automatic release, stale acquisition, cleanup, and context suspension/resume. Verify recording and microphone controls remain independent of global accompaniment Stop.
- Make browser audio/control validation reproducible early, with documented prerequisites and isolated browser/server lifecycle. Existing temporary audio-render scenarios must be inspected before reuse. Retain representative PCM excerpts and timing results to compare Stop silence, duplicate attacks, tanpura replacement, queued taal changes, tempo changes, and mixed-output clipping.
- Exercise actual controls during playback, cold sample loading, failed fetches, and cached/uncached offline selections. Do not certify sound behavior from mocked engine tests alone.
- Validate keyboard operation, focus visibility, control labels, status announcements, and expanded editors at 320px, 390px, and desktop widths. Cover current desktop browsers and phone Safari/Chrome where available; report the actual tested browser/device combinations rather than assuming desktop emulation proves phone audio behavior.
- Complete production build, lint, relevant automated tests, and browser playback checks. The inspected baseline had 104 passing tests and a passing production build, with lint failing in the unfinished session controls. Those results are a baseline, not evidence that this proposed work is complete.

## Out of Scope

- Playable Manjira, standalone metronome, tabla fills, laggi, tihai, and other new instrument/expert features.
- Acoustic sample acquisition, new musical content, musician certification, and broad catalogue revision. Existing provenance and distribution follow-ups remain tracked separately.
- Worker migration or cache redesign without profiling evidence, and a general instrument plugin architecture.
- Backward compatibility with existing saved setups or older export schemas.
- Cloud accounts, cross-device synchronization, session history, practice analytics, autosaving/restoring the last working session, and saving playback cursor positions.
- Saving microphone permission or active recording into a saved session.
- Guaranteed background or locked-screen audio, installed-PWA-specific acceptance, and native mobile application behavior.
- Removing existing playable features merely because they are outside the central session workflow.
- Implementing application changes as part of this specification-writing task.

## Further Notes

- The user selected existing playback reliability over feature expansion, allowed breaking changes to old data, accepted the enabled/playing distinction, and targeted an accessible desktop-and-phone website.
- The user subsequently required Start/Stop to retain the previous settings until hard refresh, added explicitly saved sessions, and accepted the recommendations for silent preset loading, latest tanpura replacement, foreground phone practice, and prototype removal.
- To make these decisions executable without another interview, this spec treats every fresh page load as the default-reset boundary and resume as restoring setup with tabla restarting at sam. Explicit saved sessions remain durable across that reset. This does not add transport-position persistence.
- Phone model/browser was not supplied. Physical-device coverage must be recorded when performed; browser API mocks and viewport emulation do not complete that acceptance work.
- Intended issue triage label: `ready-for-agent`. Publication has not occurred: the repository points to GitHub, but project tracker/triage setup was not supplied and the GitHub CLI is unavailable in this environment. Run `/setup-matt-pocock-skills` to establish the publishing workflow.
