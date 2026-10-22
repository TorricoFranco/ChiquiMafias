import { Module } from '@nestjs/common'
import { StandingsController } from './standings.controller'
import { StandingsService } from './standings.service'
import { CompetitionsModule } from 'src/competitions/competitions.module'

@Module({
  imports: [CompetitionsModule],
  controllers: [StandingsController],
  providers: [StandingsService],
  exports: [StandingsService],
})
export class StandingsModule {}
