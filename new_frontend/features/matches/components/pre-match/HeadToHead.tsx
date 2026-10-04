import React from 'react';
import { History } from 'lucide-react';
import { Team } from '../../types';

interface HeadToHeadProps {
    history: any;
    homeTeam: Team;
    awayTeam: Team;
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({ history, homeTeam, awayTeam }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-AR', { month: 'short' });
        const year = date.getFullYear();
        return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
    };

    return (
        <div className="lg:col-span-2 rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-4 sm:p-5 shadow-sm">

            {/* Header centrado */}
            <div className="relative flex items-center justify-center border-b border-[#2b2a2a] pb-3 mb-4">
                <div className="absolute left-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#d2f000]/10">
                    <History className="w-3.5 h-3.5 text-[#d2f000]" />
                </div>
                <h3 className="font-extrabold text-base text-[#e5e2e1] uppercase tracking-wider">
                    Historial
                </h3>
            </div>

            {/* Cajas de Estadísticas */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
                {/* Local */}
                <div className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border border-red-500/40 bg-red-500/10">
                    <span className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-wider truncate w-full text-center">
                        {homeTeam.name}
                    </span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#d2f000] my-1">
                        {history.homeWins}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#8e9285] uppercase tracking-wider">
                        Victorias
                    </span>
                </div>

                {/* Empates */}
                <div className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border border-zinc-500/40 bg-zinc-500/10">
                    <span className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-wider">
                        Empates
                    </span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#e5e2e1] my-1">
                        {history.draws}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#8e9285] uppercase tracking-wider">
                        Resultados
                    </span>
                </div>

                {/* Visitante */}
                <div className="flex flex-col items-center justify-center py-3 px-2 rounded-xl border border-blue-500/40 bg-blue-500/10">
                    <span className="text-[10px] font-bold text-[#e5e2e1] uppercase tracking-wider truncate w-full text-center">
                        {awayTeam.name}
                    </span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#60a5fa] my-1">
                        {history.awayWins}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-[#8e9285] uppercase tracking-wider">
                        Victorias
                    </span>
                </div>
            </div>

            {/* Últimos Partidos */}
            <div className="flex flex-col gap-2">
                {history.lastMatches.map((m: any) => {
                    const homeScore = m.goals.home;
                    const awayScore = m.goals.away;
                    const matchHomeTeam = m.teams.home.name;
                    const matchAwayTeam = m.teams.away.name;
                    const matchHomeLogo = m.teams.home.logo;
                    const matchAwayLogo = m.teams.away.logo;

                    return (
                        <div
                            key={m.fixture.id}
                            className="flex flex-col items-center py-2.5 px-3 sm:px-4 rounded-xl bg-[#242323] border border-[#2b2a2a] hover:border-[#3e3d3c] transition-colors"
                        >
                            {/* Fecha centrada arriba */}
                            <span className="text-[#8e9285] text-[10px] font-medium tracking-wider uppercase mb-2">
                                {formatDate(m.fixture.date)}
                            </span>

                            {/* Contenedor del Marcador */}
                            <div className="flex items-center justify-between w-full">

                                {/* Equipo Local: Escudo auto-ajustado, nombre centrado en el espacio restante */}
                                <div className="flex-1 grid grid-cols-[auto_1fr] items-center gap-2 sm:gap-3 min-w-0">
                                    <img
                                        src={matchHomeLogo}
                                        alt={matchHomeTeam}
                                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                                    />
                                    <span className={`text-center text-xs sm:text-sm truncate w-full ${homeScore > awayScore ? 'text-[#d2f000] font-bold' : 'text-[#e5e2e1] font-semibold'}`}>
                                        {matchHomeTeam}
                                    </span>
                                </div>

                                {/* Marcador centralizado y con márgenes fijos */}
                                <div className="px-2 sm:px-4 flex-shrink-0">
                                    <span className="w-14 sm:w-16 py-1 rounded-full bg-[#131313] font-mono font-bold text-[#e5e2e1] border border-[#353534] text-xs sm:text-sm flex justify-center items-center">
                                        {homeScore ?? '-'} - {awayScore ?? '-'}
                                    </span>
                                </div>

                                {/* Equipo Visitante: Nombre centrado en el espacio restante, escudo auto-ajustado */}
                                <div className="flex-1 grid grid-cols-[1fr_auto] items-center gap-2 sm:gap-3 min-w-0">
                                    <span className={`text-center text-xs sm:text-sm truncate w-full ${awayScore > homeScore ? 'text-[#d2f000] font-bold' : 'text-[#e5e2e1] font-semibold'}`}>
                                        {matchAwayTeam}
                                    </span>
                                    <img
                                        src={matchAwayLogo}
                                        alt={matchAwayTeam}
                                        className="w-5 h-5 sm:w-6 sm:h-6 object-contain flex-shrink-0"
                                    />
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
};