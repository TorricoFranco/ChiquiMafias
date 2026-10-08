import { Module } from '@nestjs/common'
import { ApiFootballHttp } from './http/api-football.http'
// import { ApiFootballFixturesService } from './services/fixtures.service'
import { ApiFootballFixturesController } from './controllers/api-football.controller'
import { ApiFootballStandingsService } from './services/standings.service'
import { ApiFootballLeagueService } from './services/league.service'
import { ApiFootbalTeamsService } from './services/teams.service'

// SERVICES
import { PrematchServiceApi } from './services/prematch.api'

// CRONS
import { LineupsFetchCron } from './cron/lineups-fetch.cron'
import { PrematchTrackerService } from './cron/prematch-tracker.cron'
import { FixturesSyncCron } from './cron/fixtures-sync.cron'
import { EventsFetchCron } from './cron/events-fetch.cron'
import { StatsSyncCron } from './cron/stats-sync.cron'
import { LiveScoreCron } from './cron/liveScoreCron'
import { StandingCron } from './cron/standings.cron'

// IMPORTS
import { StandingsModule } from 'src/standings/standings.module'

@Module({
  controllers: [ApiFootballFixturesController],
  providers: [
    ApiFootballHttp,
    // ApiFootballFixturesService,
    ApiFootballStandingsService,
    ApiFootballLeagueService,
    ApiFootbalTeamsService,
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
    // ApiFootballFixturesService,
    ApiFootballStandingsService,
    ApiFootballLeagueService,
    ApiFootbalTeamsService,
    PrematchServiceApi,
  ],

  imports: [StandingsModule],
})
export class ApiFootballModule {}
