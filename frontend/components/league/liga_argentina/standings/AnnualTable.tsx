"use client";
import React, { useMemo } from "react";
import { Star } from "lucide-react";
import { getLiveMatchForTeam, LiveHeaderBadge, hasActiveLiveMatches } from "./HasActiveLiveMatch";
import { TeamRowCell } from "./TeamRowCell";

interface AnnualRow {
  position: number;
  teamId: string;
  teamName: string;
  teamLogo?: string;
  points: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  description?: string | null;
  pts?: number;
}


const Badge = ({ label, variant }: { label: string; variant: 'green' | 'yellow' | 'blue' | 'red' }) => {
  const styles = {
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tighter border ${styles[variant]} whitespace-nowrap`}>
      {label}
    </span>
  );
};

/**
 * Función compartida para determinar el estilo de fila según su clasificación
 */
const getRowStylingAnnual = (row: AnnualRow, index: number, total: number): string => {
  const desc = row.description?.toLowerCase() || "";
  if (desc.includes("libertadores")) {
    return (index === 0 || desc.includes("group"))
      ? "bg-green-900/10 border-l-2 border-green-500 hover:bg-green-800/20"
      : "bg-yellow-900/10 border-l-2 border-yellow-500 hover:bg-yellow-800/20";
  }
  if (desc.includes("sudamericana")) return "bg-blue-900/10 border-l-2 border-blue-400 hover:bg-blue-800/20";
  if (desc.includes("relegation") || index === total - 1) return "bg-red-900/20 border-l-2 border-red-500 hover:bg-red-800/30";
  return "hover:bg-white/[0.02] border-l-2 border-transparent";
};

/**
 * Función compartida para renderizar el badge según la clasificación
 */
const renderBadgeAnnual = (row: AnnualRow, index: number, total: number) => {
  const desc = row.description?.toLowerCase() || "";
  if (desc.includes("libertadores")) {
    return (desc.includes("group") || index === 0)
      ? <Badge label="LIB" variant="green" />
      : <Badge label="LIB (P)" variant="yellow" />;
  }
  if (desc.includes("sudamericana")) return <Badge label="SUD" variant="blue" />;
  if (desc.includes("relegation") || index === total - 1) return <Badge label="DESC" variant="red" />;
  return null;
};

export const AnnualTable: React.FC<{ data: AnnualRow[], liveResults?: Record<string, any> }> = ({ data, liveResults = {} }) => {

  const isAnyMatchLive = useMemo(() => hasActiveLiveMatches(liveResults), [liveResults]);

  return (
    <div className="bg-[#1e1e1e] p-4 rounded-2xl shadow-xl border border-gray-800 font-sans h-fit">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center border-b border-gray-700 pb-2">
        <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
        Tabla Anual {new Date().getFullYear()}
        {isAnyMatchLive && <LiveHeaderBadge />}
      </h3>

      <div className="overflow-x-auto custom-scrollbar-horizontal">
        <table className="w-full text-left text-xs text-gray-300">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700 text-[9px] uppercase tracking-tighter font-bold">
              <th className="px-1 py-3 text-center w-6">#</th>
              <th className="px-2 py-3 text-left">Equipo</th>
              <th className="px-1 py-3 text-center font-bold text-white">PTS</th>
              <th className="px-1 py-3 text-center">PJ</th>
              <th className="px-1 py-3 text-center hidden xl:table-cell">G</th>
              <th className="px-1 py-3 text-center hidden xl:table-cell">E</th>
              <th className="px-1 py-3 text-center hidden xl:table-cell">P</th>
              <th className="px-1 py-3 text-center hidden 2xl:table-cell">Goles</th>
              <th className="px-1 py-3 text-center">DG</th>
              <th className="px-2 py-3 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data && data.length > 0 ? (
              data.map((row, index) => {
                const live = getLiveMatchForTeam(row.teamId, liveResults);

                return (
                  <tr
                    key={row.teamId}
                    className={`transition-colors duration-150 ${getRowStylingAnnual(row, index, data.length)}`}
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
                    <td className="px-1 py-3 text-center">
                      <span className="text-yellow-400 font-black">{row.points ?? row.pts}</span>
                    </td>
                    <td className="px-1 py-3 text-center font-mono text-gray-400">{row.played}</td>
                    <td className="px-1 py-3 text-center font-mono text-gray-500 hidden xl:table-cell">{row.won}</td>
                    <td className="px-1 py-3 text-center font-mono text-gray-500 hidden xl:table-cell">{row.draw}</td>
                    <td className="px-1 py-3 text-center font-mono text-gray-500 hidden xl:table-cell">{row.lost}</td>
                    <td className="px-1 py-3 text-center font-mono text-[9px] text-gray-600 hidden 2xl:table-cell">
                      {row.goalsFor}:{row.goalsAgainst}
                    </td>
                    <td className={`px-1 py-3 text-center font-mono font-bold text-[10px] ${row.goalDiff >= 0 ? 'text-sky-500' : 'text-rose-500'}`}>
                      {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                    </td>
                    <td className="px-2 py-3 text-right">
                      {renderBadgeAnnual(row, index, data.length)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-600 italic text-[11px]">
                  No hay datos anuales disponibles
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};