import React, { useState } from 'react';
import { LiveMatchInfo } from '@/features/league/type';
import { Shield } from 'lucide-react';

interface TeamRowCellProps {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  live?: LiveMatchInfo;
  compact?: boolean;
}

export const TeamRowCell: React.FC<TeamRowCellProps> = ({
  teamId,
  teamName,
  teamLogo,
  live,
  compact = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const fallbackUrl = `https://media.api-sports.io/football/teams/${teamId}.png`;
  const logoSrc = imageError ? null : (teamLogo || fallbackUrl);

  const getScoreColor = (resultType?: 'winning' | 'losing' | 'drawing') => {
    switch (resultType) {
      case 'winning':
        return 'text-emerald-400';
      case 'losing':
        return 'text-red-400';
      case 'drawing':
      default:
        return 'text-amber-400';
    }
  };

  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2.5 py-1 w-full">
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        {/* Team Crest / Logo */}
        <div className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} sm:w-7 sm:h-7 rounded-full bg-[#252525] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0`}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={teamName}
              className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} sm:w-5.5 sm:h-5.5 object-contain`}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <Shield className="w-3.5 h-3.5 text-[#8e9285]" />
          )}
        </div>

        <span
          className={`font-extrabold uppercase tracking-tight text-[#e5e2e1] ${compact ? 'line-clamp-2 break-words leading-tight sm:truncate text-[10px] sm:text-xs' : 'truncate text-[11px] sm:text-sm'}`}
          title={teamName}
        >
          {teamName}
        </span>
      </div>

      {live && (
        <span className={`font-mono font-bold text-xs flex-shrink-0 ${getScoreColor(live.resultType)}`}>
          {live.isHome ? `${live.homeGoals} - ${live.awayGoals}` : `${live.awayGoals} - ${live.homeGoals}`}
        </span>
      )}
    </div>
  );
};