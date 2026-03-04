/**
 * Visual beat display: shows matra positions with sam/taali/khaali markers.
 * Highlights the currently playing matra with pulse animations.
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
        const isSam = division?.type === 'sam';

        // Color based on division type
        let borderColor = 'border-white/10';
        let textColor = 'text-text-muted';
        let activeBg = 'bg-saffron-600/30';
        let activeShadow = 'shadow-saffron-500/20';

        if (division) {
          switch (division.type) {
            case 'sam':
              borderColor = 'border-sam/60';
              textColor = 'text-sam';
              activeBg = 'bg-sam/30';
              activeShadow = 'shadow-sam/30';
              break;
            case 'taali':
              borderColor = 'border-taali/60';
              textColor = 'text-taali';
              activeBg = 'bg-taali/20';
              activeShadow = 'shadow-taali/20';
              break;
            case 'khaali':
              borderColor = 'border-khaali/60';
              textColor = 'text-khaali';
              activeBg = 'bg-khaali/20';
              activeShadow = 'shadow-khaali/20';
              break;
          }
        }

        return (
          <div
            key={matra}
            className={`
              relative flex flex-col items-center justify-center
              w-9 h-12 rounded-lg border text-xs font-mono
              transition-all duration-75
              ${borderColor}
              ${isCurrent
                ? `${activeBg} scale-110 shadow-lg ${activeShadow} border-opacity-100`
                : 'bg-surface-lighter/50'
              }
            `}
          >
            {/* Pulse ring on sam beat */}
            {isCurrent && isSam && (
              <span
                className="absolute inset-0 rounded-lg border-2 border-sam animate-ping opacity-40"
                style={{ animationDuration: '0.6s', animationIterationCount: '1' }}
              />
            )}

            {/* Pulse dot on current beat */}
            {isCurrent && !isSam && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-saffron-400 animate-pulse"
              />
            )}

            {/* Division label (X, 2, 0, 3) */}
            {division && (
              <span className={`text-[10px] font-bold leading-none ${
                isCurrent ? 'text-white' : textColor
              }`}>
                {division.label}
              </span>
            )}

            {/* Matra number */}
            <span
              className={`text-xs leading-tight ${
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
