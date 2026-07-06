import { useQuery } from '@tanstack/react-query';
import { fetchLiveScores } from '@/services/fetchFixturesLive';

export const useLiveScores = () => {
    return useQuery({
        queryKey: ['live-scores-league'],
        queryFn: fetchLiveScores,
        staleTime: 1000 * 60 * 5, // 5 min
        refetchOnWindowFocus: false,
    });
};