"use client";

import React, { useState, useMemo } from "react";

import { StandingsTable } from "./standings/StandingsTable";
import { AnnualTable } from "./standings/AnnualTable";
import { AveragesTable } from "./standings/AveragesTable";
import { FixturesPanelContainer } from "./fixture/fixturePanelContainer";
import { HeaderLeague } from "./HeaderLeague";
import { SimulatorPanel } from "./fixture/simulatorPanel";
import { TableSkeleton } from "./TableSkeleton";
import { BracketModal } from "./BracketModal";

import TournamentTabs from "@/components/league/liga_argentina/TournamentsTabs";
import ZoneTabs from "@/components/league/liga_argentina/ZoneTabs";

// Hooks
import { useStandings } from "@/hook/react-query/useStandings";
import { usePendingFixtures } from "@/hook/react-query/usePendingFixture";
import { useLeagueLive } from "@/hook/socket/useLeagueLive";
import { useBrackets } from "@/hook/react-query/useBracketsMatch";
import { useLeagueStages } from "@/hook/react-query/useLeagueStage";

import { TableProcessor } from "@/app/utils/TableProcessor";

import { Trophy } from 'lucide-react';


export const ArgentinaLeaguePage: React.FC<{ leagueId: string }> = ({ leagueId }) => {
  const [activeTournament, setActiveTournament] = useState<"APERTURA" | "CLAUSURA">("APERTURA");
  const [activeZone, setActiveZone] = useState<"A" | "B">("A");
  const [activeMatchday, setActiveMatchday] = useState<number | undefined>(undefined);
  const [isBracketsOpen, setIsBracketsOpen] = useState(false); // Control del Modal
  const [simulatedResults, setSimulatedResults] = useState<Record<string, any>>({});

  // Fechas y Playoffs disponibles
  const { data: stages } = useLeagueStages("2026", activeTournament);

  // DATA DE POSICIONES Y FIXTURE 
  const { data: serverData, isLoading: loadingStandings } = useStandings(2026);
  const { data: pendingFixtures } = usePendingFixtures("2026", activeTournament);

  const { data: bracketsData, isLoading } = useBrackets("2026", activeTournament);

  // SOCKET
  const { liveResults } = useLeagueLive(leagueId);

  // LÓGICA DE PROCESAMIENTO Simulador y Live
  const allMatchUpdates = useMemo(() => ({
    ...liveResults,
    ...simulatedResults
  }), [liveResults, simulatedResults]);

  const processedData = useMemo(() => {
    return TableProcessor.calculate(serverData, allMatchUpdates, pendingFixtures || []);
  }, [serverData, allMatchUpdates, pendingFixtures]);

  const currentStandings = activeTournament === "APERTURA"
    ? processedData?.apertura
    : processedData?.clausura;
  if (loadingStandings) return <TableSkeleton />;
  return (
    <div className="min-h-screen bg-[#121212] text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <div className="flex justify-between items-center mb-6">
          <HeaderLeague />

          {/* {stages?.playoffs?.length > 0 && ( */}
          <button
            onClick={() => setIsBracketsOpen(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-lg shadow-sky-900/20"
          >
            <Trophy className="w-4 h-4" />
            VER LLAVES
          </button>
          {/* )} */}
        </div>


        <TournamentTabs
          active={activeTournament}
          onChange={(t) => { setActiveTournament(t); setActiveMatchday(undefined); }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <ZoneTabs activeZone={activeZone} onChange={setActiveZone} />

            {loadingStandings || !processedData ? (
              <TableSkeleton rows={15} cols={6} />
            ) : (
              <StandingsTable
                data={{
                  A: currentStandings?.groups.A,
                  B: currentStandings?.groups.B
                }}
                activeZone={activeZone}
                liveResults={allMatchUpdates}
              />
            )}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <FixturesPanelContainer
              season="2026"
              tournament={activeTournament}
              activeMatchday={activeMatchday}
              onMatchdayChange={setActiveMatchday}
              availableStages={stages}
            />

            <SimulatorPanel
              fixtures={pendingFixtures || []}
              onSimulate={setSimulatedResults}
            />
          </div>
        </div>

        {/* Tablas Anual y Promedios */}
        {!loadingStandings && processedData && (
          <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-10">
            <AnnualTable data={processedData.annual || []} liveResults={allMatchUpdates} />
            <AveragesTable data={processedData.averages || []} liveResults={allMatchUpdates} />
          </div>
        )}

        <BracketModal
          isOpen={isBracketsOpen}
          onClose={() => setIsBracketsOpen(false)}
          season="2026"
          tournament={activeTournament}
          liveResults={liveResults}
          data={bracketsData}
        />
      </div>
    </div>
  );
};