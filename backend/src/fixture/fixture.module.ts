import { Module } from '@nestjs/common'
import { FixtureController } from './fixture.controller'
import { FixtureService } from './fixture.service'

import { FixtureLeagueGateway } from './fixture.gateway'
import { CompetitionsModule } from 'src/competitions/competitions.module'
import { StandingsModule } from 'src/standings/standings.module'

@Module({
  imports: [CompetitionsModule, StandingsModule],
  controllers: [FixtureController],
  providers: [FixtureService, FixtureLeagueGateway],
  exports: [FixtureService],
})
export class FixtureModule {}
