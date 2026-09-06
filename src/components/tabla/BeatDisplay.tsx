import type { TaalDefinition } from '@/audio/types';
import { getSpeedRange, getThekaForSpeed } from '@/lib/taal';

interface BeatDisplayProps {
  taal: TaalDefinition;
  currentMatra: number;
  playing: boolean;
  styleId: string;
  tempo: number;
}

export function BeatDisplay({ taal, currentMatra, playing, styleId, tempo }: BeatDisplayProps) {
  const style = taal.styles.find((entry) => entry.id === styleId) ?? taal.styles[0];
  const bols = style ? getThekaForSpeed(style, getSpeedRange(taal, tempo)) ?? [] : [];

  return (
    <div className="flex flex-wrap gap-2" aria-label={`${taal.name} beat cycle, grouped by vibhag`}>
      {taal.divisions.map((division, index) => {
        const end = taal.divisions[index + 1]?.matra ?? taal.matras + 1;
        const color = division.type === 'sam' ? 'text-sam' : division.type === 'khaali' ? 'text-khaali' : 'text-taali';
        return (
          <div key={division.matra} className="min-w-0 max-w-full rounded-lg border border-white/10 p-1.5">
            <div className={`mb-1 text-[10px] font-semibold ${color}`}>
              {division.label} {division.type === 'sam' ? 'Sam' : division.type === 'khaali' ? 'Khaali' : 'Taali'}
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: end - division.matra }, (_, offset) => {
                const matra = division.matra + offset;
                const active = playing && currentMatra === matra;
                const bol = bols.filter((entry) => entry.position >= matra && entry.position < matra + 1).map((entry) => entry.name).join(' ') || '-';
                return (
                  <div
                    key={matra}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Beat ${matra}: ${bol}`}
                    className={`flex w-12 min-h-12 flex-col items-center justify-center rounded border px-0.5 text-center transition-colors ${active ? 'border-saffron-400 bg-saffron-600/30 text-text-primary' : 'border-white/5 bg-surface-lighter/50 text-text-muted'}`}
                  >
                    <span className="text-xs font-mono">{matra}</span>
                    <span className="w-full break-words text-[10px] leading-tight">{bol}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
