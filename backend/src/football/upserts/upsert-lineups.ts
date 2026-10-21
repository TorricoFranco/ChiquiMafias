import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

import { FootballLineup, FootballLineupPlayer } from '../football.types'

type PrismaLike = PrismaService | Prisma.TransactionClient

export async function upsertMatchLineup(
  prisma: PrismaLike,
  matchId: string,
  teamId: string,
  lineup: FootballLineup,
) {
  return prisma.matchLineup.upsert({
    where: {
      match_id_team_id: {
        match_id: matchId,
        team_id: teamId,
      },
    },
    update: {
      formation: lineup.formation,
      kit_colors: (lineup.kitColors ?? undefined) as
        Prisma.InputJsonValue | undefined,
      team_logo: lineup.team.logo,
      coach: lineup.coachName,
    },
    create: {
      match_id: matchId,
      team_id: teamId,
      formation: lineup.formation,
      kit_colors: (lineup.kitColors ?? undefined) as
        Prisma.InputJsonValue | undefined,
      team_logo: lineup.team.logo,
      coach: lineup.coachName,
    },
  })
}

export async function upsertMatchPlayer(
  prisma: PrismaLike,
  matchId: string,
  teamId: string,
  lineupId: string,
  playerInternalId: string,
  p: FootballLineupPlayer,
  isStarting: boolean,
) {
  return prisma.matchPlayer.upsert({
    where: {
      match_id_player_id: {
        match_id: matchId,
        player_id: playerInternalId,
      },
    },
    update: {
      is_starting: isStarting,
      position: p.position || undefined,
      grid: p.grid || undefined,
      number: p.number?.toString() || undefined,
    },
    create: {
      match_id: matchId,
      team_id: teamId,
      lineup_id: lineupId,
      player_id: playerInternalId,
      is_starting: isStarting,
      position: p.position || null,
      grid: p.grid || null,
      number: p.number?.toString() || null,
    },
  })
}
