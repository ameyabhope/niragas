import type { TaalDefinition } from '@/audio/types';

/**
 * Deepchandi - 14 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Theka: Dha Dhi - | Dha Dha Tin - | Ta Tin - | Dha Dha Dhi -
 * Grouping: 3+4+3+4
 */
export const deepchandi: TaalDefinition = {
  id: 'deepchandi',
  name: 'Deepchandi',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 8, type: 'khaali', label: '0' },
    { matra: 11, type: 'taali', label: '3' },
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
          { name: 'Dhi', position: 2, velocity: 0.7 },
          // position 3 is a sustain/rest
          { name: 'Dha', position: 4, velocity: 0.9 },
          { name: 'Dha', position: 5, velocity: 0.7 },
          { name: 'Tin', position: 6, velocity: 0.7 },
          // position 7 is a sustain/rest
          { name: 'Ta', position: 8, velocity: 0.9 },
          { name: 'Tin', position: 9, velocity: 0.7 },
          // position 10 is a sustain/rest
          { name: 'Dha', position: 11, velocity: 0.9 },
          { name: 'Dha', position: 12, velocity: 0.7 },
          { name: 'Dhi', position: 13, velocity: 0.7 },
          // position 14 is a sustain/rest
        ],
      },
    },
  ],
};

/**
 * Dhamar - 14 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 5+2+3+4
 * Theka: Ka Dhi Ta Dhi Ta | Dha - | Ge Ti Ta | Ti Ta Kat Ga Di Ga Na
 */
export const dhamar: TaalDefinition = {
  id: 'dhamar',
  name: 'Dhamar',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 6, type: 'taali', label: '2' },
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
          { name: 'Ka', position: 1, velocity: 1.0 },
          { name: 'Dhi', position: 2, velocity: 0.7 },
          { name: 'Ta', position: 3, velocity: 0.7 },
          { name: 'Dhi', position: 4, velocity: 0.7 },
          { name: 'Ta', position: 5, velocity: 0.6 },
          { name: 'Dha', position: 6, velocity: 0.9 },
          // position 7 is a sustain/rest
          { name: 'Ge', position: 8, velocity: 0.9 },
          { name: 'Ti', position: 9, velocity: 0.6 },
          { name: 'Ta', position: 10, velocity: 0.7 },
          { name: 'Ti', position: 11, velocity: 0.9 },
          { name: 'Ta', position: 12, velocity: 0.6 },
          { name: 'Kat', position: 12.5, velocity: 0.4 },
          { name: 'Ga', position: 13, velocity: 0.7 },
          { name: 'Di', position: 13.5, velocity: 0.4 },
          { name: 'Ga', position: 14, velocity: 0.6 },
          { name: 'Na', position: 14.5, velocity: 0.4 },
        ],
      },
    },
  ],
};

/**
 * Chautaal - 12 matras
 * Divisions: X 0 2 0 3 4 (groups of 2)
 * Theka: Dha Dha | Dhin Ta | Kt Dha | Dhin Ta | Tit Ta | Dhin Dha
 */
