"use client";

import { useMemo } from 'react';
import { Clock, Calendar } from 'lucide-react';

// 1. Definimos las interfaces necesarias
interface Team {
    name: string;
    logo: string;
}

interface Match {
    teams: {
        home: Team;
        away: Team;
    };
    status: string;
    liveData?: {
        score: { home: number; away: number };
        minute?: number;
    };
    matchInfo: {
        date: string | Date;
    };
}

interface MatchHeaderProps {
    match: Match;
}

// 2. Aplicamos la interface a las props
export const MatchHeader = ({ match }: MatchHeaderProps) => {
    const { home, away } = match.teams;
    const { status } = match;

    const isLiveOrFinished = status === 'live' || status === 'finished';

    // Acceso seguro a liveData usando optional chaining (?.)
    const score = (isLiveOrFinished && match.liveData) ? match.liveData.score : { home: 0, away: 0 };
    const minute = (status === 'live' && match.liveData) ? match.liveData.minute : (status === 'finished' ? 90 : null);

    const statusText = useMemo(() => {
        if (status === 'live') return `EN VIVO - Minuto ${minute}`;
        if (status === 'finished') return "FINALIZADO";
        if (status === 'lineups_available') return "ALINEACIONES LISTAS";
        return "PRÓXIMAMENTE";
    }, [status, minute]);

    const statusColor = useMemo(() => {
        if (status === 'live') return 'bg-red-600';
        if (status === 'finished') return 'bg-green-600';
        return 'bg-blue-600';
    }, [status]);

    return (
        <header className="p-6 bg-gray-800 rounded-xl shadow-2xl mb-6">
            <div className="flex justify-between items-center mb-6">
                <div className={`px-3 py-1 text-sm font-bold rounded-full text-white ${statusColor} animate-pulse-slow`}>
                    {statusText}
                </div>
                {status === 'live' && minute !== null && (
                    <div className="flex items-center text-lg font-mono text-white bg-gray-900 px-3 py-1 rounded-lg">
                        <Clock className="w-4 h-4 mr-1 text-red-400" /> {minute}'
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-center">
                <div className="flex-1">
                    {/* Añadimos un fallback para el manejo de la imagen */}
                    <img src={home.logo} alt={home.name} className="w-20 h-20 md:w-28 md:h-28 mx-auto object-contain border-2 border-white/10 rounded-full" />
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2">{home.name}</h2>
                </div>

                <div className="mx-8">
                    <span className="text-4xl md:text-6xl font-black text-white">
                        {isLiveOrFinished ? score.home : 'VS'}
                    </span>
                    <span className="text-4xl md:text-6xl font-black text-white mx-3">-</span>
                    <span className="text-4xl md:text-6xl font-black text-white">
                        {isLiveOrFinished ? score.away : 'VS'}
                    </span>
                </div>

                <div className="flex-1">
                    <img src={away.logo} alt={away.name} className="w-20 h-20 md:w-28 md:h-28 mx-auto object-contain border-2 border-white/10 rounded-full" />
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-2">{away.name}</h2>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700 flex justify-around text-sm md:text-base text-gray-400">
                <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(match.matchInfo.date).toLocaleDateString('es-AR')}
                </div>
                <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {new Date(match.matchInfo.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </header>
    );
};