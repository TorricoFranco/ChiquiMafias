
import { useQuery } from '@tanstack/react-query';
import { getActiveMatchday, getFixtureByMatchday } from '@/services/fetchFixtures';

export const useFixture = (season: string, tournament: string, selectedMatchday?: number) => {

    const activeDayQuery = useQuery({
        queryKey: ['active-matchday', season, tournament],
        queryFn: () => getActiveMatchday(season, tournament),
        staleTime: 1000 * 60 * 60 * 24,
    });

    const matchdayToFetch = selectedMatchday || Number(activeDayQuery.data?.current_matchday);

    const fixtureQuery = useQuery({
        queryKey: ['fixtures', season, tournament, matchdayToFetch],
        queryFn: () => getFixtureByMatchday(season, tournament, matchdayToFetch),
        enabled: !!matchdayToFetch,
        placeholderData: (previousData) => previousData,
    });

    return {
        activeDay: activeDayQuery.data?.current_matchday,
        matches: fixtureQuery.data?.matches || [],
        isLoading: activeDayQuery.isLoading || fixtureQuery.isLoading,
        isFetching: fixtureQuery.isFetching,
        error: fixtureQuery.error,
    };
};