import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ApiFootballHttp } from '../http/api-football.http'

import { PrismaService } from 'src/prisma/prisma.service'
import { RedisService } from 'src/redis/redis.service'
import { StandingsService } from 'src/standings/standings.service'

import { ApiFootballResponse } from '../interfaces/types'
import { ApiFootballStandingsResponse } from '../interfaces/apiStandings'

import { mapApiGroupToStage } from '../mappers/mapApiGroupStage'
import { upsertTeam } from '../upserts/upsert-team'
import { upsertTeamSeasonStats } from '../upserts/upsert-teamSeasonStats'
import { OnEvent } from '@nestjs/event-emitter'

@Injectable()
export class StandingCron {
  private readonly logger = new Logger(StandingCron.name)
  private readonly LEAGUE_API_ID = 128
  private readonly SEASON = 2026

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ApiFootballHttp,
    private readonly redis: RedisService,
    private readonly standings: StandingsService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetchStandings() {
    await this.syncStandings()
  }

  @OnEvent('match.finished')
  async handleMatchFinished(payload: { leagueId: number; season: number }) {
    this.logger.log(
      `Evento recibido: Partido terminado. Actualizando Standings de liga ${payload.leagueId}`,
    )

    setTimeout(async () => {
      await this.syncStandings()
    }, 60000)
  }

  private async syncStandings() {
    try {
      const res = await this.http.get<
        ApiFootballResponse<ApiFootballStandingsResponse>
      >('/standings', {
        league: this.LEAGUE_API_ID,
        season: this.SEASON,
      })

      const leagueDb = await this.prisma.leagues.findFirst({
        where: { api_league_id: this.LEAGUE_API_ID },
      })

      if (!leagueDb) return

      const allStandings = res.data.response[0].league.standings

      for (const standingsArray of allStandings) {
        for (const s of standingsArray) {
          const team = await upsertTeam(this.prisma, s.team)

          if (!team) {
            this.logger.warn(
              `No se pudo upsertar el equipo ${s.team.id} - ${s.team.name}`,
            )
            continue
          }

          const { stage, groupName } = mapApiGroupToStage(s.group)

          await upsertTeamSeasonStats(
            this.prisma,
            {
              leagueId: leagueDb.id,
              season: this.SEASON,
              stage: stage,
              teamId: team.id,
            },
            s,
            groupName,
          )
        }
      }

      const cacheKey = `standings:${leagueDb.id}:${this.SEASON}`

      const fullStandings = await this.standings.calculateFullStandings(
        leagueDb.id,
        this.SEASON,
      )

      await this.redis.redis.set(
        cacheKey,
        JSON.stringify(fullStandings),
        'EX',
        3600,
      )
      this.logger.log('✅ Standings actualizados y caché limpia')
    } catch (error) {
      this.logger.error(`❌ Error StandingCron: ${error.message}`)
    }
  }
}
