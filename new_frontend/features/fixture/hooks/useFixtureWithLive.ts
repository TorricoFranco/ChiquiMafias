import { useFixtureMatchday } from './useFixture';
import { useLeagueLive } from '../socket/useFixtureSocket';

export const useFixtureWithLive = (
    season: string, 
    tournament: string, 
    matchday: string, 
    leagueId: string 
) => {
    const { 
        data: fixtureData, 
        isLoading: isFixtureLoading 
    } = useFixtureMatchday(season, tournament, matchday);

    const { 
        liveResults 
    } = useLeagueLive(leagueId);

    const mergedMatches = fixtureData?.matches.map(match => {
        const liveData = liveResults[match.id]; 
        
        if (liveData) {
            return {
                ...match,
                home_goals: liveData.h,
                away_goals: liveData.a,
                home_penalty_goals: liveData.hp,
                away_penalty_goals: liveData.ap,
                status_short: liveData.status,
                elapsed: liveData.elapsed,
                is_live: ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(liveData.status)
            };
        }
        
        const isMatchActiveOrFinished = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'FT'].includes(match.status_short);

        return {
            ...match,
            is_live: isMatchActiveOrFinished && match.status_short !== 'FT'
        };
    }) || [];

    return {
        tournament: fixtureData?.tournament,
        current_matchday: fixtureData?.current_matchday,
        matches: mergedMatches,
        isLoading: isFixtureLoading
    };
};