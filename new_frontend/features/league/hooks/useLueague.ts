import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  TournamentType,
  ZoneType,
  SimulatedResult,
  PlayoffStageKey,
  StandingRow,
  LeagueMatch,
  FullStandings,
  MatchStatus,
  BracketMatch,
  AvailableStages,
  AverageRow
} from '../type';

import {
  useActiveMatchday,
  useAvailableStages,
  useTournamentBrackets,
  usePendingFixtures,
} from '@/features/fixture/hooks/useFixture';

import { useFixtureWithLive } from '@/features/fixture/hooks/useFixtureWithLive';
import { LIVE_STATUSES } from '@/features/fixture/utils/liveStatus';
import type { MatchFixture } from '@/features/fixture/types';
import { useStandings } from '@/features/standings/hooks/useStandings';
import { LEAGUE_SLUG } from '@/features/competitions/constants';
import { useCurrentSeason } from '@/features/competitions/hooks/useCompetitions';
import {
  processStandingsWithSimulations,
} from './leagueData2026';


const PLAYOFF_LABELS: Record<string, { labelShort: string; labelFull: string }> = {
  'octavos': { labelShort: 'OCT', labelFull: 'Octavos de Final' },
  'cuartos': { labelShort: 'CUA', labelFull: 'Cuartos de Final' },
  'semifinal': { labelShort: 'SEM', labelFull: 'Semifinal' },
  'final': { labelShort: 'FIN', labelFull: 'Final' },
};



/**
 * Cuándo volver a pedir la tabla después del último final, contado desde ese final. El backend
 * la pide un minuto después del último (y vuelve a esperar si termina otro), y el proveedor puede
 * tardar más en tenerla: por eso hay reintentos.
 */
const STANDINGS_REFETCH_AFTER_FINISH_MS = [2, 4, 8, 16].map((min) => min * 60 * 1000);

/** Partidos jugados de un equipo en el torneo, según la tabla del backend. */
const playedIn = (standings: FullStandings, tournament: TournamentType, teamId: string) => {
  const groups = tournament === 'APERTURA' ? standings.apertura.groups : standings.clausura.groups;
  return [...groups.A, ...groups.B].find((row) => row.teamId === teamId)?.played;
};

const enrichWithLive = <T extends { teamId: string }>(rows: T[], liveMatches: MatchFixture[]): T[] => {
  if (!liveMatches || liveMatches.length === 0) return rows;

  return rows.map((row) => {
    const activeMatch = liveMatches.find(
      (m) =>
        (m.home_team_id === row.teamId || m.away_team_id === row.teamId) &&
        ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(m.status_short)
    );

    if (!activeMatch) {
      return { ...row, live: undefined };
    }

    const isHome = activeMatch.home_team_id === row.teamId;
    const homeGoals = activeMatch.home_goals ?? 0;
    const awayGoals = activeMatch.away_goals ?? 0;
    const teamGoals = isHome ? homeGoals : awayGoals;
    const opponentGoals = isHome ? awayGoals : homeGoals;

    let resultType: 'winning' | 'losing' | 'drawing' = 'drawing';
    if (teamGoals > opponentGoals) resultType = 'winning';
    else if (teamGoals < opponentGoals) resultType = 'losing';

    return {
      ...row,
      live: {
        matchId: activeMatch.id,
        opponentName: isHome ? activeMatch.away_team.name : activeMatch.home_team.name,
        isHome,
        homeGoals,
        awayGoals,
        status: activeMatch.status_short,
        elapsed: activeMatch.elapsed ? activeMatch.elapsed.toString() : undefined,
        resultType,
      },
    };
  });
};

export interface UseLigaProfesionalDataOptions {
  initialTournament?: TournamentType;
  initialZone?: ZoneType;
  externalSimulations?: Record<string, SimulatedResult>;
  onSimulationChange?: (sims: Record<string, SimulatedResult>) => void;
}

