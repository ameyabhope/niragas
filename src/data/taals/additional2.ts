import type { TaalDefinition } from '@/audio/types';

/**
 * Farodast - 14 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 4+4+4+2 (but often played 4+3+4+3)
 * Theka: Dhin Dha Dhin Dha | Dhin Dha Tin Ta | Tin Ta Dhin Dha | Dhin Dha Dhin Dha
 */
export const farodast: TaalDefinition = {
  id: 'farodast',
  name: 'Farodast',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 8, type: 'khaali', label: '0' },
    { matra: 11, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 300 },
  speedBreakpoints: {
    vilambit: 40,
    madhya: 80,
    drut: 160,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Dha', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.7 },
          { name: 'Dhin', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Tin', position: 7, velocity: 0.7 },
          { name: 'Ta', position: 8, velocity: 0.9 },
          { name: 'Tin', position: 9, velocity: 0.7 },
          { name: 'Ta', position: 10, velocity: 0.7 },
          { name: 'Dhin', position: 11, velocity: 0.9 },
          { name: 'Dha', position: 12, velocity: 0.7 },
          { name: 'Dhin', position: 13, velocity: 0.7 },
          { name: 'Dha', position: 14, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Jat - 16 matras
 * Divisions: X 2 0 3 (same structure as Teentaal)
 * Theka: Dha Ti Dha Ge | Dhi Na Dha Ge | Ta Ti Ta Ke | Dhi Na Dha Ge
 */
export const jat: TaalDefinition = {
  id: 'jat',
  name: 'Jat',
  matras: 16,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 9, type: 'khaali', label: '0' },
    { matra: 13, type: 'taali', label: '3' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Ti', position: 2, velocity: 0.6 },
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Ge', position: 4, velocity: 0.6 },
          { name: 'Dhi', position: 5, velocity: 0.9 },
          { name: 'Na', position: 6, velocity: 0.7 },
          { name: 'Dha', position: 7, velocity: 0.7 },
          { name: 'Ge', position: 8, velocity: 0.6 },
          { name: 'Ta', position: 9, velocity: 0.9 },
          { name: 'Ti', position: 10, velocity: 0.6 },
          { name: 'Ta', position: 11, velocity: 0.7 },
          { name: 'Ke', position: 12, velocity: 0.6 },
          { name: 'Dhi', position: 13, velocity: 0.9 },
          { name: 'Na', position: 14, velocity: 0.7 },
          { name: 'Dha', position: 15, velocity: 0.7 },
          { name: 'Ge', position: 16, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Pashto - 7 matras
 * Divisions: X 0 2 (Sam, Khaali, Taali)
 * Grouping: 3+4
 * Theka: Dhin Na Dhin | Dhi Na Tin Na
 */
export const pashto: TaalDefinition = {
  id: 'pashto',
  name: 'Pashto',
  matras: 7,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'khaali', label: '0' },
    { matra: 6, type: 'taali', label: '2' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 30, max: 400 },
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
        madhya: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Na', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhi', position: 4, velocity: 0.9 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Tin', position: 6, velocity: 0.9 },
          { name: 'Na', position: 7, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Chanchar - 14 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 3+4+3+4 (similar structure to Deepchandi but different bols/feel)
 * Theka: Dha Dhin Dha | Dha Ge Dhin Dha | Tin Na Tin | Na Ke Dhin Dha
 */
export const chanchar: TaalDefinition = {
  id: 'chanchar',
  name: 'Chanchar',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 8, type: 'khaali', label: '0' },
    { matra: 11, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 350 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.9 },
          { name: 'Ge', position: 5, velocity: 0.6 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Dha', position: 7, velocity: 0.7 },
          { name: 'Tin', position: 8, velocity: 0.9 },
          { name: 'Na', position: 9, velocity: 0.7 },
          { name: 'Tin', position: 10, velocity: 0.7 },
          { name: 'Na', position: 11, velocity: 0.9 },
          { name: 'Ke', position: 12, velocity: 0.6 },
          { name: 'Dhin', position: 13, velocity: 0.7 },
          { name: 'Dha', position: 14, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Tivra - 7 matras
 * Divisions: X 2 0 (Sam, Taali, Khaali)
 * Grouping: 3+4
 * Theka: Dha Dhin Ta | Tit Kat Gad Ghen
 */
export const tivra: TaalDefinition = {
  id: 'tivra',
  name: 'Tivra',
  matras: 7,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 6, type: 'khaali', label: '0' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 30, max: 400 },
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
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Ta', position: 3, velocity: 0.7 },
          { name: 'Tit', position: 4, velocity: 0.9 },
          { name: 'Kat', position: 5, velocity: 0.6 },
          { name: 'Gad', position: 6, velocity: 0.9 },
          { name: 'Ghen', position: 7, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Dhumali - 8 matras
 * Divisions: X 0 (Sam, Khaali)
 * Theka: Dha Dha DhiTa | Dha Dha TiTa
 * Note: DhiTa and TiTa are compound bols on half-beats
 */
export const dhumali: TaalDefinition = {
  id: 'dhumali',
  name: 'Dhumali',
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
          { name: 'Dha', position: 2, velocity: 0.7 },
          { name: 'Dhi', position: 3, velocity: 0.7 },
          { name: 'Ta', position: 3.5, velocity: 0.4 },
          { name: 'Dha', position: 4, velocity: 0.7 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Ti', position: 7, velocity: 0.7 },
          { name: 'Ta', position: 7.5, velocity: 0.4 },
          { name: 'Dha', position: 8, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Sitarkhani - 16 matras
 * Divisions: X 2 0 3 (same structure as Teentaal)
 * Vilambit style with rests (-S-)
 * Theka: Dha -S- Dha Trkt | Dhin -S- Dhin Dha | Ge -S- Dha Trkt | Tin -S- Tin Ta
 */
export const sitarkhani: TaalDefinition = {
  id: 'sitarkhani',
  name: 'Sitarkhani',
  matras: 16,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 9, type: 'khaali', label: '0' },
    { matra: 13, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 300 },
  speedBreakpoints: {
    atiVilambit: 20,
    vilambit: 40,
    madhya: 80,
    drut: 160,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          // position 2 is rest (-S-)
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Trkt', position: 3.5, velocity: 0.4 },
          { name: 'Dhin', position: 5, velocity: 0.9 },
          // position 6 is rest (-S-)
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dha', position: 8, velocity: 0.7 },
          { name: 'Ge', position: 9, velocity: 0.9 },
          // position 10 is rest (-S-)
          { name: 'Dha', position: 11, velocity: 0.7 },
          { name: 'Trkt', position: 11.5, velocity: 0.4 },
          { name: 'Tin', position: 13, velocity: 0.9 },
          // position 14 is rest (-S-)
          { name: 'Tin', position: 15, velocity: 0.7 },
          { name: 'Ta', position: 16, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Sawari - 15 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 2+3+2+3+2+3 or typically 2+3+2+3+5
 * Theka: Dhin Ta | Dhi Dhi Na | Tit Ta | Dhi Dhi Na | Dha Dhin
 */
export const sawari: TaalDefinition = {
  id: 'sawari',
  name: 'Sawari',
  matras: 15,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'taali', label: '2' },
    { matra: 6, type: 'khaali', label: '0' },
    { matra: 8, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 300 },
  speedBreakpoints: {
    vilambit: 40,
    madhya: 80,
    drut: 160,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Ta', position: 2, velocity: 0.6 },
          { name: 'Dhi', position: 3, velocity: 0.9 },
          { name: 'Dhi', position: 4, velocity: 0.7 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Tit', position: 6, velocity: 0.9 },
          { name: 'Ta', position: 7, velocity: 0.6 },
          { name: 'Dhi', position: 8, velocity: 0.9 },
          { name: 'Dhi', position: 9, velocity: 0.7 },
          { name: 'Na', position: 10, velocity: 0.7 },
          { name: 'Dha', position: 11, velocity: 0.9 },
          { name: 'Dhin', position: 12, velocity: 0.7 },
          { name: 'Dha', position: 13, velocity: 0.7 },
          { name: 'Trkt', position: 13.5, velocity: 0.4 },
          { name: 'Dhin', position: 14, velocity: 0.7 },
          { name: 'Na', position: 15, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Gaj Jhampa - 15 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 5+3+5+2 (sometimes 5+4+4+2 — varies by gharana)
 * Theka: Dhin Dhin Dha Ge Trkt | Dhin Dha Ge Trkt | Tin Tin Ta Ke Trkt | Dhin Dha Ge Trkt
 */
export const gajJhampa: TaalDefinition = {
  id: 'gaj-jhampa',
  name: 'Gaj Jhampa',
  matras: 15,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 8, type: 'khaali', label: '0' },
    { matra: 12, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 300 },
  speedBreakpoints: {
    vilambit: 40,
    madhya: 80,
    drut: 160,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Ge', position: 4, velocity: 0.6 },
          { name: 'Trkt', position: 4.5, velocity: 0.4 },
          { name: 'Dhin', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Ge', position: 7, velocity: 0.6 },
          { name: 'Trkt', position: 7.5, velocity: 0.4 },
          { name: 'Tin', position: 8, velocity: 0.9 },
          { name: 'Tin', position: 9, velocity: 0.7 },
          { name: 'Ta', position: 10, velocity: 0.7 },
          { name: 'Ke', position: 11, velocity: 0.6 },
          { name: 'Trkt', position: 11.5, velocity: 0.4 },
          { name: 'Dhin', position: 12, velocity: 0.9 },
          { name: 'Dha', position: 13, velocity: 0.7 },
          { name: 'Ge', position: 14, velocity: 0.6 },
          { name: 'Trkt', position: 14.5, velocity: 0.4 },
          { name: 'Dhin', position: 15, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Rudra - 11 matras
 * Divisions: X 0 2 3 (Sam, Khaali, Taali, Taali)
 * Grouping: 4+2+3+2
 * Theka: Dha Trkt Dhin Ta | Ta Ka | Dhin Na Dhin | Dha Ge
 */
export const rudra: TaalDefinition = {
  id: 'rudra',
  name: 'Rudra',
  matras: 11,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'khaali', label: '0' },
    { matra: 7, type: 'taali', label: '2' },
    { matra: 10, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Trkt', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Ta', position: 4, velocity: 0.7 },
          { name: 'Ta', position: 5, velocity: 0.9 },
          { name: 'Ka', position: 6, velocity: 0.6 },
          { name: 'Dhin', position: 7, velocity: 0.9 },
          { name: 'Na', position: 8, velocity: 0.7 },
          { name: 'Dhin', position: 9, velocity: 0.7 },
          { name: 'Dha', position: 10, velocity: 0.9 },
          { name: 'Ge', position: 11, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Lakshmi - 18 matras
 * Divisions: X 2 0 3 4 5 (Sam, Taali, Khaali, Taali, Taali, Taali)
 * Grouping: 4+4+4+4+2
 * Theka: Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha | Dha Tin
 */
export const lakshmi: TaalDefinition = {
  id: 'lakshmi',
  name: 'Lakshmi',
  matras: 18,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 9, type: 'khaali', label: '0' },
    { matra: 13, type: 'taali', label: '3' },
    { matra: 15, type: 'taali', label: '4' },
    { matra: 17, type: 'taali', label: '5' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 300 },
  speedBreakpoints: {
    vilambit: 40,
    madhya: 80,
    drut: 160,
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
          { name: 'Dha', position: 4, velocity: 0.7 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dha', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.9 },
          { name: 'Tin', position: 10, velocity: 0.7 },
          { name: 'Tin', position: 11, velocity: 0.7 },
          { name: 'Ta', position: 12, velocity: 0.6 },
          { name: 'Ta', position: 13, velocity: 0.9 },
          { name: 'Dhin', position: 14, velocity: 0.7 },
          { name: 'Dhin', position: 15, velocity: 0.9 },
          { name: 'Dha', position: 16, velocity: 0.7 },
          { name: 'Dha', position: 17, velocity: 0.9 },
          { name: 'Tin', position: 18, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Brahma - 14 matras
 * Divisions: X 0 2 3 4 5 6 (groups of 2)
 * Theka: Dha Ki | Ti Ke | Ta Ga | Di Na | Dha Ge | Dhi Na | Dha Ki
 */
export const brahma: TaalDefinition = {
  id: 'brahma',
  name: 'Brahma',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'khaali', label: '0' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 7, type: 'taali', label: '3' },
    { matra: 9, type: 'taali', label: '4' },
    { matra: 11, type: 'taali', label: '5' },
    { matra: 13, type: 'taali', label: '6' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Ki', position: 2, velocity: 0.6 },
          { name: 'Ti', position: 3, velocity: 0.9 },
          { name: 'Ke', position: 4, velocity: 0.6 },
          { name: 'Ta', position: 5, velocity: 0.9 },
          { name: 'Ga', position: 6, velocity: 0.6 },
          { name: 'Di', position: 7, velocity: 0.9 },
          { name: 'Na', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.9 },
          { name: 'Ge', position: 10, velocity: 0.6 },
          { name: 'Dhi', position: 11, velocity: 0.9 },
          { name: 'Na', position: 12, velocity: 0.7 },
          { name: 'Dha', position: 13, velocity: 0.9 },
          { name: 'Ki', position: 14, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Vishnu - 20 matras
 * Divisions: X 2 0 3 4 (four groups of 5)
 * Theka: Dha Trkt Dhin Dhin Dha | Dha Dhin Dhin Dha Ge |
 *        Ta Trkt Tin Tin Ta | Ta Dhin Dhin Dha Ge
 * Note: groups of 5 = 5+5+5+5
 */
export const vishnu: TaalDefinition = {
  id: 'vishnu',
  name: 'Vishnu',
  matras: 20,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 6, type: 'taali', label: '2' },
    { matra: 11, type: 'khaali', label: '0' },
    { matra: 16, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 250 },
  speedBreakpoints: {
    vilambit: 30,
    madhya: 70,
    drut: 140,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Trkt', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.7 },
          { name: 'Dha', position: 5, velocity: 0.7 },
          { name: 'Dha', position: 6, velocity: 0.9 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dhin', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.7 },
          { name: 'Ge', position: 10, velocity: 0.6 },
          { name: 'Ta', position: 11, velocity: 0.9 },
          { name: 'Trkt', position: 12, velocity: 0.6 },
          { name: 'Tin', position: 13, velocity: 0.7 },
          { name: 'Tin', position: 14, velocity: 0.7 },
          { name: 'Ta', position: 15, velocity: 0.7 },
          { name: 'Ta', position: 16, velocity: 0.9 },
          { name: 'Dhin', position: 17, velocity: 0.7 },
          { name: 'Dhin', position: 18, velocity: 0.7 },
          { name: 'Dha', position: 19, velocity: 0.7 },
          { name: 'Ge', position: 20, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Ashtamangal - 22 matras
 * Divisions: X 2 3 0 4 5 (complex devotional taal)
 * Grouping: 4+4+4+4+4+2
 * Theka: Dha Dhin Trkt Dhin | Dha Dha Dhin Dhin |
 *        Dha Ge Trkt Dhin | Ta Tin Trkt Tin |
 *        Dha Dha Dhin Dhin | Dha Ge
 */
export const ashtamangal: TaalDefinition = {
  id: 'ashtamangal',
  name: 'Ashtamangal',
  matras: 22,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 9, type: 'taali', label: '3' },
    { matra: 13, type: 'khaali', label: '0' },
    { matra: 17, type: 'taali', label: '4' },
    { matra: 21, type: 'taali', label: '5' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 250 },
  speedBreakpoints: {
    vilambit: 30,
    madhya: 70,
    drut: 140,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Trkt', position: 3, velocity: 0.6 },
          { name: 'Dhin', position: 4, velocity: 0.7 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dhin', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.9 },
          { name: 'Ge', position: 10, velocity: 0.6 },
          { name: 'Trkt', position: 11, velocity: 0.6 },
          { name: 'Dhin', position: 12, velocity: 0.7 },
          { name: 'Ta', position: 13, velocity: 0.9 },
          { name: 'Tin', position: 14, velocity: 0.7 },
          { name: 'Trkt', position: 15, velocity: 0.6 },
          { name: 'Tin', position: 16, velocity: 0.7 },
          { name: 'Dha', position: 17, velocity: 0.9 },
          { name: 'Dha', position: 18, velocity: 0.7 },
          { name: 'Dhin', position: 19, velocity: 0.7 },
          { name: 'Dhin', position: 20, velocity: 0.7 },
          { name: 'Dha', position: 21, velocity: 0.9 },
          { name: 'Ge', position: 22, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Tevra - 7 matras
 * Divisions: X 2 0 (Sam, Taali, Khaali)
 * Grouping: 3+2+2
 * Theka: Dha Dhin Ta | Tit Dha | Dhin Ta
 */
export const tevra: TaalDefinition = {
  id: 'tevra',
  name: 'Tevra',
  matras: 7,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 6, type: 'khaali', label: '0' },
  ],
  manjiraSupported: true,
  tempoRange: { min: 30, max: 400 },
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
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Ta', position: 3, velocity: 0.7 },
          { name: 'Tit', position: 4, velocity: 0.9 },
          { name: 'Dha', position: 5, velocity: 0.7 },
          { name: 'Dhin', position: 6, velocity: 0.9 },
          { name: 'Ta', position: 7, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Khemta - 6 matras
 * Divisions: X 0 (Sam, Khaali)
 * Grouping: 3+3
 * Theka: Dhin Na Dhin | Dhin Na Tin (variation of Dadra)
 */
export const khemta: TaalDefinition = {
  id: 'khemta',
  name: 'Khemta',
  matras: 6,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'khaali', label: '0' },
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
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Na', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.9 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Tin', position: 6, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Kaherva Bhajan - 8 matras
 * Divisions: X 0 (Sam, Khaali)
 * Devotional variant of Kaherva
 * Theka: Dha Ge Na Ti | Na Ka Dhi Na
 */
export const kahervaBhajan: TaalDefinition = {
  id: 'kaherva-bhajan',
  name: 'Kaherva Bhajan',
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
          { name: 'Dhi', position: 7, velocity: 0.7 },
          { name: 'Na', position: 8, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Roopak Sawari - 11 matras
 * Divisions: X 0 2 (Sam/Khaali hybrid, Khaali, Taali)
 * Grouping: 3+4+4 (hybrid of Rupak and Sawari feel)
 * Theka: Tin Tin Na | Dhin Na Dhin Na | Dhin Na Dhin Na
 * Note: Sam is khaali-like in Rupak tradition
 */
export const roopakSawari: TaalDefinition = {
  id: 'roopak-sawari',
  name: 'Roopak Sawari',
  matras: 11,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'khaali', label: '0' },
    { matra: 8, type: 'taali', label: '2' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Tin', position: 1, velocity: 1.0 },
          { name: 'Tin', position: 2, velocity: 0.7 },
          { name: 'Na', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.9 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Na', position: 7, velocity: 0.7 },
          { name: 'Dhin', position: 8, velocity: 0.9 },
          { name: 'Na', position: 9, velocity: 0.7 },
          { name: 'Dhin', position: 10, velocity: 0.7 },
          { name: 'Na', position: 11, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Yashwant - 8 matras
 * Divisions: X 0 (Sam, Khaali)
 * Grouping: 3+3+2 (or sometimes 3+5)
 * Theka: Dha Dha Dhin | Ta Dha Tin | Na Na
 */
export const yashwant: TaalDefinition = {
  id: 'yashwant',
  name: 'Yashwant',
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
          { name: 'Dha', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Ta', position: 4, velocity: 0.6 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Tin', position: 6, velocity: 0.7 },
          { name: 'Na', position: 7, velocity: 0.7 },
          { name: 'Na', position: 8, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Indra - 19 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 5+5+5+4
 * Theka: Dha Dhin Dhin Dha Ge | Dha Dhin Dhin Dha Trkt |
 *        Ta Tin Tin Ta Ke | Dha Dhin Dhin Dha
 */
export const indra: TaalDefinition = {
  id: 'indra',
  name: 'Indra',
  matras: 19,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 6, type: 'taali', label: '2' },
    { matra: 11, type: 'khaali', label: '0' },
    { matra: 16, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 250 },
  speedBreakpoints: {
    vilambit: 30,
    madhya: 70,
    drut: 140,
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
          { name: 'Dha', position: 4, velocity: 0.7 },
          { name: 'Ge', position: 5, velocity: 0.6 },
          { name: 'Dha', position: 6, velocity: 0.9 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dhin', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.7 },
          { name: 'Trkt', position: 10, velocity: 0.6 },
          { name: 'Ta', position: 11, velocity: 0.9 },
          { name: 'Tin', position: 12, velocity: 0.7 },
          { name: 'Tin', position: 13, velocity: 0.7 },
          { name: 'Ta', position: 14, velocity: 0.7 },
          { name: 'Ke', position: 15, velocity: 0.6 },
          { name: 'Dha', position: 16, velocity: 0.9 },
          { name: 'Dhin', position: 17, velocity: 0.7 },
          { name: 'Dhin', position: 18, velocity: 0.7 },
          { name: 'Dha', position: 19, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Surphankhta - 10 matras
 * Divisions: X 2 0 (Sam, Taali, Khaali)
 * Grouping: 4+3+3
 * Theka: Dha Ge Dha Ge | Dhin Na Dha | Ge Tin Na
 */
export const surphankhta: TaalDefinition = {
  id: 'surphankhta',
  name: 'Surphankhta',
  matras: 10,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 8, type: 'khaali', label: '0' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Ge', position: 2, velocity: 0.6 },
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Ge', position: 4, velocity: 0.6 },
          { name: 'Dhin', position: 5, velocity: 0.9 },
          { name: 'Na', position: 6, velocity: 0.7 },
          { name: 'Dha', position: 7, velocity: 0.7 },
          { name: 'Ge', position: 8, velocity: 0.9 },
          { name: 'Tin', position: 9, velocity: 0.7 },
          { name: 'Na', position: 10, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Dipak - 10 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 2+2+2+4
 * Theka: Dha Dhin | Dha Dhin | Ta Tin | Dha Dha Dhin Ta
 */
export const dipak: TaalDefinition = {
  id: 'dipak',
  name: 'Dipak',
  matras: 10,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'taali', label: '2' },
    { matra: 5, type: 'khaali', label: '0' },
    { matra: 7, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Dha', position: 3, velocity: 0.9 },
          { name: 'Dhin', position: 4, velocity: 0.7 },
          { name: 'Ta', position: 5, velocity: 0.9 },
          { name: 'Tin', position: 6, velocity: 0.7 },
          { name: 'Dha', position: 7, velocity: 0.9 },
          { name: 'Dha', position: 8, velocity: 0.7 },
          { name: 'Dhin', position: 9, velocity: 0.7 },
          { name: 'Ta', position: 10, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Mani - 11 matras
 * Divisions: X 2 0 (Sam, Taali, Khaali)
 * Grouping: 3+2+2+4
 * Theka: Dha Trkt Dhin | Dhin Na | Dha Dha | Trkt Dhin Dhin Na
 */
export const mani: TaalDefinition = {
  id: 'mani',
  name: 'Mani',
  matras: 11,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 6, type: 'khaali', label: '0' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Trkt', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.9 },
          { name: 'Na', position: 5, velocity: 0.7 },
          { name: 'Dha', position: 6, velocity: 0.9 },
          { name: 'Dha', position: 7, velocity: 0.7 },
          { name: 'Trkt', position: 8, velocity: 0.6 },
          { name: 'Dhin', position: 9, velocity: 0.7 },
          { name: 'Dhin', position: 10, velocity: 0.7 },
          { name: 'Na', position: 11, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Ganesh - 10 matras
 * Divisions: X 2 0 3 4 (groups of 2)
 * Theka: Dha Dhi | Ta Dhi | Ta Na | Dhi Dhi | Ta Na
 */
export const ganesh: TaalDefinition = {
  id: 'ganesh',
  name: 'Ganesh',
  matras: 10,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'taali', label: '2' },
    { matra: 5, type: 'khaali', label: '0' },
    { matra: 7, type: 'taali', label: '3' },
    { matra: 9, type: 'taali', label: '4' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhi', position: 2, velocity: 0.7 },
          { name: 'Ta', position: 3, velocity: 0.9 },
          { name: 'Dhi', position: 4, velocity: 0.7 },
          { name: 'Ta', position: 5, velocity: 0.9 },
          { name: 'Na', position: 6, velocity: 0.7 },
          { name: 'Dhi', position: 7, velocity: 0.9 },
          { name: 'Dhi', position: 8, velocity: 0.7 },
          { name: 'Ta', position: 9, velocity: 0.9 },
          { name: 'Na', position: 10, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Narayana - 10 matras
 * Divisions: X 2 0 3 4 (groups of 2, same structure as Ganesh)
 * Theka: Dhin Na | Dhin Dhin | Na Tin | Na Dhin | Dhin Na
 */
export const narayana: TaalDefinition = {
  id: 'narayana',
  name: 'Narayana',
  matras: 10,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'taali', label: '2' },
    { matra: 5, type: 'khaali', label: '0' },
    { matra: 7, type: 'taali', label: '3' },
    { matra: 9, type: 'taali', label: '4' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Na', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.9 },
          { name: 'Dhin', position: 4, velocity: 0.7 },
          { name: 'Na', position: 5, velocity: 0.9 },
          { name: 'Tin', position: 6, velocity: 0.7 },
          { name: 'Na', position: 7, velocity: 0.9 },
          { name: 'Dhin', position: 8, velocity: 0.7 },
          { name: 'Dhin', position: 9, velocity: 0.9 },
          { name: 'Na', position: 10, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Chandrashekhar - 17 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 4+5+4+4
 * Theka: Dha Dhin Dhin Dha | Dha Trkt Dhin Dhin Dha |
 *        Ta Tin Tin Ta | Dha Dhin Dhin Dha
 */
export const chandrashekhar: TaalDefinition = {
  id: 'chandrashekhar',
  name: 'Chandrashekhar',
  matras: 17,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 10, type: 'khaali', label: '0' },
    { matra: 14, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 300 },
  speedBreakpoints: {
    vilambit: 40,
    madhya: 80,
    drut: 160,
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
          { name: 'Dha', position: 4, velocity: 0.7 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Trkt', position: 6, velocity: 0.6 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dhin', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.7 },
          { name: 'Ta', position: 10, velocity: 0.9 },
          { name: 'Tin', position: 11, velocity: 0.7 },
          { name: 'Tin', position: 12, velocity: 0.7 },
          { name: 'Ta', position: 13, velocity: 0.6 },
          { name: 'Dha', position: 14, velocity: 0.9 },
          { name: 'Dhin', position: 15, velocity: 0.7 },
          { name: 'Dhin', position: 16, velocity: 0.7 },
          { name: 'Dha', position: 17, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Shikar - 12 matras
 * Divisions: X 0 2 3 (Sam, Khaali, Taali, Taali)
 * Grouping: 3+3+3+3
 * Theka: Dha Trkt Dhin | Dha Trkt Dhin | Ta Trkt Tin | Ta Trkt Dhin
 */
export const shikar: TaalDefinition = {
  id: 'shikar',
  name: 'Shikar',
  matras: 12,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'khaali', label: '0' },
    { matra: 7, type: 'taali', label: '2' },
    { matra: 10, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Trkt', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dha', position: 4, velocity: 0.9 },
          { name: 'Trkt', position: 5, velocity: 0.6 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Ta', position: 7, velocity: 0.9 },
          { name: 'Trkt', position: 8, velocity: 0.6 },
          { name: 'Tin', position: 9, velocity: 0.7 },
          { name: 'Ta', position: 10, velocity: 0.9 },
          { name: 'Trkt', position: 11, velocity: 0.6 },
          { name: 'Dhin', position: 12, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Basant - 12 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 3+3+3+3
 * Theka: Dha Dhin Ta | Kat Dha Dhin | Ta Kat Ta | Dhin Dha Dhin
 */
export const basant: TaalDefinition = {
  id: 'basant',
  name: 'Basant',
  matras: 12,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 7, type: 'khaali', label: '0' },
    { matra: 10, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 20, max: 400 },
  speedBreakpoints: {
    vilambit: 50,
    madhya: 100,
    drut: 200,
  },
  styles: [
    {
      id: 'theka',
      name: 'Theka',
      thekas: {
        madhya: [
          { name: 'Dha', position: 1, velocity: 1.0 },
          { name: 'Dhin', position: 2, velocity: 0.7 },
          { name: 'Ta', position: 3, velocity: 0.7 },
          { name: 'Kat', position: 4, velocity: 0.9 },
          { name: 'Dha', position: 5, velocity: 0.7 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Ta', position: 7, velocity: 0.9 },
          { name: 'Kat', position: 8, velocity: 0.6 },
          { name: 'Ta', position: 9, velocity: 0.7 },
          { name: 'Dhin', position: 10, velocity: 0.9 },
          { name: 'Dha', position: 11, velocity: 0.7 },
          { name: 'Dhin', position: 12, velocity: 0.7 },
        ],
      },
    },
  ],
};
