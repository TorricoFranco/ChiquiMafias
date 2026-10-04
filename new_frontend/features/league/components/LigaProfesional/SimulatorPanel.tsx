import React, { useState } from 'react';
import { LeagueMatch, SimulatedResult } from '@/features/league/type';
import { Sliders, RotateCcw, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface SimulatorPanelProps {
    pendingMatches: LeagueMatch[];
    simulatedResults: Record<string, SimulatedResult>;
    onUpdateSimulation: (matchId: string, h: number | null, a: number | null, homeId: string, awayId: string) => void;
    onClearSimulations: () => void;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
    pendingMatches,
    simulatedResults,
    onUpdateSimulation,
    onClearSimulations,
}) => {
    const [localScores, setLocalScores] = useState<Record<string, { h: string; a: string }>>({});

    const availableRounds: number[] = Array.from(
        new Set<number>(
            pendingMatches
                .map((m) => m.round)
                .filter((r): r is number => typeof r === 'number')
        )
    ).sort((a, b) => a - b);

    if (!pendingMatches || pendingMatches.length === 0 || availableRounds.length === 0) {
        return null;
    }

    const [currentRoundIdx, setCurrentRoundIdx] = useState(0);

    const safeIdx = Math.min(currentRoundIdx, Math.max(0, availableRounds.length - 1));
    const activeRound = availableRounds[safeIdx] ?? availableRounds[0] ?? 1;

    const currentRoundMatches = pendingMatches.filter((m) => m.round === activeRound);

    const totalSimulatedCount = Object.keys(simulatedResults).filter(
        id => typeof simulatedResults[id]?.h === 'number' && typeof simulatedResults[id]?.a === 'number'
    ).length;

    const handleScoreChange = (
        match: LeagueMatch,
        type: 'h' | 'a',
        valueStr: string
    ) => {
        if (valueStr !== '') {
            const parsed = parseInt(valueStr, 10);
            if (isNaN(parsed) || parsed < 0 || parsed > 99) return;
        }

        const currentH = localScores[match.id]?.h ?? (typeof simulatedResults[match.id]?.h === 'number' ? String(simulatedResults[match.id].h) : '');
        const currentA = localScores[match.id]?.a ?? (typeof simulatedResults[match.id]?.a === 'number' ? String(simulatedResults[match.id].a) : '');

        const newHStr = type === 'h' ? valueStr : currentH;
        const newAStr = type === 'a' ? valueStr : currentA;

        setLocalScores(prev => ({
            ...prev,
            [match.id]: { h: newHStr, a: newAStr }
        }));

        const numH: number | null = newHStr !== '' ? parseInt(newHStr, 10) : null;
        const numA: number | null = newAStr !== '' ? parseInt(newAStr, 10) : null;

        onUpdateSimulation(match.id, numH, numA, match.home_team.id, match.away_team.id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['-', '+', 'e', 'E', '.', ','].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleClearAll = () => {
        setLocalScores({});
        onClearSimulations();
    };

    return (
        <div className="flex flex-col bg-[#1c1b1b] border border-[#353534] rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-3.5 border-b border-[#353534] bg-[#222221]">
                <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <h3 className="font-black text-sm text-[#e5e2e1] uppercase tracking-tight">
                        Simulador
                    </h3>
                </div>

                {totalSimulatedCount > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30"
                        title="Limpiar simulaciones"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Limpiar todo ({totalSimulatedCount})</span>
                    </button>
                )}
            </div>

            {/* Subheader */}
            <div className="p-3 bg-[#181818] border-b border-[#353534] flex items-center justify-between text-xs">
                <span className="text-[#8e9285] text-[11px]">
                    Completá ambos resultados para procesar:
                </span>

                {availableRounds.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-[#252525] border border-[#353534] px-2 py-0.5 rounded-lg">
                        <button
                            onClick={() => setCurrentRoundIdx((prev) => Math.max(0, prev - 1))}
                            disabled={currentRoundIdx === 0}
                            className="text-[#8e9285] hover:text-[#e5e2e1] disabled:opacity-30 cursor-pointer"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[11px] font-bold text-amber-500 font-mono">
                            Fecha {activeRound}
                        </span>
                        <button
                            onClick={() =>
                                setCurrentRoundIdx((prev) => Math.min(availableRounds.length - 1, prev + 1))
                            }
                            disabled={currentRoundIdx === availableRounds.length - 1}
                            className="text-[#8e9285] hover:text-[#e5e2e1] disabled:opacity-30 cursor-pointer"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Matches list */}
            <div className="divide-y divide-[#2a2a2a] max-h-[340px] overflow-y-auto p-2">
                {currentRoundMatches.map((match) => {
                    const sim = simulatedResults[match.id];

                    const valH = localScores[match.id]?.h ?? (typeof sim?.h === 'number' ? String(sim.h) : '');
                    const valA = localScores[match.id]?.a ?? (typeof sim?.a === 'number' ? String(sim.a) : '');

                    const isCompleted = valH !== '' && valA !== '';

                    return (
                        <div
                            key={match.id}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all my-1 ${isCompleted
                                ? 'bg-amber-950/20 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.05)]'
                                : 'bg-[#1e1e1e] border border-[#353534]/60 hover:bg-[#252525]'
                                }`}
                        >
                            {/* Home Team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                                <span className="text-xs font-bold text-[#e5e2e1] uppercase whitespace-normal leading-tight text-right">
                                    {match.home_team.short_code || match.home_team.name}
                                </span>
                                <div className="w-7 h-7 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img
                                        src={match.home_team.logo_url}
                                        alt={match.home_team.name}
                                        className="w-5.5 h-5.5 object-contain"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="flex items-center gap-2 px-3 flex-shrink-0">
                                <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={valH}
                                    onChange={(e) => handleScoreChange(match, 'h', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="-"
                                    className={`w-9 h-9 rounded-lg border text-center font-mono font-black text-sm focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${isCompleted
                                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                                        : 'bg-[#181818] border-[#444] text-[#e5e2e1] focus:border-amber-500 focus:bg-[#2a2a2a]'
                                        }`}
                                />
                                <span className={`text-xs font-black ${isCompleted ? 'text-amber-500/50' : 'text-[#8e9285]'}`}>:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={valA}
                                    onChange={(e) => handleScoreChange(match, 'a', e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="-"
                                    className={`w-9 h-9 rounded-lg border text-center font-mono font-black text-sm focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${isCompleted
                                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                                        : 'bg-[#181818] border-[#444] text-[#e5e2e1] focus:border-amber-500 focus:bg-[#2a2a2a]'
                                        }`}
                                />
                            </div>

                            {/* Away Team */}
                            <div className="flex items-center gap-2 flex-1 min-w-0 justify-start text-left">
                                <div className="w-7 h-7 rounded-full bg-[#2a2a2a] border border-[#353534] flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img
                                        src={match.away_team.logo_url}
                                        alt={match.away_team.name}
                                        className="w-5.5 h-5.5 object-contain"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-[#e5e2e1] uppercase whitespace-normal leading-tight text-left">
                                    {match.away_team.short_code || match.away_team.name}
                                </span>
                                {isCompleted && (
                                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0 ml-1 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};