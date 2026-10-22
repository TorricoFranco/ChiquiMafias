import { Module } from '@nestjs/common'
import { FixtureController } from './fixture.controller'
import { FixtureService } from './fixture.service'

import { FixtureLeagueGateway } from './fixture.gateway'
import { CompetitionsModule } from 'src/competitions/competitions.module'

@Module({
  imports: [CompetitionsModule],
  controllers: [FixtureController],
  providers: [FixtureService, FixtureLeagueGateway],
  exports: [FixtureService],
})
export class FixtureModule {}
