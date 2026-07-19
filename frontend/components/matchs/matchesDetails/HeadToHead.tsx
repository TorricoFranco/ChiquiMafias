import React, { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';

interface HeadToHeadProps {
    history: {
        homeWins: number;
        awayWins: number;
        draws: number;
        total: number;
        lastMatches: Array<{
            fixture: { id: string | number; date: string };
            teams: { home: { name: string }; away: { name: string } };
            goals: { home: number; away: number };
        }>;
    };
}

export const HeadToHead = ({ history }: HeadToHeadProps) => {
    const { homeWins, awayWins, draws, total, lastMatches } = history;
    const [isExpanded, setIsExpanded] = useState(false);

    const homePct = total > 0 ? (homeWins / total) * 100 : 0;
    const awayPct = total > 0 ? (awayWins / total) * 100 : 0;
    const drawsPct = total > 0 ? (draws / total) * 100 : 0;

    return (
        <section className="max-w-5xl mx-auto bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden transition-all duration-500 shadow-2xl">
            {/* HEADER */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-white/[0.03] to-transparent">
                <div className="flex flex-col items-center gap-2 mb-8">
                    <div className="flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-full">
                        <History className="w-3 h-3 text-sky-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-500">Historial</span>
                    </div>
                    <h4 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">
                        Enfrentamientos <span className="text-gray-500">Directos</span>
                    </h4>
                </div>

                <div className="max-w-3xl mx-auto">
                    <div className="flex justify-between items-end mb-4 px-1">
                        <div className="text-left">
                            <span className="block text-4xl md:text-6xl font-black text-sky-500 leading-none">{homeWins}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Local</span>
                        </div>
                        <div className="text-center pb-1">
                            <span className="block text-2xl md:text-3xl font-black text-gray-600 leading-none">{draws}</span>
                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">Empates</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-4xl md:text-6xl font-black text-slate-300 leading-none">{awayWins}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">Visita</span>
                        </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5 p-[1.5px] border border-white/10 shadow-inner">
                        <div style={{ width: `${homePct}%` }} className="bg-sky-500 h-full rounded-l-sm transition-all duration-1000" />
                        <div style={{ width: `${drawsPct}%` }} className="bg-gray-700/50 h-full transition-all duration-1000" />
                        <div style={{ width: `${awayPct}%` }} className="bg-slate-400 h-full rounded-r-sm transition-all duration-1000" />
                    </div>
                </div>

                {/* BOTÓN PARA DESPLEGAR */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-8 mx-auto flex flex-col items-center gap-1 group/btn transition-all"
                >
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover/btn:text-sky-500 transition-colors">
                        {isExpanded ? "Ocultar Detalles" : `Ver últimos ${lastMatches.length} partidos`}
                    </span>
                    <div className={`p-2 rounded-full bg-white/5 border border-white/10 group-hover/btn:border-sky-500/50 group-hover/btn:bg-sky-500/10 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4 text-sky-500" />
                    </div>
                </button>
            </div>

            {/* LISTADO DINÁMICO */}
            {isExpanded && (
                <div className="p-6 md:p-10 bg-black/40 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                    <div className="max-w-2xl mx-auto space-y-3">
                        {lastMatches.map((m, i) => (
                            <div
                                key={m.fixture.id}
                                className="group flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] p-4 rounded-2xl border border-white/5 transition-all animate-in fade-in zoom-in-95"
                                style={{ animationDelay: `${i * 50}ms` }}
                            >
                                <div className="hidden md:flex flex-col w-12">
                                    <span className="text-sm font-mono font-bold text-gray-500 italic">
                                        {new Date(m.fixture.date).getFullYear().toString().slice(-2)}'
                                    </span>
                                </div>

                                <div className="flex-1 flex items-center justify-center gap-4">
                                    <span className="flex-1 text-right text-xs font-bold uppercase truncate">{m.teams.home.name}</span>

                                    <div className="flex items-center bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
                                        <span className={`text-base font-black ${m.goals.home > m.goals.away ? 'text-sky-400' : 'text-white'}`}>{m.goals.home}</span>
                                        <span className="mx-2 text-gray-700 text-xs">-</span>
                                        <span className={`text-base font-black ${m.goals.away > m.goals.home ? 'text-sky-400' : 'text-white'}`}>{m.goals.away}</span>
                                    </div>

                                    <span className="flex-1 text-left text-xs font-bold uppercase truncate text-gray-400">{m.teams.away.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};