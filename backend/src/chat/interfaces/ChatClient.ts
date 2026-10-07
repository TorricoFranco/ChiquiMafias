export interface ChatClient {
  socketId: string
  userId?: string
  username: string | null
  teamName?: string | null
  badgeUrl?: string | null
  tier?: string | null
  role?: string | null
}
