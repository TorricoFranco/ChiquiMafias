
export interface ChatMessagePayload {
  messageId: string;
  matchId?: string;
  userId: string;
  name: string;
  teamName: string | null;
  badgeUrl: string | null;
  message: string;
  stickerId: string | null;
  nameColor: string | null;
  bannerId: string | null;
  isMegaphone: boolean;
  timestamp: number;
}