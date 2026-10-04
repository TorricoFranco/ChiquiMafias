import { apiFetch } from "@/lib/apiFetch";
import { FullStandingsResponse } from '../types/';


export const fetchStandings = async (season: number): Promise<FullStandingsResponse> => {
  const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/standings/seasons/${season}`, {
    method: 'GET',
    headers: { "Content-Type": "application/json" },
  })

  if (!res.ok) throw new Error('Error al cargar las posiciones');
  return res.json();
};


