
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { betsApi } from '@/features/bets/api/betsApi';              
import { Market } from '@/features/bets/types/index';

export const useMarkets = () => {
  const query = useQuery<Market[]>({
    queryKey: ["markets"],
    queryFn: betsApi.getActiveMarkets,
    staleTime: 1000 * 60 * 2, 
  });

  const markets = query.data || [];

  const matchMarkets = useMemo(() => 
    markets.filter((m) => m.type === 'MATCH'), 
  [markets]);

  const customMarkets = useMemo(() => 
    markets.filter((m) => m.type !== 'MATCH'), 
  [markets]);

  const getMarketByTeams = (teamA: string, teamB: string) => {
    return matchMarkets.find(m => 
      m.metadata?.homeTeam?.short === teamA || m.metadata?.homeTeam?.name === teamA ||
      m.metadata?.awayTeam?.short === teamB || m.metadata?.awayTeam?.name === teamB
    );
  };

  return {
    ...query,
    markets,
    matchMarkets,
    customMarkets,
    getMarketByTeams
  };
};