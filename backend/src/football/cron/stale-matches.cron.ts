import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { MatchStatus, Prisma } from '@prisma/client'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

import { FootballDataProvider } from '../football-data.provider'
import { MATCH_FINISHED_EVENT, MatchFinishedEvent } from '../football.events'
import {
  isFinishedWithoutScore,
  toMatchResultUpdate,
} from '../mappers/fixture-update'
import { leagueCacheKey } from '../mappers/round'
import { FootballRefsService } from '../services/refs.service'

// Un partido dura menos que esto (con alargue y penales): pasado ese tiempo
// desde el inicio, si sigue sin terminar en la base, quedó congelado.
const GRACE_MS = 3 * 60 * 60 * 1000
// Más atrás que esto no se corrige solo: una consulta tan ancha sale cara.
// Para fechas viejas está scripts/resync-stale-fixtures.ts.
const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000
// Cada competición se consulta como mucho una vez en este plazo.
const COOLDOWN_SECONDS = 30 * 60
const MAX_STALE_PER_RUN = 200
// Un partido suspendido que nunca se reanuda en la base también cuenta como
// congelado: si después se juega, hay que poder recuperarlo.
const STALE_STATUSES: MatchStatus[] = ['SCHEDULED', 'LIVE', 'SUSPENDED']

const STALE_SELECT = {
  id: true,
  date: true,
  round: true,
  season: true,
  status: true,
  status_short: true,
  league_id: true,
  league: { select: { id: true, name: true, api_league_id: true } },
  home_team: { select: { name: true } },
  away_team: { select: { name: true } },
  markets: { select: { status: true } },
} satisfies Prisma.MatchesSelect

type StaleMatch = Prisma.MatchesGetPayload<{ select: typeof STALE_SELECT }>

const day = (d: Date) => d.toISOString().slice(0, 10)

/**
 * Corrige los partidos que quedaron en SCHEDULED/LIVE después de jugarse.
 *
 * El sync del fixture solo mira una ventana de días (10 hacia atrás en la
 * Liga): si el servidor estuvo apagado, o en medio de un cambio de proveedor,
 * los partidos jugados fuera de ella se quedaban sin resultado para siempre.
 * Cada 10 minutos busca esos partidos, le pide al proveedor solo el rango que
 * los cubre y actualiza estado y resultado, igual que el sync del fixture.
 */
