"use client";

import React, { useState, useMemo } from "react";
import { Trophy } from "lucide-react";
import Link from 'next/link';

import { ZoneStandings, STANDINGS_MOCKS } from "@/lib/mocks";
import { StandingsTable } from "@/components/league/liga_argentina/fixture/StandingsTable";
import { FixturesPanel } from "@/components/league/liga_argentina/fixture/FixturesPanel";
import { AnnualTable } from "@/components/league/liga_argentina/fixture/AnnualTable";
import { AveragesTable } from "@/components/league/liga_argentina/fixture/AveragesTable";

import TournamentTabs from "@/components/league/liga_argentina/TournamentsTabs";
import ZoneTabs from "@/components/league/liga_argentina/ZoneTabs";


import { useLeagueSimulation } from "@/hook/useLuegueSimulation";
import { MOCK_PENDING_MATCHES, PendingMatch } from "@/lib/matchesMock";

/**
 * LeaguePage integrado con useLeagueSimulation
 */
export const LeaguePage: React.FC = () => {
  const [activeTournament, setActiveTournament] = useState<"apertura" | "clausura">("apertura");
  const [activeZone, setActiveZone] = useState<"A" | "B">("A");

  // Inicializamos el hook con los mocks existentes
  const { standings, matches, simulateMatch, resetMatch, annual, promedios } = useLeagueSimulation(
    {
      aperturaZoneA: STANDINGS_MOCKS.apertura.A,
      aperturaZoneB: STANDINGS_MOCKS.apertura.B,
      clausuraZoneA: STANDINGS_MOCKS.clausura.A,
      clausuraZoneB: STANDINGS_MOCKS.clausura.B,
    },
    MOCK_PENDING_MATCHES
  );

  // Obtiene la tabla actual desde el estado del hook
  const currentStandings: ZoneStandings = useMemo(() => {
    const key = `${activeTournament}Zone${activeZone}` as "aperturaZoneA" | "aperturaZoneB" | "clausuraZoneA" | "clausuraZoneB";
    return (standings as any)[key] as ZoneStandings;
  }, [standings, activeTournament, activeZone]);

  // Filtra partidos pendientes para el torneo+zona activos (los devuelve del estado del hook)
  const pendingForView: PendingMatch[] = useMemo(() => {
    return matches.filter(m => m.tournament === activeTournament && m.zone === activeZone);
  }, [matches, activeTournament, activeZone]);

  // Estado local para scores temporales por matchId
  const [scores, setScores] = useState<Record<string, { home: number; away: number }>>(() => {
    const map: Record<string, { home: number; away: number }> = {};
    MOCK_PENDING_MATCHES.forEach(m => {
      map[m.matchId] = { home: m.homeGoals ?? 0, away: m.awayGoals ?? 0 };
    });
    return map;
  });

  const setScore = (matchId: string, side: "home" | "away", value: number) => {
    setScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [side]: value } }));
  };

  const handleSimulate = (matchId: string) => {
    const s = scores[matchId] ?? { home: 0, away: 0 };
    simulateMatch(matchId, s.home, s.away);
  };

  const handleReset = (matchId: string) => {
    resetMatch(matchId);
    // opcional: resetear inputs locales a 0
    setScores(prev => ({ ...prev, [matchId]: { home: 0, away: 0 } }));
  };

  // Helper para buscar nombre de equipo desde el estado de standings (busca en las 4 tablas)
  const findTeamName = (teamId: string) => {
    const tables: ZoneStandings[] = [
      standings.aperturaZoneA,
      standings.aperturaZoneB,
      standings.clausuraZoneA,
      standings.clausuraZoneB,
    ];
    for (const t of tables) {
      const r = t.rows.find(r => r.teamId === teamId);
      if (r) return r.teamName;
    }
    return teamId;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 md:p-8 font-sans">
      <style>{`
                .custom-scrollbar-horizontal::-webkit-scrollbar { height: 8px; }
                .custom-scrollbar-horizontal::-webkit-scrollbar-thumb { background-color: #4B5563; border-radius: 4px; }
                .custom-scrollbar-horizontal::-webkit-scrollbar-track { background-color: #1F2937; }
                .custom-scrollbar-vertical::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-vertical::-webkit-scrollbar-thumb { background-color: #374151; border-radius: 3px; }
                .custom-scrollbar-vertical::-webkit-scrollbar-track { background-color: #1F2937; }
                .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            `}</style>

      <div className="max-w-7xl mx-auto">
        <Link href="/league/liga-profesional-argentina-2025" aria-label="Ir a Liga Profesional Argentina 2025">
          <header className="mb-8 hover:underline">
            <h1 className="text-4xl font-extrabold text-white flex items-center mb-2">
              <Trophy className="w-8 h-8 mr-3 text-yellow-400" /> Clasificación LPF 2025
            </h1>
            <p className="text-gray-400 text-lg">Torneos Apertura y Clausura y sus respectivas fases.</p>
          </header>
        </Link>

        <TournamentTabs active={activeTournament} onChange={setActiveTournament} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-6">
            <ZoneTabs activeZone={activeZone} onChange={setActiveZone} />

            {/* Aquí usamos la tabla proveniente del hook (se recalculará al simular) */}
            <StandingsTable data={currentStandings} />
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Panel de fixtures original (solo lecturas de calendario) */}
            <FixturesPanel tournament={activeTournament} fixtures={STANDINGS_MOCKS.fixtures[activeTournament]} />

            {/* Nuevo panel: Partidos pendientes + controles de simulación */}
            <div className="p-4 bg-gray-800 rounded-xl shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-3">Partidos pendientes - {activeTournament} Zona {activeZone}</h3>

              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar-vertical pr-2">
                {pendingForView.length === 0 && (
                  <div className="text-gray-400 text-sm">No hay partidos pendientes para esta zona.</div>
                )}

                {/* Agrupar partidos por jornada */}
                {(() => {
                  const groups: Record<number, typeof pendingForView> = {};
                  pendingForView.forEach(m => {
                    const k = m.round || 0;
                    if (!groups[k]) groups[k] = [];
                    groups[k].push(m);
                  });

                  const sortedRounds = Object.keys(groups).map(Number).sort((a, b) => a - b);

                  return sortedRounds.map(round => (
                    <div key={round} className="mb-2">
                      <div className="sticky top-0 bg-gray-800/80 px-2 py-1 font-semibold text-sm text-amber-400 rounded-md">Jornada {round}</div>
                      <div className="mt-2 space-y-2">
                        {groups[round].map((m) => {
                          const s = scores[m.matchId] ?? { home: m.homeGoals ?? 0, away: m.awayGoals ?? 0 };
                          return (
                            <div key={m.matchId} className="bg-gray-700/40 p-3 rounded-md flex items-center justify-between">
                              <div className="flex-1 pr-3">
                                <div className="text-sm text-gray-300 font-medium truncate">{findTeamName(m.homeTeamId)}</div>
                                <div className="text-xs text-gray-500">vs</div>
                                <div className="text-sm text-gray-300 font-medium truncate">{findTeamName(m.awayTeamId)}</div>
                              </div>

                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  className="w-12 p-1 text-center rounded bg-gray-800 border border-gray-600"
                                  value={s.home}
                                  min={0}
                                  onChange={(e) => setScore(m.matchId, "home", Number(e.target.value))}
                                />
                                <span className="text-gray-300 font-bold">-</span>
                                <input
                                  type="number"
                                  className="w-12 p-1 text-center rounded bg-gray-800 border border-gray-600"
                                  value={s.away}
                                  min={0}
                                  onChange={(e) => setScore(m.matchId, "away", Number(e.target.value))}
                                />

                                {!m.played ? (
                                  <button
                                    onClick={() => handleSimulate(m.matchId)}
                                    className="ml-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500"
                                  >
                                    Simular
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReset(m.matchId)}
                                    className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-6 border-b border-gray-700 pb-2">Tablas Acumuladas</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnnualTable data={annual} />
          <AveragesTable data={promedios} />
        </div>
      </div>
    </div>
  );
};