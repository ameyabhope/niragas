import type { TaalDefinition } from '@/audio/types';

/**
 * Keherva - 8 matras
 * Divisions: X 0 (Sam, Khaali)
 * Theka: Dha Ge Na Ti | Na Ka Dhi Na
 */
export const keherva: TaalDefinition = {
  id: 'keherva',
  name: 'Keherva',
  matras: 8,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'khaali', label: '0' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 40, max: 500 },
  speedBreakpoints: {
    vilambit: 80,
    madhya: 140,
    drut: 280,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Ge', position: 2, velocity: 0.6 },
          { name: 'Na', position: 3, velocity: 0.7 },
          { name: 'Ti', position: 4, velocity: 0.7 },
          { name: 'Na', position: 5, velocity: 0.9 },
          { name: 'Ka', position: 6, velocity: 0.6 },
          { name: 'Dhi', position: 7, velocity: 0.8 },
          { name: 'Na', position: 8, velocity: 0.7 },
        ],
      },
    },
  ],
};
