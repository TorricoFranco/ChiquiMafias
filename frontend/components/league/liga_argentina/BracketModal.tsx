'use client';

import { X, Trophy } from 'lucide-react';
import { MatchCardBracket } from './MatchCardBracket';
import { Match } from '@/types/league/bracketsMatch';
import { useEffect, useState, useRef } from 'react';
import { useGlobalSocket } from '@/context/SocketContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    season: string;
    tournament?: string;
    liveResults?: any;
    data: any
}

interface LiveScore {
    h: number;
    a: number;
    hp?: number;
    ap?: number;
    status?: string;
    elapsed?: number;
    isLive?: boolean;
}

const filterBySide = (array: Match[], side: 'left' | 'right') =>
    (array || []).filter(m => m.side === side).sort((a, b) => a.position - b.position);

const ScoreDisplay = ({ match, liveScore }: { match: Match; liveScore?: LiveScore }) => {
    const score = liveScore || {
        h: match.home_goals ?? 0,
        a: match.away_goals ?? 0,
        hp: match.home_pen ?? null,
        ap: match.away_pen ?? null,
    };

    const hasPenalties = score.hp !== null && score.ap !== null;

    return (
        <div className="flex items-center justify-center gap-2 text-xs font-bold">
            <span className={score.isLive ? 'text-yellow-400' : 'text-white'}>
                {score.h}
            </span>
            <span className="text-zinc-600">-</span>
            <span className={score.isLive ? 'text-yellow-400' : 'text-white'}>
                {score.a}
            </span>
            {hasPenalties && (
                <>
                    <span className="text-zinc-700">({score.hp}-{score.ap}p)</span>
                </>
            )}
        </div>
    );
};

