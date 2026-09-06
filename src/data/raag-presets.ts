/**
 * Factory raag presets.
 *
 * Practice starting points, not authoritative performance prescriptions.
 * Only the explicitly listed raags have starter Swar Mandal inventories;
 * all others use Sa only until the player tunes them. Pitch labels are legacy.
 */

import type { Preset, TanpuraConfig, TanpuraTuning, SwarName, SwarMandalStringConfig } from '@/audio/types';

// Lower-case initials denote komal; M denotes tivra Ma. These inventories
// do not encode aroha/avaroha, ornamentation, or gharana-specific practice.
const RAAG_NOTES: Record<string, string> = {
  yaman: 'S R G M P D N',
  bilawal: 'S R G m P D N',
  bhairav: 'S r G m P d N',
  'ahir-bhairav': 'S r G m P D n',
  malkauns: 'S g m d n',
  chandrakauns: 'S g m d N',
  bhairavi: 'S r g m P d n',
  bhimpalasi: 'S R g m P D n',
  durga: 'S R m P D',
  bhupali: 'S R G P D',
  deshkar: 'S R G P D',
  hamsadhwani: 'S R G P N',
  marwa: 'S r G M D N',
  puriya: 'S r G M D N',
  hindol: 'S G M D N',
  kalavati: 'S G P D n',
};

function raagKey(id: string): string {
  return id.replace(/^factory-/, '').replace(/-(women|ektaal|jhaptaal|jhoomra|rupak|deepchandi)$/, '');
}

export function hasRaagSwarMandal(id: string): boolean {
  return Object.hasOwn(RAAG_NOTES, raagKey(id));
}

function raagStrings(id: string): SwarMandalStringConfig[] {
  const notes: Record<string, SwarName> = { S: 'Sa', R: 'Re', G: 'Ga', M: 'Ma', P: 'Pa', D: 'Dha', N: 'Ni' };
  const tokens = (RAAG_NOTES[raagKey(id)] ?? 'S').split(' ');
  return [...tokens, 'S'].map((token, index) => ({
    note: notes[token.toUpperCase()],
    variant: token === 'M' ? 'tivra' : token === token.toLowerCase() && token !== 'm' ? 'komal' : 'shuddha',
    octaveOffset: index === tokens.length ? 1 : 0,
    enabled: true,
  }));
}

// Narrow corrections for clearly absent drone pitches, without claiming a
// complete string inventory for these raags or a preferred performance tuning.
const DRONE_CORRECTIONS: Record<string, TanpuraTuning> = {
  bageshri: 'Ma',
  darbari: 'Pa',
  rageshree: 'Ma',
  'gujari-todi': 'Ni',
};

function makeTanpura(
  firstString: TanpuraTuning,
  enabled = true
): TanpuraConfig {
  return {
    enabled,
    tuning: firstString,
    eq: 'neutral',
    finePitchCents: 0,
    speed: 1.0,
  };
}

const defaultMixer = () => ({
  tanpura1: { volume: 0.75, pan: -0.3, muted: false },
  tanpura2: { volume: 0.75, pan: 0.3, muted: false },
  tabla: { volume: 0.75, pan: 0, muted: false },
  surpeti: { volume: 0.75, pan: 0, muted: false },
  swarmandal: { volume: 0.6, pan: 0, muted: false },
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

// Retained solely as the signature of shipped factory data for migration.
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
});

function makePreset(
  id: string,
  name: string,
  note: string,
  octave: number,
  firstString1: TanpuraTuning,
  firstString2: TanpuraTuning,
  taalId: string,
  tempo: number
): Preset {
  const now = Date.now();
  const strings = raagStrings(id);
  const correctedDrone = DRONE_CORRECTIONS[raagKey(id)];
  if (correctedDrone) firstString1 = firstString2 = correctedDrone;
  if (hasRaagSwarMandal(id)) {
    const supports = (tuning: TanpuraTuning) => strings.some((s) => s.note === tuning && s.variant === 'shuddha');
    const supported = (['Pa', 'Ma', 'Ni'] as const).find(supports)!;
    // Avoid an absent shuddha drone note; this is not a tuning prescription.
    if (!supports(firstString1)) firstString1 = supported;
    if (!supports(firstString2)) firstString2 = supported;
  }
  return {
    schemaVersion: 3,
    id: `factory-${id}`,
    name,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    pitch: { note: note as Preset['pitch']['note'], octave, cents: 0, a4Freq: 440 },
    tanpura1: makeTanpura(firstString1, true),
    tanpura2: makeTanpura(firstString2, true),
    tabla: { taalId, styleId: 'theka', tempo, enabled: false },
    surPeti: { enabled: false },
    swarMandal: { ...defaultSwarMandal(), strings },
    mixer: defaultMixer(),
    master: { volume: 0.8, muted: false },
    eq: defaultEQ(),
  };
}

