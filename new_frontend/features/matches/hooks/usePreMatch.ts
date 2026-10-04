import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { matchApi } from '../api/matchApi';
import { PreMatchResponse } from '../types';

/**
 * Hook que obtiene la información previa al partido (solo cuando el partido no está iniciado).
 */
export const usePreMatch = (
  matchId: string,
): UseQueryResult<PreMatchResponse, Error> => {
  return useQuery({
    queryKey: ['preMatch', matchId],
    queryFn: () => matchApi.getPreMatchInfo(matchId),
    enabled: !!matchId,
    staleTime: 1000 * 60 * 15, // 15 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos en memoria
  });
};