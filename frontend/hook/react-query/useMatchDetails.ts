import { useQuery } from '@tanstack/react-query';
import { useMatchSocket } from '../socket/useMatchLive';
import { getMatchDetails } from '@/services/fetchMatchDetails';


export const useMatch = (matchId: string, initialData: any) => {
  useMatchSocket(matchId);

  const getRefetchInterval = (data: any) => {
    const status = data?.metadata?.status;
    const liveStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "LIVE"];
    const notStarted = ["NS", "SCHEDULED"].includes(status);

    if (liveStatuses.includes(status)) return 30000;
    if (notStarted) return 120000;
    return false;
  };

  return useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatchDetails(matchId),
    initialData,
    staleTime: 10000,
    refetchInterval: (query) => getRefetchInterval(query.state.data),
    refetchOnWindowFocus: true,
  });
};