import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useYearlyCalendar } from './useFixture';
import { useCompetitionsLive } from '../socket/useFixtureSocket';
import { LIVE_STATUSES, liveFor } from '../utils/liveStatus';
import type { MatchFixture } from '../types';
import { upcomingMatchesQuery } from '@/features/competitions/hooks/useCompetitions';
import type { Competition, CompetitionMatchesResponse } from '@/features/competitions/types';

/** Partido del calendario con el nombre de su competición (Social mezcla varias). */
export type CalendarMatch = MatchFixture & { competitionName?: string };

type CalendarCompetition = Pick<Competition, 'slug' | 'name' | 'shortName'>;

const nameOf = (c: CalendarCompetition | undefined) => c?.shortName ?? c?.name;

/** Día del partido en la Argentina (`2026-10-28`), como agrupa el calendario del backend. */
const dayKeyOf = (date: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(date));

// Fuera del hook: con una referencia estable, useQueries solo vuelve a combinar si cambian los datos.
const combineMatches = (results: { data?: CompetitionMatchesResponse }[]) => results.map((r) => r.data);

/**
 * Calendario de la Liga (la temporada entera) sumado a los partidos cercanos de
 * las otras competiciones (`others`, como la Copa), por día y con los marcadores
 * en vivo de todas. `league` y `others` tienen que ser referencias estables.
 */
export const useCalendarWithLive = (
  season: string,
  league: CalendarCompetition | undefined,
  others: CalendarCompetition[],
) => {
  const {
    data: calendarData,
    isLoading: isCalendarLoading
  } = useYearlyCalendar(season);

  // No suman a la carga: la Liga se muestra sin esperarlas y sus partidos aparecen al llegar.
  const othersMatches = useQueries({
    queries: others.map((c) => upcomingMatchesQuery(c.slug)),
    combine: combineMatches,
  });

  const slugs = league ? [league.slug, ...others.map((c) => c.slug)] : [];
  const {
    liveResults,
    isLoading: isLiveLoading
  } = useCompetitionsLive(slugs);

  // Por día y sin el vivo: los días disponibles no cambian con cada aviso del socket
  // (el sidebar vuelve a elegir el día de hoy cuando cambian).
  const grouped = useMemo(() => {
    if (!calendarData) return null;

    const byDay: Record<string, CalendarMatch[]> = {};
    Object.entries(calendarData.calendar).forEach(([dateString, matches]) => {
      byDay[dateString] = matches.map((match) => ({ ...match, competitionName: nameOf(league) }));
    });
    // Una competición que no cargó no tapa a la Liga: se muestra lo que hay.
    others.forEach((competition, i) => {
      for (const match of othersMatches[i]?.matches ?? []) {
        (byDay[dayKeyOf(match.date)] ??= []).push({ ...match, competitionName: nameOf(competition) });
      }
    });
    for (const matches of Object.values(byDay)) {
      matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return { byDay, availableDays: Object.keys(byDay).sort() };
  }, [calendarData, league, others, othersMatches]);

  const mergedCalendar = useMemo(() => {
    if (!calendarData || !grouped) return null;

    const updatedCalendarRecord: Record<string, CalendarMatch[]> = {};

    Object.entries(grouped.byDay).forEach(([dateString, matches]) => {
      updatedCalendarRecord[dateString] = matches.map(match => {
        const liveData = liveFor(match, liveResults[match.id]);

        if (liveData) {
          return {
            ...match,
            home_goals: liveData.h,
            away_goals: liveData.a,
            home_penalty_goals: liveData.hp,
            away_penalty_goals: liveData.ap,
            status_short: liveData.status,
            elapsed: liveData.elapsed,
            is_live: LIVE_STATUSES.includes(liveData.status)
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
      availableDays: grouped.availableDays,
      calendar: updatedCalendarRecord
    };
  }, [calendarData, grouped, liveResults]);

  return {
    calendarData: mergedCalendar,
    isLoading: isCalendarLoading || isLiveLoading
  };
};
