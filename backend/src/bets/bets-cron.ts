import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { BetsService } from './bets.service'
import { RedisService } from 'src/redis/redis.service'
import { BetsGateway } from './bets.gateway'
import { FootballRefsService } from 'src/football/services/refs.service'

import { calculateMarketOdds } from './utils/odds.util'
import { MatchOutcome, resolveMatchOutcome } from './utils/match-outcome.util'
import {
  LOCK_MARKET_LUA_SCRIPT,
  RESCHEDULE_MARKET_LUA_SCRIPT,
} from './bets.scripts'

const DRAW_OPTION_NAME = 'Empate'
// El mercado automático cierra 5 minutos antes del inicio.
const CLOSE_BEFORE_KICKOFF_MS = 5 * 60 * 1000
// Estados en los que el partido todavía no empezó.
const NOT_STARTED_STATUSES = ['NS', 'TBD']
// Un mercado cerrado cuyo partido volvió a "no empezado" con el inicio más allá
// de este margen respecto del cierre se reprogramó: se trata como postergado.
const RESCHEDULED_AFTER_LOCK_MS = 60 * 60 * 1000

interface MarketTeamsMetadata {
  homeTeam?: { name?: string }
  awayTeam?: { name?: string }
}

/**
 * Escudo de un equipo en el mercado. Con ID de API-Football, ese ID: el front
 * usa su escudo local (`/escudos-api/<id>.webp`). Sin él (equipos dados de alta
 * desde otro proveedor), la URL de Cloudinary de `logo_url`. Sin ninguno,
 * undefined: la opción queda sin escudo.
 */
export function teamBadge(team: {
  api_team_id: number | null
  logo_url: string | null
}): string | undefined {
  if (team.api_team_id !== null) return String(team.api_team_id)
  return team.logo_url?.startsWith('https://') ? team.logo_url : undefined
}

@Injectable()
export class BetsCronService {
  private readonly logger = new Logger(BetsCronService.name)
  private readonly FOUR_HOURS = 4 * 60 * 60 * 1000

