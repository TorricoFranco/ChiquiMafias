import { apiFetch } from '@/lib/apiFetch';
import type { GetLiveScoresResponse } from '@/features/fixture/types';
import type { Competition } from '../types';

export const competitionsApi = {
  /** Competiciones con su temporada actual. */
  list: async (): Promise<Competition[]> => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/competitions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error('Error al cargar las competiciones');
    return res.json();
  },

  /** Marcadores en vivo de una competición. */
  live: async (slug: string): Promise<GetLiveScoresResponse[]> => {
    const res = await apiFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/competitions/${encodeURIComponent(slug)}/live`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!res.ok) throw new Error('Error al cargar los resultados en vivo');
    return res.json();
  },
};
