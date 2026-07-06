import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { BetsService } from './bets.service'
import { BetsGateway } from './bets.gateway'

@Injectable()
export class BetsCronService {
  private readonly logger = new Logger(BetsCronService.name)
  private readonly FOUR_HOURS = 4 * 60 * 60 * 1000

  constructor(
    private readonly prisma: PrismaService,
    private readonly betsService: BetsService,
    private readonly betsGateway: BetsGateway,
  ) { }

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

        const initialProbabilities = { home: 40, draw: 30, away: 30 }
        const closesAt = new Date(match.date.getTime() - 5 * 60 * 1000)

        // Capturamos el mercado creado desde la transacción
        const newMarketCreated = await this.prisma.$transaction(async (tx) => {
          const market = await tx.market.create({
            data: {
              title: `${match.home_team.name} vs ${match.away_team.name} - Torneo Argentino`,
              fixtureId: match.api_fixture_id,
              isManual: false,
              status: 'OPEN',
              closesAt: closesAt,
              options: {
                create: [
                  {
                    name: match.home_team.name,
                    initialProb: initialProbabilities.home,
                  },
                  { name: 'Empate', initialProb: initialProbabilities.draw },
                  {
                    name: match.away_team.name,
                    initialProb: initialProbabilities.away,
                  },
                ],
              },
            },
            include: { options: true }, // 👈 CLAVE: Incluir las opciones para mandarlas completas al front
          })

          await tx.matches.update({
            where: { id: match.id },
            data: { market_created: true },
          })

          return market
        })

        this.logger.log(
          `[AUTO-MARKET] Mercado creado exitosamente [ID API: ${match.api_fixture_id}]`,
        )

        // 🔥 AVISO POR WEBSOCKET (Fuera de la tx): Aparece la tarjeta nueva en la Home de todos al instante
        this.betsGateway.emitMarketCreated(newMarketCreated)
      } catch (error: any) {
        this.logger.error(
          `Error al crear mercado automático para el partido ID: ${match.id}`,
          error.stack,
        )
      }
    }
  }

  /**
   * 🔒 CRON 2: Cierra la ventana pasando de OPEN a LOCKED.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleMarketLocking() {
    const now = new Date()

    const marketsToLock = await this.prisma.market.findMany({
      where: {
        status: 'OPEN',
        closesAt: { lte: now },
      },
    })

    if (marketsToLock.length > 0) {
      this.logger.log(
        `[CRON] Bloqueando ${marketsToLock.length} mercados que entraron en juego`,
      )

      // Ejecutamos el update en bloque en la BD
      await this.prisma.market.updateMany({
        where: { id: { in: marketsToLock.map((m) => m.id) } },
        data: { status: 'LOCKED' },
      })

      // 🔥 AVISO POR WEBSOCKET: Recorremos los que bloqueamos y les metemos el candado en el Front
      for (const market of marketsToLock) {
        this.betsGateway.emitMarketStatusChange(market.id, 'LOCKED')
      }
    }
  }

  /**
   * 🧠 CRON 3: Chequea partidos jugados para pagarles a los usuarios.
   */
  @Cron('0 */15 * * * *')
  async handleMarketSettlement() {
    this.logger.log(
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

    for (const market of activeMarkets) {
      const matchStatusFromApi: string = 'FT'
      const winnerName = 'Boca'

      // CASO DE FALLO A (BR-06): Partido suspendido/cancelado
      if (matchStatusFromApi === 'SUSP' || matchStatusFromApi === 'CANX') {
        this.logger.warn(
          `Partido ${market.title} suspendido por la API. Ejecutando REEMBOLSO masivo`,
        )
        // 🚨 OJO ACÁ: No llamamos al Gateway desde el Cron directamente
        await this.betsService.settleMarket(market.id, { status: 'REFUNDED' })
        continue
      }

      if (matchStatusFromApi === 'FT') {
        const winningOption = market.options.find(
          (opt) => opt.name === winnerName,
        )

        if (winningOption) {
          this.logger.log(
            `Liquidando mercado ${market.title}. Ganador: ${winnerName}`,
          )

          // 🚨 OJO ACÁ: Tampoco llamamos al Gateway desde el Cron directamente
          await this.betsService.settleMarket(market.id, {
            status: 'SETTLED',
            winningOptionId: winningOption.id,
          })
        }
      }
    }
  }
}
