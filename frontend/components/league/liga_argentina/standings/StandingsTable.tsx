"use client";
import React, { useMemo } from "react";
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { getLiveMatchForTeam, LiveHeaderBadge, hasActiveLiveMatches } from "./HasActiveLiveMatch";
import { TeamRowCell } from "./TeamRowCell";
import { getRowClassForStandings } from "./liveMatchUtils";


interface RowData {
  position: number;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  played: number;
  pts: string;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  description?: string | null;
}

interface StandingsTableProps {
  data: {
    A?: RowData[];
    B?: RowData[];
  } | any;
  activeZone?: string;
  liveResults?: Record<string, any>;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  data,
  activeZone = "A",
  liveResults = {}
}) => {

  const rows: RowData[] = useMemo(() => {
    if (!data) return [];

    const zoneKey = activeZone.toUpperCase();
    const zoneData = data[zoneKey] || data[activeZone.toLowerCase()] || [];

    return zoneData;

  }, [data, activeZone, liveResults]);

  const isAnyMatchLive = useMemo(() => hasActiveLiveMatches(liveResults), [liveResults]);

  if (!data || rows.length === 0) {
    return (
      <div className="p-8 bg-gray-800/30 rounded-2xl text-center my-6 border border-gray-800 shadow-inner">
        <AlertTriangle className="w-10 h-10 text-yellow-500/50 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white/80 uppercase tracking-tight">
          Zona {activeZone}
        </h3>
        <p className="text-gray-500 mt-2 font-medium">
          La competencia aún no ha comenzado o no hay datos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="my-6 bg-[#1e1e1e] p-5 rounded-2xl shadow-2xl border border-gray-800">
      <div className="flex justify-between items-center mb-5 border-b border-gray-700 pb-3">
        <div className="text-lg font-bold text-white flex items-center uppercase tracking-wider">
          <BarChart3 className="w-5 h-5 mr-2 text-sky-400" />
          Clasificación - Zona {activeZone}
          {isAnyMatchLive && <LiveHeaderBadge />}
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar-horizontal">
        <table className="min-w-full text-sm text-gray-300">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700 text-[10px] uppercase tracking-widest font-bold">
              <th className="px-3 py-3 text-center w-10">Pos</th>
              <th className="px-3 py-3 text-left min-w-[160px]">Equipo</th>
              <th className="px-2 py-3 text-center font-bold text-white">PTS</th>
              <th className="px-2 py-3 text-center">J</th>
              <th className="px-2 py-3 text-center">G</th>
              <th className="px-2 py-3 text-center">E</th>
              <th className="px-2 py-3 text-center">P</th>
              <th className="px-2 py-3 text-center hidden sm:table-cell">Goles</th>
              <th className="px-2 py-3 text-center">DG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {rows.map((row, index) => {
              const live = getLiveMatchForTeam(row.teamId, liveResults);

              return (
                <tr
                  key={row.teamId}
                  className={`transition-all duration-150 ${getRowClassForStandings(index, rows.length)}`}
                >
                  <td className="px-3 py-4 text-center font-mono font-bold text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4">
                    <TeamRowCell
                      teamId={row.teamId}
                      teamName={row.teamName}
                      teamLogo={row.teamLogo}
                      live={live}
                    />
                  </td>
                  <td className="px-2 py-4 text-center">
                    <span className="text-sky-400 font-black text-lg">
                      {row.points ?? row.pts}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-center font-mono font-semibold">{row.played}</td>
                  <td className="px-2 py-4 text-center font-mono text-gray-400">{row.won}</td>
                  <td className="px-2 py-4 text-center font-mono text-gray-400">{row.draw}</td>
                  <td className="px-2 py-4 text-center font-mono text-gray-400">{row.lost}</td>
                  <td className="px-2 py-4 text-center font-mono text-[11px] text-gray-500 hidden sm:table-cell">
                    {row.goalsFor}/{row.goalsAgainst}
                  </td>
                  <td className={`px-2 py-4 text-center font-mono font-bold ${row.goalDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="mt-5 p-3 bg-sky-500/5 rounded-xl border border-sky-500/10">
        <div className="flex items-start gap-3">
          <div className="w-4 h-4 mt-0.5 rounded shadow-sm bg-sky-500 flex-shrink-0" />
          <div>
            <span className="font-bold text-sky-400 text-xs uppercase block">Zona de Clasificación</span>
            <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
              Los primeros 8 equipos de cada zona clasifican a la Fase Final del torneo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};