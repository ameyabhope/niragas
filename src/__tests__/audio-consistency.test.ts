import { afterEach, describe, expect, it } from 'vitest';
import { TAAL_LIST, getTaal } from '@/data/taals';
import { expandTablaBols } from '@/audio/tabla';
import { getBolSample } from '@/audio/sample-loader';
import {
  resolveTanpuraSample,
  TANPURA_SAMPLE_GAIN_DB,
} from '@/audio/tanpura';
import { tanpuraPitchRate } from '@/audio/tanpura-processing';
import { getSpeedRange, getThekaForSpeed } from '@/lib/taal';
import { noteToFreq, setA4Freq, swarToFreq } from '@/lib/notes';
import { useTablaStore } from '@/store/tabla-store';

afterEach(() => {
  setA4Freq(440);
  useTablaStore.setState({
    taalId: 'teentaal',
    styleId: 'theka',
    tempo: 120,
    playing: false,
    currentMatra: 1,
    currentDivisionLabel: null,
  });
});

describe('audio data coverage', () => {
  it('maps every used tabla bol to a recorded stroke or alias', () => {
    for (const taal of TAAL_LIST) {
      for (const style of taal.styles) {
        for (const theka of Object.values(style.thekas)) {
          for (const bol of expandTablaBols(theka ?? [])) {
            const composites: Record<string, string[]> = {
              Dha: ['Ge', 'Na'], Dhin: ['Ge', 'Tin'], Dhi: ['Ge', 'Tin'], Di: ['Ge', 'Tin'],
            };
            for (const stroke of composites[bol.name] ?? [bol.name]) {
              expect(getBolSample(stroke), `${taal.id}: ${bol.name}`).not.toBeNull();
            }
          }
        }
      }
    }
  });

  it('has gain compensation for every tanpura source recording', () => {
    expect(Object.keys(TANPURA_SAMPLE_GAIN_DB)).toHaveLength(17);
    expect(Object.values(TANPURA_SAMPLE_GAIN_DB).every(Number.isFinite)).toBe(true);
  });

  it('routes G3 through audible F-sharp sources for every tanpura tuning', () => {
    const g3 = noteToFreq('G', 3);
    for (const tuning of ['Pa', 'Ma', 'Ni'] as const) {
      const selection = resolveTanpuraSample(tuning, 'bass', g3);
      expect(selection.url).toBe(`/samples/tanpura/${tuning}_Fs.m4a`);
      expect(selection.key).toBe(`${tuning}_Fs_neutral`);
      expect(TANPURA_SAMPLE_GAIN_DB[selection.key]).toBeTypeOf('number');
      expect(tanpuraPitchRate(selection.baseRate, 0)).toBeCloseTo(g3 / 185, 5);
    }
  });
});

describe('shared tuning', () => {
  it('applies cents and the A4 reference to swar frequencies', () => {
    const standard = swarToFreq('A', 4, 0, 'Sa');
    expect(standard).toBeCloseTo(440, 5);

    setA4Freq(432);
    expect(swarToFreq('A', 4, 0, 'Sa')).toBeCloseTo(432, 5);
    expect(swarToFreq('A', 4, 50, 'Sa')).toBeCloseTo(432 * Math.pow(2, 50 / 1200), 5);
  });

  it('does not clamp high tanpura corrections out of tune', () => {
    expect(tanpuraPitchRate(329.6276 / 185, 50)).toBeCloseTo(329.6276 / 185 * 2 ** (50 / 1200), 6);
  });
});

describe('taal tempo behavior', () => {
  it('falls back to the nearest available speed-specific theka', () => {
    const teentaal = getTaal('teentaal');
    const style = teentaal.styles[0];
    expect(getSpeedRange(teentaal, 20)).toBe('ati-vilambit');
    expect(getThekaForSpeed(style, 'ati-vilambit')).toBe(style.thekas.vilambit);
    expect(getThekaForSpeed(style, 'ati-drut')).toBe(style.thekas.drut);
  });

  it('clamps displayed tempo when changing taal', () => {
    const tabla = useTablaStore.getState();
    tabla.setTempo(700);
    useTablaStore.getState().setTaalId('dadra');
    expect(useTablaStore.getState().tempo).toBe(400);
  });
});
