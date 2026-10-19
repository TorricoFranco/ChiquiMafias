import React from 'react';
import {
    TournamentType,
    AvailableStages,
    PlayoffStageKey,
    LeagueMatch,
    SimulatedResult,
} from '@/features/league/type';

import { FixturesPanel } from './FixturesPanel';
import { SimulatorPanel } from './SimulatorPanel';

interface FixturesAndSimulatorSectionProps {
    tournament: TournamentType;
    availableStages: AvailableStages;
    selectedRound: number | PlayoffStageKey;
    onSelectRound: (round: number | PlayoffStageKey) => void;
    matches: LeagueMatch[];
    pendingMatches: LeagueMatch[];
    simulatedResults: Record<string, SimulatedResult>;
    onUpdateSimulation: (
        matchId: string,
        homeGoals: number | null,
        awayGoals: number | null,
        homeTeamId: string,
        awayTeamId: string
    ) => void;
    onClearSimulations: () => void;
}

export const FixturesAndSimulatorSection: React.FC<FixturesAndSimulatorSectionProps> = ({
    tournament,
    availableStages,
    selectedRound,
    onSelectRound,
    matches,
    pendingMatches,
    simulatedResults,
    onUpdateSimulation,
    onClearSimulations,
}) => {
    return (
        <div className="flex flex-col gap-6">
            <div id="fixture" className="scroll-mt-24">
                <FixturesPanel
                    tournament={tournament}
                    availableStages={availableStages}
                    selectedRound={selectedRound}
                    onSelectRound={onSelectRound}
                    matches={matches}
                />
            </div>

            {pendingMatches.length > 0 && (
                <div id="simulador" className="scroll-mt-24">
                    <SimulatorPanel
                        pendingMatches={pendingMatches}
                        simulatedResults={simulatedResults}
                        onUpdateSimulation={onUpdateSimulation}
                        onClearSimulations={onClearSimulations}
                    />
                </div>
            )}
        </div>
    );
};