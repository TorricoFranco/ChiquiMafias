import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { FootballDataProvider } from '../football-data.provider'
import { FootballLineupPlayer } from '../football.types'

import { upsertPlayer } from '../upserts/upsert-players'
import { upsertTeam } from '../upserts/upsert-team'
import { upsertMatchLineup, upsertMatchPlayer } from '../upserts/upsert-lineups'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

@Injectable()
export class LineupsFetchCron {
  private readonly logger = new Logger(LineupsFetchCron.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchLineups() {
    const matches = await this.prisma.matches.findMany({
      where: { tracked: true, lineup_fetched: false },
      select: { id: true, api_fixture_id: true },
    })
    if (matches.length === 0) return

    for (const match of matches) {
      try {
        const lineups = await this.provider.getLineups(match.api_fixture_id)
        this.logger.debug(`Alineaciones recibidas: ${lineups.length}`)
        const hasConfirmedLineups = lineups.some((l) => l.startXI.length > 0)

        if (!hasConfirmedLineups) continue

        await this.prisma.$transaction(async (tx) => {
          for (const lineup of lineups) {
            const team = await upsertTeam(tx, {
              externalId: lineup.team.externalId,
              name: lineup.team.name,
            })
            if (!team) continue

            const matchLineup = await upsertMatchLineup(
              tx,
              match.id,
              team.id,
              lineup,
            )

            const saveGroup = async (
              players: FootballLineupPlayer[],
              isStarting: boolean,
            ) => {
              for (const p of players) {
                const player = await upsertPlayer(tx, {
                  externalId: p.externalId,
                  name: p.name,
                  position: p.position,
                })
                if (player) {
                  await upsertMatchPlayer(
                    tx,
                    match.id,
                    team.id,
                    matchLineup.id,
                    player.id,
                    p,
                    isStarting,
                  )
                }
              }
            }

            await saveGroup(lineup.startXI, true)
            await saveGroup(lineup.substitutes, false)
          }

          await tx.matches.update({
            where: { id: match.id },
            data: { lineup_fetched: true, lineup_fetched_at: new Date() },
          })
        })

        await this.redisService.redis.del(`match:details:v1:${match.id}`)

        // NOTIFICACIÓN PUB/SUB
        await this.redisService.publish('match_updates', {
          matchId: match.id,
          type: 'LINEUPS_READY',
          payload: { lineup_fetched: true, matchId: match.id },
        })

        this.logger.log(`✅ Formaciones sincronizadas para Match: ${match.id}`)
      } catch (error) {
        this.logger.error(
          `❌ Error lineups Match ${match.id}: ${error.message}`,
        )
      }
    }
  }
}
