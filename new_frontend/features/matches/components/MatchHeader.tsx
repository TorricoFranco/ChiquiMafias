import React from 'react';
import {
    MatchDetails,
    getDerivedMatchState,
    MatchStatus,
} from '../types';
import { MapPin, User, Shield } from 'lucide-react';

interface MatchHeaderProps {
    details: MatchDetails;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({ details }) => {
    const { metadata, score, teams } = details;
    const { isLive, isNotStarted } = getDerivedMatchState(metadata.status);

    const getStatusBadge = (status: MatchStatus) => {
        switch (status) {
            case '1H':
                return { label: `1T ${score.elapsed ? `${score.elapsed}'` : ''}`, bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
            case '2H':
                return { label: `2T ${score.elapsed ? `${score.elapsed}'` : ''}`, bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
            case 'HT':
                return { label: 'ENTRETIEMPO', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
            case 'ET':
            case 'BT':
                return { label: `TIEMPO EXTRA ${score.elapsed ? `${score.elapsed}'` : ''}`, bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
            case 'PEN':
                return { label: 'PENALES', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
            case 'FT':
                return { label: 'FINALIZADO', bg: 'bg-[#2b2a2a] text-[#c6c9ab] border-[#3e3d3c]' };
            case 'AET':
                return { label: 'FINAL TRAS PRÓRROGA', bg: 'bg-[#2b2a2a] text-[#c6c9ab] border-[#3e3d3c]' };
            case 'SUSP':
                return { label: 'SUSPENDIDO', bg: 'bg-red-900/40 text-red-300 border-red-700/50' };
            case 'CANC':
                return { label: 'CANCELADO', bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
            case 'PST':
                return { label: 'POSTERGADO', bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
            case 'NS':
                return { label: 'PROXIMAMENTE', bg: 'bg-[#2b2a2a] text-[#d2f000] border-[#d2f000]/30' };
            case 'SCHEDULED':
                return { label: 'PROGRAMADO', bg: 'bg-[#2b2a2a] text-[#d2f000] border-[#d2f000]/30' };
            case 'TBD':
            default:
                return { label: metadata.status_long || 'PROGRAMADO', bg: 'bg-[#2b2a2a] text-[#d2f000] border-[#d2f000]/30' };
        }
    };

    const statusBadge = getStatusBadge(metadata.status);
    const formattedDate = new Date(metadata.date).toLocaleDateString('es-AR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Filtramos tarjetas rojas
    const homeReds = score.summary?.redCards?.filter((rc) => rc.team === teams.home.id).length || 0;
    const awayReds = score.summary?.redCards?.filter((rc) => rc.team === teams.away.id).length || 0;

    // Filtramos los goles por equipo
    const homeGoals = score.summary?.goals?.filter((g) => g.team === teams.home.id) || [];
    const awayGoals = score.summary?.goals?.filter((g) => g.team === teams.away.id) || [];

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#1c1b1b] border border-[#2b2a2a] p-6 md:p-8 shadow-xl">
            {metadata.venue?.image && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-10 blur-sm pointer-events-none"
                    style={{ backgroundImage: `url(${metadata.venue.image})` }}
                />
            )}

            {/* Top Bar: Torneo y Estado */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#2b2a2a] pb-4 mb-5 text-xs text-[#8e9285]">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-[#d2f000] uppercase tracking-wider">{metadata.tournament}</span>
                    <span>•</span>
                    <span className="font-medium text-[#e5e2e1]">{metadata.round}</span>
                </div>

                <div className="flex items-center gap-3">
                    <span
                        className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${statusBadge.bg}`}
                    >
                        {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />}
                        {statusBadge.label}
                    </span>
                </div>
            </div>

            <div className="relative z-10 text-center mb-4">
                <span className="text-xs font-semibold text-[#8e9285] uppercase tracking-wider bg-[#131313] px-3.5 py-1 rounded-full border border-[#2b2a2a]">
                    {formattedDate}
                </span>
            </div>

            {/* Scoreboard Arena */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-7 items-center gap-6 md:gap-4 my-2">
                {/* Local Team */}
                <div className="md:col-span-3 flex items-center justify-start md:justify-end gap-4 order-1">
                    <div className="text-left md:text-right">
                        <h2 className="text-xl md:text-2xl font-black text-[#e5e2e1] tracking-tight">
                            {teams.home.name}
                        </h2>
                    </div>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#2b2a2a] p-2 flex items-center justify-center border border-[#3e3d3c] shrink-0">
                        {teams.home.logo ? (
                            <img
                                src={teams.home.logo}
                                alt={teams.home.name}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <Shield className="w-10 h-10 text-[#8e9285]" />
                        )}
                    </div>
                </div>

                {/* Center: Score & Red Cards */}
                <div className="md:col-span-1 flex flex-col items-center justify-center order-2 py-2">
                    {isNotStarted ? (
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl md:text-3xl font-black text-[#8e9285] tracking-widest font-mono">
                                VS
                            </span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-3">
                                {/* Tarjetas rojas Local */}
                                {homeReds > 0 && (
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: homeReds }).map((_, i) => (
                                            <div key={i} className="w-3 h-4 bg-red-500 rounded-[2px] shadow-sm border border-red-600/50" />
                                        ))}
                                    </div>
                                )}

                                {/* Marcador */}
                                <div className="flex items-center gap-3 bg-[#131313] px-5 py-2.5 rounded-2xl border border-[#2b2a2a] shadow-inner">
                                    <span className="text-3xl md:text-4xl font-black text-[#e5e2e1] font-mono">
                                        {score.home}
                                    </span>
                                    <span className="text-xl text-[#8e9285] font-light">-</span>
                                    <span className="text-3xl md:text-4xl font-black text-[#e5e2e1] font-mono">
                                        {score.away}
                                    </span>
                                </div>

                                {/* Tarjetas rojas Visitante */}
                                {awayReds > 0 && (
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: awayReds }).map((_, i) => (
                                            <div key={i} className="w-3 h-4 bg-red-500 rounded-[2px] shadow-sm border border-red-600/50" />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {metadata.status === 'PEN' && (
                                <div className="mt-1 px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-mono font-bold border border-purple-500/30">
                                    Penales: ({score.home_penalties ?? '-'}) - ({score.away_penalties ?? '-'})
                                </div>
                            )}

                            {isLive && score.elapsed && (
                                <span className="text-xs font-mono font-bold text-red-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    {score.elapsed}'
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Away Team */}
                <div className="md:col-span-3 flex items-center justify-start gap-4 order-3">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#2b2a2a] p-2 flex items-center justify-center border border-[#3e3d3c] shrink-0">
                        {teams.away.logo ? (
                            <img
                                src={teams.away.logo}
                                alt={teams.away.name}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <Shield className="w-10 h-10 text-[#8e9285]" />
                        )}
                    </div>
                    <div className="text-left">
                        <h2 className="text-xl md:text-2xl font-black text-[#e5e2e1] tracking-tight">
                            {teams.away.name}
                        </h2>
                    </div>
                </div>
            </div>

            {(homeGoals.length > 0 || awayGoals.length > 0) && (
                <div className="relative z-10 mt-5 pt-4 border-t border-[#2b2a2a]/60 grid grid-cols-1 md:grid-cols-7 gap-4 text-[11px]">
                    <div className="md:col-span-3 flex flex-wrap items-start justify-center md:justify-end gap-2 order-1">
                        {homeGoals.map((g, idx) => (
                            <span
                                key={`home-goal-${idx}`}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#242323] text-[#e5e2e1] border border-[#353534]"
                            >
                                <span className="font-medium">{g.player}</span>
                                <span className="text-[#8e9285] font-mono">{g.min}'</span>
                            </span>
                        ))}
                    </div>

                    <div className="md:col-span-1 order-2 hidden md:block"></div>

                    <div className="md:col-span-3 flex flex-wrap items-start justify-center md:justify-start gap-2 order-3">
                        {awayGoals.map((g, idx) => (
                            <span
                                key={`away-goal-${idx}`}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#242323] text-[#e5e2e1] border border-[#353534]"
                            >
                                <span className="font-medium">{g.player}</span>
                                <span className="text-[#8e9285] font-mono">{g.min}'</span>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Venue & Referee Footer Info */}
            <div className="relative z-10 mt-6 pt-4 border-t border-[#2b2a2a] flex flex-wrap items-center justify-between gap-4 text-xs text-[#8e9285]">
                {metadata.venue ? (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#d2f000]" />
                        <span className="font-medium text-[#e5e2e1]">{metadata.venue.name}</span>
                        {metadata.venue.city && <span>({metadata.venue.city})</span>}
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-[#5e6255]">
                        <MapPin className="w-4 h-4" />
                        <span>Estadio no asignado</span>
                    </div>
                )}

                {metadata.referee ? (
                    <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[#c6c9ab]" />
                        <span>Árbitro:</span>
                        <span className="font-semibold text-[#e5e2e1]">{metadata.referee}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-[#5e6255]">
                        <User className="w-4 h-4" />
                        <span>Árbitro a designar</span>
                    </div>
                )}
            </div>
        </div>
    );
};