import { describe, it, expect } from 'vitest';
import { TAAL_LIST, TAAL_MAP } from '@/data/taals';

describe('taal data integrity', () => {
  it('has at least 40 taals', () => {
    expect(TAAL_LIST.length).toBeGreaterThanOrEqual(40);
  });

  it('TAAL_MAP and TAAL_LIST are consistent', () => {
    for (const taal of TAAL_LIST) {
      expect(TAAL_MAP[taal.id]).toBe(taal);
    }
  });

  it('every taal has a non-empty id and name', () => {
    for (const taal of TAAL_LIST) {
      expect(taal.id).toBeTruthy();
      expect(taal.name).toBeTruthy();
    }
  });

  it('every taal has at least 1 matra', () => {
    for (const taal of TAAL_LIST) {
      expect(taal.matras).toBeGreaterThanOrEqual(1);
    }
  });

  it('every taal has at least one division', () => {
    for (const taal of TAAL_LIST) {
      expect(taal.divisions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('division matra positions are within the matra count', () => {
    for (const taal of TAAL_LIST) {
      for (const div of taal.divisions) {
        expect(div.matra).toBeGreaterThanOrEqual(1);
        expect(div.matra).toBeLessThanOrEqual(taal.matras);
      }
    }
  });

  it('every taal has at least one style', () => {
    for (const taal of TAAL_LIST) {
      expect(taal.styles.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every style has at least one theka', () => {
    for (const taal of TAAL_LIST) {
      for (const style of taal.styles) {
        const thekaKeys = Object.keys(style.thekas);
        expect(thekaKeys.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('speed breakpoints are ordered: vilambit < madhya < drut', () => {
    for (const taal of TAAL_LIST) {
      const bp = taal.speedBreakpoints;
      expect(bp.vilambit).toBeLessThan(bp.madhya);
      expect(bp.madhya).toBeLessThan(bp.drut);
      if (bp.atiVilambit !== undefined) {
        expect(bp.atiVilambit).toBeLessThan(bp.vilambit);
      }
      if (bp.atiDrut !== undefined) {
        expect(bp.atiDrut).toBeGreaterThanOrEqual(bp.drut);
      }
    }
  });

  it('bol positions in thekas are within matra count', () => {
    for (const taal of TAAL_LIST) {
      for (const style of taal.styles) {
        for (const [, bols] of Object.entries(style.thekas)) {
          if (!bols) continue;
          for (const bol of bols) {
            expect(bol.position).toBeGreaterThanOrEqual(1);
            expect(bol.position).toBeLessThanOrEqual(taal.matras + 0.99);
          }
        }
      }
    }
  });

  it('all taal IDs are unique', () => {
    const ids = TAAL_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tempo ranges have min < max', () => {
    for (const taal of TAAL_LIST) {
      expect(taal.tempoRange.min).toBeLessThan(taal.tempoRange.max);
    }
  });
});
