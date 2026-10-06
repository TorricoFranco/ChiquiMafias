
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { betsApi } from '@/features/bets/api/betsApi';              
import { Market, TeamMetadata } from '@/features/bets/types/index';

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

  const getMarketByTeams = (homeTeam: string, awayTeam: string) => {
    const isTeam = (team: TeamMetadata | undefined, name: string) => team?.short === name || team?.name === name;
    return matchMarkets.find((m) =>
      isTeam(m.metadata?.homeTeam, homeTeam) && isTeam(m.metadata?.awayTeam, awayTeam)
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