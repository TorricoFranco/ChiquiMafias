import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

type PrismaLike = PrismaService | Prisma.TransactionClient

export async function upsertMatchLineup(
  prisma: PrismaLike,
  matchId: string,
  teamId: string,
  lineup: any,
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
      kit_colors: lineup.team.colors,
      team_logo: lineup.team.logo,
      coach: lineup.coach.name,
    },
    create: {
      match_id: matchId,
      team_id: teamId,
      formation: lineup.formation,
      kit_colors: lineup.team.colors,
      team_logo: lineup.team.logo,
      coach: lineup.coach.name,
    },
  })
}

export async function upsertMatchPlayer(
  prisma: PrismaLike,
  matchId: string,
  teamId: string,
  lineupId: string,
  playerInternalId: string,
  p: any, // data de la API
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
      position: p.player.pos || undefined,
      grid: p.player.grid || undefined,
      number: p.player.number?.toString() || undefined,
    },
    create: {
      match_id: matchId,
      team_id: teamId,
      lineup_id: lineupId,
      player_id: playerInternalId,
      is_starting: isStarting,
      position: p.player.pos || null,
      grid: p.player.grid || null,
      number: p.player.number?.toString() || null,
    },
  })
}
