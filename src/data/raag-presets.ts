/**
 * Factory raag presets.
 *
 * Each preset contains pitch, tanpura tuning, taal, and tempo settings
 * optimized for the raag. The tanpura first-string is tuned based on
 * which notes are present in the raag:
 *   - Pa present → first string = Pa
 *   - No Pa, Shuddha Ma present → first string = Ma
 *   - No Pa, No Shuddha Ma → first string = Ni
 *
 * Common conventions:
 *   - Men: Sa = C# (Kali Ek)
 *   - Women: Sa = G# (Kali Char)
 */

import type { Preset, TanpuraConfig, TanpuraStringConfig } from '@/audio/types';
import { DEFAULT_TANPURA_STRINGS } from '@/audio/types';

type SwarName = 'Sa' | 'Re' | 'Ga' | 'Ma' | 'Pa' | 'Dha' | 'Ni';

function makeTanpura(
  firstString: SwarName,
  pan: number,
  enabled = true
): TanpuraConfig {
  const strings: TanpuraStringConfig[] = DEFAULT_TANPURA_STRINGS.map((s) => ({ ...s }));
  strings[0] = { note: firstString, variant: 'shuddha', octaveOffset: 0, customCents: 0, enabled: true };
  return { enabled, strings, pan, volume: 0.75, cycleSpeed: 5 };
}

const defaultMixer = () => ({
  tanpura1: { enabled: true, volume: 0.75, pan: -0.3, muted: false, solo: false },
  tanpura2: { enabled: true, volume: 0.75, pan: 0.3, muted: false, solo: false },
  tabla: { enabled: false, volume: 0.75, pan: 0, muted: false, solo: false },
  surpeti: { enabled: false, volume: 0.75, pan: 0, muted: false, solo: false },
  swarmandal: { enabled: false, volume: 0.6, pan: 0, muted: false, solo: false },
  manjira: { enabled: false, volume: 0.5, pan: 0, muted: false, solo: false },
  metronome: { enabled: false, volume: 0.5, pan: 0, muted: false, solo: false },
});

const defaultEQ = () => ({
  enabled: true,
  bands: [
    { frequency: 60, gain: 0, Q: 0.7, type: 'lowshelf' as BiquadFilterType },
    { frequency: 150, gain: 0, Q: 1.0, type: 'peaking' as BiquadFilterType },
    { frequency: 400, gain: 0, Q: 1.0, type: 'peaking' as BiquadFilterType },
    { frequency: 1000, gain: 0, Q: 1.0, type: 'peaking' as BiquadFilterType },
    { frequency: 2500, gain: 0, Q: 1.0, type: 'peaking' as BiquadFilterType },
    { frequency: 6000, gain: 0, Q: 1.0, type: 'peaking' as BiquadFilterType },
    { frequency: 15000, gain: 0, Q: 0.7, type: 'highshelf' as BiquadFilterType },
  ],
  presetName: 'Flat',
});

const defaultSwarMandal = () => ({
  enabled: false,
  strings: [
    { note: 'Sa' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Re' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Ga' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Ma' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Pa' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Dha' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Ni' as SwarName, variant: 'shuddha' as const, octaveOffset: 0, enabled: true },
    { note: 'Sa' as SwarName, variant: 'shuddha' as const, octaveOffset: 1, enabled: true },
  ],
  autoLoop: false,
  loopDuration: 8,
  volume: 0.6,
});

function makePreset(
  id: string,
  name: string,
  note: string,
  octave: number,
  firstString1: SwarName,
  firstString2: SwarName,
  taalId: string,
  tempo: number
): Preset {
  const now = Date.now();
  return {
    id: `factory-${id}`,
    name,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    pitch: { note: note as Preset['pitch']['note'], octave, cents: 0 },
    tanpura1: makeTanpura(firstString1, -0.3, true),
    tanpura2: makeTanpura(firstString2, 0.3, true),
    tabla: { taalId, styleId: 'theka', tempo, enabled: false },
    surPeti: { enabled: false, volume: 0.75 },
    swarMandal: defaultSwarMandal(),
    manjira: { enabled: false, volume: 0.5 },
    mixer: defaultMixer(),
    eq: defaultEQ(),
  };
}

/**
 * Factory raag presets. Based on common performance conventions.
 */
export const FACTORY_PRESETS: Preset[] = [
  // ── Morning Raags ──
  makePreset('yaman', 'Yaman', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('bhairav', 'Bhairav', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('bilawal', 'Bilawal', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('todi', 'Todi', 'C#', 3, 'Pa', 'Ni', 'jhaptaal', 60),
  makePreset('ahir-bhairav', 'Ahir Bhairav', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('lalit', 'Lalit', 'C#', 3, 'Ma', 'Ni', 'teentaal', 60),
  makePreset('bhatiyar', 'Bhatiyar', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),

  // ── Late Morning / Afternoon Raags ──
  makePreset('sarang', 'Brindavani Sarang', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('desh', 'Desh', 'C#', 3, 'Pa', 'Ni', 'keherva', 120),
  makePreset('bhimpalasi', 'Bhimpalasi', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('multani', 'Multani', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('patdeep', 'Patdeep', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),

  // ── Evening Raags ──
  makePreset('marwa', 'Marwa', 'C#', 3, 'Ni', 'Ni', 'teentaal', 60),
  makePreset('puriya', 'Puriya', 'C#', 3, 'Ni', 'Ni', 'teentaal', 60),
  makePreset('puriya-dhanashree', 'Puriya Dhanashree', 'C#', 3, 'Ni', 'Ni', 'teentaal', 70),
  makePreset('shree', 'Shree', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),

  // ── Night Raags ──
  makePreset('malkauns', 'Malkauns', 'C#', 3, 'Ma', 'Ni', 'teentaal', 60),
  makePreset('bageshri', 'Bageshri', 'C#', 3, 'Ma', 'Ni', 'teentaal', 80),
  makePreset('chandrakauns', 'Chandrakauns', 'C#', 3, 'Ma', 'Ni', 'teentaal', 80),
  makePreset('darbari', 'Darbari Kanada', 'C#', 3, 'Pa', 'Ni', 'teentaal', 50),
  makePreset('kalavati', 'Kalavati', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('yaman-kalyan', 'Yaman Kalyan', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('hindol', 'Hindol', 'C#', 3, 'Ma', 'Ni', 'teentaal', 70),
  makePreset('kedar', 'Kedar', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('hameer', 'Hameer', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('kamod', 'Kamod', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('bihag', 'Bihag', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('rageshree', 'Rageshree', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),

  // ── Seasonal / Devotional ──
  makePreset('megh', 'Megh', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('miyan-ki-malhar', 'Miyan ki Malhar', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('bhairavi', 'Bhairavi', 'C#', 3, 'Pa', 'Ma', 'dadra', 120),
  makePreset('pilu', 'Pilu', 'C#', 3, 'Pa', 'Ni', 'keherva', 120),
  makePreset('khamaj', 'Khamaj', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('tilak-kamod', 'Tilak Kamod', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('durga', 'Durga', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('hamsadhwani', 'Hamsadhwani', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),

  // ── Women's pitch presets (G#) ──
  makePreset('yaman-w', 'Yaman (Women)', 'G#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('bhairavi-w', 'Bhairavi (Women)', 'G#', 3, 'Pa', 'Ma', 'dadra', 120),
  makePreset('desh-w', 'Desh (Women)', 'G#', 3, 'Pa', 'Ni', 'keherva', 120),
  makePreset('bageshri-w', 'Bageshri (Women)', 'G#', 3, 'Ma', 'Ni', 'teentaal', 80),
];
