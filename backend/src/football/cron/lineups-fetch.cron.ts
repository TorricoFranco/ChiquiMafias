import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { FootballDataProvider } from '../football-data.provider'
import { FootballLineupPlayer } from '../football.types'

import { FootballRefsService } from '../services/refs.service'
import { upsertMatchLineup, upsertMatchPlayer } from '../upserts/upsert-lineups'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

// Un partido sin alineaciones deja de consultarse pasado este tiempo desde su
// inicio: si el proveedor nunca las tuvo (algunos partidos de copa), sin este
// límite se las seguía pidiendo cada 5 minutos a un partido ya terminado.
const LOOKBACK_MS = 6 * 60 * 60 * 1000
// Desde cuántos minutos antes del inicio se avisa que todavía faltan.
const LATE_WARNING_MINUTES = 10

@Injectable()
export class LineupsFetchCron {
  private readonly logger = new Logger(LineupsFetchCron.name)
  // Partidos de los que ya se avisó que faltan alineaciones: una vez por partido.
  private readonly warnedMissing = new Set<string>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redisService: RedisService,
    private readonly refs: FootballRefsService,
  ) {}

  /**
   * Avisa una vez por partido que el proveedor todavía no publicó las
   * alineaciones cuando falta poco para el inicio (o ya empezó): distingue "el
   * proveedor no las tiene" de un error nuestro al leer los logs.
   */
  private warnIfMissing(
    match: {
      id: string
      date: Date
      home_team: { name: string }
      away_team: { name: string }
    },
    now: Date,
  ) {
    if (this.warnedMissing.has(match.id)) return

    const minutes = Math.round((match.date.getTime() - now.getTime()) / 60_000)
    if (minutes > LATE_WARNING_MINUTES) return

    this.warnedMissing.add(match.id)
    const when =
      minutes >= 0
        ? `Faltan ${minutes} min para`
        : `Empezó hace ${-minutes} min`
    this.logger.warn(
      `${when} ${match.home_team.name} vs ${match.away_team.name} y el proveedor todavía no publicó las alineaciones; se sigue consultando cada 5 min.`,
    )
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchLineups() {
    const now = new Date()
    const matches = await this.prisma.matches.findMany({
      where: {
        tracked: true,
        lineup_fetched: false,
        date: { gte: new Date(now.getTime() - LOOKBACK_MS) },
      },
      select: {
        id: true,
        api_fixture_id: true,
        date: true,
        home_team: { select: { name: true } },
        away_team: { select: { name: true } },
      },
    })
    if (matches.length === 0) return

    const externalIds = await this.refs.matchExternalIds(matches)

    for (const match of matches) {
      try {
        const externalId = externalIds.get(match.id)
        if (externalId === undefined) {
          this.logger.warn(
            `Partido ${match.id} sin ID en el proveedor, se saltea`,
          )
          continue
        }
        const lineups = await this.provider.getLineups(externalId)
        this.logger.debug(
          `Alineaciones recibidas de ${match.home_team.name} vs ${match.away_team.name}: ${lineups.length}`,
        )
        const hasConfirmedLineups = lineups.some((l) => l.startXI.length > 0)

        if (!hasConfirmedLineups) {
          this.warnIfMissing(match, now)
          continue
        }

        await this.prisma.$transaction(async (tx) => {
          for (const lineup of lineups) {
            const team = await this.refs.resolveTeam(tx, {
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
                const player = await this.refs.resolvePlayer(tx, {
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

        await this.redisService.redis.del(`match:details:v2:${match.id}`)

        // NOTIFICACIÓN PUB/SUB
        await this.redisService.publish('match_updates', {
          matchId: match.id,
          type: 'LINEUPS_READY',
          payload: { lineup_fetched: true, matchId: match.id },
        })

        this.logger.log(`✅ Formaciones sincronizadas para Match: ${match.id}`)
      } catch (error) {
        this.logger.error(
          `❌ Error lineups Match ${match.id}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }
}
