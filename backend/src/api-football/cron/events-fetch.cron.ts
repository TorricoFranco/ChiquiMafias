import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ApiFootballHttp } from '../http/api-football.http'
import { ApiFootballResponse } from '../interfaces/types'

import { upsertPlayer } from '../upserts/upsert-players'
import { upsertTeam } from '../upserts/upsert-team'
import { upsertMatchEvent } from '../upserts/upsert-events'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

@Injectable()
export class EventsFetchCron {
  private readonly logger = new Logger(EventsFetchCron.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ApiFootballHttp,
    private readonly redisService: RedisService,
  ) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async fetchEvents() {
    const now = new Date()
    const halfHourFromNow = new Date(now.getTime() + 30 * 60000)
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60000)

    const matches = await this.prisma.matches.findMany({
      where: {
        tracked: true,
        events_finalized: false,

        date: {
          gte: threeDaysAgo,
          lte: halfHourFromNow,
        },
      },
      select: {
        id: true,
        api_fixture_id: true,
        status_short: true,
        league: {
          select: {
            api_league_id: true,
          },
        },
      },
    })

    if (matches.length === 0) return

    this.logger.log(
      `Sincronizando eventos para ${matches.length} partidos: [${matches
        .map((m) => `${m.id}(${m.status_short})`)
        .join(', ')}]`,
    )

    for (const match of matches) {
      try {
        const res = await this.http.get<ApiFootballResponse<any[]>>(
          '/fixtures/events',
          { fixture: match.api_fixture_id },
        )

        const apiEvents = res.data.response || []

        const redisCountKey = `match:events_count:${match.id}`
        const lastCount = await this.redisService.redis.get(redisCountKey)

        // Si no hay eventos nuevos salteamos
        if (lastCount === apiEvents.length.toString()) {
          continue
        }
        await this.redisService.redis.set(
          redisCountKey,
          apiEvents.length.toString(),
          'EX',
          7200,
        )

        const currentApiEventIds: string[] = []

        await this.prisma.$transaction(async (tx) => {
          for (const event of apiEvents) {
            const minute = event.time.elapsed
            const teamId = event.team.id
            const playerId = event.player?.id || 0
            const type = event.type || 'UNKNOWN'

            const detail =
              event.detail === null || event.detail === 'null'
                ? 'NONE'
                : event.detail

            const uniqueEventId =
              `${minute}-${teamId}-${playerId}-${type}-${detail}`
                .replace(/\s+/g, '_')
                .toLowerCase()

            currentApiEventIds.push(uniqueEventId)
            const teamInternal = event.team
              ? await upsertTeam(tx, event.team)
              : null
            const playerInternal = event.player
              ? await upsertPlayer(tx, event.player)
              : null
            const assistInternal = event.assist
              ? await upsertPlayer(tx, event.assist)
              : null

            if (!teamInternal) {
              this.logger.warn(
                `Evento omitido en match ${match.id}: No se pudo procesar el equipo api_id ${event.team.id}`,
              )
              continue
            }

            await upsertMatchEvent(
              tx,
              match.id,
              event,
              teamInternal?.id || null,
              playerInternal?.id || null,
              assistInternal?.id || null,
              uniqueEventId,
            )
          }

          // Borrado de eventos que ya no están
          await tx.matchEvents.deleteMany({
            where: {
              match_id: match.id,
              api_event_id: { notIn: currentApiEventIds },
            },
          })
        })

        // Borrado detalles en Redis para forzar recálculo con los nuevos eventos en el service
        await this.redisService.redis.del(`match:details:v1:${match.id}`)

        const isFinished = ['FT', 'AET', 'PEN'].includes(match.status_short)

        if (isFinished) {
          await this.prisma.matches.update({
            where: { id: match.id },
            data: {
              events_fetched: true,
              events_fetched_at: new Date(),
              events_finalized: true,
            },
          })
        }

        const lastEvent = apiEvents[apiEvents.length - 1]

        await this.redisService.publish('match_updates', {
          matchId: match.id,
          type: 'EVENTS_UPDATED',
          payload: {
            count: apiEvents.length,
            // UsarMapper despues aca también para que el formato coincida con la API
            // lastEvent: this.formatSingleEvent(lastEvent),
            lastEvent,
            status: match.status_short,
          },
        })
      } catch (error) {
        this.logger.error(
          `❌ Error eventos Match ${match.id}: ${error.message}`,
        )
      }
    }
  }
}
