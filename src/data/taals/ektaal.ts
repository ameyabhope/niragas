import type { TaalDefinition } from '@/audio/types';

/**
 * Ektaal - 12 matras
 * Divisions: X 0 2 0 3 4 (Sam, Khaali, Taali, Khaali, Taali, Taali)
 * Theka: Dhin Dhin | Dha Ge | Ti Ra Ki Ta | Tu Na | Ka Ta | Dhi Na
 */
export const ektaal: TaalDefinition = {
  id: 'ektaal',
  name: 'Ektaal',
  matras: 12,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'khaali', label: '0' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 7, type: 'khaali', label: '0' },
    { matra: 9, type: 'taali', label: '3' },
    { matra: 11, type: 'taali', label: '4' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 500 },
  speedBreakpoints: {
    atiVilambit: 30,
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
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Dha', position: 3, velocity: 0.9 },
          { name: 'Ge', position: 3.5, velocity: 0.4 },
          { name: 'Trkt', position: 4, velocity: 0.4 },
          { name: 'Tu', position: 5, velocity: 0.7 },
          { name: 'Na', position: 6, velocity: 0.7 },
          { name: 'Kat', position: 7, velocity: 0.7 },
          { name: 'Ta', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.9 },
          { name: 'Ge', position: 9.5, velocity: 0.4 },
          { name: 'Trkt', position: 10, velocity: 0.4 },
          { name: 'Dhin', position: 11, velocity: 0.7 },
          { name: 'Na', position: 12, velocity: 0.7 },
        ],
        madhya: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Dha', position: 3, velocity: 0.9 },
          { name: 'Ge', position: 4, velocity: 0.6 },
          { name: 'Ti', position: 5, velocity: 0.9 },
          { name: 'Ta', position: 6, velocity: 0.6 },
          { name: 'Tu', position: 7, velocity: 0.9 },
          { name: 'Na', position: 8, velocity: 0.7 },
          { name: 'Ka', position: 9, velocity: 0.9 },
          { name: 'Ta', position: 10, velocity: 0.6 },
          { name: 'Dhi', position: 11, velocity: 0.9 },
          { name: 'Na', position: 12, velocity: 0.7 },
        ],
        drut: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.6 },
          { name: 'Dha', position: 3, velocity: 0.8 },
          { name: 'Ge', position: 4, velocity: 0.5 },
          { name: 'Ti', position: 5, velocity: 0.8 },
          { name: 'Ta', position: 6, velocity: 0.5 },
          { name: 'Tu', position: 7, velocity: 0.8 },
          { name: 'Na', position: 8, velocity: 0.6 },
          { name: 'Ka', position: 9, velocity: 0.8 },
          { name: 'Ta', position: 10, velocity: 0.5 },
          { name: 'Dhi', position: 11, velocity: 0.8 },
          { name: 'Na', position: 12, velocity: 0.6 },
        ],
      },
    },
  ],
};
