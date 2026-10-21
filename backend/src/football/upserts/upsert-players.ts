import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

import { FootballPlayerRef } from '../football.types'

type PrismaLike = PrismaService | Prisma.TransactionClient

export async function upsertPlayer(
  prisma: PrismaLike,
  player?: FootballPlayerRef | null,
) {
  if (
    !player ||
    player.externalId === null ||
    player.externalId === undefined
  ) {
    return null
  }

  return prisma.players.upsert({
    where: { api_id: player.externalId },
    update: {
      name: player.name || 'Unknown',
      position: player.position || undefined,
    },
    create: {
      api_id: player.externalId,
      name: player.name || 'Unknown',
      position: player.position || null,
    },
  })
}
