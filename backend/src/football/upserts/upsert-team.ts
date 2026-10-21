import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { FootballTeamRef } from '../football.types'

type PrismaLike = PrismaService | Prisma.TransactionClient

export async function upsertTeam(
  prisma: PrismaLike,
  team?: Pick<FootballTeamRef, 'externalId' | 'name'> &
    Partial<FootballTeamRef>,
): Promise<{ id: string; name: string } | null> {
  if (!team?.externalId || !team.name) {
    return null
  }

  return prisma.teams.upsert({
    where: { api_team_id: team.externalId },
    update: {
      name: team.name,
      short_code: team.code || undefined,
      country: team.country || undefined,
      foundation_year: team.founded || undefined,
      logo_url: team.logo || undefined,
    },
    create: {
      api_team_id: team.externalId,
      name: team.name,
      short_code: team.code || null,
      country: team.country || null,
      foundation_year: team.founded || null,
      logo_url: team.logo || null,
    },
    select: { id: true, name: true },
  })
}
