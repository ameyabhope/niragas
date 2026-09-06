import { create } from 'zustand';

/** Playback intent lives for this page only; instrument stores retain the setup. */
export const useSessionStore = create(() => ({ requested: false, running: false }));
