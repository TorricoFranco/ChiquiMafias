import React from 'react';
import { TeamStats, Team } from '../types';
import { BarChart2, AlertCircle } from 'lucide-react';

interface MatchStatsProps {
  stats: TeamStats[];
  homeTeam: Team;
  awayTeam: Team;
}

interface StatRowDefinition {
  label: string;
  homeKey: keyof TeamStats['statistics'];
  isPercent?: boolean;
  isHigherBetter?: boolean;
}

export const MatchStats: React.FC<MatchStatsProps> = ({ stats, homeTeam, awayTeam }) => {
  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-8 text-center my-4">
        <div className="w-12 h-12 rounded-full bg-[#242323] flex items-center justify-center mx-auto mb-3 border border-[#353534]">
          <AlertCircle className="w-6 h-6 text-[#8e9285]" />
        </div>
        <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase">
          Estadísticas no disponibles aún
        </h3>
        <p className="text-xs text-[#8e9285] max-w-sm mx-auto mt-1">
          Las métricas oficiales del partido se sincronizarán periódicamente a medida que avance el juego.
        </p>
      </div>
    );
  }

  const homeStats = stats.find((s) => s.teamId === homeTeam.id)?.statistics || stats[0]?.statistics;
  const awayStats = stats.find((s) => s.teamId === awayTeam.id)?.statistics || stats[1]?.statistics;

  const rows: StatRowDefinition[] = [
    { label: 'Posesión del Balón', homeKey: 'ball_possession', isPercent: true },
    { label: 'Goles Esperados (xG)', homeKey: 'expected_goals' },
    { label: 'Tiros Totales', homeKey: 'total_shots' },
    { label: 'Tiros al Arco', homeKey: 'shots_on_goal' },
    { label: 'Tiros Desviados', homeKey: 'shots_off_goal' },
    { label: 'Tiros Bloqueados', homeKey: 'blocked_shots' },
    { label: 'Tiros Dentro del Área', homeKey: 'shots_insidebox' },
    { label: 'Tiros Fuera del Área', homeKey: 'shots_outsidebox' },
    { label: 'Efectividad de Pases', homeKey: 'passes_%', isPercent: true },
    { label: 'Pases Totales', homeKey: 'total_passes' },
    { label: 'Pases Precisos', homeKey: 'passes_accurate' },
    { label: 'Tiros de Esquina', homeKey: 'corner_kicks' },
    { label: 'Faltas Cometidas', homeKey: 'fouls', isHigherBetter: false },
    { label: 'Fueras de Juego', homeKey: 'offsides' },
    { label: 'Atajadas del Arquero', homeKey: 'goalkeeper_saves' },
    { label: 'Tarjetas Amarillas', homeKey: 'yellow_cards', isHigherBetter: false },
    { label: 'Tarjetas Rojas', homeKey: 'red_cards', isHigherBetter: false },
  ];

  const parseNum = (val: string | number | null | undefined): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    const clean = val.replace('%', '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  };

  return (
    <div className="rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-6 shadow-sm">
      {/* Header Teams */}
      <div className="flex items-center justify-between border-b border-[#2b2a2a] pb-4 mb-6">
        <div className="flex items-center gap-2">
          {homeTeam.logo && (
            <img src={homeTeam.logo} alt={homeTeam.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
          )}
          <span className="font-extrabold text-sm text-[#e5e2e1] uppercase">{homeTeam.name}</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-[#8e9285] uppercase">
          <BarChart2 className="w-4 h-4 text-[#d2f000]" />
          <span>Métricas Oficiales</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-[#e5e2e1] uppercase">{awayTeam.name}</span>
          {awayTeam.logo && (
            <img src={awayTeam.logo} alt={awayTeam.name} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
          )}
        </div>
      </div>

      {/* Stats List */}
      <div className="flex flex-col gap-4">
        {rows.map((row) => {
          const homeValRaw = homeStats ? homeStats[row.homeKey] : null;
          const awayValRaw = awayStats ? awayStats[row.homeKey] : null;

          const homeValNum = parseNum(homeValRaw);
          const awayValNum = parseNum(awayValRaw);

          const total = (homeValNum || 0) + (awayValNum || 0);
          const homePct = total > 0 ? ((homeValNum || 0) / total) * 100 : 50;
          const awayPct = 100 - homePct;

          const homeDisplay = homeValRaw !== null && homeValRaw !== undefined ? `${homeValRaw}` : '-';
          const awayDisplay = awayValRaw !== null && awayValRaw !== undefined ? `${awayValRaw}` : '-';

          return (
            <div key={row.label} className="bg-[#242323] p-3 rounded-xl border border-[#2b2a2a]">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className={`font-mono text-sm ${homeValRaw !== null ? 'text-[#e5e2e1]' : 'text-[#5e6255]'}`}>
                  {homeDisplay}
                </span>
                <span className="text-[#8e9285] uppercase tracking-wider text-[11px] font-semibold">
                  {row.label}
                </span>
                <span className={`font-mono text-sm ${awayValRaw !== null ? 'text-[#e5e2e1]' : 'text-[#5e6255]'}`}>
                  {awayDisplay}
                </span>
              </div>

              {/* Progress bar if both values exist */}
              {homeValNum !== null && awayValNum !== null ? (
                <div className="w-full h-1.5 rounded-full bg-[#131313] overflow-hidden flex">
                  <div style={{ width: `${homePct}%` }} className="bg-[#d2f000] h-full transition-all duration-500" />
                  <div style={{ width: `${awayPct}%` }} className="bg-blue-500 h-full transition-all duration-500" />
                </div>
              ) : (
                <div className="w-full h-1.5 rounded-full bg-[#131313] opacity-30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
