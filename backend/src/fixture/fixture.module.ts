import { Module } from '@nestjs/common'
import { FixtureController } from './fixture.controller'
import { FixtureService } from './fixture.service'

import { FixtureLeagueGateway } from './fixture.gateway'

@Module({
  controllers: [FixtureController],
  providers: [FixtureService, FixtureLeagueGateway],
})
export class FixtureModule { }
