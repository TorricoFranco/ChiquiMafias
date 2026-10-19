import { useQuery, UseQueryResult, keepPreviousData } from '@tanstack/react-query';
import { matchApi } from '../api/matchApi';
import { MatchDetails } from '../types';

export const useMatchDetails = (
  leagueId: string,
  season: string,
  matchId: string,
): UseQueryResult<MatchDetails, Error> => {
  return useQuery({
    queryKey: ['matchDetail', leagueId, season, matchId],
    queryFn: () => matchApi.getMatchDetails(leagueId, season, matchId),
    enabled: !!leagueId && !!season && !!matchId,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
};