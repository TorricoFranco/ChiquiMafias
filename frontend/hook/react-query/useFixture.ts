
import { useQuery } from '@tanstack/react-query';
import { getActiveMatchday, getFixtureByMatchday } from '@/services/fetchFixtures';


export const useFixture = (season: string, tournament: string, selectedMatchday?: number) => {

    const activeDayQuery = useQuery({
        queryKey: ['active-matchday', season, tournament],
        queryFn: () => getActiveMatchday(season, tournament),
        staleTime: 1000 * 60 * 60 * 24, // 24 horas
    });

    const matchdayToFetch = selectedMatchday || activeDayQuery.data?.active_matchday;

    const fixtureQuery = useQuery({
        queryKey: ['fixtures', season, tournament, matchdayToFetch],
        queryFn: () => getFixtureByMatchday(season, tournament, matchdayToFetch!),
        enabled: !!matchdayToFetch, // No se ejecuta hasta que tengamos un número de fecha
        placeholderData: (previousData) => previousData, // Mantiene la fecha anterior mientras carga la nueva 
    });

    return {
        activeDay: activeDayQuery.data?.active_matchday,
        matches: fixtureQuery.data?.matches || [],
        isLoading: activeDayQuery.isLoading || fixtureQuery.isLoading,
        isFetching: fixtureQuery.isFetching, 
        error: fixtureQuery.error,
    };
};