import React from 'react';
import {
    TournamentType,
    ZoneType,
    SimulatedResult,
} from '../../type';
import { useLigaProfesionalData } from '../../hooks/useLueague';
import { HeaderLeague } from './HeaderLeague';
import { TournamentTabs } from './TournamentTabs';
import { StandingsSection } from './StandingsSection';
import { FixturesAndSimulatorSection } from './FixturesAndSimulatorSection';
import { AccumulatedTablesSection } from './AccumulatedTablesSection';
import { BracketModal } from './BracketModal';

export interface LigaProfesionalViewProps {
    onShowToast?: (message: string) => void;
    externalTournament?: TournamentType;
    onChangeTournament?: (t: TournamentType) => void;
    externalZone?: ZoneType;
    onChangeZone?: (z: ZoneType) => void;
    isBracketOpen?: boolean;
    onToggleBracket?: (open: boolean) => void;
    simulatedResults?: Record<string, SimulatedResult>;
    onUpdateSimulation?: (
        matchId: string,
        h: number | null,
        a: number | null,
        homeId: string,
        awayId: string
    ) => void;
    onClearSimulations?: () => void;
}

export const LigaProfesionalView: React.FC<LigaProfesionalViewProps> = ({
    onShowToast,
    externalTournament,
    onChangeTournament,
    externalZone,
    onChangeZone,
    isBracketOpen: externalBracketOpen,
    onToggleBracket,
    simulatedResults: externalSimulatedResults,
    onUpdateSimulation: externalUpdateSimulation,
    onClearSimulations: externalClearSimulations,
}) => {
    const data = useLigaProfesionalData({
        initialTournament: externalTournament,
        initialZone: externalZone,
        externalSimulations: externalSimulatedResults,
    });

    const currentTournament = externalTournament ?? data.activeTournament;
    const currentZone = externalZone ?? data.activeZone;
    const bracketOpen = externalBracketOpen ?? data.isBracketOpen;
    const simulations = externalSimulatedResults ?? data.simulations;

    const handleTournamentChange = (t: TournamentType) => {
        if (onChangeTournament) onChangeTournament(t);
        data.setTournament(t);
    };

    const handleZoneChange = (z: ZoneType) => {
        if (onChangeZone) onChangeZone(z);
        data.setZone(z);
    };

    const handleBracketToggle = (open: boolean) => {
        if (onToggleBracket) onToggleBracket(open);
        data.setIsBracketOpen(open);
    };

    const handleUpdateSimulation = (
        matchId: string,
        h: number | null,
        a: number | null,
        homeId: string,
        awayId: string
    ) => {
        if (externalUpdateSimulation) {
            externalUpdateSimulation(matchId, h, a, homeId, awayId);
        } else {
            data.updateSimulatedMatch(matchId, h, a, homeId, awayId);
        }
    };

    const handleClearSimulations = () => {
        if (externalClearSimulations) {
            externalClearSimulations();
        } else {
            data.clearSimulations();
        }
        onShowToast?.('Simulaciones restablecidas a los valores oficiales.');
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
            <HeaderLeague
                onOpenBrackets={() => handleBracketToggle(true)}
                hasLiveMatches={data.hasLiveMatches}
            />

            {/* Selector de Torneo (Apertura 2026 / Clausura 2026) */}
            <TournamentTabs
                activeTournament={currentTournament}
                onChangeTournament={handleTournamentChange}
            />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                {/* Columna Principal: Posiciones de la Zona Activa (Ocupa 3 de 5 columnas) */}
                <div className="lg:col-span-3">
                    <StandingsSection
                        activeZone={currentZone}
                        onChangeZone={handleZoneChange}
                        standings={data.activeZoneStandings}
                    />
                </div>

                <div className="lg:col-span-2 w-full">
                    <FixturesAndSimulatorSection
                        tournament={currentTournament}
                        availableStages={data.availableStages}
                        selectedRound={data.selectedRound}
                        onSelectRound={data.setSelectedRound}
                        matches={data.currentRoundMatches}
                        pendingMatches={data.pendingRegularMatches}
                        simulatedResults={simulations}
                        onUpdateSimulation={handleUpdateSimulation}
                        onClearSimulations={handleClearSimulations}
                    />
                </div>
            </div>

            <AccumulatedTablesSection
                annualStandings={data.annualStandings}
                averages={data.averagesStandings}
            />

            {/* Modal Cuadro Eliminación Directa (Playoffs) */}
            <BracketModal
                isOpen={bracketOpen}
                onClose={() => handleBracketToggle(false)}
                tournamentName={`${currentTournament} 2026`}
                brackets={data.playoffBrackets}
            />
        </div>
    );
};
