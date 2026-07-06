import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

type PrismaClientLike = PrismaService | Prisma.TransactionClient

export async function upsertMatchEvent(
  prisma: PrismaClientLike,
  matchId: string,
  event: any,
  teamInternalId: string | null,
  playerInternalId: string | null,
  assistInternalId: string | null,
  apiEventId: string,
) {
  return prisma.matchEvents.upsert({
    where: {
      match_id_api_event_id: {
        match_id: matchId,
        api_event_id: apiEventId,
      },
    },
    update: {
      minute: event.time.elapsed,
      extra_minute: event.time.extra,
      type: event.type,
      detail: event.detail || 'NONE',
      player_id: playerInternalId,
      assist_id: assistInternalId,
      team_id: teamInternalId,
    },
    create: {
      match_id: matchId,
      api_event_id: apiEventId,
      minute: event.time.elapsed,
      extra_minute: event.time.extra,
      type: event.type,
      detail: event.detail || 'NONE',
      player_id: playerInternalId,
      assist_id: assistInternalId,
      team_id: teamInternalId,
    },
  })
}