  constructor(
    private readonly prisma: PrismaService,
    private readonly betsService: BetsService,
    private readonly betsGateway: BetsGateway,
    private readonly redisService: RedisService,
    private readonly refs: FootballRefsService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleMarketAutoCreation() {
    this.logger.log(
      '=== [CRON] Buscando partidos para mercados de apuestas ===',
    )

    const now = new Date()
    const endWindow = new Date(now.getTime() + this.FOUR_HOURS)

    // Solo temporadas con apuestas activadas (RF-A13c) que además se
    // sincronizan: un partido que ningún cron actualiza nunca se liquidaría.
    const seasonsWithBets = await this.prisma.competitionSeason.findMany({
      where: { bets_enabled: true, sync_enabled: true },
      select: { league_id: true, season: true },
    })

    if (seasonsWithBets.length === 0) {
      this.logger.log('[CRON] Ninguna competición tiene apuestas activadas.')
      return
    }

    const upcomingMatches = await this.prisma.matches.findMany({
      where: {
        market_created: false,
        OR: seasonsWithBets.map((s) => ({
          league_id: s.league_id,
          season: s.season,
        })),
        date: {
          gte: now,
          lte: endWindow,
        },
        status_short: 'NS',
      },
      include: {
        home_team: true,
        away_team: true,
        league: { select: { name: true, short_name: true } },
      },
    })

    if (upcomingMatches.length === 0) {
      this.logger.log(
        '[CRON] No hay partidos próximos que requieran abrir mercados.',
      )
      return
    }

    // Un partido sin ID en el proveedor activo no recibe resultado: su mercado
    // quedaría cerrado para siempre con las monedas adentro.
    const externalIds = await this.refs.matchExternalIds(upcomingMatches)

    for (const match of upcomingMatches) {
      if (!externalIds.has(match.id)) {
        this.logger.warn(
          `[AUTO-MARKET] Partido ${match.id} sin ID en el proveedor: no se abre mercado`,
        )
        continue
      }
      try {
        this.logger.log(
          `[AUTO-MARKET] Generando pozo para: ${match.home_team.name} vs ${match.away_team.name}`,
        )

        const initialProbabilities = { home: 33, draw: 34, away: 33 }
        const closesAt = new Date(
          match.date.getTime() - CLOSE_BEFORE_KICKOFF_MS,
        )
        const competitionName = match.league.short_name ?? match.league.name

        const newMarketCreated = await this.prisma.$transaction(async (tx) => {
          const market = await tx.market.create({
            data: {
              title: `${match.home_team.name} vs ${match.away_team.name} - ${competitionName}`,
              type: 'MATCH',
              // Se liquida por matchId; fixtureId queda como dato histórico.
              matchId: match.id,
              fixtureId: match.api_fixture_id,
              isManual: false,
              status: 'OPEN',
              closesAt: closesAt,
              metadata: {
                homeTeam: {
                  name: match.home_team.name,
                  short:
                    match.home_team.short_code ||
                    match.home_team.name.substring(0, 3).toUpperCase(),
                  api_team_id: match.home_team.api_team_id,
                  logoUrl: teamBadge(match.home_team) ?? null,
                },
                awayTeam: {
                  name: match.away_team.name,
                  short:
                    match.away_team.short_code ||
                    match.away_team.name.substring(0, 3).toUpperCase(),
                  api_team_id: match.away_team.api_team_id,
                  logoUrl: teamBadge(match.away_team) ?? null,
                },
              },
              options: {
                create: [
                  {
                    name: match.home_team.name,
                    initialProb: initialProbabilities.home,
                    logoUrl: teamBadge(match.home_team),
                  },
                  {
                    name: DRAW_OPTION_NAME,
                    initialProb: initialProbabilities.draw,
                  },
                  {
                    name: match.away_team.name,
                    initialProb: initialProbabilities.away,
                    logoUrl: teamBadge(match.away_team),
                  },
                ],
              },
            },
            include: { options: true },
          })

          await tx.matches.update({
            where: { id: match.id },
            data: { market_created: true },
          })

          return market
        })

        const redis = this.redisService.redis
        const marketKey = `market:${newMarketCreated.id}`

        await redis.hset(
          marketKey,
          'status',
          'OPEN',
          'closesAt',
          closesAt.getTime().toString(),
        )

        for (const opt of newMarketCreated.options) {
          await redis.hset(marketKey, opt.id, '0')
        }

        // Si el cierre corrió entre el commit y el hset, la base ya no dice
        // OPEN: Redis tiene que reflejarlo para no aceptar apuestas.
        const fresh = await this.prisma.market.findUnique({
          where: { id: newMarketCreated.id },
          select: { status: true },
        })
        if (fresh && fresh.status !== 'OPEN') {
          await redis.hset(marketKey, 'status', fresh.status)
        }

        this.logger.log(
          `[AUTO-MARKET] Mercado creado exitosamente [partido ${match.id}]`,
        )

        this.betsGateway.emitMarketCreated(
          calculateMarketOdds(newMarketCreated),
        )
      } catch (error: any) {
        this.logger.error(
          `Error al crear mercado automático para el partido ID: ${match.id}`,
          error.stack,
        )
      }
    }
  }

  /**
   *  Cierre de la ventana pasando de OPEN a LOCKED (RF-A13). Un mercado nunca
   *  acepta apuestas con el partido empezado:
   *  - se cierra al llegar su hora de cierre (cualquier mercado);
   *  - un mercado automático se cierra en cuanto su partido deja de estar sin
   *    empezar (empezó, se postergó o se canceló), aunque falte para el cierre;
   *  - si el partido de un mercado automático se reprogramó, se recalcula el
   *    cierre (inicio - 5 minutos).
   *  Los mercados manuales no están atados a partidos: solo cierran por hora.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleMarketLocking() {
    const now = new Date()

    const [byTime, byMatchStarted] = await Promise.all([
      this.prisma.market.findMany({
        where: { status: 'OPEN', closesAt: { lte: now } },
        select: { id: true },
      }),
      this.prisma.market.findMany({
        where: {
          status: 'OPEN',
          isManual: false,
          match: { status_short: { notIn: NOT_STARTED_STATUSES } },
        },
        select: { id: true },
      }),
    ])

    const toLock = new Set([...byTime, ...byMatchStarted].map((m) => m.id))

    if (toLock.size > 0) {
      this.logger.log(
        `[CRON] Bloqueando ${toLock.size} mercados que entraron en juego`,
      )
    }

    // Un error en un mercado no puede dejar abiertos a los demás.
    for (const marketId of toLock) {
      try {
        await this.lockMarket(marketId)
      } catch (error) {
        this.logger.error(
          `Error al bloquear el mercado ${marketId}`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }

    await this.rescheduleOpenMarkets(now, toLock)
  }

  /**
   *  Cierra un mercado: primero Redis (corta las apuestas en el acto) y después
   *  la base con update condicional. Si la base falla, el mercado ya no acepta
   *  apuestas y el próximo ciclo completa el cierre.
   */
  private async lockMarket(marketId: string) {
    await this.redisService.redis.eval(
      LOCK_MARKET_LUA_SCRIPT,
      1,
      `market:${marketId}`,
    )

    // Condicional: si lo liquidaron entre la lectura y acá, no vuelve a LOCKED
    const { count } = await this.prisma.market.updateMany({
      where: { id: marketId, status: 'OPEN' },
      data: { status: 'LOCKED' },
    })

    if (count > 0) {
      this.betsGateway.emitMarketStatusChange(marketId, 'LOCKED')
    }
  }

  /**
   *  Si el partido de un mercado automático abierto cambió de fecha, el cierre
   *  pasa a ser inicio - 5 minutos. Si con la fecha nueva ya debería estar
   *  cerrado, se cierra.
   */
  private async rescheduleOpenMarkets(now: Date, alreadyLocked: Set<string>) {
    const openMarkets = await this.prisma.market.findMany({
      where: { status: 'OPEN', isManual: false, matchId: { not: null } },
      select: {
        id: true,
        closesAt: true,
        match: { select: { date: true } },
      },
    })

    for (const market of openMarkets) {
      if (!market.match || alreadyLocked.has(market.id)) continue

      const closesAt = new Date(
        market.match.date.getTime() - CLOSE_BEFORE_KICKOFF_MS,
      )
      if (closesAt.getTime() === market.closesAt.getTime()) continue

      try {
        if (closesAt <= now) {
          await this.lockMarket(market.id)
          continue
        }

        await this.redisService.redis.eval(
          RESCHEDULE_MARKET_LUA_SCRIPT,
          1,
          `market:${market.id}`,
          closesAt.getTime().toString(),
        )
        const { count } = await this.prisma.market.updateMany({
          where: { id: market.id, status: 'OPEN' },
          data: { closesAt },
        })

        if (count > 0) {
          this.logger.log(
            `[CRON] Mercado ${market.id} reprogramado: cierra ${closesAt.toISOString()}`,
          )
        }
      } catch (error) {
        this.logger.error(
          `Error al reprogramar el mercado ${market.id}`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }
  }

  /**
   *  Liquida los mercados automáticos con el resultado guardado en Matches
   *  (lo escribe LiveScoreCron al terminar el partido), sin llamar al proveedor.
   *  El partido se busca por matchId; los mercados viejos sin matchId, por
   *  fixtureId.
   */
  @Cron('0 */15 * * * *')
  async handleMarketSettlement() {
    this.logger.debug(
      '=== [CRON] Chequeando resultados de partidos finalizados ===',
    )

    const activeMarkets = await this.prisma.market.findMany({
      where: {
        status: 'LOCKED',
        isManual: false,
        OR: [{ matchId: { not: null } }, { fixtureId: { not: null } }],
      },
      include: { options: true },
    })

    if (activeMarkets.length === 0) return

    const matchIds = activeMarkets.flatMap((m) =>
      m.matchId ? [m.matchId] : [],
    )
    const fixtureIds = activeMarkets.flatMap((m) =>
      !m.matchId && m.fixtureId !== null ? [m.fixtureId] : [],
    )

    const matches = await this.prisma.matches.findMany({
      where: {
        OR: [{ id: { in: matchIds } }, { api_fixture_id: { in: fixtureIds } }],
      },
      select: {
        id: true,
        api_fixture_id: true,
        date: true,
        status_short: true,
        home_goals: true,
        away_goals: true,
        home_team: { select: { name: true } },
        away_team: { select: { name: true } },
      },
    })
    const matchesById = new Map(matches.map((m) => [m.id, m]))
    const matchesByFixture = new Map(matches.map((m) => [m.api_fixture_id, m]))

    for (const market of activeMarkets) {
      try {
        const match = market.matchId
          ? matchesById.get(market.matchId)
          : matchesByFixture.get(market.fixtureId)

        if (!match) {
          this.logger.warn(
            `[SETTLEMENT] No se encontró el partido ${market.matchId ?? market.fixtureId} del mercado ${market.id}`,
          )
          continue
        }

        // Partido reprogramado después de cerrar el mercado (por ejemplo, un
        // PST que volvió a NS con fecha nueva antes de este ciclo): se trata
        // como postergado y se reembolsa, en vez de dejar las monedas
        // retenidas hasta la nueva fecha.
        const rescheduledAfterLock =
          NOT_STARTED_STATUSES.includes(match.status_short) &&
          match.date.getTime() >
            market.closesAt.getTime() + RESCHEDULED_AFTER_LOCK_MS

        const outcome = rescheduledAfterLock
          ? 'VOID'
          : resolveMatchOutcome(
              match.status_short,
              match.home_goals,
              match.away_goals,
            )

        if (!outcome) continue

        if (outcome === 'VOID') {
          this.logger.warn(
            `Partido ${market.title} quedó en ${match.status_short}. Ejecutando REEMBOLSO masivo`,
          )
          await this.betsService.settleMarket(market.id, {
            status: 'REFUNDED',
          })
          continue
        }

        const winnerName = this.getWinningOptionName(
          outcome,
          market.metadata,
          match,
        )
        const winningOption = market.options.find(
          (opt) => opt.name === winnerName,
        )

        if (!winningOption) {
          this.logger.error(
            `[SETTLEMENT] El mercado ${market.id} no tiene la opción "${winnerName}". Queda LOCKED para revisión manual`,
          )
          continue
        }

        this.logger.log(
          `Liquidando mercado ${market.title}. Ganador: ${winnerName}`,
        )

        await this.betsService.settleMarket(market.id, {
          status: 'SETTLED',
          winningOptionId: winningOption.id,
        })
      } catch (error) {
        this.logger.error(
          `Error al liquidar el mercado ${market.id}`,
          error instanceof Error ? error.stack : String(error),
        )
      }
    }
  }

  /**
   *  Las opciones se llaman como los equipos al crear el mercado: se usa el
   *  snapshot de metadata y, si falta, el nombre actual del equipo.
   */
  private getWinningOptionName(
    outcome: Exclude<MatchOutcome, 'VOID'>,
    metadata: Prisma.JsonValue,
    match: { home_team: { name: string }; away_team: { name: string } },
  ) {
    if (outcome === 'DRAW') return DRAW_OPTION_NAME

    const teams = metadata as MarketTeamsMetadata | null

    if (outcome === 'HOME') {
      return teams?.homeTeam?.name ?? match.home_team.name
    }
    return teams?.awayTeam?.name ?? match.away_team.name
  }
}
