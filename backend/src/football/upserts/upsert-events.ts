import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

import { FootballEvent } from '../football.types'

type PrismaClientLike = PrismaService | Prisma.TransactionClient

export async function upsertMatchEvent(
  prisma: PrismaClientLike,
  matchId: string,
  event: FootballEvent,
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
      minute: event.minute,
      extra_minute: event.extraMinute,
      type: event.type,
      detail: event.detail || 'NONE',
      player_id: playerInternalId,
      assist_id: assistInternalId,
      team_id: teamInternalId,
    },
    create: {
      match_id: matchId,
      api_event_id: apiEventId,
      minute: event.minute,
      extra_minute: event.extraMinute,
      type: event.type,
      detail: event.detail || 'NONE',
      player_id: playerInternalId,
      assist_id: assistInternalId,
      team_id: teamInternalId,
    },
  })
}
