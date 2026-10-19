import { useMatchDetails } from './useMatchDetails';
import { usePreMatch } from './usePreMatch';
import { useMatchLive } from '../socket/useMatchLive';
import { getDerivedMatchState } from '../types';
import { useMemo } from 'react';
import { MatchDetails, PreMatchResponse } from '../types';

export const useMatch = ({
  leagueId,
  season,
  matchId,
}: {
  leagueId: string;
  season: string;
  matchId: string;
}) => {
  const main = useMatchDetails(leagueId, season, matchId);
  const pre = usePreMatch(matchId);

  useMatchLive(leagueId, season, matchId);

  const derived = useMemo(() => {
    const status = main.data?.metadata?.status;
    
    if (!status) return { 
        isLive: false, 
        isNotStarted: true, 
        isFinished: false, 
        isInterrupted: false, 
        showPreMatch: true,
        hasLineups: false 
    };
    
    const baseState = getDerivedMatchState(status);
    
    const hasLineups = (main.data?.lineups?.length ?? 0) > 0;

    const showPreMatch = baseState.isNotStarted && !hasLineups;

    return {
      ...baseState,
      showPreMatch,
      hasLineups
    };
  }, [main.data?.metadata?.status, main.data?.lineups]);

  return {
    matchDetails: (main.data || undefined) as MatchDetails | undefined,
    preMatchData: (pre.data || undefined) as PreMatchResponse | undefined,
    isLoading: main.isLoading,
    error: main.error,
    isPreMatchLoading: pre.isLoading,
    preMatchError: pre.error,
    ...derived,
    refetchMatch: main.refetch,
    refetchPreMatch: pre.refetch,
  };
};