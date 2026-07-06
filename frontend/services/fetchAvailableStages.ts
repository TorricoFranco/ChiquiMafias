import { getBaseUrl } from "./getBaseUrl";
import { AvailableStagesResponse } from "@/types/fixtures";

export async function getAvailableStages(
  season: string,
  tournament: string
): Promise<AvailableStagesResponse | null> {
  const baseUrl = getBaseUrl();
  try {
    const url = `${baseUrl}/fixtures/seasons/${season}/tournaments/${tournament}/availableStage`;
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

    const data = await res.json();
    console.log("Available Stages Response:", data);
    return data
  } catch (error) {
    console.error("Fetch Available Stages Error:", error);
    return { regular: [], playoffs: [] };
  }
}