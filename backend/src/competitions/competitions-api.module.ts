import { Module } from '@nestjs/common'
import { FixtureModule } from 'src/fixture/fixture.module'
import { StandingsModule } from 'src/standings/standings.module'
import { CompetitionsController } from './competitions.controller'
import { CompetitionsModule } from './competitions.module'
import { BracketModule } from 'src/bracket/bracket.module'

/** Rutas `/competitions`. Ver `CompetitionsModule`. */
@Module({
  imports: [CompetitionsModule, FixtureModule, StandingsModule, BracketModule],
  controllers: [CompetitionsController],
})
export class CompetitionsApiModule {}
