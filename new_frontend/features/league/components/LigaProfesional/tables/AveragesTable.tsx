import React from 'react';
import { AverageRow } from '@/features/league/type';
import { TeamRowCell } from '../utils/TeamRowCell';
import { AlertTriangle, Radio } from 'lucide-react';

interface AveragesTableProps {
    averages: AverageRow[];
}

export const AveragesTable: React.FC<AveragesTableProps> = ({ averages }) => {
    // Detectar si hay algún partido en vivo en esta tabla
    const hasLiveMatch = averages.some((row) => row.live);

    return (
        <div className="flex flex-col bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border-b border-[#353534] bg-[#222221]">
                <div className="flex items-center gap-2.5">
                    <h3 className="font-black text-sm sm:text-base text-[#e5e2e1] uppercase tracking-tight">
                        Tabla de Promedios (2024 - 2026)
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
                            <th className="py-2.5 px-3 text-center w-10">#</th>
                            <th className="py-2.5 px-3">Equipo</th>
                            <th className="py-2.5 px-3 text-center font-black text-amber-400 w-24">Promedio</th>
                            <th className="py-2.5 px-2 text-center w-12">Pts</th>
                            <th className="py-2.5 px-2 text-center w-12">PJ</th>
                            <th className="py-2.5 px-3 text-center hidden md:table-cell text-[10px] text-[#8e9285] w-28">
                                Pts (24/25/26)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a2a] text-xs font-medium text-[#c6c9ab]">
                        {averages.map((row, index) => {
                            const pos = index + 1;
                            const isLast = pos === averages.length;

                            const zebraBg = index % 2 === 0 ? 'bg-transparent' : 'bg-[#222221]';

                            const rowClass = isLast
                                ? 'bg-red-950/25 border-l-4 border-l-red-500'
                                : `${zebraBg} border-l-4 border-l-transparent`;

                            return (
                                <tr
                                    key={row.teamId}
                                    className={`transition-colors hover:bg-[#2e2e2d] ${rowClass}`}
                                >
                                    {/* Pos */}
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

                                    <td className="py-2 px-3 text-center font-black text-sm font-mono">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded ${isLast
                                                ? 'bg-red-500 text-white font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                                                : 'text-amber-400'
                                                }`}
                                        >
                                            {row.coefficient.toFixed(3)}
                                        </span>
                                    </td>

                                    <td className="py-2 px-2 text-center font-mono font-bold text-[#e5e2e1]">
                                        {row.totalPoints}
                                    </td>

                                    <td className="py-2 px-2 text-center font-mono text-[#8e9285]">
                                        {row.totalPlayed}
                                    </td>

                                    <td className="py-2 px-3 text-center font-mono text-[11px] text-[#8e9285] hidden md:table-cell">
                                        {row.stats2024.pts}/{row.stats2025.pts}/{row.stats2026.pts}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-[#181818] border-t border-[#353534] text-[11px] text-[#8e9285]">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span>
                        El último equipo de esta tabla al finalizar la temporada regular perderá la categoría.
                    </span>
                </div>
                <span className="text-[#666] font-mono">Promedio = Puntos / PJ</span>
            </div>
        </div>
    );
};