import type { TaalDefinition } from '@/audio/types';

/**
 * Dadra - 6 matras
 * Divisions: X 0 (Sam, Khaali)
 * Theka: Dha Dhi Na | Dha Tu Na
 */
export const dadra: TaalDefinition = {
  id: 'dadra',
  name: 'Dadra',
  matras: 6,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'khaali', label: '0' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 40, max: 400 },
  speedBreakpoints: {
    vilambit: 80,
    madhya: 140,
    drut: 260,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhi', position: 2, velocity: 0.7 },
          { name: 'Na', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.9 },
          { name: 'Tu', position: 5, velocity: 0.6 },
          { name: 'Na', position: 6, velocity: 0.7 },
        ],
      },
    },
    {
      id: 'variation1',
      name: 'Variation 1',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Ge', position: 1.5, velocity: 0.4 },
          { name: 'Dhi', position: 2, velocity: 0.7 },
          { name: 'Na', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.9 },
          { name: 'Ge', position: 4.5, velocity: 0.4 },
          { name: 'Tu', position: 5, velocity: 0.6 },
          { name: 'Na', position: 6, velocity: 0.7 },
        ],
      },
    },
  ],
};
