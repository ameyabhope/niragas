import type { Bol, SpeedRange, TaalDefinition, TaalStyle } from '@/audio/types';

const SPEED_ORDER: SpeedRange[] = [
  'ati-vilambit',
  'vilambit',
  'madhya',
  'drut',
  'ati-drut',
];

export function getSpeedRange(taal: TaalDefinition, bpm: number): SpeedRange {
  const bp = taal.speedBreakpoints;
  if (bp.atiVilambit !== undefined && bpm < bp.atiVilambit) return 'ati-vilambit';
  if (bpm < bp.vilambit) return 'vilambit';
  if (bpm < bp.madhya) return 'madhya';
  if (bpm < bp.drut) return 'drut';
  if (bp.atiDrut !== undefined && bpm >= bp.atiDrut) return 'ati-drut';
  return 'drut';
}

export function getSpeedLabel(taal: TaalDefinition, bpm: number): string {
  return getSpeedRange(taal, bpm)
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('-');
}

export function getThekaForSpeed(style: TaalStyle, speed: SpeedRange): Bol[] | undefined {
  const exact = style.thekas[speed];
  if (exact) return exact;

  const target = SPEED_ORDER.indexOf(speed);
  for (let distance = 1; distance < SPEED_ORDER.length; distance++) {
    const slower = SPEED_ORDER[target - distance];
    const faster = SPEED_ORDER[target + distance];
    if (slower && style.thekas[slower]) return style.thekas[slower];
    if (faster && style.thekas[faster]) return style.thekas[faster];
  }
  return undefined;
}
