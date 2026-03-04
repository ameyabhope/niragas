import type { TaalDefinition } from '@/audio/types';

/**
 * Rupak - 7 matras
 * Divisions: 0 2 3 (Khaali, Taali, Taali) - unusually starts on khaali
 * Theka: Ti Ti Na | Dhi Na | Dhi Na
 */
export const rupak: TaalDefinition = {
  id: 'rupak',
  name: 'Rupak',
  matras: 7,
  divisions: [
    { matra: 1, type: 'khaali', label: '0' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 6, type: 'taali', label: '3' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 60,
    madhya: 120,
    drut: 240,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        vilambit: [
          { name: 'Ti', position: 1, velocity: 0.9 },
          { name: 'Ke', position: 1.5, velocity: 0.4 },
          { name: 'Ti', position: 2, velocity: 0.6 },
          { name: 'Na', position: 3, velocity: 0.7 },
          { name: 'Trkt', position: 3.5, velocity: 0.4 },
          { name: 'Dhi', position: 4, velocity: 1.0 },
          { name: 'Ge', position: 4.5, velocity: 0.4 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Dhi', position: 6, velocity: 0.9 },
          { name: 'Ge', position: 6.5, velocity: 0.4 },
          { name: 'Na', position: 7, velocity: 0.7 },
        ],
        madhya: [
          { name: 'Ti', position: 1, velocity: 0.9 },
          { name: 'Ti', position: 2, velocity: 0.6 },
          { name: 'Na', position: 3, velocity: 0.7 },
          { name: 'Dhi', position: 4, velocity: 1.0 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Dhi', position: 6, velocity: 0.9 },
          { name: 'Na', position: 7, velocity: 0.7 },
        ],
        drut: [
          { name: 'Ti', position: 1, velocity: 0.8 },
          { name: 'Ti', position: 2, velocity: 0.5 },
          { name: 'Na', position: 3, velocity: 0.6 },
          { name: 'Dhi', position: 4, velocity: 1.0 },
          { name: 'Na', position: 5, velocity: 0.6 },
          { name: 'Dhi', position: 6, velocity: 0.8 },
          { name: 'Na', position: 7, velocity: 0.6 },
        ],
      },
    },
  ],
};
