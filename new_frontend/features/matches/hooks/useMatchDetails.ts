import { useQuery, UseQueryResult, keepPreviousData } from '@tanstack/react-query';
import { matchApi } from '../api/matchApi';
import { MatchDetails } from '../types';

export const matchDetailKey = (matchId: string) => ['matchDetail', matchId] as const;

export const useMatchDetails = (matchId: string): UseQueryResult<MatchDetails, Error> => {
  return useQuery({
    queryKey: matchDetailKey(matchId),
    queryFn: () => matchApi.getMatchDetails(matchId),
    enabled: !!matchId,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
};