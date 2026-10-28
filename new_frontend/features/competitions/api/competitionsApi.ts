import { apiFetch } from '@/lib/apiFetch';
import type { GetLiveScoresResponse } from '@/features/fixture/types';
import type { BracketResponse, Competition, CompetitionMatchesResponse } from '../types';

const base = () => process.env.NEXT_PUBLIC_API_URL;
const competitionUrl = (slug: string) => `${base()}/competitions/${encodeURIComponent(slug)}`;

const get = async <T>(url: string, errorMessage: string): Promise<T> => {
  const res = await apiFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) throw new Error(errorMessage);
  return res.json();
};

export const competitionsApi = {
  /** Competiciones con su temporada actual. */
  list: (): Promise<Competition[]> =>
    get(`${base()}/competitions`, 'Error al cargar las competiciones'),

  /** Marcadores en vivo de una competición. */
  live: (slug: string): Promise<GetLiveScoresResponse[]> =>
    get(`${competitionUrl(slug)}/live`, 'Error al cargar los resultados en vivo'),

  /** Cuadro de una competición de eliminación directa. */
  bracket: (slug: string): Promise<BracketResponse> =>
    get(`${competitionUrl(slug)}/bracket`, 'Error al cargar el cuadro'),

  /** Partidos cercanos de la temporada actual: de una semana atrás a dos adelante. */
  upcomingMatches: (slug: string): Promise<CompetitionMatchesResponse> =>
    get(`${competitionUrl(slug)}/matches`, 'Error al cargar los partidos'),

  /** Partidos de una ronda de la temporada actual. */
  matchesOfRound: (slug: string, round: string): Promise<CompetitionMatchesResponse> =>
    get(
      `${competitionUrl(slug)}/matches?round=${encodeURIComponent(round)}`,
      'Error al cargar los partidos',
    ),
};
