import { useMemo } from 'react';
import { useYearlyCalendar } from './useFixture';
import { useLeagueLive } from '../socket/useFixtureSocket';

export const useCalendarWithLive = (season: string, leagueId: string) => {
  const {
    data: calendarData,
    isLoading: isCalendarLoading
  } = useYearlyCalendar(season);

  const {
    liveResults,
    isLoading: isLiveLoading
  } = useLeagueLive(leagueId);

  const mergedCalendar = useMemo(() => {
    if (!calendarData) return null;

    const updatedCalendarRecord: Record<string, any[]> = {};

    Object.entries(calendarData.calendar).forEach(([dateString, matches]) => {
      updatedCalendarRecord[dateString] = matches.map(match => {
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
      });
    });

    return {
      ...calendarData,
      calendar: updatedCalendarRecord
    };
  }, [calendarData, liveResults]);

  return {
    calendarData: mergedCalendar,
    isLoading: isCalendarLoading || isLiveLoading
  };
};