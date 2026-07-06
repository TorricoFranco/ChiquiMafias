import { useQuery } from '@tanstack/react-query';
import { getStandings } from '@/services/fetchStandings';

export const useStandings = (season: number) => {
    return useQuery({
        queryKey: ['standings', season],
        queryFn: () => getStandings(season),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
};