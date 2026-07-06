import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

type PrismaLike = PrismaService | Prisma.TransactionClient

export async function upsertPlayer(prisma: PrismaLike, player: any) {
  if (!player || player.id === null || player.id === undefined) {
    return null
  }

  const birthDate =
    player.birth?.date && !isNaN(Date.parse(player.birth.date))
      ? new Date(player.birth.date)
      : null

  return prisma.players.upsert({
    where: { api_id: player.id },
    update: {
      name: player.name || 'Unknown',
      firstname: player.firstname || undefined,
      lastname: player.lastname || undefined,
      age: player.age || undefined,
      birth_date: birthDate ?? undefined,
      nationality: player.nationality || undefined,
      height: player.height || undefined,
      weight: player.weight || undefined,
      position: player.position || undefined,
      photo: player.photo || undefined,
    },
    create: {
      api_id: player.id,
      name: player.name || 'Unknown',
      firstname: player.firstname || null,
      lastname: player.lastname || null,
      age: player.age || null,
      birth_date: birthDate,
      nationality: player.nationality || null,
      height: player.height || null,
      weight: player.weight || null,
      position: player.position || null,
      photo: player.photo || null,
    },
  })
}