@Injectable()
export class StaleMatchesCron {
  private readonly logger = new Logger(StaleMatchesCron.name)
  // Partidos que el proveedor tampoco da por terminados: se avisa una vez.
  private readonly warnedUnresolved = new Set<string>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
    private readonly redis: RedisService,
    private readonly refs: FootballRefsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/10 * * * *')
  async handle() {
    try {
      const now = Date.now()
      const stale = await this.prisma.matches.findMany({
        where: {
          status: { in: STALE_STATUSES },
          date: {
            lt: new Date(now - GRACE_MS),
            gte: new Date(now - LOOKBACK_MS),
          },
        },
        select: STALE_SELECT,
        orderBy: { date: 'asc' },
        take: MAX_STALE_PER_RUN,
      })
      if (stale.length === 0) return

      // Solo las competiciones que se sincronizan: una apagada (la Copa antes
      // de activarla) no tiene por qué estar al día.
      const enabled = await this.prisma.competitionSeason.findMany({
        where: { sync_enabled: true },
        select: { league_id: true, season: true },
      })
      const enabledKeys = new Set(
        enabled.map((s) => `${s.league_id}:${s.season}`),
      )

      const groups = new Map<string, StaleMatch[]>()
      for (const match of stale) {
        const key = `${match.league_id}:${match.season}`
        if (!enabledKeys.has(key)) continue
        groups.set(key, [...(groups.get(key) ?? []), match])
      }

      // Un error en una competición no deja sin corregir a las demás.
      for (const [key, matches] of groups) {
        try {
          await this.fixGroup(key, matches)
        } catch (error) {
          this.logger.error(
            `Error corrigiendo partidos congelados (${key}): ${error instanceof Error ? error.message : String(error)}`,
          )
          // Un fallo del proveedor no deja la competición 30 minutos sin reintentar.
          await this.redis.redis
            .del(`stale-matches:${key}`)
            .catch(() => undefined)
        }
      }
    } catch (error) {
      this.logger.error(
        `Error en StaleMatchesCron: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async fixGroup(key: string, matches: StaleMatch[]) {
    // Reclamo en Redis: dos corridas, o dos instancias, no piden lo mismo ni
    // se vuelve a consultar una competición sin novedades antes del plazo.
    const claimed = await this.redis.redis.set(
      `stale-matches:${key}`,
      '1',
      'EX',
      COOLDOWN_SECONDS,
      'NX',
    )
    if (claimed === null) return

    const { league } = matches[0]
    const season = matches[0].season
    const leagueExternalId = await this.refs.leagueExternalId(league)
    if (leagueExternalId === null) {
      this.logger.warn(
        `Hay ${matches.length} partidos congelados de ${league.name} ${season} pero la liga no tiene ID en ${this.refs.providerName}.`,
      )
      return
    }

    const first = matches[0].date.getTime()
    const last = matches[matches.length - 1].date.getTime()
    const fixtures = await this.provider.getFixtures({
      leagueExternalId,
      season,
      from: day(new Date(first - 86_400_000)),
      to: day(new Date(last + 86_400_000)),
      includeDetails: false,
    })

    const byId = new Map(matches.map((m) => [m.id, m]))
    const resolved = new Set<string>()
    let finished = 0

    for (const fixture of fixtures) {
      const matchId = await this.refs.findInternalId(
        'MATCH',
        fixture.externalId,
      )
      const match = matchId ? byId.get(matchId) : undefined
      if (!match) continue

      // Terminado sin marcador: guardarlo sería 0-0 y las apuestas se
      // liquidarían como empate. No se toca hasta que el proveedor lo informe.
      if (isFinishedWithoutScore(fixture)) {
        this.warnOnce(
          match,
          'el proveedor lo da por terminado pero sin marcador; no se corrige para no liquidar apuestas con un 0-0 falso',
        )
        continue
      }

      const update = toMatchResultUpdate(fixture)
      // Sigue igual en el proveedor (postergado, o todavía sin dato): se avisa abajo.
      if (
        update.status === match.status &&
        update.status_short === match.status_short
      ) {
        continue
      }

      // Condicional: si el cron en vivo lo cambió mientras tanto, no se pisa.
      const written = await this.prisma.matches.updateMany({
        where: { id: match.id, status: { in: STALE_STATUSES } },
        data: update,
      })
      if (written.count === 0) continue

      resolved.add(match.id)
      await this.redis.redis.del(`match:details:v2:${match.id}`)
      if (update.status === 'FINISHED') finished++

      const openMarkets = match.markets.filter(
        (m) => m.status === 'OPEN' || m.status === 'LOCKED',
      ).length
      this.logger.log(
        `[CONGELADO] Corregido: ${match.home_team.name} ${update.home_goals}-${update.away_goals} ${match.away_team.name} (${match.round}, ${day(match.date)}) ${match.status_short}→${update.status_short}` +
          (openMarkets > 0
            ? `; tiene ${openMarkets} mercado(s) abierto(s) que el cron de apuestas va a liquidar`
            : ''),
      )
    }

    for (const match of matches) {
      if (resolved.has(match.id)) continue
      this.warnOnce(
        match,
        `sigue en ${match.status_short} y el proveedor no lo da por terminado (¿postergado o sin vincular?)`,
      )
    }

    if (resolved.size === 0) return

    await this.clearFixturesCache(league, season)
    if (finished > 0) {
      // Igual que un final visto en vivo: recalcula la tabla y el cuadro.
      const event: MatchFinishedEvent = {
        leagueId: leagueCacheKey(league),
        leagueDbId: league.id,
        season,
      }
      this.eventEmitter.emit(MATCH_FINISHED_EVENT, event)
    }
  }

  /** Un aviso por partido (y por proceso) de por qué no se pudo corregir. */
  private warnOnce(match: StaleMatch, reason: string) {
    if (this.warnedUnresolved.has(match.id)) return
    this.warnedUnresolved.add(match.id)
    this.logger.warn(
      `[CONGELADO] ${match.home_team.name} vs ${match.away_team.name} (${match.round}, ${day(match.date)}): ${reason}.`,
    )
  }

  /** Borra las fechas cacheadas del fixture de la competición (SCAN, nunca KEYS). */
  private async clearFixturesCache(
    league: { id: string; api_league_id: number | null },
    season: number,
  ) {
    const pattern = `fixtures:${leagueCacheKey(league)}:${season}:*`
    let cursor = '0'
    const keys: string[] = []
    do {
      const [next, found] = await this.redis.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        200,
      )
      cursor = next
      keys.push(...found)
    } while (cursor !== '0')
    if (keys.length > 0) await this.redis.redis.del(...keys)
  }
}
