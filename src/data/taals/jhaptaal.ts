import type { TaalDefinition } from '@/audio/types';

/**
 * Jhaptaal - 10 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Theka: Dhi Na | Dhi Dhi Na | Ti Na | Dhi Dhi Na
 */
export const jhaptaal: TaalDefinition = {
  id: 'jhaptaal',
  name: 'Jhaptaal',
  matras: 10,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'taali', label: '2' },
    { matra: 6, type: 'khaali', label: '0' },
    { matra: 8, type: 'taali', label: '3' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 20, max: 500 },
  speedBreakpoints: {
    vilambit: 60,
    madhya: 120,
    drut: 240,
    atiDrut: 380,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        vilambit: [
          { name: 'Dhi', position: 1, velocity: 1.0 },
          { name: 'Ge', position: 1.5, velocity: 0.4 },
          { name: 'Na', position: 2, velocity: 0.7 },
          { name: 'Dhi', position: 3, velocity: 0.9 },
          { name: 'Ge', position: 3.5, velocity: 0.4 },
          { name: 'Dhi', position: 4, velocity: 0.7 },
          { name: 'Trkt', position: 4.5, velocity: 0.4 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Ti', position: 6, velocity: 0.9 },
          { name: 'Ke', position: 6.5, velocity: 0.4 },
          { name: 'Na', position: 7, velocity: 0.7 },
          { name: 'Dhi', position: 8, velocity: 0.9 },
          { name: 'Ge', position: 8.5, velocity: 0.4 },
          { name: 'Dhi', position: 9, velocity: 0.7 },
          { name: 'Trkt', position: 9.5, velocity: 0.4 },
          { name: 'Na', position: 10, velocity: 0.7 },
        ],
        madhya: [
          { name: 'Dhi', position: 1, velocity: 1.0 },
          { name: 'Na', position: 2, velocity: 0.7 },
          { name: 'Dhi', position: 3, velocity: 0.9 },
          { name: 'Dhi', position: 4, velocity: 0.7 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Ti', position: 6, velocity: 0.9 },
          { name: 'Na', position: 7, velocity: 0.7 },
          { name: 'Dhi', position: 8, velocity: 0.9 },
          { name: 'Dhi', position: 9, velocity: 0.7 },
          { name: 'Na', position: 10, velocity: 0.7 },
        ],
        drut: [
          { name: 'Dhi', position: 1, velocity: 1.0 },
          { name: 'Na', position: 2, velocity: 0.6 },
          { name: 'Dhi', position: 3, velocity: 0.8 },
          { name: 'Dhi', position: 4, velocity: 0.6 },
          { name: 'Na', position: 5, velocity: 0.6 },
          { name: 'Ti', position: 6, velocity: 0.8 },
          { name: 'Na', position: 7, velocity: 0.6 },
          { name: 'Dhi', position: 8, velocity: 0.8 },
          { name: 'Dhi', position: 9, velocity: 0.6 },
          { name: 'Na', position: 10, velocity: 0.6 },
        ],
      },
    },
  ],
};
