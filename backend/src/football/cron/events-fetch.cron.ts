import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { FootballDataProvider } from '../football-data.provider'
import { FootballEvent } from '../football.types'

import { FootballRefsService } from '../services/refs.service'
import { upsertMatchEvent } from '../upserts/upsert-events'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

/**
 * Forma del evento que viaja por el socket (`EVENTS_UPDATED.lastEvent`). El
 * gateway y el front la leen así (`time.elapsed`, `team.id`, `player.name`…),
 * por eso se mantiene aunque el contrato interno sea otro.
 */
export function toWireEvent(event: FootballEvent) {
  return {
    time: { elapsed: event.minute, extra: event.extraMinute },
    team: event.team
      ? {
          id: event.team.externalId,
          name: event.team.name,
          logo: event.team.logo ?? undefined,
        }
      : null,
    player: event.player
      ? { id: event.player.externalId, name: event.player.name }
      : null,
    assist: event.assist
      ? { id: event.assist.externalId, name: event.assist.name }
      : null,
    type: event.type,
    // El front hace detail.toLowerCase(): nunca null (la base guarda 'NONE').
    detail: event.detail ?? 'NONE',
  }
}

/** Id estable de un evento dentro del partido (se guarda en `api_event_id`). */
export function buildEventKey(event: FootballEvent): string {
  const detail =
    event.detail === null || event.detail === 'null' ? 'NONE' : event.detail
  // Sin id, el nombre: si no, dos tiros de la tanda del mismo equipo (todos en
  // el 120) quedaban con la misma clave y se pisaban.
  const playerId = event.player?.externalId || event.player?.name || 0
  const type = event.type || 'UNKNOWN'

  return `${event.minute}-${event.team?.externalId}-${playerId}-${type}-${detail}`
    .replace(/\s+/g, '_')
    .toLowerCase()
}

/** La clave sin el minuto: el proveedor a veces corrige el minuto de un evento. */
const withoutMinute = (key: string) => key.slice(key.indexOf('-') + 1)

/**
 * Eventos que no estaban guardados. Un evento al que el proveedor le corrigió
 * el minuto no cuenta como nuevo: el bot del chat no tiene que volver a
 * anunciar un gol por eso.
 */
export function findNewEvents<T extends { key: string }>(
  savedKeys: string[],
  events: T[],
): T[] {
  const saved = new Map<string, number>()
  for (const key of savedKeys) {
    const id = withoutMinute(key)
    saved.set(id, (saved.get(id) ?? 0) + 1)
  }
  return events.filter((e) => {
    const id = withoutMinute(e.key)
    const left = saved.get(id) ?? 0
    if (left > 0) {
      saved.set(id, left - 1)
      return false
    }
    return true
  })
}

@Injectable()
export class EventsFetchCron {
  private readonly logger = new Logger(EventsFetchCron.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redisService: RedisService,
    private readonly refs: FootballRefsService,
  ) {}

  private async markEventsFinalized(matchId: string) {
    await this.prisma.matches.update({
      where: { id: matchId },
      data: {
        events_fetched: true,
        events_fetched_at: new Date(),
        events_finalized: true,
      },
    })
  }

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
        const apiEvents = await this.provider.getEvents(externalId)

        const redisCountKey = `match:events_count:${match.id}`
        const lastCount = await this.redisService.redis.get(redisCountKey)

        const isFinished = ['FT', 'AET', 'PEN'].includes(match.status_short)

        // Si no hay eventos nuevos salteamos. Un partido terminado se cierra
        // igual: si no, quedaba sin `events_finalized` (los eventos ya estaban
        // guardados desde que se jugaba) y se volvía a consultar cada minuto
        // durante 3 días.
        if (lastCount === apiEvents.length.toString()) {
          if (isFinished) await this.markEventsFinalized(match.id)
          continue
        }
        await this.redisService.redis.set(
          redisCountKey,
          apiEvents.length.toString(),
          'EX',
          7200,
        )

        const currentApiEventIds: string[] = []
        const stored: { key: string; event: FootballEvent }[] = []
        let savedKeys: string[] = []

        await this.prisma.$transaction(async (tx) => {
          const saved = await tx.matchEvents.findMany({
            where: { match_id: match.id },
            select: { api_event_id: true },
          })
          savedKeys = saved.map((e) => e.api_event_id)

          for (const event of apiEvents) {
            const uniqueEventId = buildEventKey(event)

            currentApiEventIds.push(uniqueEventId)
            const teamInternal = event.team
              ? await this.refs.resolveTeam(tx, event.team)
              : null
            const playerInternal = event.player
              ? await this.refs.resolvePlayer(tx, event.player)
              : null
            const assistInternal = event.assist
              ? await this.refs.resolvePlayer(tx, event.assist)
              : null

            if (!teamInternal) {
              this.logger.warn(
                `Evento omitido en match ${match.id}: No se pudo procesar el equipo externo ${event.team?.externalId}`,
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
            stored.push({ key: uniqueEventId, event })
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
        await this.redisService.redis.del(`match:details:v2:${match.id}`)

        if (isFinished) await this.markEventsFinalized(match.id)

        const lastEvent = apiEvents[apiEvents.length - 1]
        // En la tanda caen dos tiros por minuto: el bot del chat reacciona a
        // todos los eventos nuevos, no solo al último.
        const newEvents = findNewEvents(savedKeys, stored).map((s) =>
          toWireEvent(s.event),
        )

        await this.redisService.publish('match_updates', {
          matchId: match.id,
          type: 'EVENTS_UPDATED',
          payload: {
            count: apiEvents.length,
            lastEvent: lastEvent ? toWireEvent(lastEvent) : undefined,
            newEvents,
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
