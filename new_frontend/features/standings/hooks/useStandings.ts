import { useQuery } from '@tanstack/react-query';
import { fetchStandings } from '../api/standingsApi';

/** Tablas de la temporada; espera hasta tener la temporada actual. */
export const useStandings = (season: number | undefined) => {
    return useQuery({
        queryKey: ['standings', season],
        queryFn: () => fetchStandings(season!),
        enabled: !!season,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
};