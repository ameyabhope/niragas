/**
 * Visual beat display: shows matra positions with sam/taali/khaali markers.
 * Highlights the currently playing matra.
 */

import type { TaalDefinition } from '@/audio/types';

interface BeatDisplayProps {
  taal: TaalDefinition;
  currentMatra: number;
  playing: boolean;
}

export function BeatDisplay({ taal, currentMatra, playing }: BeatDisplayProps) {
  // Build a lookup: matra → division info
  const divisionMap = new Map(
    taal.divisions.map((d) => [d.matra, d])
  );

  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: taal.matras }, (_, i) => {
        const matra = i + 1;
        const division = divisionMap.get(matra);
        const isCurrent = playing && currentMatra === matra;

        // Color based on division type
        let borderColor = 'border-white/10';
        let textColor = 'text-text-muted';
        if (division) {
          switch (division.type) {
            case 'sam':
              borderColor = 'border-sam/60';
              textColor = 'text-sam';
              break;
            case 'taali':
              borderColor = 'border-taali/60';
              textColor = 'text-taali';
              break;
            case 'khaali':
              borderColor = 'border-khaali/60';
              textColor = 'text-khaali';
              break;
          }
        }

        return (
          <div
            key={matra}
            className={`
              flex flex-col items-center justify-center
              w-9 h-12 rounded-lg border text-xs font-mono
              transition-all duration-100
              ${borderColor}
              ${isCurrent
                ? 'bg-saffron-600/30 scale-110 shadow-lg shadow-saffron-500/20'
                : 'bg-surface-lighter/50'
              }
            `}
          >
            {/* Division label (X, 2, 0, 3) */}
            {division && (
              <span className={`text-[10px] font-bold ${textColor}`}>
                {division.label}
              </span>
            )}
            {/* Matra number */}
            <span
              className={`text-xs ${
                isCurrent ? 'text-saffron-300 font-bold' : 'text-text-muted'
              }`}
            >
              {matra}
            </span>
          </div>
        );
      })}
    </div>
  );
}
