import { useQuery } from '@tanstack/react-query';
import { fetchStandings } from '../api/standingsApi';

export const useStandings = (season: number = 2026) => {
    return useQuery({
        queryKey: ['standings', season],
        queryFn: () => fetchStandings(season),
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
};