/**
 * Factory practice presets. Unreviewed inventories deliberately fall back to Sa.
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

  // ── Additional Morning Raags (Men C#3) ──
  makePreset('nat-bhairav', 'Nat Bhairav', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('gunakali', 'Gunakali', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('vibhas', 'Vibhas', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('miya-ki-todi', 'Miya ki Todi', 'C#', 3, 'Pa', 'Ni', 'jhaptaal', 60),
  makePreset('gujari-todi', 'Gujari Todi', 'C#', 3, 'Pa', 'Ni', 'jhaptaal', 60),
  makePreset('ahir-lalit', 'Ahir Lalit', 'C#', 3, 'Ma', 'Ni', 'teentaal', 60),
  makePreset('basant', 'Basant', 'C#', 3, 'Ma', 'Ni', 'teentaal', 70),
  makePreset('basant-bahar', 'Basant Bahar', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('bahar', 'Bahar', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('ramkali', 'Ramkali', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),

  // ── Late Morning / Afternoon Raags (Men C#3) ──
  makePreset('gaud-sarang', 'Gaud Sarang', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('shudh-sarang', 'Shudh Sarang', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('madhuvanti', 'Madhuvanti', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('bhupali', 'Bhupali', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('deshkar', 'Deshkar', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('jaunpuri', 'Jaunpuri', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('asawari', 'Asawari', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('komal-rishabh-asawari', 'Komal Rishabh Asawari', 'C#', 3, 'Pa', 'Ni', 'teentaal', 60),

  // ── Evening Raags (Men C#3) ──
  makePreset('puriya-kalyan', 'Puriya Kalyan', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('gauri', 'Gauri', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('shankara', 'Shankara', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('chhayanat', 'Chhayanat', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('sohini', 'Sohini', 'C#', 3, 'Ni', 'Ni', 'teentaal', 70),

  // ── Night Raags (Men C#3) ──
  makePreset('bihagda', 'Bihagda', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('nandkauns', 'Nandkauns', 'C#', 3, 'Ma', 'Ni', 'teentaal', 80),
  makePreset('shahana', 'Shahana', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('jhinjhoti', 'Jhinjhoti', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),
  makePreset('kaushi-kanada', 'Kaushi Kanada', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('adana', 'Adana', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('nayaki-kanada', 'Nayaki Kanada', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('suha-kanada', 'Suha Kanada', 'C#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('gorakh-kalyan', 'Gorakh Kalyan', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('jog', 'Jog', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('jayjaywanti', 'Jayjaywanti', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('kirwani', 'Kirwani', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('charukesi', 'Charukesi', 'C#', 3, 'Pa', 'Ni', 'teentaal', 80),

  // ── Additional (Men C#3) ──
  makePreset('tilang', 'Tilang', 'C#', 3, 'Pa', 'Ni', 'keherva', 100),

  // ── Light / Semi-Classical (Men C#3) ──
  makePreset('pahadi', 'Pahadi', 'C#', 3, 'Pa', 'Ni', 'dadra', 120),
  makePreset('mand', 'Mand', 'C#', 3, 'Pa', 'Ni', 'dadra', 120),
  makePreset('kafi', 'Kafi', 'C#', 3, 'Pa', 'Ni', 'keherva', 120),
  makePreset('sindhu-bhairavi', 'Sindhu Bhairavi', 'C#', 3, 'Pa', 'Ma', 'dadra', 120),
  makePreset('madhyamavati', 'Madhyamavati', 'C#', 3, 'Pa', 'Ni', 'teentaal', 100),

  // ── Raags with specific taal pairings (Men C#3) ──
  makePreset('darbari-ektaal', 'Darbari (Ektaal)', 'C#', 3, 'Pa', 'Ni', 'ektaal', 40),
  makePreset('miyan-ki-malhar-ektaal', 'Miyan ki Malhar (Ektaal)', 'C#', 3, 'Pa', 'Ni', 'ektaal', 50),
  makePreset('yaman-ektaal', 'Yaman (Ektaal)', 'C#', 3, 'Pa', 'Ni', 'ektaal', 55),
  makePreset('marwa-jhaptaal', 'Marwa (Jhaptaal)', 'C#', 3, 'Ni', 'Ni', 'jhaptaal', 55),
  makePreset('malkauns-jhaptaal', 'Malkauns (Jhaptaal)', 'C#', 3, 'Ma', 'Ni', 'jhaptaal', 55),
  makePreset('bhairav-jhaptaal', 'Bhairav (Jhaptaal)', 'C#', 3, 'Pa', 'Ni', 'jhaptaal', 60),
  makePreset('kedar-jhaptaal', 'Kedar (Jhaptaal)', 'C#', 3, 'Pa', 'Ni', 'jhaptaal', 70),
  makePreset('puriya-dhanashree-ektaal', 'Puriya Dhanashree (Ektaal)', 'C#', 3, 'Ni', 'Ni', 'ektaal', 50),
  makePreset('todi-jhoomra', 'Todi (Jhoomra)', 'C#', 3, 'Pa', 'Ni', 'jhoomra', 40),
  makePreset('darbari-jhoomra', 'Darbari (Jhoomra)', 'C#', 3, 'Pa', 'Ni', 'jhoomra', 35),
  makePreset('shree-rupak', 'Shree (Rupak)', 'C#', 3, 'Pa', 'Ni', 'rupak', 70),
  makePreset('bhimpalasi-rupak', 'Bhimpalasi (Rupak)', 'C#', 3, 'Pa', 'Ni', 'rupak', 80),
  makePreset('basant-chautaal', 'Basant (Chautaal)', 'C#', 3, 'Ma', 'Ni', 'chautaal', 60),
  makePreset('bhairavi-deepchandi', 'Bhairavi (Deepchandi)', 'C#', 3, 'Pa', 'Ma', 'deepchandi', 100),
  makePreset('khamaj-deepchandi', 'Khamaj (Deepchandi)', 'C#', 3, 'Pa', 'Ni', 'deepchandi', 100),
  makePreset('tilak-kamod-rupak', 'Tilak Kamod (Rupak)', 'C#', 3, 'Pa', 'Ni', 'rupak', 100),

  // ── Women's pitch presets (G#3) ──
  makePreset('yaman-women', 'Yaman (Women G#)', 'G#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('bhairav-women', 'Bhairav (Women G#)', 'G#', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('bhairavi-women', 'Bhairavi (Women G#)', 'G#', 3, 'Pa', 'Ma', 'dadra', 120),
  makePreset('todi-women', 'Todi (Women G#)', 'G#', 3, 'Pa', 'Ni', 'jhaptaal', 60),
  makePreset('malkauns-women', 'Malkauns (Women G#)', 'G#', 3, 'Ma', 'Ni', 'teentaal', 60),
  makePreset('darbari-women', 'Darbari (Women G#)', 'G#', 3, 'Pa', 'Ni', 'teentaal', 50),
  makePreset('desh-women', 'Desh (Women G#)', 'G#', 3, 'Pa', 'Ni', 'keherva', 120),
  makePreset('bageshri-women', 'Bageshri (Women G#)', 'G#', 3, 'Ma', 'Ni', 'teentaal', 80),
  makePreset('kedar-women', 'Kedar (Women G#)', 'G#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('bihag-women', 'Bihag (Women G#)', 'G#', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('marwa-women', 'Marwa (Women G#)', 'G#', 3, 'Ni', 'Ni', 'teentaal', 60),
  makePreset('puriya-women', 'Puriya (Women G#)', 'G#', 3, 'Ni', 'Ni', 'teentaal', 60),

  // ── Carnatic presets ──
  makePreset('kalyani-carnatic', 'Kalyani (Carnatic)', 'C', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('shankarabharanam', 'Shankarabharanam', 'C', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('kharaharapriya', 'Kharaharapriya', 'C', 3, 'Pa', 'Ni', 'teentaal', 80),
  makePreset('todi-carnatic', 'Todi (Carnatic)', 'D', 3, 'Pa', 'Ni', 'teentaal', 70),
  makePreset('bhairavi-carnatic', 'Bhairavi (Carnatic)', 'D', 3, 'Pa', 'Ni', 'teentaal', 80),
];
