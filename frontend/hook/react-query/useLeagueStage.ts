import { useQuery } from '@tanstack/react-query';
import { getAvailableStages } from '@/services/fetchAvailableStages';


export const useLeagueStages = (season: string, tournament: string) => {
    return useQuery({
        queryKey: ['league-stages', season, tournament],
        queryFn: () => getAvailableStages(season, tournament),
    });
};