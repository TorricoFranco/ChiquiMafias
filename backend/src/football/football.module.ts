import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EnvironmentVariables } from 'src/config/interfaces/env.interface'
import { StandingsModule } from 'src/standings/standings.module'

import { FootballDataProvider } from './football-data.provider'
import { ApiFootballHttp } from './providers/api-football/api-football.http'
import { ApiFootballProvider } from './providers/api-football/api-football.provider'
import { HighlightlyHttp } from './providers/highlightly/highlightly.http'
import { HighlightlyProvider } from './providers/highlightly/highlightly.provider'

import { FootballAdminController } from './controllers/football-admin.controller'
import { FootballStandingsService } from './services/standings.service'
import { FootballLeagueService } from './services/league.service'
import { FootballTeamsService } from './services/teams.service'
import { PrematchServiceApi } from './services/prematch.api'
import { FootballRefsService } from './services/refs.service'

import { LineupsFetchCron } from './cron/lineups-fetch.cron'
import { PrematchTrackerService } from './cron/prematch-tracker.cron'
import { FixturesSyncCron } from './cron/fixtures-sync.cron'
import { EventsFetchCron } from './cron/events-fetch.cron'
import { StatsSyncCron } from './cron/stats-sync.cron'
import { LiveScoreCron } from './cron/liveScoreCron'
import { StandingCron } from './cron/standings.cron'
import { StaleMatchesCron } from './cron/stale-matches.cron'

/**
 * Elige el proveedor de datos según `FOOTBALL_PROVIDER`. Es el único lugar que
 * conoce las implementaciones concretas: el resto inyecta `FootballDataProvider`.
 */
export function createFootballProvider(
  config: ConfigService<EnvironmentVariables>,
  apiFootballHttp: ApiFootballHttp,
  highlightlyHttp: HighlightlyHttp,
): FootballDataProvider {
  const name =
    config.get('FOOTBALL_PROVIDER', { infer: true }) ?? 'api-football'

  switch (name) {
    case 'api-football':
      return new ApiFootballProvider(apiFootballHttp)
    case 'highlightly':
      return new HighlightlyProvider(highlightlyHttp)
    default:
      throw new Error(
        `FOOTBALL_PROVIDER="${String(name)}" no es un proveedor conocido. Usá "api-football" o "highlightly".`,
      )
  }
}

@Module({
  controllers: [FootballAdminController],
  providers: [
    ApiFootballHttp,
    HighlightlyHttp,
    {
      provide: FootballDataProvider,
      inject: [ConfigService, ApiFootballHttp, HighlightlyHttp],
      useFactory: createFootballProvider,
    },
    FootballStandingsService,
    FootballLeagueService,
    FootballTeamsService,
    PrematchServiceApi,
    FootballRefsService,
    // CRONS
    LineupsFetchCron,
    PrematchTrackerService,
    FixturesSyncCron,
    EventsFetchCron,
    StatsSyncCron,
    LiveScoreCron,
    StandingCron,
    StaleMatchesCron,
  ],
  exports: [
    FootballDataProvider,
    FootballStandingsService,
    FootballLeagueService,
    FootballTeamsService,
    PrematchServiceApi,
    FootballRefsService,
  ],
  imports: [StandingsModule],
})
export class FootballModule {}
