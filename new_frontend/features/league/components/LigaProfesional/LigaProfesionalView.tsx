'use client';

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

    // LeagueView cambia el torneo y la zona también desde su barra lateral, sin pasar por el hook: el hook los sigue
    // acá, durante el render (sin efecto), igual que las fechas.
    if (externalTournament !== undefined && externalTournament !== data.activeTournament) {
        data.setTournament(externalTournament);
    }
    if (externalZone !== undefined && externalZone !== data.activeZone) {
        data.setZone(externalZone);
    }

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

            {data.isSeasonError && (
                <div
                    role="alert"
                    className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1c1b1b] border border-[#353534] rounded-2xl p-4 text-sm text-[#ffb4ab]"
                >
                    No se pudo cargar la temporada de la Liga.
                    <button
                        type="button"
                        onClick={data.retrySeason}
                        className="bg-[#d2f000] hover:bg-[#b8d300] text-[#191e00] font-black uppercase tracking-wider text-xs px-4 py-2 rounded-lg"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Selector de Torneo (Apertura / Clausura) */}
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
                        tournament={currentTournament}
                    />
                </div>

                <div className="lg:col-span-2 w-full">
                    <FixturesAndSimulatorSection
                        tournament={currentTournament}
                        availableStages={data.availableStages}
                        selectedRound={data.selectedRound}
                        onSelectRound={data.setSelectedRound}
                        matches={data.currentRoundMatches}
                        isLoading={data.isFixtureLoading}
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
                tournamentName={`${currentTournament} ${data.seasonLabel}`.trim()}
                brackets={data.playoffBrackets}
            />
        </div>
    );
};
