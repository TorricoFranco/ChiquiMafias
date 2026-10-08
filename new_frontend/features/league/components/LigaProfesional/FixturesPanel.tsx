import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { formatDateHeader } from '@/features/league/utils/formatDateHeader';
import { formatMatchTime } from '@/features/league/utils/formatMatchTime';
import { groupMatchesByDate } from '@/features/league/utils/groupMatchesByDate';
import { translateStatus } from '@/features/league/utils/translateStatus';

import {
    TournamentType,
    PlayoffStageKey,
    AvailableStages,
    LeagueMatch,
} from '@/features/league/type';

interface FixturesPanelProps {
    tournament: TournamentType;
    availableStages: AvailableStages;
    selectedRound: number | PlayoffStageKey;
    onSelectRound: (round: number | PlayoffStageKey) => void;
    matches: LeagueMatch[];
}


export const FixturesPanel: React.FC<FixturesPanelProps> = ({
    tournament,
    availableStages,
    selectedRound,
    onSelectRound,
    matches,
}) => {

    const router = useRouter();

    const handleMatchClick = (matchId: string) => {
        if (!matchId || matchId === 'null' || matchId === 'undefined') return;
        router.push(`/match/${matchId}`);
    };
    const getRoundLabel = (round: number | PlayoffStageKey) => {
        if (typeof round === 'number') {
            return `FECHA ${round}`;
        }
        const stage = availableStages.playoffs.find((p) => p.key === round);
        return stage ? stage.labelFull.toUpperCase() : 'PLAYOFFS';
    };

    const renderMatchStatus = (m: LeagueMatch) => {
        const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(m.status_short);

        if (isLive) {
            return null; // El estado en vivo se muestra arriba a la izquierda
        }

        if (m.status_short === 'FT') {
            return <span className="text-[9px] font-semibold text-[#8e9285]">Finalizado</span>;
        }

        if (m.status_short === 'PEN') {
            return (
                <span className="inline-block px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold">
                    Penales
                </span>
            );
        }

        if (m.status_short === 'TBD') {
            return <span className="text-[9px] font-bold text-[#8e9285]">A Confirmar</span>;
        }

        return <span className="text-[9px] font-semibold text-[#c6c9ab]">{formatMatchTime(m.date)}</span>;
    };

    const groupedMatches = groupMatchesByDate(matches);

    return (
        <div className="flex flex-col bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-xl w-full">
            {/* Header principal */}
            <div className="flex items-center justify-between p-2.5 border-b border-[#353534] bg-[#222221]">
                <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#d2f000]" />
                    <h3 className="font-black text-xs text-[#e5e2e1] uppercase tracking-tight">
                        Fixture {tournament}
                    </h3>
                </div>
                <span className="text-[10px] font-black text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30">
                    {getRoundLabel(selectedRound)}
                </span>
            </div>

            {/* Selector de Fechas */}
            <div className="p-2 border-b border-[#353534] bg-[#181818] overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                    {availableStages.regular.map((num) => {
                        const isActive = selectedRound === num;
                        return (
                            <button
                                key={`regular-${num}`}
                                onClick={() => onSelectRound(num)}
                                className={`w-6 h-6 rounded-full text-[11px] font-bold font-mono transition-all flex items-center justify-center cursor-pointer ${isActive
                                    ? 'bg-sky-500 text-white font-black shadow-[0_0_10px_rgba(14,165,233,0.5)] scale-105'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
                                    }`}
                                title={`Fecha ${num}`}
                            >
                                {num}
                            </button>
                        );
                    })}

                    <div className="h-4 w-[1px] bg-[#353534] mx-1"></div>

                    {availableStages.playoffs.map((stage, index) => {
                        const isActive = selectedRound === stage.key;
                        return (
                            <button
                                key={`playoff-${stage.key}-${index}`}
                                onClick={() => onSelectRound(stage.key)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${isActive
                                    ? 'bg-amber-500 text-[#191e00] font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                                    : 'text-[#c6c9ab] hover:text-[#e5e2e1] hover:bg-[#2a2a2a]'
                                    }`}
                            >
                                <span>{stage.labelShort}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Lista de partidos */}
            <div className="divide-y divide-[#2a2a2a]">
                {matches.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8e9285]">
                        No hay partidos programados para esta fecha.
                    </div>
                ) : (
                    groupedMatches.map((group) => (
                        <div key={group.dateStr} className="flex flex-col">
                            <div className="bg-[#242423] px-3 py-0.5 text-[9px] font-black text-[#d2f000] tracking-wider uppercase border-y border-[#353534] text-center">
                                {formatDateHeader(group.dateStr)}
                            </div>

                            <div className="divide-y divide-[#2a2a2a]/60">
                                {group.matches.map((match, index) => {
                                    const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(match.status_short);
                                    const isFinished = ['FT', 'PEN', 'AET'].includes(match.status_short);
                                    const showScore = (isLive || isFinished) && match.home_goals !== null && match.away_goals !== null;

                                    return (
                                        <div
                                            key={`match-${match.id}-${index}`}
                                            onClick={() => handleMatchClick(String(match.id))}
                                            className={`relative flex items-center justify-between py-2.5 px-2 hover:bg-[#252525] transition-colors cursor-pointer ${isLive
                                                ? 'bg-red-950/10 border-l-2 border-l-red-500'
                                                : isFinished
                                                    ? 'border-l-2 border-l-[#353534]'
                                                    : 'border-l-2 border-l-transparent'
                                                }`}
                                        >
                                            {/* Arriba a la izquierda: Status y Minuto cuando está en vivo */}
                                            {isLive && (
                                                <div className="absolute top-1 left-2 flex items-center gap-1 text-[9px] font-bold text-red-400 font-mono">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                    <span>{translateStatus(match.status_short)}</span>
                                                    {match.minute && <span>{match.minute}&apos;</span>}
                                                </div>
                                            )}

                                            {/* Equipo Local */}
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right pt-2 sm:pt-0">
                                                <span className="font-bold text-[10px] text-[#e5e2e1] uppercase leading-tight text-right break-words max-w-[100px]">
                                                    {match.home_team.short_code || match.home_team.name}
                                                </span>
                                                <div className="w-5 h-5 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={match.home_team.logo_url}
                                                        alt={match.home_team.name}
                                                        className="w-3.5 h-3.5 object-contain"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Marcador / VS en el medio */}
                                            <div className="flex flex-col items-center justify-center px-2 min-w-[60px] flex-shrink-0 pt-2 sm:pt-0">
                                                {showScore ? (
                                                    <div className="flex items-center gap-1 font-mono font-black text-xs leading-none">
                                                        <span className={isLive ? 'text-emerald-400' : 'text-[#e5e2e1]'}>
                                                            {match.home_goals}
                                                        </span>
                                                        <span className="text-[#8e9285] text-[10px]">-</span>
                                                        <span className={isLive ? 'text-emerald-400' : 'text-[#e5e2e1]'}>
                                                            {match.away_goals}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-[#8e9285] font-mono leading-none">VS</span>
                                                )}
                                                <div className="mt-1 leading-none">{renderMatchStatus(match)}</div>
                                            </div>

                                            {/* Equipo Visitante */}
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-start text-left pt-2 sm:pt-0">
                                                <div className="w-5 h-5 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={match.away_team.logo_url}
                                                        alt={match.away_team.name}
                                                        className="w-3.5 h-3.5 object-contain"
                                                        referrerPolicy="no-referrer"
                                                        onError={(e) => {
                                                            (e.target as HTMLElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                                <span className="font-bold text-[10px] text-[#e5e2e1] uppercase leading-tight text-left break-words max-w-[100px]">
                                                    {match.away_team.short_code || match.away_team.name}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};