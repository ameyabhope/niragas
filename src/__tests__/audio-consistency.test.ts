import { afterEach, describe, expect, it } from 'vitest';
import { TAAL_LIST, getTaal } from '@/data/taals';
import { getBolSamplerNote } from '@/audio/sample-loader';
import {
  computePitchShiftSt,
  TANPURA_SAMPLE_GAIN_DB,
} from '@/audio/tanpura';
import { getSpeedRange, getThekaForSpeed } from '@/lib/taal';
import { setA4Freq, swarToFreq } from '@/lib/notes';
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
          for (const bol of theka ?? []) {
            expect(getBolSamplerNote(bol.name), `${taal.id}: ${bol.name}`).not.toBeNull();
          }
        }
      }
    }
  });

  it('has gain compensation for every tanpura source recording', () => {
    expect(Object.keys(TANPURA_SAMPLE_GAIN_DB)).toHaveLength(17);
    expect(Object.values(TANPURA_SAMPLE_GAIN_DB).every(Number.isFinite)).toBe(true);
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
    const e4FromFs3AtSlowSpeed = computePitchShiftSt(329.6276 / 185, 0, 0.7);
    expect(e4FromFs3AtSlowSpeed).toBeCloseTo(16.17, 1);
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
