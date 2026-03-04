import type { TaalDefinition } from '@/audio/types';

/**
 * Teentaal (Tritaal) - 16 matras
 * Divisions: X 2 0 3  (Sam, Taali, Khaali, Taali)
 * Theka: Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha
 */
export const teentaal: TaalDefinition = {
  id: 'teentaal',
  name: 'Teentaal',
  matras: 16,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 9, type: 'khaali', label: '0' },
    { matra: 13, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 700 },
  speedBreakpoints: {
    atiVilambit: 30,
    vilambit: 60,
    madhya: 120,
    drut: 240,
    atiDrut: 400,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.8 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dha', position: 8, velocity: 0.8 },
          { name: 'Dha', position: 9, velocity: 0.9 },
          { name: 'Tin', position: 10, velocity: 0.7 },
          { name: 'Tin', position: 11, velocity: 0.7 },
          { name: 'Ta', position: 12, velocity: 0.8 },
          { name: 'Ta', position: 13, velocity: 0.9 },
          { name: 'Dhin', position: 14, velocity: 0.7 },
          { name: 'Dhin', position: 15, velocity: 0.7 },
          { name: 'Dha', position: 16, velocity: 0.8 },
        ],
      },
    },
    {
      id: 'variation1',
      name: 'Variation 1',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.8 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Ti', position: 5.5, velocity: 0.4 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dha', position: 8, velocity: 0.8 },
          { name: 'Dha', position: 9, velocity: 0.9 },
          { name: 'Tin', position: 10, velocity: 0.6 },
          { name: 'Tin', position: 11, velocity: 0.7 },
          { name: 'Ta', position: 12, velocity: 0.8 },
          { name: 'Ta', position: 13, velocity: 0.9 },
          { name: 'Ti', position: 13.5, velocity: 0.4 },
          { name: 'Dhin', position: 14, velocity: 0.7 },
          { name: 'Dhin', position: 15, velocity: 0.7 },
          { name: 'Dha', position: 16, velocity: 0.8 },
        ],
      },
    },
  ],
};
