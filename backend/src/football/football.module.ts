import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { StandingsModule } from 'src/standings/standings.module'

import { FootballDataProvider } from './football-data.provider'
import { ApiFootballHttp } from './providers/api-football/api-football.http'
import { ApiFootballProvider } from './providers/api-football/api-football.provider'

import { FootballAdminController } from './controllers/football-admin.controller'
import { FootballStandingsService } from './services/standings.service'
import { FootballLeagueService } from './services/league.service'
import { FootballTeamsService } from './services/teams.service'
import { PrematchServiceApi } from './services/prematch.api'

import { LineupsFetchCron } from './cron/lineups-fetch.cron'
import { PrematchTrackerService } from './cron/prematch-tracker.cron'
import { FixturesSyncCron } from './cron/fixtures-sync.cron'
import { EventsFetchCron } from './cron/events-fetch.cron'
import { StatsSyncCron } from './cron/stats-sync.cron'
import { LiveScoreCron } from './cron/liveScoreCron'
import { StandingCron } from './cron/standings.cron'

/**
 * Elige el proveedor de datos según `FOOTBALL_PROVIDER`. Es el único lugar que
 * conoce las implementaciones concretas: el resto inyecta `FootballDataProvider`.
 */
export function createFootballProvider(
  config: ConfigService<EnvironmentVariables>,
  apiFootballHttp: ApiFootballHttp,
): FootballDataProvider {
  const name =
    config.get('FOOTBALL_PROVIDER', { infer: true }) ?? 'api-football'

  switch (name) {
    case 'api-football':
      return new ApiFootballProvider(apiFootballHttp)
    default:
      throw new Error(
        `FOOTBALL_PROVIDER="${name}" todavía no tiene implementación. Usá "api-football".`,
      )
  }
}

@Module({
  controllers: [FootballAdminController],
  providers: [
    ApiFootballHttp,
    {
      provide: FootballDataProvider,
      inject: [ConfigService, ApiFootballHttp],
      useFactory: createFootballProvider,
    },
    FootballStandingsService,
    FootballLeagueService,
    FootballTeamsService,
    PrematchServiceApi,
    // CRONS
    LineupsFetchCron,
    PrematchTrackerService,
    FixturesSyncCron,
    EventsFetchCron,
    StatsSyncCron,
    LiveScoreCron,
    StandingCron,
  ],
  exports: [
    FootballDataProvider,
    FootballStandingsService,
    FootballLeagueService,
    FootballTeamsService,
    PrematchServiceApi,
  ],
  imports: [StandingsModule],
})
export class FootballModule {}
