import React from 'react';
import { StandingRow, TournamentType, ZoneType } from '../../../type';
import { TeamRowCell } from '../utils/TeamRowCell';
import { Sparkles, Radio } from 'lucide-react';

interface StandingsTableProps {
    tournament?: TournamentType;
    zone: ZoneType;
    standings: StandingRow[];
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
    tournament = 'Apertura',
    zone,
    standings,
}) => {
    const hasLiveMatch = standings.some((row) => row.live);

    return (
        <div className="flex flex-col bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-xl">
            {/* Table Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border-b border-[#353534] bg-[#222221]">
                <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
                    <h3 className="font-black text-sm sm:text-base text-[#e5e2e1] uppercase tracking-tight">
                    {tournament} 2026 (Zona {zone})
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    {hasLiveMatch && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[11px] font-bold font-mono text-red-400 animate-pulse w-fit">
                            <Radio className="w-3.5 h-3.5 text-red-500" />
                            <span>PARTIDOS EN VIVO</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Table Content with horizontal scroll on small devices */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[550px] sm:min-w-full">
                    <thead>
                        <tr className="border-b border-[#353534] bg-[#181818] text-[11px] font-bold uppercase tracking-wider text-[#8e9285]">
                            <th className="py-2.5 px-3 text-center w-10">Pos</th>
                            <th className="py-2.5 px-3">Equipo</th>
                            <th className="py-2.5 px-3 text-center font-black text-sky-400 w-12">PTS</th>
                            <th className="py-2.5 px-2 text-center w-10">J</th>
                            <th className="py-2.5 px-2 text-center w-10">G</th>
                            <th className="py-2.5 px-2 text-center w-10">E</th>
                            <th className="py-2.5 px-2 text-center w-10">P</th>
                            <th className="py-2.5 px-3 text-center hidden sm:table-cell w-16">Goles</th>
                            <th className="py-2.5 px-2 text-center w-12">DG</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a] text-xs font-medium text-[#c6c9ab]">
                        {standings.map((row, index) => {
                            const isPlayoffZone = index < 8; // Top 8 qualify for playoffs

                            return (
                                <tr
                                    key={row.teamId}
                                    className={`transition-colors hover:bg-[#252525] ${
                                        isPlayoffZone
                                            ? 'bg-sky-950/15 border-l-4 border-l-sky-500'
                                            : 'border-l-4 border-l-transparent'
                                    }`}
                                >
                                    {/* Position number */}
                                    <td className="py-2 px-3 text-center">
                                        <span
                                            className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-bold text-xs font-mono ${
                                                isPlayoffZone
                                                    ? 'bg-sky-500/20 text-sky-300'
                                                    : 'text-[#8e9285]'
                                            }`}
                                        >
                                            {index + 1}
                                        </span>
                                    </td>

                                    {/* Team cell */}
                                    <td className="py-2 px-3">
                                        <TeamRowCell
                                            teamId={row.teamId}
                                            teamName={row.teamName}
                                            teamLogo={row.teamLogo}
                                            live={row.live}
                                        />
                                    </td>

                                    {/* Points (Highlighted in sky-400) */}
                                    <td className="py-2 px-3 text-center font-black text-sm text-sky-400 font-mono">
                                        {row.points}
                                    </td>

                                    {/* Stats */}
                                    <td className="py-2 px-2 text-center font-mono text-[#e5e2e1]">{row.played}</td>
                                    <td className="py-2 px-2 text-center font-mono text-emerald-400/90">{row.won}</td>
                                    <td className="py-2 px-2 text-center font-mono text-[#a0a09e]">{row.draw}</td>
                                    <td className="py-2 px-2 text-center font-mono text-red-400/90">{row.lost}</td>

                                    {/* Goles (hidden on mobile) */}
                                    <td className="py-2 px-3 text-center font-mono text-[#8e9285] hidden sm:table-cell text-[11px]">
                                        {row.goalsFor}:{row.goalsAgainst}
                                    </td>

                                    {/* Goal Difference */}
                                    <td
                                        className={`py-2 px-2 text-center font-mono font-bold ${
                                            row.goalDiff > 0
                                                ? 'text-emerald-400'
                                                : row.goalDiff < 0
                                                ? 'text-red-400'
                                                : 'text-[#8e9285]'
                                        }`}
                                    >
                                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer explanation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-[#181818] border-t border-[#353534] text-[11px] text-[#8e9285]">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-sky-500/30 border border-sky-500 inline-block"></span>
                    <span>
                        <strong className="text-sky-300">Puestos 1° al 8°:  </strong>   Clasifican a la Fase Final (Octavos de Final)
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-[#a0a09e]">
                </div>
            </div>
        </div>
    );
};