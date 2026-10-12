import type { GetLiveScoresResponse, LiveResult } from '../types';

export const formatToMapFixtureSocket = (data: GetLiveScoresResponse[]) => {
    return data.reduce<Record<string, LiveResult>>((acc, match) => {
        acc[match.matchId] = {
            h: match.h,
            a: match.a,
            hp: match.hp || 0,
            ap: match.ap || 0,
            homeTeamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            status: match.status,
            isLive: true,
            isPlayoff: !!match.isPlayoff,
            elapsed: match.elapsed
        };
        return acc;
    }, {});
};