export const chautaal: TaalDefinition = {
  id: 'chautaal',
  name: 'Chautaal',
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
  tempoRange: { min: 10, max: 400 },
  speedBreakpoints: {
    vilambit: 40,
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
          { name: 'Dha', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.9 },
          { name: 'Ta', position: 4, velocity: 0.6 },
          { name: 'Kt', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Dhin', position: 7, velocity: 0.9 },
          { name: 'Ta', position: 8, velocity: 0.6 },
          { name: 'Tit', position: 9, velocity: 0.9 },
          { name: 'Ta', position: 10, velocity: 0.6 },
          { name: 'Dhin', position: 11, velocity: 0.9 },
          { name: 'Dha', position: 12, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Jhoomra - 14 matras
 * Divisions: X 2 0 3 (Sam, Taali, Khaali, Taali)
 * Grouping: 3+4+3+4
 * Theka: Dhin - Dha Trkt | Dhin Dhin Dha Ge | Tin - Ta Trkt | Dhin Dhin Dha Ge
 */
export const jhoomra: TaalDefinition = {
  id: 'jhoomra',
  name: 'Jhoomra',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 8, type: 'khaali', label: '0' },
    { matra: 11, type: 'taali', label: '3' },
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
          { name: 'Dhin', position: 1, velocity: 1.0 },
          // position 2 is a sustain/rest
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Trkt', position: 3.5, velocity: 0.4 },
          { name: 'Dhin', position: 4, velocity: 0.9 },
          { name: 'Dhin', position: 5, velocity: 0.7 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Ge', position: 7, velocity: 0.6 },
          { name: 'Tin', position: 8, velocity: 0.9 },
          // position 9 is a sustain/rest
          { name: 'Ta', position: 10, velocity: 0.7 },
          { name: 'Trkt', position: 10.5, velocity: 0.4 },
          { name: 'Dhin', position: 11, velocity: 0.9 },
          { name: 'Dhin', position: 12, velocity: 0.7 },
          { name: 'Dha', position: 13, velocity: 0.7 },
          { name: 'Ge', position: 14, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Tilwada - 16 matras
 * Divisions: X 2 0 3 (same structure as Teentaal)
 * Theka: Dha Trkt Dhin Dhin | Dha Dha Tin Tin | Ta Trkt Dhin Dhin | Dha Dha Dhin Dhin
 */
export const tilwada: TaalDefinition = {
  id: 'tilwada',
  name: 'Tilwada',
  matras: 16,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 9, type: 'khaali', label: '0' },
    { matra: 13, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 400 },
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
          { name: 'Trkt', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.7 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Tin', position: 7, velocity: 0.7 },
          { name: 'Tin', position: 8, velocity: 0.6 },
          { name: 'Ta', position: 9, velocity: 0.9 },
          { name: 'Trkt', position: 10, velocity: 0.6 },
          { name: 'Dhin', position: 11, velocity: 0.7 },
          { name: 'Dhin', position: 12, velocity: 0.7 },
          { name: 'Dha', position: 13, velocity: 0.9 },
          { name: 'Dha', position: 14, velocity: 0.7 },
          { name: 'Dhin', position: 15, velocity: 0.7 },
          { name: 'Dhin', position: 16, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Ada Chautaal - 14 matras
 * Divisions: X 2 0 3 4 0 5 (groups of 2)
 * Theka: Dhin Trkt | Dhin Dha | Dhin Dhin | Dha Trkt | Tin Trkt | Tin Na | Dhin Dhin
 */
export const adaChautaal: TaalDefinition = {
  id: 'ada-chautaal',
  name: 'Ada Chautaal',
  matras: 14,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'taali', label: '2' },
    { matra: 5, type: 'khaali', label: '0' },
    { matra: 7, type: 'taali', label: '3' },
    { matra: 9, type: 'taali', label: '4' },
    { matra: 11, type: 'khaali', label: '0' },
    { matra: 13, type: 'taali', label: '5' },
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
          { name: 'Trkt', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.9 },
          { name: 'Dha', position: 4, velocity: 0.7 },
          { name: 'Dhin', position: 5, velocity: 0.9 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Dha', position: 7, velocity: 0.9 },
          { name: 'Trkt', position: 8, velocity: 0.6 },
          { name: 'Tin', position: 9, velocity: 0.9 },
          { name: 'Trkt', position: 10, velocity: 0.6 },
          { name: 'Tin', position: 11, velocity: 0.9 },
          { name: 'Na', position: 12, velocity: 0.7 },
          { name: 'Dhin', position: 13, velocity: 0.9 },
          { name: 'Dhin', position: 14, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Sooltaal - 10 matras
 * Divisions: X 0 2 0 3 (groups of 2)
 * Theka: Dha Dha | Dhin Ta | Kt Dha | Tin Ta | Ta Dha
 */
export const sooltaal: TaalDefinition = {
  id: 'sooltaal',
  name: 'Sooltaal',
  matras: 10,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 3, type: 'khaali', label: '0' },
    { matra: 5, type: 'taali', label: '2' },
    { matra: 7, type: 'khaali', label: '0' },
    { matra: 9, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 400 },
  speedBreakpoints: {
    vilambit: 40,
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
          { name: 'Dha', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.9 },
          { name: 'Ta', position: 4, velocity: 0.6 },
          { name: 'Kt', position: 5, velocity: 0.9 },
          { name: 'Dha', position: 6, velocity: 0.7 },
          { name: 'Tin', position: 7, velocity: 0.9 },
          { name: 'Ta', position: 8, velocity: 0.6 },
          { name: 'Ta', position: 9, velocity: 0.9 },
          { name: 'Dha', position: 10, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Pancham Sawari - 15 matras
 * Divisions: X 2 0 3 4 (groups of 3)
 * Theka: Dhin Na Dhin | Dhin Dhin Na | Ti Na Dhin | Dhin Dhin Na | Dha Na Dhin
 * Note: Adjusted to fill 15 matras with standard grouping 3+3+3+3+3
 */
export const panchamSawari: TaalDefinition = {
  id: 'pancham-sawari',
  name: 'Pancham Sawari',
  matras: 15,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'taali', label: '2' },
    { matra: 7, type: 'khaali', label: '0' },
    { matra: 10, type: 'taali', label: '3' },
    { matra: 13, type: 'taali', label: '4' },
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
          { name: 'Na', position: 2, velocity: 0.7 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.9 },
          { name: 'Dhin', position: 5, velocity: 0.7 },
          { name: 'Na', position: 6, velocity: 0.7 },
          { name: 'Ti', position: 7, velocity: 0.9 },
          { name: 'Na', position: 8, velocity: 0.7 },
          { name: 'Dhin', position: 9, velocity: 0.7 },
          { name: 'Dhin', position: 10, velocity: 0.9 },
          { name: 'Dhin', position: 11, velocity: 0.7 },
          { name: 'Na', position: 12, velocity: 0.7 },
          { name: 'Dha', position: 13, velocity: 0.9 },
          { name: 'Na', position: 14, velocity: 0.7 },
          { name: 'Dhin', position: 15, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Matta Taal - 9 matras
 * Divisions: X 2 0 3 (groups of 2+2+2+3 or 2+2+2+2+1)
 * Theka: Dha Ghir | Na Tin | Na Ka | Dhi Na
 * Grouping: typically 2+2+2+3
 */
export const mattaTaal: TaalDefinition = {
  id: 'matta-taal',
  name: 'Matta Taal',
  matras: 9,
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
          { name: 'Ghir', position: 2, velocity: 0.6 },
          { name: 'Na', position: 3, velocity: 0.9 },
          { name: 'Tin', position: 4, velocity: 0.7 },
          { name: 'Na', position: 5, velocity: 0.9 },
          { name: 'Ka', position: 6, velocity: 0.6 },
          { name: 'Dhi', position: 7, velocity: 0.9 },
          { name: 'Na', position: 8, velocity: 0.7 },
          { name: 'Dha', position: 9, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Bhajani - 8 matras
 * Divisions: X 0 (Sam, Khaali) - like Keherva but different feel
 * Theka: Dha Ge Na Ti | Na Ke Dhi Na
 */
export const bhajani: TaalDefinition = {
  id: 'bhajani',
  name: 'Bhajani',
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
          { name: 'Ke', position: 6, velocity: 0.6 },
          { name: 'Dhi', position: 7, velocity: 0.7 },
          { name: 'Na', position: 8, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Addha - 8 matras
 * Divisions: X 0 (Sam, Khaali) - like Keherva but different groove
 * Theka: Dhin Ta | Dhin Dhin | Ta Ti | Dhin Dhin
 */
export const addha: TaalDefinition = {
  id: 'addha',
  name: 'Addha',
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
          { name: 'Dhin', position: 1, velocity: 1.0 },
          { name: 'Ta', position: 2, velocity: 0.6 },
          { name: 'Dhin', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.7 },
          { name: 'Ta', position: 5, velocity: 0.9 },
          { name: 'Ti', position: 6, velocity: 0.6 },
          { name: 'Dhin', position: 7, velocity: 0.7 },
          { name: 'Dhin', position: 8, velocity: 0.7 },
        ],
      },
    },
  ],
};

/**
 * Punjabi - 8 matras
 * Divisions: X 0 (Sam, Khaali)
 * Theka: Dha Dha | Dhin Na | Dha Dhin | Dha Na
 */
export const punjabi: TaalDefinition = {
  id: 'punjabi',
  name: 'Punjabi',
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
          { name: 'Na', position: 4, velocity: 0.6 },
          { name: 'Dha', position: 5, velocity: 0.9 },
          { name: 'Dhin', position: 6, velocity: 0.7 },
          { name: 'Dha', position: 7, velocity: 0.7 },
          { name: 'Na', position: 8, velocity: 0.6 },
        ],
      },
    },
  ],
};

/**
 * Chartal ki Sawari - 11 matras
 * Divisions: X 0 2 3 (groups: 3+2+3+3)
 * Theka: Dhin Ta Dha | Dhin Ta | Tin Ta Dha | Dhin Ta Dha | Dhin
 * Note: Standard theka adjusted to 11 matras
 */
export const chartalKiSawari: TaalDefinition = {
  id: 'chartal-ki-sawari',
  name: 'Chartal ki Sawari',
  matras: 11,
  divisions: [
    { matra: 1, type: 'sam', label: 'X' },
    { matra: 4, type: 'khaali', label: '0' },
    { matra: 6, type: 'taali', label: '2' },
    { matra: 9, type: 'taali', label: '3' },
  ],
  manjiraSupported: false,
  tempoRange: { min: 10, max: 400 },
  speedBreakpoints: {
    vilambit: 40,
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
          { name: 'Ta', position: 2, velocity: 0.6 },
          { name: 'Dha', position: 3, velocity: 0.7 },
          { name: 'Dhin', position: 4, velocity: 0.9 },
          { name: 'Ta', position: 5, velocity: 0.6 },
          { name: 'Tin', position: 6, velocity: 0.9 },
          { name: 'Ta', position: 7, velocity: 0.6 },
          { name: 'Dha', position: 8, velocity: 0.7 },
          { name: 'Dhin', position: 9, velocity: 0.9 },
          { name: 'Ta', position: 10, velocity: 0.6 },
          { name: 'Dha', position: 11, velocity: 0.7 },
        ],
      },
    },
  ],
};
