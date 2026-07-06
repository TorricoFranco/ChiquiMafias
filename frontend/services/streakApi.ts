import { apiFetch } from "@/lib/apiFetch";

export interface StreakTimelineItem {
  dayNumber: number;
  coins: number;
  hasSpecialGift: boolean;
  giftName: string | null;
  status: 'completed' | 'current' | 'upcoming';
}

export interface StreakTimelineResponse {
  currentStreak: number;
  streakRewardClaimed: boolean;
  userTier: string;
  timeline: StreakTimelineItem[];
}

export interface CheckInResponse {
  incremented: boolean;
  currentStreak: number;
  canClaimReward: boolean;
}

export const streakApi = {
  /**
   * Ejecuta el check-in automático (silencioso) al cargar la app
   * POST /subscriptions/streak/check-in
   */
  checkIn: async (): Promise<CheckInResponse> => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/streak/check-in`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Error en el check-in de racha');
    return res.json();
  },

  /**
   * Reclama el premio del día actual
   * POST /subscriptions/streak/claim
   */
  claimReward: async (): Promise<{ status: string; coinsAwarded: number; cosmeticAwarded: string | null; currentStreak: number }> => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/streak/claim`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Error al reclamar la recompensa diaria');
    return res.json();
  },

  /**
   * Trae el camino de recompensas de 7 días
   * GET /subscriptions/streak/timeline
   */
  getTimeline: async (): Promise<StreakTimelineResponse> => {
    const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/subscriptions/streak/timeline`, {
      method: 'GET',
    });
    if (!res.ok) throw new Error('Error al obtener el timeline de racha');
    return res.json();
  },
};