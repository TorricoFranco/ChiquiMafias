import { useState, useMemo, useEffect, useCallback } from 'react';
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
  AvailableStages
} from '../type';

import {
  useActiveMatchday,
  useAvailableStages,
  useTournamentBrackets,
  usePendingFixtures,
} from '@/features/fixture/hooks/useFixture';

import { useFixtureWithLive } from '@/features/fixture/hooks/useFixtureWithLive';
import { useStandings } from '@/features/standings/hooks/useStandings';
import {
  processStandingsWithSimulations,
} from './leagueData2026';

const CURRENT_SEASON = '2026';
const SOCKET_LEAGUE_ID = '128';

const PLAYOFF_LABELS: Record<string, { labelShort: string; labelFull: string }> = {
  'octavos': { labelShort: 'OCT', labelFull: 'Octavos de Final' },
  'cuartos': { labelShort: 'CUA', labelFull: 'Cuartos de Final' },
  'semifinal': { labelShort: 'SEM', labelFull: 'Semifinal' },
  'final': { labelShort: 'FIN', labelFull: 'Final' },
};



const enrichWithLive = <T extends { teamId: string }>(rows: T[], liveMatches: any[]): T[] => {
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

  const { data: activeMatchdayData } = useActiveMatchday(CURRENT_SEASON, activeTournament);
  const { data: availableStagesData } = useAvailableStages(CURRENT_SEASON, activeTournament);
  const { data: bracketsData } = useTournamentBrackets(CURRENT_SEASON, activeTournament);
  const { data: pendingFixturesData } = usePendingFixtures(CURRENT_SEASON, activeTournament);

  const { data: baseStandings, isLoading: isStandingsLoading } = useStandings(Number(CURRENT_SEASON));

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

  useEffect(() => {
    if (activeMatchdayData !== undefined && !selectedRound) {
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
  }, [activeMatchdayData, selectedRound]);

  const currentRoundStr = selectedRound?.toString() || '1';
  const { matches: liveMatches, isLoading: isFixtureLoading } = useFixtureWithLive(
    CURRENT_SEASON,
    activeTournament,
    currentRoundStr,
    SOCKET_LEAGUE_ID
  );

  const currentRoundMatches = useMemo<LeagueMatch[]>(() => {
    if (!liveMatches) return [];
    console.log(liveMatches)
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

  const effectiveSimulations = useMemo(() => {
    const combined = { ...simulations };

    if (liveMatches) {
      liveMatches.forEach(m => {
        const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(m.status_short);
        if (isLive && !combined[m.id]) {
          combined[m.id] = {
            h: m.home_goals ?? 0,
            a: m.away_goals ?? 0,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            isSimulated: false,
          };
        }
      });
    }
    return combined;
  }, [simulations, liveMatches]);

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
        next[matchId] = { h: homeGoals, a: awayGoals, homeTeamId, awayTeamId, isSimulated: true };
      }
      if (options?.onSimulationChange) options.onSimulationChange(next);
      return next;
    });
  }, [options]);

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
    isLoading: isFixtureLoading || isStandingsLoading,
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