export function useLigaProfesionalData(options?: UseLigaProfesionalDataOptions) {
  const [activeTournament, setActiveTournament] = useState<TournamentType>(
    options?.initialTournament ?? 'APERTURA'
  );
  const [activeZone, setActiveZone] = useState<ZoneType>(
    options?.initialZone ?? 'A'
  );
  const [selectedRound, setSelectedRound] = useState<number | PlayoffStageKey | null>(null);
  const [isBracketOpen, setIsBracketOpen] = useState<boolean>(false);
  const [simulations, setSimulations] = useState<Record<string, SimulatedResult>>(
    options?.externalSimulations ?? {}
  );

  // La temporada sale de GET /competitions: mientras carga, las consultas esperan.
  const {
    season: currentSeason,
    label: seasonLabel,
    isLoading: isSeasonLoading,
    isError: isSeasonError,
    retry: retrySeason,
  } = useCurrentSeason(LEAGUE_SLUG);

  const { data: activeMatchdayData } = useActiveMatchday(currentSeason, activeTournament);
  const { data: availableStagesData } = useAvailableStages(currentSeason, activeTournament);
  const { data: bracketsData } = useTournamentBrackets(currentSeason, activeTournament);
  const { data: pendingFixturesData } = usePendingFixtures(currentSeason, activeTournament);

  const queryClient = useQueryClient();
  const {
    data: baseStandings,
    isLoading: isStandingsLoading,
    dataUpdatedAt: standingsUpdatedAt,
  } = useStandings(currentSeason ? Number(currentSeason) : undefined);

  const formattedAvailableStages = useMemo<AvailableStages>(() => {
    if (!availableStagesData) return { regular: [], playoffs: [] };

    return {
      regular: availableStagesData.regular || [],
      playoffs: (availableStagesData.playoffs || []).map((stage: string) => ({
        key: stage as PlayoffStageKey,
        labelShort: PLAYOFF_LABELS[stage]?.labelShort || stage.substring(0, 3).toUpperCase(),
        labelFull: PLAYOFF_LABELS[stage]?.labelFull || stage,
      })),
    };
  }, [availableStagesData]);

  // Sin ronda elegida, arranca en la fecha activa del torneo. Se ajusta durante el render (sin efecto), cuando cambia la fecha o la ronda.
  const [prevRoundSync, setPrevRoundSync] = useState<{
    matchday: typeof activeMatchdayData;
    round: typeof selectedRound;
  } | null>(null);
  if (
    prevRoundSync === null ||
    prevRoundSync.matchday !== activeMatchdayData ||
    prevRoundSync.round !== selectedRound
  ) {
    setPrevRoundSync({ matchday: activeMatchdayData, round: selectedRound });
    if (activeMatchdayData !== undefined && selectedRound === null) {
      if (activeMatchdayData.active_matchday) {
        const isNumeric = !isNaN(Number(activeMatchdayData.active_matchday));
        setSelectedRound(
          isNumeric
            ? Number(activeMatchdayData.active_matchday)
            : activeMatchdayData.active_matchday as PlayoffStageKey
        );
      } else {
        setSelectedRound(1);
      }
    }
  }

  const currentRoundStr = selectedRound?.toString() || '1';
  const { matches: liveMatches, liveResults, isLoading: isFixtureLoading } = useFixtureWithLive(
    currentSeason,
    activeTournament,
    currentRoundStr,
    LEAGUE_SLUG
  );

  const currentRoundMatches = useMemo<LeagueMatch[]>(() => {
    if (!liveMatches) return [];
    return liveMatches.map((m) => ({
      id: m.id,
      tournament: activeTournament,
      round: selectedRound as number | PlayoffStageKey,
      date: m.date,
      status_short: m.status_short as MatchStatus,
      minute: m.elapsed ? m.elapsed.toString() : undefined,
      home_team: {
        id: m.home_team_id,
        name: m.home_team.name,
        logo_url: m.home_team.logo_url
      },
      away_team: {
        id: m.away_team_id,
        name: m.away_team.name,
        logo_url: m.away_team.logo_url
      },
      home_goals: m.home_goals,
      away_goals: m.away_goals,
      home_pen: m.home_penalty_goals,
      away_pen: m.away_penalty_goals,
    }));
  }, [liveMatches, activeTournament, selectedRound]);

  const pendingRegularMatches = useMemo<LeagueMatch[]>(() => {
    if (!pendingFixturesData) return [];
    const flatMatches: LeagueMatch[] = [];

    pendingFixturesData.forEach(group => {
      // Los cruces de playoff no suman a la tabla: no se simulan (y su ronda no es un número de fecha).
      if (group.is_playoff) return;
      group.matches.forEach(m => {
        const isPending = m.status_short === 'NS' || m.status_short === 'TBD';

        if (isPending) {
          flatMatches.push({
            id: m.id,
            tournament: activeTournament,
            round: Number(group.matchday),
            date: m.date,
            status_short: m.status_short as MatchStatus,
            home_team: {
              id: m.home_team.id,
              name: m.home_team.name,
              logo_url: m.home_team.logo_url
            },
            away_team: {
              id: m.away_team.id,
              name: m.away_team.name,
              logo_url: m.away_team.logo_url
            },
            home_goals: null,
            away_goals: null,
          });
        }
      });
    });
    return flatMatches;
  }, [pendingFixturesData, activeTournament]);

  // Partidos jugados del local en la tabla del backend mientras el partido estaba en juego (la
  // tabla del proveedor no cuenta el partido en curso). Un partido que terminó se sigue sumando
  // hasta que la tabla nueva aumenta ese número: así no desaparece con el pitazo ni se cuenta dos
  // veces cuando termina otro, aunque el proveedor tarde en actualizarla.
  const [playedBeforeMatch, setPlayedBeforeMatch] = useState<Record<string, number>>({});
  if (baseStandings && liveMatches) {
    const missing: Record<string, number> = {};
    for (const m of liveMatches) {
      if (m.is_playoff || playedBeforeMatch[m.id] !== undefined) continue;
      if (!LIVE_STATUSES.includes(m.status_short) && liveResults[m.id]?.finishedAt === undefined) continue;
      const played = playedIn(baseStandings, activeTournament, m.home_team_id);
      if (played !== undefined) missing[m.id] = played;
    }
    // Se ajusta durante el render, sin efecto: solo cuando aparece un partido nuevo.
    if (Object.keys(missing).length > 0) setPlayedBeforeMatch((prev) => ({ ...prev, ...missing }));
  }

  // Terminados por socket que la tabla del backend todavía no incluye.
  const finishedNotInTable = useMemo(() => {
    if (!baseStandings || !liveMatches) return [];
    return liveMatches.filter((m) => {
      const finishedAt = liveResults[m.id]?.finishedAt;
      const before = playedBeforeMatch[m.id];
      if (m.is_playoff || finishedAt === undefined || before === undefined) return false;
      return playedIn(baseStandings, activeTournament, m.home_team_id) === before;
    });
  }, [baseStandings, liveMatches, liveResults, playedBeforeMatch, activeTournament]);

  // Próximo pedido de la tabla: a 2, 4, 8 y 16 minutos del último final pendiente.
  const nextStandingsRefetchAt = useMemo(() => {
    const finishedAts = finishedNotInTable.map((m) => liveResults[m.id]?.finishedAt ?? 0);
    if (finishedAts.length === 0) return null;
    const latest = Math.max(...finishedAts);
    for (const offset of STANDINGS_REFETCH_AFTER_FINISH_MS) {
      if (latest + offset > standingsUpdatedAt) return latest + offset;
    }
    return null;
  }, [finishedNotInTable, liveResults, standingsUpdatedAt]);

  useEffect(() => {
    if (nextStandingsRefetchAt === null) return;
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['standings'] });
    }, Math.max(0, nextStandingsRefetchAt - Date.now()));
    return () => clearTimeout(timer);
  }, [nextStandingsRefetchAt, queryClient]);

  const effectiveSimulations = useMemo(() => {
    const combined = { ...simulations };

    if (liveMatches) {
      liveMatches.forEach(m => {
        // Los playoffs no suman a las zonas, a la anual ni a los promedios.
        if (combined[m.id] || m.is_playoff) return;
        const isLive = LIVE_STATUSES.includes(m.status_short);
        const pendingInTable = finishedNotInTable.some((f) => f.id === m.id);
        if (!isLive && !pendingInTable) return;
        combined[m.id] = {
          h: m.home_goals ?? 0,
          a: m.away_goals ?? 0,
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          isSimulated: false,
          // La fecha que se muestra es del torneo activo: el partido suma solo en ese torneo.
          tournament: activeTournament,
        };
      });
    }
    return combined;
  }, [simulations, liveMatches, finishedNotInTable, activeTournament]);

  const processedStandings = useMemo<FullStandings | null>(() => {
    if (!baseStandings) return null;
    return processStandingsWithSimulations(baseStandings, effectiveSimulations);
  }, [baseStandings, effectiveSimulations]);

  const activeZoneStandings = useMemo<StandingRow[]>(() => {
    if (!processedStandings) return [];
    const tournamentGroup = activeTournament === 'APERTURA'
      ? processedStandings.apertura.groups
      : processedStandings.clausura.groups;
    const baseRows = tournamentGroup[activeZone] || [];
    return enrichWithLive(baseRows, liveMatches);
  }, [activeTournament, activeZone, processedStandings, liveMatches]);

  const annualStandings = useMemo<StandingRow[]>(() => {
    if (!processedStandings?.annual) return [];
    return enrichWithLive(processedStandings.annual, liveMatches);
  }, [processedStandings, liveMatches]);

  const averagesStandings = useMemo<AverageRow[]>(() => {
    if (!processedStandings?.averages) return [];
    return enrichWithLive(processedStandings.averages, liveMatches);
  }, [processedStandings, liveMatches]);

  const handleTournamentChange = useCallback((tournament: TournamentType) => {
    setActiveTournament(tournament);
    setSelectedRound(null);
  }, []);

  const updateSimulatedMatch = useCallback((
    matchId: string,
    homeGoals: number | null,
    awayGoals: number | null,
    homeTeamId: string,
    awayTeamId: string
  ) => {
    setSimulations((prev) => {
      const next = { ...prev };
      if (homeGoals === null || awayGoals === null) {
        delete next[matchId];
      } else {
        // El simulador lista los partidos pendientes del torneo activo.
        next[matchId] = { h: homeGoals, a: awayGoals, homeTeamId, awayTeamId, isSimulated: true, tournament: activeTournament };
      }
      if (options?.onSimulationChange) options.onSimulationChange(next);
      return next;
    });
  }, [options, activeTournament]);

  const clearSimulations = useCallback(() => {
    setSimulations({});
    if (options?.onSimulationChange) options.onSimulationChange({});
  }, [options]);


  const playoffBracketsFlat = useMemo<BracketMatch[]>(() => {
    if (!bracketsData) return [];

    if (bracketsData.brackets && typeof bracketsData.brackets === 'object') {
      return Object.values(bracketsData.brackets).flat() as BracketMatch[];
    }

    if (Array.isArray(bracketsData)) {
      return bracketsData;
    }

    return [];
  }, [bracketsData]);


  const hasLiveMatches = useMemo(() => {
    if (!liveMatches) return false;
    return liveMatches.some((m) => m.is_live);
  }, [liveMatches]);

  return {
    isLoading: isSeasonLoading || isFixtureLoading || isStandingsLoading,
    /** El fixture de la fecha todavía no llegó (incluye esperar a la temporada, de la que sale su clave). */
    isFixtureLoading: isSeasonLoading || isFixtureLoading,
    /** Etiqueta de la temporada actual (`2026`); vacía mientras carga. */
    seasonLabel,
    isSeasonError,
    retrySeason,
    hasLiveMatches,
    activeTournament,
    activeZone,
    selectedRound: selectedRound || 1,
    isBracketOpen,
    simulations,
    simulatedCount: Object.keys(simulations).length,

    availableStages: formattedAvailableStages,
    currentRoundMatches,
    pendingRegularMatches,
    playoffBrackets: playoffBracketsFlat,
    activeZoneStandings,
    annualStandings,
    averagesStandings,

    setTournament: handleTournamentChange,
    setZone: setActiveZone,
    setSelectedRound,
    setIsBracketOpen,
    updateSimulatedMatch,
    clearSimulations,
  };
}