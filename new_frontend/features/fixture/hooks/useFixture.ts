import { useQuery } from '@tanstack/react-query';
import { fixturesApi } from '../api/fixtureApi';
import {
  GetFixtureMatchdayResponse,
  GetYearlyCalendarResponse,
  GetPendingFixturesResponse,
  GetActiveMatchdayResponse,
  TournamentBracketsResponse,
  AvailableStagesResponse,
  GetLiveScoresResponse,
  GetYearlyCalendarResponseDto
} from '../types';


const MINUTE = 1000 * 60;
const HOUR = MINUTE * 60;

export const fixtureKeys = {
  all: ['fixtures'] as const,
  matchday: (season: string, tournament: string, matchday: string) =>
    [...fixtureKeys.all, 'matchday', season, tournament, matchday] as const,
  calendar: (season: string) =>
    [...fixtureKeys.all, 'calendar', season] as const,
  pending: (season: string, tournament: string) =>
    [...fixtureKeys.all, 'pending', season, tournament] as const,
  activeMatchday: (season: string, tournament: string) =>
    [...fixtureKeys.all, 'active-matchday', season, tournament] as const,
  brackets: (season: string, tournament: string) =>
    [...fixtureKeys.all, 'brackets', season, tournament] as const,
  availableStages: (season: string, tournament: string) =>
    [...fixtureKeys.all, 'available-stages', season, tournament] as const,
};

/**
 * Obtiene los partidos de una fecha específica.
 */
export const useFixtureMatchday = (season: string, tournament: string, matchday: string) => {
  return useQuery<GetFixtureMatchdayResponse, Error>({
    queryKey: fixtureKeys.matchday(season, tournament, matchday),
    queryFn: () => fixturesApi.getByMatchday(season, tournament, matchday),
    staleTime: 5 * MINUTE,
    enabled: !!season && !!tournament && !!matchday,
  });
};

/**
 * Obtiene qué fecha mostrarle al usuario apenas entra.
 */
export const useActiveMatchday = (season: string, tournament: string) => {
  return useQuery<GetActiveMatchdayResponse, Error>({
    queryKey: fixtureKeys.activeMatchday(season, tournament),
    queryFn: () => fixturesApi.getActiveMatchday(season, tournament),
    staleTime: 30 * MINUTE,
    enabled: !!season && !!tournament,
  });
};

/**
 * Obtiene las etapas disponibles (Fechas 1 a 14 y Playoffs).
 */
export const useAvailableStages = (season: string, tournament: string) => {
  return useQuery<AvailableStagesResponse, Error>({
    queryKey: fixtureKeys.availableStages(season, tournament),
    queryFn: () => fixturesApi.getAvailableStages(season, tournament),
    staleTime: 12 * HOUR,
    enabled: !!season && !!tournament,
  });
};

/**
 * Llaves de eliminación directa.
 */
export const useTournamentBrackets = (season: string, tournament: string) => {
  return useQuery<TournamentBracketsResponse, Error>({
    queryKey: fixtureKeys.brackets(season, tournament),
    queryFn: () => fixturesApi.getBrackets(season, tournament),
    staleTime: 10 * MINUTE,
    enabled: !!season && !!tournament,
  });
};

/**
 * Calendario anual (Agrupado por día).
 */
export const useYearlyCalendar = (season: string) => {
  return useQuery<GetYearlyCalendarResponseDto, Error>({
    queryKey: fixtureKeys.calendar(season),
    queryFn: () => fixturesApi.getYearlyCalendar(season),
    staleTime: 1000 * 60 * 60,
    enabled: !!season,
  });
};



/**
 * Partidos pendientes.
 */
export const usePendingFixtures = (season: string, tournament: string) => {
  return useQuery<GetPendingFixturesResponse[], Error>({
    queryKey: fixtureKeys.pending(season, tournament),
    queryFn: () => fixturesApi.getPendingFixtures(season, tournament),
    staleTime: 1 * HOUR,
    enabled: !!season && !!tournament,
  });
};

export const useLiveScores = () => {
  return useQuery<GetLiveScoresResponse[], Error>({
    queryKey: [...fixtureKeys.all, 'live-scores'],
    queryFn: () => fixturesApi.getLiveScores(),
    staleTime: 1 * MINUTE,
  });
};