import { useQuery } from '@tanstack/react-query';
import { getBracketsMatch } from '@/services/fetchBracketsMatch';

export const useBrackets = (season: string, tournament: string) => {
    return useQuery({
        queryKey: ['brackets', season, tournament],
        queryFn: () => getBracketsMatch(season, tournament),
        staleTime: 1000 * 60 * 5,
    });
};