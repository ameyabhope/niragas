# Niragas

Niragas provides accompaniment and practice tools for Indian classical music.

## Language

**Practice session**:
The current accompaniment setup and its playback state while the website is open. Stopping retains the setup; a fresh page load starts with defaults.
_Avoid_: Recording, saved session

**Saved session**:
A named, explicitly saved accompaniment setup that can be loaded again after refresh. It captures musical settings and selected instruments, not playback position or a recording.
_Avoid_: Practice history, recording

**Factory preset**:
A supplied starting setup for practice. Loading it uses the same setup controls as loading a saved session.

**Enabled instrument**:
An instrument selected and available for use. An enabled manual instrument may be silent between actions.
_Avoid_: Playing, sounding

**Playing accompaniment**:
An ongoing drone or repeating musical pattern. An enabled Swar Mandal awaiting a manual strum is not playing accompaniment.
_Avoid_: Enabled

**Manual strum**:
A single player-triggered Swar Mandal sweep, with no automatic repetition.

**Auto-loop**:
Automatic repetition of Swar Mandal strums at the selected interval.
