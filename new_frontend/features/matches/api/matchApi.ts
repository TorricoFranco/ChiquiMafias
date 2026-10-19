import { apiFetch } from '@/lib/apiFetch';
import { MatchDetails, PreMatchResponse } from '../types';

export const matchApi = {
  /**
   * Detalle principal del partido
   */
  getMatchDetails: async (
    leagueId: string,
    season: string,
    matchId: string,
  ): Promise<MatchDetails> => {
    const res = await apiFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/matches/leagues/${leagueId}/seasons/${season}/matches/${matchId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al cargar el detalle del partido');
    }

    return res.json();
  },

  /**
   * Información previa al partido (solo cuando el partido no empezó)
   */
  getPreMatchInfo: async (matchId: string): Promise<PreMatchResponse> => {
    const res = await apiFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/matches/pre-match/${matchId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al cargar la información pre‑match');
    }

    return res.json();
  },
};
