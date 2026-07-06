"use client";
import React, { useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { getLiveMatchForTeam, LiveHeaderBadge, hasActiveLiveMatches } from "./HasActiveLiveMatch";
import { TeamRowCell } from "./TeamRowCell";
import { getRowClassForAverages } from "./liveMatchUtils";


interface AverageRow {
  teamId: string;
  teamName: string;
  teamLogo?: string;
  pts24: number;
  pj24: number;
  pts25: number;
  pj25: number;
  pts26: number;
  pj26: number;
  totalPoints: number;
  totalPlayed: number;
  coefficient: number;
  stats2024?: { pj: number };
  stats2025?: { pj: number };
  stats2026?: { pj: number };
}

export const AveragesTable: React.FC<{ data: AverageRow[], liveResults?: Record<string, any> }> = ({
  data,
  liveResults = {}
}) => {

  const isAnyMatchLive = useMemo(() => hasActiveLiveMatches(liveResults), [liveResults]);

  return (
    <div className="bg-[#1e1e1e] p-4 rounded-2xl shadow-xl border border-gray-800 font-sans h-fit">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
        <ArrowDown className="w-4 h-4 mr-2 text-red-500" />
        Tabla de Promedios
        {isAnyMatchLive && <LiveHeaderBadge />}
      </h3>

      <div className="overflow-x-auto custom-scrollbar-horizontal">
        <table className="w-full text-left text-xs text-gray-300">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700 text-[9px] uppercase tracking-tighter font-bold">
              <th className="px-1 py-3 text-center w-6">#</th>
              <th className="px-2 py-3 text-left">Equipo</th>
              <th className="px-1 py-3 text-center hidden md:table-cell">24/25/26</th>
              <th className="px-1 py-3 text-center">Pts</th>
              <th className="px-1 py-3 text-center">PJ</th>
              <th className="px-2 py-3 text-right text-white font-bold">Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data && data.length > 0 ? (
              data.map((row, index) => {
                const live = getLiveMatchForTeam(row.teamId, liveResults);

                return (
                  <tr
                    key={row.teamId}
                    className={`transition-colors duration-150 ${getRowClassForAverages(index, data.length)}`}
                  >
                    <td className="px-1 py-3 text-center text-gray-600 font-mono text-[10px]">
                      {index + 1}
                    </td>
                    <td className="px-2 py-3">
                      <TeamRowCell
                        teamId={row.teamId}
                        teamName={row.teamName}
                        teamLogo={row.teamLogo}
                        live={live}
                        compact
                      />
                    </td>
                    <td className="px-1 py-3 text-center text-gray-500 hidden md:table-cell font-mono text-[10px] italic">
                      {row.stats2024?.pj}/{row.stats2025?.pj}/{row.stats2026?.pj}
                    </td>
                    <td className="px-1 py-3 text-center font-mono text-gray-400">
                      {row.totalPoints}
                    </td>
                    <td className="px-1 py-3 text-center font-mono text-gray-400">
                      {row.totalPlayed}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className="bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/20 font-black text-[13px]">
                        {Number(row.coefficient || 0).toFixed(3)}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-600 italic text-[11px]">
                  No hay datos de promedios disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
        <p className="text-[9px] text-gray-500 leading-tight">
          <span className="text-red-500 font-bold uppercase mr-1 italic">Descenso:</span>
          El último equipo de esta tabla al finalizar la temporada regular perderá la categoría.
        </p>
      </div>
    </div>
  );
};