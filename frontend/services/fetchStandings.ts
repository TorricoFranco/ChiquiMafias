import { getBaseUrl } from "./getBaseUrl";
import { FullStandings } from "@/types/standings";

export const getStandings = async (season: number): Promise<FullStandings> => {
  const baseURL = getBaseUrl();

  try {
    const res = await fetch(`${baseURL}/standings/seasons/${season}`);
    if (!res.ok) throw new Error('Error al cargar las tablas de posiciones');
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};