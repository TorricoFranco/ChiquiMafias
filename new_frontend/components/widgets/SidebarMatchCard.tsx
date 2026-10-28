"use client";

import React from "react";
import Link from "next/link";
import { MatchFixture } from "@/features/fixture/types";
import { formatMatchTime } from "@/features/league/utils/formatMatchTime";
import { shootoutScore } from "@/features/fixture/utils/liveStatus";

interface SidebarMatchCardProps {
    match: MatchFixture;
    /** Competición del partido: el calendario de Social mezcla la Liga y la Copa. */
    competitionName?: string;
}

export const SidebarMatchCard: React.FC<SidebarMatchCardProps> = ({ match, competitionName }) => {
    const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(match.status_short);
    const isFinished = ['FT', 'PEN', 'AET'].includes(match.status_short);
    const inShootout = match.status_short === 'P';
    const pens = shootoutScore(match.status_short, match.home_penalty_goals, match.away_penalty_goals);

    // El nombre accesible reemplaza al contenido: tiene que decir la competición y la tanda.
    const label = [
        `${match.home_team.name} vs ${match.away_team.name}`,
        competitionName,
        pens
            ? `${inShootout ? 'penales en vivo' : 'final'}, ${match.home_goals ?? 0} a ${match.away_goals ?? 0}, penales ${pens.home} a ${pens.away}`
            : null,
    ].filter(Boolean).join(', ');

    const pensLine = pens && (
        <span className={`text-[9px] md:text-[10px] font-bold tabular-nums ${inShootout ? 'text-red-400' : 'text-[#c6c9ab]'}`}>
            ({pens.home} - {pens.away})
        </span>
    );

    return (
        <Link
            href={`/match/${match.id}`}
            aria-label={label}
            className="flex flex-col gap-1 p-2.5 md:p-3.5 rounded-xl bg-[#201f1f] border border-[#353534] hover:border-[#d2f000]/50 hover:bg-[#262525] transition-all cursor-pointer group shadow-sm w-full"
        >
            {competitionName && (
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#8e9285] text-center leading-none">
                    {competitionName}
                </span>
            )}

            <div className="flex items-center justify-between w-full">
                {/* LOCAL (Alineado a la derecha) */}
                <div className="flex-1 flex items-center justify-end gap-1.5 md:gap-3 min-w-0">
                    <span className="text-xs md:text-sm font-bold text-[#e5e2e1] group-hover:text-white transition-colors line-clamp-2 break-words leading-tight text-right">
                        {match.home_team.name}
                    </span>
                    <img
                        src={match.home_team.logo_url}
                        alt={match.home_team.name}
                        className="w-5 h-5 md:w-7 md:h-7 object-contain flex-shrink-0"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                </div>

                {/* CENTRO: MARCADOR / HORA / ESTADO */}
                <div className="w-[4.5rem] md:w-28 flex flex-col items-center justify-center mx-1.5 md:mx-4 px-1 md:px-2 py-1 bg-[#181818] rounded-lg border border-[#30302f] flex-shrink-0">
                    {isLive ? (
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 mb-0.5">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                                <span className="text-[9px] font-black text-red-400 uppercase tracking-wider">
                                    {inShootout ? 'Penales' : match.status_short === 'HT' ? 'ET' : 'VIVO'}
                                </span>
                            </div>
                            <span className="text-sm md:text-base font-black text-emerald-400 tracking-wider">
                                {match.home_goals} - {match.away_goals}
                            </span>
                            {pensLine}
                        </div>
                    ) : isFinished ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold text-[#8c8e76] uppercase">
                                {match.status_short === 'PEN' ? 'Penales' : 'Final'}
                            </span>
                            <span className="text-sm md:text-base font-black text-white tracking-wider">
                                {match.home_goals} - {match.away_goals}
                            </span>
                            {pensLine}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] md:text-xs font-bold text-[#c6c9ab] whitespace-nowrap">
                                {formatMatchTime(match.date)}
                            </span>
                        </div>
                    )}
                </div>

                {/* VISITANTE (Alineado a la izquierda) */}
                <div className="flex-1 flex items-center justify-start gap-1.5 md:gap-3 min-w-0">
                    <img
                        src={match.away_team.logo_url}
                        alt={match.away_team.name}
                        className="w-5 h-5 md:w-7 md:h-7 object-contain flex-shrink-0"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                    />
                    <span className="text-xs md:text-sm font-bold text-[#e5e2e1] group-hover:text-white transition-colors line-clamp-2 break-words leading-tight text-left">
                        {match.away_team.name}
                    </span>
                </div>
            </div>
        </Link>
    );
};
