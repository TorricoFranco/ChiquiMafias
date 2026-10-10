import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { BetsService } from './bets.service'
import { RedisService } from 'src/redis/redis.service'
import { BetsGateway } from './bets.gateway'

import { calculateMarketOdds } from './utils/odds.util'
import { MatchOutcome, resolveMatchOutcome } from './utils/match-outcome.util'

const DRAW_OPTION_NAME = 'Empate'

interface MarketTeamsMetadata {
  homeTeam?: { name?: string }
  awayTeam?: { name?: string }
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
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleMarketAutoCreation() {
    this.logger.log(
      '=== [CRON] Buscando partidos para mercados de apuestas ===',
    )

    const now = new Date()
    const endWindow = new Date(now.getTime() + this.FOUR_HOURS)

    const upcomingMatches = await this.prisma.matches.findMany({
      where: {
        market_created: false,
        date: {
          gte: now,
          lte: endWindow,
        },
        status_short: 'NS',
      },
      include: {
        home_team: true,
        away_team: true,
      },
    })

    if (upcomingMatches.length === 0) {
      this.logger.log(
        '[CRON] No hay partidos próximos que requieran abrir mercados.',
      )
      return
    }

    for (const match of upcomingMatches) {
      try {
        this.logger.log(
          `[AUTO-MARKET] Generando pozo para: ${match.home_team.name} vs ${match.away_team.name}`,
        )

        const initialProbabilities = { home: 33, draw: 34, away: 33 }
        const closesAt = new Date(match.date.getTime() - 5 * 60 * 1000)

        const newMarketCreated = await this.prisma.$transaction(async (tx) => {
          const market = await tx.market.create({
            data: {
              title: `${match.home_team.name} vs ${match.away_team.name} - Torneo Argentino`,
              type: 'MATCH',
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
                  logoUrl: `${match.home_team.api_team_id}`,
                },
                awayTeam: {
                  name: match.away_team.name,
                  short:
                    match.away_team.short_code ||
                    match.away_team.name.substring(0, 3).toUpperCase(),
                  api_team_id: match.away_team.api_team_id,
                  logoUrl: `${match.away_team.api_team_id}`,
                },
              },
              options: {
                create: [
                  {
                    name: match.home_team.name,
                    initialProb: initialProbabilities.home,
                  },
                  {
                    name: DRAW_OPTION_NAME,
                    initialProb: initialProbabilities.draw,
                  },
                  {
                    name: match.away_team.name,
                    initialProb: initialProbabilities.away,
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

        this.logger.log(
          `[AUTO-MARKET] Mercado creado exitosamente [ID API: ${match.api_fixture_id}]`,
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
   *  Cierre de la ventana pasando de OPEN a LOCKED.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleMarketLocking() {
    const now = new Date()

    const marketsToLock = await this.prisma.market.findMany({
      where: {
        status: 'OPEN',
        closesAt: { lte: now },
      },
      select: { id: true },
    })

    if (marketsToLock.length === 0) return

    this.logger.log(
      `[CRON] Bloqueando ${marketsToLock.length} mercados que entraron en juego`,
    )

    for (const market of marketsToLock) {
      // Condicional: si lo liquidaron entre la lectura y acá, no vuelve a LOCKED
      const { count } = await this.prisma.market.updateMany({
        where: { id: market.id, status: 'OPEN' },
        data: { status: 'LOCKED' },
      })

      if (count > 0) {
        this.betsGateway.emitMarketStatusChange(market.id, 'LOCKED')
      }
    }
  }

  /**
   *  Liquida los mercados automáticos con el resultado guardado en Matches
   *  (lo escribe LiveScoreCron al terminar el partido), sin llamar a API-Football.
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
        fixtureId: { not: null },
      },
      include: { options: true },
    })

    if (activeMarkets.length === 0) return

    const matches = await this.prisma.matches.findMany({
      where: {
        api_fixture_id: { in: activeMarkets.map((m) => m.fixtureId!) },
      },
      select: {
        api_fixture_id: true,
        status_short: true,
        home_goals: true,
        away_goals: true,
        home_team: { select: { name: true } },
        away_team: { select: { name: true } },
      },
    })
    const matchesByFixture = new Map(matches.map((m) => [m.api_fixture_id, m]))

    for (const market of activeMarkets) {
      try {
        const match = matchesByFixture.get(market.fixtureId!)

        if (!match) {
          this.logger.warn(
            `[SETTLEMENT] No se encontró el partido ${market.fixtureId} del mercado ${market.id}`,
          )
          continue
        }

        const outcome = resolveMatchOutcome(
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
