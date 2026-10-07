import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { ApiFootballHttp } from '../http/api-football.http'
import { ApiFootballResponse } from '../interfaces/types'
import { upsertMatchStats } from '../upserts/upsert-stats'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'

@Injectable()
export class StatsSyncCron {
  private readonly logger = new Logger(StatsSyncCron.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ApiFootballHttp,
    private readonly redisService: RedisService,
  ) {}

  @Cron('*/3 * * * *') // 3 min
  async fetchStats() {
    const now = new Date()
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60000)

    const halfHourFromNow = new Date(now.getTime() + 30 * 60000)

    const matchesToSync = await this.prisma.matches.findMany({
      where: {
        tracked: true,
        stats_finalized: false,
        date: {
          gte: threeHoursAgo,
          lte: halfHourFromNow,
        },
        status_short: {
          in: ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'FT', 'AET', 'PEN'],
        },
      },
      take: 10,
      orderBy: { date: 'desc' },
    })

    if (matchesToSync.length === 0) return

    for (const match of matchesToSync) {
      try {
        const res = await this.http.get<ApiFootballResponse<any[]>>(
          '/fixtures/statistics',
          { fixture: match.api_fixture_id },
        )
        const apiResponse = res.data.response
        if (!apiResponse || apiResponse.length === 0) continue

        const dbStats = await this.prisma.stats_team_match.findMany({
          where: { match_id: match.id },
        })

        const newStatsProcessed = this.mapApiStatsToInternal(apiResponse)
        const currentDbData = dbStats.map((s) => s.data)

        // Comparamos si cambió algo para no saturar el Socket ni Redis
        const hasChanged =
          JSON.stringify(currentDbData) !==
          JSON.stringify(newStatsProcessed.map((s) => s.statistics))

        if (hasChanged || dbStats.length === 0) {
          await upsertMatchStats(this.prisma, match.id, apiResponse)

          await this.redisService.redis.del(`match:details:v1:${match.id}`)

          await this.redisService.publish('match_updates', {
            matchId: match.id,
            type: 'STATS_UPDATED',
            payload: newStatsProcessed,
          })
        }

        const isFinished = ['FT', 'AET', 'PEN'].includes(match.status_short)

        if (isFinished) {
          await this.prisma.matches.update({
            where: { id: match.id },
            data: {
              stats_fetched: true,
              stats_finalized: true,
            },
          })
          this.logger.log(
            `📊 Stats de Match ${match.api_fixture_id} FINALIZADAS.`,
          )
        }
      } catch (error) {
        this.logger.error(
          `Error procesando stats match ${match.id}: ${error.message}`,
        )
      }
    }
  }

  private mapApiStatsToInternal(apiResponse: any[]) {
    return apiResponse.map((item) => ({
      teamId: item.team.id,
      teamName: item.team.name,
      teamLogo: item.team.logo,
      statistics: item.statistics.reduce((acc: any, stat: any) => {
        if (stat.type) {
          const key = stat.type.toLowerCase().replace(/\s+/g, '_')
          acc[key] = stat.value
        }
        return acc
      }, {}),
    }))
  }
}
