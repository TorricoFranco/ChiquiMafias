import React from 'react';
import { Check, X, Shield } from 'lucide-react';
import { ShootoutKick, Team } from '../types';

interface MatchPenaltyShootoutProps {
  kicks: ShootoutKick[];
  homeTeam: Team;
  awayTeam: Team;
  homePenalties: number | null;
  awayPenalties: number | null;
  /** La tanda se está pateando. */
  inProgress: boolean;
  /** El partido terminó: recién ahí hay ganador (una tanda interrumpida no lo tiene). */
  decided: boolean;
}

interface LaneProps {
  team: Team;
  kicks: ShootoutKick[];
  total: number;
  isWinner: boolean;
}

const ShootoutLane: React.FC<LaneProps> = ({ team, kicks, total, isWinner }) => (
  <div className="rounded-xl bg-[#242323] border border-[#2b2a2a] p-3">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[#191818] border border-[#353534] p-1 flex items-center justify-center shrink-0">
        {team.logo ? (
          <img src={team.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <Shield className="w-4 h-4 text-[#8e9285]" />
        )}
      </div>
      <span className="flex-1 min-w-0 truncate font-extrabold text-sm text-[#e5e2e1] uppercase">
        {team.name}
      </span>
      <span
        className={`font-mono font-black text-2xl leading-none ${isWinner ? 'text-[#d2f000]' : 'text-[#e5e2e1]'}`}
        aria-label={`${total} penales convertidos`}
      >
        {total}
      </span>
    </div>

    {/* Sin tiros (todavía no llegaron o el proveedor no los informa) queda solo el total. */}
    {kicks.length > 0 && (
      <ul className="flex flex-wrap gap-x-2 gap-y-3 mt-3">
        {kicks.map((kick) => (
          <li
            key={kick.order}
            aria-label={`${kick.scored ? 'Gol' : 'Errado'}: ${kick.player}`}
            className="flex flex-col items-center gap-1 w-14"
          >
            <span
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
                kick.scored
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400'
                  : 'bg-[#d30017]/20 border-[#d30017] text-[#ffb4ab]'
              }`}
            >
              {kick.scored ? <Check className="w-4 h-4" strokeWidth={3} /> : <X className="w-4 h-4" strokeWidth={3} />}
            </span>
            <span className="w-full text-center text-[10px] leading-tight text-[#c6c9ab] line-clamp-2 break-words" title={kick.player}>
              {kick.player}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const MatchPenaltyShootout: React.FC<MatchPenaltyShootoutProps> = ({
  kicks,
  homeTeam,
  awayTeam,
  homePenalties,
  awayPenalties,
  inProgress,
  decided,
}) => {
  const homeKicks = kicks.filter((k) => k.teamId === homeTeam.id).sort((a, b) => a.order - b.order);
  const awayKicks = kicks.filter((k) => k.teamId === awayTeam.id).sort((a, b) => a.order - b.order);

  // El marcador del proveedor manda: los tiros pueden llegar más tarde o no llegar.
  const homeTotal = homePenalties ?? homeKicks.filter((k) => k.scored).length;
  const awayTotal = awayPenalties ?? awayKicks.filter((k) => k.scored).length;

  return (
    <section
      aria-label="Tanda de penales"
      className={`rounded-2xl bg-[#1c1b1b] border p-4 md:p-6 ${inProgress ? 'border-red-500/40' : 'border-[#2b2a2a]'}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#2b2a2a] pb-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="font-extrabold text-sm text-[#e5e2e1] uppercase">Tanda de penales</h3>
          {inProgress && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-extrabold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              En curso
            </span>
          )}
        </div>
        <span className="font-mono font-black text-sm text-[#d2f000]">
          {homeTotal} - {awayTotal}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <ShootoutLane team={homeTeam} kicks={homeKicks} total={homeTotal} isWinner={decided && homeTotal > awayTotal} />
        <ShootoutLane team={awayTeam} kicks={awayKicks} total={awayTotal} isWinner={decided && awayTotal > homeTotal} />
      </div>

      {kicks.length === 0 && (
        <p className="mt-3 text-center text-[11px] text-[#8e9285]">
          {inProgress ? 'Los tiros aparecen a medida que se patean.' : 'Sin el detalle de los tiros.'}
        </p>
      )}
    </section>
  );
};
