import { useQuery } from '@tanstack/react-query';
import { getPreMatchInfo } from '@/services/fetchPreMatch';

export const usePreMatch = (matchId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['pre-match', matchId],
    queryFn: () => getPreMatchInfo(matchId),

    enabled: !!matchId && enabled,

    staleTime: 1000 * 60 * 5, // 5 minutos de cache "fresca"
    gcTime: 1000 * 60 * 30,    // Mantener en memoria 30 mins
    retry: 1,
  });
};