import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { Cron, CronExpression } from '@nestjs/schedule'

@Injectable()
export class PrematchTrackerService {
  private readonly logger = new Logger(PrematchTrackerService.name)
  private readonly MINUTES_BEFORE = 30

  constructor(private readonly prisma: PrismaService) { }

  @Cron(CronExpression.EVERY_MINUTE)
  async trackUpcomingMatches() {
    const now = new Date()

    const startWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const endWindow = new Date(now.getTime() + this.MINUTES_BEFORE * 60 * 1000)

    const matches = await this.prisma.matches.findMany({
      where: {
        tracked: false,
        // is_live_finished: false,
        date: {
          // gte: startWindow,
          lte: endWindow,
        },

        status_short: {
          in: ['NS', '1H', 'HT', '2H', 'ET', 'P', 'BT', 'FT', 'AET', 'PEN'],
        },
      },
      include: {
        home_team: true,
        away_team: true,
      },
    })

    if (matches.length === 0) return

    const ids = matches.map((m) => m.id)

    await this.prisma.matches.updateMany({
      where: { id: { in: ids } },
      data: {
        tracked: true,
      },
    })

    const matchDetails = matches
      .map(
        (m) =>
          `${m.home_team.name} vs ${m.away_team.name} (ID: ${m.api_fixture_id})`,
      )
      .join(' | ')

    this.logger.log(`Se marcaron ${matches.length} partidos: ${matchDetails}`)
  }
}
