import React from 'react';
import { StandingRow } from '@/features/league/type';
import { TeamRowCell } from '../utils/TeamRowCell';
import { Globe, ShieldAlert, Radio } from 'lucide-react';

interface AnnualTableProps {
  annualStandings: StandingRow[];
}

export const AnnualTable: React.FC<AnnualTableProps> = ({
  annualStandings,
}) => {
  const hasLiveMatch = annualStandings.some((row) => row.live);

  return (
    <div className="flex flex-col bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border-b border-[#353534] bg-[#222221]">
        <div className="flex items-center gap-2.5">
          <h3 className="font-black text-sm sm:text-base text-[#e5e2e1] uppercase tracking-tight">
            Tabla Anual 2026 (Apertura + Clausura)
          </h3>
        </div>

        {hasLiveMatch && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[11px] font-bold font-mono text-red-400 animate-pulse w-fit">
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span>PARTIDOS EN VIVO</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[580px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#353534] bg-[#181818] text-[11px] font-bold uppercase tracking-wider text-[#8e9285]">
              <th className="py-2.5 px-3 text-center w-10" title="Posición en la tabla">#</th>
              <th className="py-2.5 px-3" title="Nombre y escudo oficial del equipo">Equipo</th>
              <th className="py-2.5 px-3 text-center font-black text-sky-400 w-12" title="Puntos totales obtenidos">PTS</th>
              <th className="py-2.5 px-2 text-center w-10" title="Partidos jugados">PJ</th>
              <th className="py-2.5 px-2 text-center w-10" title="Partidos ganados">G</th>
              <th className="py-2.5 px-2 text-center w-10" title="Partidos empatados">E</th>
              <th className="py-2.5 px-2 text-center w-10" title="Partidos perdidos">P</th>
              <th className="py-2.5 px-3 text-center hidden md:table-cell w-16" title="Goles a favor y goles en contra">Gol</th>
              <th className="py-2.5 px-2 text-center w-12" title="Diferencia de gol (GF menos GC)">DG</th>
              <th className="py-2.5 px-3 text-center w-20" title="Clasificación a copas internacionales o situación actual">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a] text-xs font-medium text-[#c6c9ab]">
            {annualStandings.map((row, index) => {
              const pos = index + 1;
              const isLibGroup = pos === 1;
              const isLibPrevia = pos >= 2 && pos <= 3;
              const isSuda = pos >= 4 && pos <= 9;
              const isRelegation = pos === annualStandings.length;

              const zebraBg = index % 2 === 0 ? 'bg-transparent' : 'bg-[#222221]';
              let rowClass = `${zebraBg} border-l-4 border-l-transparent`;

              if (isLibGroup) {
                rowClass = 'bg-emerald-950/20 border-l-4 border-l-emerald-500';
              } else if (isLibPrevia) {
                rowClass = 'bg-amber-950/15 border-l-4 border-l-amber-500';
              } else if (isSuda) {
                rowClass = 'bg-sky-950/15 border-l-4 border-l-sky-500';
              } else if (isRelegation) {
                rowClass = 'bg-red-950/25 border-l-4 border-l-red-500';
              }

              return (
                <tr key={row.teamId} className={`transition-colors hover:bg-[#2e2e2d] ${rowClass}`}>
                  {/* Position */}
                  <td className="py-2 px-3 text-center font-mono font-bold text-[#8e9285]">
                    {pos}
                  </td>

                  {/* Team */}
                  <td className="py-2 px-3">
                    <TeamRowCell
                      teamId={row.teamId}
                      teamName={row.teamName}
                      teamLogo={row.teamLogo}
                      live={row.live}
                      compact
                    />
                  </td>

                  {/* Points */}
                  <td className="py-2 px-3 text-center font-black text-sm text-sky-400 font-mono">
                    {row.points}
                  </td>

                  {/* PJ */}
                  <td className="py-2 px-2 text-center font-mono text-[#e5e2e1]">{row.played}</td>
                  <td className="py-2 px-2 text-center font-mono text-emerald-400/90">{row.won}</td>
                  <td className="py-2 px-2 text-center font-mono text-[#a0a09e]">{row.draw}</td>
                  <td className="py-2 px-2 text-center font-mono text-red-400/90">{row.lost}</td>

                  {/* Goles */}
                  <td className="py-2 px-3 text-center font-mono text-[#8e9285] hidden md:table-cell text-[11px]">
                    {row.goalsFor}:{row.goalsAgainst}
                  </td>

                  {/* DG */}
                  <td
                    className={`py-2 px-2 text-center font-mono font-bold ${row.goalDiff > 0
                      ? 'text-emerald-400'
                      : row.goalDiff < 0
                        ? 'text-red-400'
                        : 'text-[#8e9285]'
                      }`}
                  >
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>

                  {/* Estado Badge */}
                  <td className="py-2 px-3 text-center">
                    {isLibGroup && (
                      <span
                        className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-wider border border-emerald-500/30"
                        title="Campeón de Liga. Clasificado a Copa Libertadores 2027 y Supercopa Internacional 2026"
                      >
                        LIB
                      </span>
                    )}
                    {isLibPrevia && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-wider border border-amber-500/30"
                        title="CONMEBOL Libertadores"
                      >
                        LIB (P)
                      </span>
                    )}
                    {isSuda && (
                      <span
                        className="inline-block px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-black tracking-wider border border-sky-500/30"
                        title="CONMEBOL Sudamericana"
                      >
                        SUD
                      </span>
                    )}
                    {isRelegation && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-black tracking-wider border border-red-500/30"
                        title="Zona de Descenso por Tabla Anual"
                      >
                        DESC
                      </span>
                    )}
                    {!isLibGroup && !isLibPrevia && !isSuda && !isRelegation && (
                      <span className="text-[#555] text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer legend */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-[#181818] border-t border-[#353534] text-[11px]">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
          <span>1° Campeón / Libertadores</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
          <span>2°-3° Libertadores</span>
        </div>
        <div className="flex items-center gap-1.5 text-sky-400">
          <span className="w-2.5 h-2.5 rounded bg-sky-500"></span>
          <span>4°-9° Sudamericana</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-400 ml-auto">
          <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          <span>30° Descenso</span>
        </div>
      </div>
    </div>
  );
};