export const BracketModal = ({ isOpen, onClose, season, tournament, data }: Props) => {
    const [liveScores, setLiveScores] = useState<Record<string, LiveScore>>({});
    const [brackets, setBrackets] = useState(data?.brackets || {});
    const socketRef = useRef<any>(null);
    const leagueId = '6a2a03c5-1054-49e4-96c3-afd2bca9ebd7';

    // Llamar al hook en el nivel superior del componente
    const socket = useGlobalSocket();

    // Conectar al socket y escuchar updates
    useEffect(() => {
        if (!isOpen || !socket) return;

        socketRef.current = socket;

        // Unirse a la room de la liga
        socket.emit('join_league', { leagueId });

        // Escuchar updates en vivo
        const handleLeagueUpdate = (formattedMatches: Record<string, LiveScore>) => {
            setLiveScores(prev => ({
                ...prev,
                ...formattedMatches
            }));
        };

        socket.on('on_league_update', handleLeagueUpdate);

        return () => {
            socket.off('on_league_update', handleLeagueUpdate);
            socket.emit('leave_league', { leagueId });
        };
    }, [isOpen, socket]);

    // Actualizar brackets cuando cambien data o liveScores
    useEffect(() => {
        if (!data?.brackets) return;

        const updatedBrackets = { ...data.brackets };

        // Actualizar cada ronda con los scores en vivo
        Object.keys(updatedBrackets).forEach(roundKey => {
            if (Array.isArray(updatedBrackets[roundKey])) {
                updatedBrackets[roundKey] = updatedBrackets[roundKey].map((match: Match) => {
                    if (liveScores[match.id]) {
                        return {
                            ...match,
                            home_goals: liveScores[match.id].h,
                            away_goals: liveScores[match.id].a,
                            home_pen: liveScores[match.id].hp,
                            away_pen: liveScores[match.id].ap,
                            status_short: liveScores[match.id].status || match.status_short,
                        };
                    }
                    return match;
                });
            }
        });

        setBrackets(updatedBrackets);
    }, [data?.brackets, liveScores]);

    if (!isOpen || !brackets?.octavos) return null;

    const { octavos, cuartos, semifinal, final } = brackets;
    const finalMatch = final?.[0];

    // Estilo común para las etiquetas de ronda
    const RoundLabel = ({ children }: { children: React.ReactNode }) => (
        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4 block text-center">
            {children}
        </span>
    );

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-4 animate-in fade-in duration-300">
            <div className="bg-zinc-950 w-full h-full md:h-[90vh] max-w-[1600px] flex flex-col border-y md:border border-zinc-800 overflow-hidden relative">

                {/* HEADER MINIMALISTA */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-zinc-900 bg-black/50">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">FASE FINAL {season}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* CONTENEDOR PRINCIPAL - USAMOS GRID PARA ALINEACIÓN PERFECTA */}
                <div className="flex-1 w-full flex items-start justify-between px-2 md:px-4 py-6 gap-1 overflow-hidden">

                    {/* LADO IZQUIERDO */}
                    <div className="flex flex-1 justify-around items-start h-full">
                        <div className="flex-1 max-w-[130px]">
                            <RoundLabel>Octavos</RoundLabel>
                            <div className="flex flex-col gap-2">
                                {filterBySide(octavos, 'left').map(m => (
                                    <div key={m.id} className="flex flex-col gap-1">
                                        <MatchCardBracket match={m} live={liveScores[m.id]} />
                                        {(m.home_goals !== null || liveScores[m.id]) && (
                                            <ScoreDisplay match={m} liveScore={liveScores[m.id]} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 max-w-[130px] self-center">
                            <RoundLabel>Cuartos</RoundLabel>
                            <div className="flex flex-col gap-16">
                                {filterBySide(cuartos, 'left').map(m => (
                                    <div key={m.id} className="flex flex-col gap-1">
                                        <MatchCardBracket match={m} live={liveScores[m.id]} />
                                        {(m.home_goals !== null || liveScores[m.id]) && (
                                            <ScoreDisplay match={m} liveScore={liveScores[m.id]} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 max-w-[130px] self-center">
                            <RoundLabel>Semis</RoundLabel>
                            <div className="flex flex-col">
                                {filterBySide(semifinal, 'left').map(m => (
                                    <div key={m.id} className="flex flex-col gap-1">
                                        <MatchCardBracket match={m} live={liveScores[m.id]} />
                                        {(m.home_goals !== null || liveScores[m.id]) && (
                                            <ScoreDisplay match={m} liveScore={liveScores[m.id]} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CENTRO - FINAL */}
                    <div className="flex flex-col items-center justify-center px-2 min-w-[180px] self-center">
                        <div className="relative mb-6">
                            <Trophy size={32} className="text-yellow-600 mb-2 mx-auto opacity-50" />
                            <img src="/logo.png" alt="Torneo" className="w-40 h-50 object-contain" />
                        </div>

                        {finalMatch && (
                            <div className="w-full bg-zinc-900 border border-sky-500/50 p-3 rounded-lg shadow-[0_0_20px_rgba(14,165,233,0.15)]">
                                <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest block text-center mb-3">Gran Final</span>
                                <div className="flex flex-col gap-4 items-center">

                                    {/* Equipo Local */}
                                    <div className="flex items-center justify-between w-full gap-2">
                                        {finalMatch.home_team.logo_url ? (
                                            <img src={finalMatch.home_team.logo_url} className="w-8 h-8 object-contain" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                                        )}
                                        <span className="text-[10px] font-bold text-white uppercase truncate flex-1 text-center">
                                            {finalMatch.home_team.name}
                                        </span>
                                    </div>

                                    {/* Score in Final */}
                                    {(finalMatch.home_goals !== null || liveScores[finalMatch.id]) && (
                                        <div className="w-full text-center border-t border-b border-zinc-700 py-2">
                                            <ScoreDisplay match={finalMatch} liveScore={liveScores[finalMatch.id]} />
                                        </div>
                                    )}

                                    <span className="text-xs font-black text-zinc-700">VS</span>

                                    {/* Equipo Visitante */}
                                    <div className="flex items-center justify-between w-full gap-2">
                                        {finalMatch.away_team.logo_url ? (
                                            <img src={finalMatch.away_team.logo_url} className="w-8 h-8 object-contain" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 bg-zinc-800 rounded-full" />
                                        )}
                                        <span className="text-[10px] font-bold text-white uppercase truncate flex-1 text-center">
                                            {finalMatch.away_team.name}
                                        </span>
                                    </div>

                                </div>
                            </div>
                        )}
                    </div>

                    {/* LADO DERECHO */}
                    <div className="flex flex-1 justify-around items-start h-full">
                        <div className="flex-1 max-w-[130px] self-center">
                            <RoundLabel>Semis</RoundLabel>
                            <div className="flex flex-col">
                                {filterBySide(semifinal, 'right').map(m => (
                                    <div key={m.id} className="flex flex-col gap-1">
                                        <MatchCardBracket match={m} live={liveScores[m.id]} />
                                        {(m.home_goals !== null || liveScores[m.id]) && (
                                            <ScoreDisplay match={m} liveScore={liveScores[m.id]} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 max-w-[130px] self-center">
                            <RoundLabel>Cuartos</RoundLabel>
                            <div className="flex flex-col gap-16">
                                {filterBySide(cuartos, 'right').map(m => (
                                    <div key={m.id} className="flex flex-col gap-1">
                                        <MatchCardBracket match={m} live={liveScores[m.id]} />
                                        {(m.home_goals !== null || liveScores[m.id]) && (
                                            <ScoreDisplay match={m} liveScore={liveScores[m.id]} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 max-w-[130px]">
                            <RoundLabel>Octavos</RoundLabel>
                            <div className="flex flex-col gap-2">
                                {filterBySide(octavos, 'right').map(m => (
                                    <div key={m.id} className="flex flex-col gap-1">
                                        <MatchCardBracket match={m} live={liveScores[m.id]} />
                                        {(m.home_goals !== null || liveScores[m.id]) && (
                                            <ScoreDisplay match={m} liveScore={liveScores[m.id]} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* FOOTER */}
                <div className="py-2 bg-black text-[8px] text-zinc-700 text-center font-bold uppercase tracking-[0.3em]">
                    Data provided by Opta & API-Football
                </div>
            </div>
        </div>
    );
};
