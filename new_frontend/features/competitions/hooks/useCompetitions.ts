import { useQuery } from '@tanstack/react-query';
import { competitionsApi } from '../api/competitionsApi';
import { LEAGUE_SLUG } from '../constants';
import type { BracketResponse, Competition, CompetitionMatchesResponse } from '../types';

export const competitionKeys = {
  all: ['competitions'] as const,
  bracket: (slug: string) => ['competitions', slug, 'bracket'] as const,
  roundMatches: (slug: string, round: string) =>
    ['competitions', slug, 'matches', round] as const,
};

/** Las competiciones cambian muy de vez en cuando (alta de temporada). */
const STALE_TIME = 10 * 60 * 1000;

export const useCompetitions = () =>
  useQuery<Competition[], Error>({
    queryKey: competitionKeys.all,
    queryFn: competitionsApi.list,
    staleTime: STALE_TIME,
  });

/** Una competición de la lista, o `undefined` mientras carga o si no existe. */
export const useCompetition = (slug: string) =>
  useQuery<Competition[], Error, Competition | undefined>({
    queryKey: competitionKeys.all,
    queryFn: competitionsApi.list,
    staleTime: STALE_TIME,
    select: (competitions) => competitions.find((c) => c.slug === slug),
  });

/**
 * Temporada actual de una competición. `season` es el año como texto (lo que
 * piden las rutas con temporada) y queda vacío mientras carga: las queries que
 * dependen de él esperan, así que quien muestre datos tiene que sumar
 * `isLoading` a su propio estado de carga y mostrar el error con `retry`.
 */
export const useCurrentSeason = (slug: string) => {
  const query = useCompetition(slug);
  const competition = query.data;
  return {
    season: competition ? String(competition.season.year) : '',
    label: competition?.season.label ?? '',
    isLoading: query.isPending,
    // También es un error que la competición no venga en la lista.
    isError: query.isError || (query.isSuccess && !competition),
    retry: () => {
      void query.refetch();
    },
  };
};

/** Etiqueta de la temporada actual de la Liga (`2026`); vacía mientras carga. */
export const useLeagueSeasonLabel = () => useCurrentSeason(LEAGUE_SLUG).label;

/** Cuadro de una competición de eliminación directa. */
export const useCompetitionBracket = (slug: string, enabled = true) =>
  useQuery<BracketResponse, Error>({
    queryKey: competitionKeys.bracket(slug),
    queryFn: () => competitionsApi.bracket(slug),
    staleTime: 60 * 1000,
    enabled: !!slug && enabled,
  });

/** Partidos de una ronda (por su nombre, `32avos de final`). */
export const useRoundMatches = (slug: string, round: string | null) =>
  useQuery<CompetitionMatchesResponse, Error>({
    queryKey: competitionKeys.roundMatches(slug, round ?? ''),
    queryFn: () => competitionsApi.matchesOfRound(slug, round!),
    staleTime: 60 * 1000,
    enabled: !!slug && !!round,
  });

